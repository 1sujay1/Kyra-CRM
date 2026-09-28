'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { readLocalJson, writeLocalJson } from '@/lib/storage';

const PROJECTS_FILE = 'projects.json';
const PLOTS_FILE = 'plots.json';

export interface FarmlandProjectItem {
  id: string;
  name: string;
  location: string;
  description: string;
  price_per_cent: number;
  total_plots: number;
  available_plots: number;
  status: 'active' | 'upcoming' | 'sold_out';
  water_source?: string;
  soil_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PlotItem {
  id: string;
  project_id: string;
  plot_no: string;
  size_cents: number;
  facing: 'east' | 'west' | 'north' | 'south' | 'north_east';
  price: number;
  status: 'available' | 'blocked' | 'booked' | 'sold';
  buyer_name?: string | null;
}

const DEFAULT_PROJECTS: FarmlandProjectItem[] = [
  {
    id: 'proj-1',
    name: 'Anaikatti Green Acres',
    location: 'Anaikatti Hills Road, Coimbatore',
    description: 'Scenic hill-view organic farmland plots with mountain breeze, perennial stream boundary, and drip-irrigation infrastructure.',
    price_per_cent: 125000,
    total_plots: 32,
    available_plots: 14,
    status: 'active',
    water_source: 'Perennial Hill Stream + 2 Borewells (450 ft, 3.5" yield)',
    soil_type: 'Virgin Red Soil (Rich in organic loam, ideal for avocado & sandalwood)',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Pollachi Coconut Groves',
    location: 'Pollachi Main Road, Kinathukadavu',
    description: 'High-yield mature coconut farmland plots with perennial borewells, motor pumps, and wide 30ft metal road frontage.',
    price_per_cent: 145000,
    total_plots: 45,
    available_plots: 8,
    status: 'active',
    water_source: '3 Deep Borewells + PAP Canal Connectivity',
    soil_type: 'Clay Loam Soil with 40-year bearing high-yield hybrid coconut palms',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'proj-3',
    name: 'Siruvani Valley Farmlands',
    location: 'Siruvani Foothills, Alandurai',
    description: 'Pure crystal Siruvani groundwater table zone ideal for wellness farmhouse estates and organic vegetable cultivation.',
    price_per_cent: 180000,
    total_plots: 24,
    available_plots: 19,
    status: 'upcoming',
    water_source: 'Natural Siruvani Aquifer (TDS < 60, zero salinity)',
    soil_type: 'Fertile Alluvial Soil suitable for natural farming & orchard',
    updated_at: new Date().toISOString(),
  },
];

// Helper to generate default plots for a project if not exists
function generatePlotsForProject(project: FarmlandProjectItem): PlotItem[] {
  const facings: PlotItem['facing'][] = ['east', 'north', 'north_east', 'west', 'south'];
  const plots: PlotItem[] = [];

  const soldCount = project.total_plots - project.available_plots;
  let soldAssigned = 0;

  for (let i = 1; i <= project.total_plots; i++) {
    const plotNo = `Plot ${i < 10 ? '0' : ''}${i}`;
    let status: PlotItem['status'] = 'available';

    if (soldAssigned < soldCount) {
      if (soldAssigned % 3 === 0) {
        status = 'booked';
      } else {
        status = 'sold';
      }
      soldAssigned++;
    }

    const sizeCents = i % 4 === 0 ? 50 : i % 2 === 0 ? 30 : 25;
    plots.push({
      id: `${project.id}-plot-${i}`,
      project_id: project.id,
      plot_no: plotNo,
      size_cents: sizeCents,
      facing: facings[(i - 1) % facings.length],
      price: sizeCents * project.price_per_cent,
      status,
      buyer_name: status === 'sold' || status === 'booked' ? `Client Kyra #${100 + i}` : null,
    });
  }

  return plots;
}

export async function fetchProjectsAction(): Promise<FarmlandProjectItem[]> {
  const localProjects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);

  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return localProjects;
    }

    const mapped: FarmlandProjectItem[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      location: d.location,
      description: d.description || '',
      price_per_cent: Number(d.price_per_cent) || 125000,
      total_plots: d.total_plots || 30,
      available_plots: d.available_plots ?? d.total_plots ?? 15,
      status: d.status || 'active',
      water_source: d.water_source || 'Perennial Borewell + Stream',
      soil_type: d.soil_type || 'Red Loam Soil',
      updated_at: d.updated_at,
    }));

    // If Supabase has active projects, treat Supabase as source of truth and update local storage
    if (mapped.length > 0) {
      writeLocalJson(PROJECTS_FILE, mapped);
      return mapped;
    }

    return localProjects;
  } catch (err: any) {
    console.warn('Notice fetching projects from Supabase (using persistent store):', err?.message);
    return localProjects;
  }
}

export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remove from local persistent storage
    const localProjects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
    const updatedProjects = localProjects.filter((p) => p.id !== projectId);
    writeLocalJson(PROJECTS_FILE, updatedProjects);

    const localPlotsRecord = readLocalJson<Record<string, PlotItem[]>>(PLOTS_FILE, {});
    delete localPlotsRecord[projectId];
    writeLocalJson(PLOTS_FILE, localPlotsRecord);

    // 2. Delete from Supabase server database
    try {
      const supabase = (await createClient()) as any;

      // Delete associated plots first
      await supabase.from('plots').delete().eq('project_id', projectId);

      // Delete the project from projects table
      const { error: delError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      // If hard delete fails due to constraint or policy, mark deleted_at
      if (delError) {
        await supabase
          .from('projects')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', projectId);
      }
    } catch (dbErr: any) {
      console.warn('Supabase project delete notice:', dbErr?.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete project.' };
  }
}

export async function updateProjectAction(
  projectId: string,
  payload: {
    name: string;
    location: string;
    description: string;
    price_per_cent: number;
    total_plots: number;
    available_plots: number;
    status: 'active' | 'upcoming' | 'sold_out';
    water_source?: string;
    soil_type?: string;
  }
): Promise<{ success: boolean; data?: FarmlandProjectItem; error?: string }> {
  try {
    // 1. Update in local persistent storage
    const localProjects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
    const index = localProjects.findIndex((p) => p.id === projectId);
    let updatedProj: FarmlandProjectItem;

    if (index >= 0) {
      localProjects[index] = {
        ...localProjects[index],
        ...payload,
        updated_at: new Date().toISOString(),
      };
      updatedProj = localProjects[index];
    } else {
      updatedProj = {
        id: projectId,
        ...payload,
        updated_at: new Date().toISOString(),
      };
      localProjects.push(updatedProj);
    }
    writeLocalJson(PROJECTS_FILE, localProjects);

    // 2. Sync to Supabase
    try {
      const supabase = (await createClient()) as any;
      await supabase
        .from('projects')
        .update({
          name: payload.name,
          location: payload.location,
          description: payload.description,
          price_per_cent: payload.price_per_cent,
          total_plots: payload.total_plots,
          available_plots: payload.available_plots,
          status: payload.status,
          water_source: payload.water_source,
          soil_type: payload.soil_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch (e: any) {
      console.warn('Supabase projects sync notice:', e.message);
    }

    return { success: true, data: updatedProj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createProjectAction(payload: {
  name: string;
  location: string;
  description: string;
  price_per_cent: number;
  total_plots: number;
  available_plots: number;
  status: 'active' | 'upcoming' | 'sold_out';
  water_source?: string;
  soil_type?: string;
}): Promise<{ success: boolean; data?: FarmlandProjectItem; error?: string }> {
  try {
    const newProj: FarmlandProjectItem = {
      id: `proj-${Date.now()}`,
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Update local persistent storage
    const localProjects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
    localProjects.push(newProj);
    writeLocalJson(PROJECTS_FILE, localProjects);

    // 2. Seed plots for this project in local storage
    const localPlotsRecord = readLocalJson<Record<string, PlotItem[]>>(PLOTS_FILE, {});
    const generatedPlots = generatePlotsForProject(newProj);
    localPlotsRecord[newProj.id] = generatedPlots;
    writeLocalJson(PLOTS_FILE, localPlotsRecord);

    // 3. Sync to Supabase
    try {
      const supabase = (await createClient()) as any;
      await supabase.from('projects').insert([
        {
          id: newProj.id,
          org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
          name: newProj.name,
          location: newProj.location,
          description: newProj.description,
          price_per_cent: newProj.price_per_cent,
          total_plots: newProj.total_plots,
          available_plots: newProj.available_plots,
          status: newProj.status,
          water_source: newProj.water_source,
          soil_type: newProj.soil_type,
        },
      ]);

      // Seed plots into Supabase
      const plotInserts = generatedPlots.map((p) => ({
        id: p.id,
        org_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000000',
        project_id: newProj.id,
        plot_no: p.plot_no,
        size_cents: p.size_cents,
        size_sqft: p.size_cents * 435.6,
        facing: p.facing,
        price: p.price,
        status: p.status,
        buyer_name: p.buyer_name,
      }));

      await supabase.from('plots').insert(plotInserts);
    } catch (e: any) {
      console.warn('Supabase project insert skipped, saved locally:', e.message);
    }

    return { success: true, data: newProj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchProjectPlotsAction(projectId: string): Promise<PlotItem[]> {
  const localPlotsRecord = readLocalJson<Record<string, PlotItem[]>>(PLOTS_FILE, {});

  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('plots')
      .select('*')
      .eq('project_id', projectId)
      .order('plot_no', { ascending: true });

    if (error || !data || data.length === 0) {
      // Check local cache
      if (localPlotsRecord[projectId] && localPlotsRecord[projectId].length > 0) {
        return localPlotsRecord[projectId];
      }
      // Generate initial plots if needed
      const projects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        const generated = generatePlotsForProject(proj);
        localPlotsRecord[projectId] = generated;
        writeLocalJson(PLOTS_FILE, localPlotsRecord);
        return generated;
      }
      return [];
    }

    const mappedPlots: PlotItem[] = data.map((d: any) => ({
      id: d.id,
      project_id: d.project_id,
      plot_no: d.plot_no,
      size_cents: Number(d.size_cents),
      facing: d.facing,
      price: Number(d.price),
      status: d.status,
      buyer_name: d.buyer_name,
    }));

    localPlotsRecord[projectId] = mappedPlots;
    writeLocalJson(PLOTS_FILE, localPlotsRecord);
    return mappedPlots;
  } catch (err: any) {
    console.warn('Supabase fetch plots notice:', err?.message);
    if (localPlotsRecord[projectId]) {
      return localPlotsRecord[projectId];
    }
    return [];
  }
}

export async function updatePlotStatusAction(
  projectId: string,
  plotId: string,
  newStatus: PlotItem['status'],
  buyerName?: string
): Promise<{ success: boolean; plots?: PlotItem[]; availableCount?: number }> {
  try {
    // 1. Update in local persistent storage
    const localPlotsRecord = readLocalJson<Record<string, PlotItem[]>>(PLOTS_FILE, {});
    let plots = localPlotsRecord[projectId];

    if (!plots) {
      const projects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
      const proj = projects.find((p) => p.id === projectId);
      plots = proj ? generatePlotsForProject(proj) : [];
      localPlotsRecord[projectId] = plots;
    }

    const plotIndex = plots.findIndex((p) => p.id === plotId);
    if (plotIndex >= 0) {
      plots[plotIndex].status = newStatus;
      if (buyerName) {
        plots[plotIndex].buyer_name = buyerName;
      } else if (newStatus === 'available') {
        plots[plotIndex].buyer_name = null;
      }
    }
    localPlotsRecord[projectId] = plots;
    writeLocalJson(PLOTS_FILE, localPlotsRecord);

    // Recalculate available plots count
    const availableCount = plots.filter((p) => p.status === 'available').length;

    // Update in local projects
    const localProjects = readLocalJson<FarmlandProjectItem[]>(PROJECTS_FILE, DEFAULT_PROJECTS);
    const pIndex = localProjects.findIndex((p) => p.id === projectId);
    if (pIndex >= 0) {
      localProjects[pIndex].available_plots = availableCount;
      writeLocalJson(PROJECTS_FILE, localProjects);
    }

    // 2. Sync to Supabase
    try {
      const supabase = (await createClient()) as any;
      await supabase
        .from('plots')
        .update({
          status: newStatus,
          buyer_name: newStatus === 'available' ? null : (buyerName || null),
          updated_at: new Date().toISOString(),
        })
        .eq('id', plotId);

      await supabase
        .from('projects')
        .update({
          available_plots: availableCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch (e: any) {
      console.warn('Supabase plot update skipped:', e.message);
    }

    return { success: true, plots: [...plots], availableCount };
  } catch (err: any) {
    return { success: false };
  }
}
