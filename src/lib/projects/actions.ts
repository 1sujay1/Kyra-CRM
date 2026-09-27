'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUserAction } from '@/lib/auth/actions';

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

// Initial seed projects
let runtimeProjects: FarmlandProjectItem[] = [
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

// In-memory runtime store for plots by project
let runtimePlots: Record<string, PlotItem[]> = {};

// Helper to seed plots for a project if not exists
function getOrGeneratePlots(project: FarmlandProjectItem): PlotItem[] {
  if (runtimePlots[project.id]) {
    return runtimePlots[project.id];
  }

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

  runtimePlots[project.id] = plots;
  return plots;
}

export async function fetchProjectsAction(): Promise<FarmlandProjectItem[]> {
  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return runtimeProjects;
    }

    // Merge Supabase data with runtime state
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      location: d.location,
      description: d.description || '',
      price_per_cent: Number(d.price_per_cent) || 125000,
      total_plots: d.total_plots || 30,
      available_plots: d.available_plots || d.total_plots || 15,
      status: d.status || 'active',
      water_source: d.water_source || 'Perennial Borewell + Stream',
      soil_type: d.soil_type || 'Red Loam Soil',
      updated_at: d.updated_at,
    }));
  } catch (err: any) {
    console.warn('Error fetching projects from Supabase (using runtime):', err);
    return runtimeProjects;
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
    const currentUser = await getCurrentUserAction();
    const userRole = currentUser?.role || 'admin';

    // Both Admin and Digital Marketing can update project details (DM has modify access)
    const index = runtimeProjects.findIndex((p) => p.id === projectId);
    let updatedProj: FarmlandProjectItem;

    if (index >= 0) {
      runtimeProjects[index] = {
        ...runtimeProjects[index],
        ...payload,
        updated_at: new Date().toISOString(),
      };
      updatedProj = runtimeProjects[index];
    } else {
      updatedProj = {
        id: projectId,
        ...payload,
        updated_at: new Date().toISOString(),
      };
      runtimeProjects.push(updatedProj);
    }

    // Sync to Supabase
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
          status: payload.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    } catch (e: any) {
      console.warn('Supabase projects sync skipped:', e.message);
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
      id: crypto.randomUUID(),
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    runtimeProjects.push(newProj);

    try {
      const supabase = (await createClient()) as any;
      await supabase.from('projects').insert([
        {
          id: newProj.id,
          name: newProj.name,
          location: newProj.location,
          description: newProj.description,
          price_per_cent: newProj.price_per_cent,
          total_plots: newProj.total_plots,
          status: newProj.status,
        },
      ]);
    } catch (e: any) {
      console.warn('Supabase insert skipped:', e.message);
    }

    return { success: true, data: newProj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchProjectPlotsAction(projectId: string): Promise<PlotItem[]> {
  const project = runtimeProjects.find((p) => p.id === projectId);
  if (!project) return [];
  return getOrGeneratePlots(project);
}

export async function updatePlotStatusAction(
  projectId: string,
  plotId: string,
  newStatus: PlotItem['status'],
  buyerName?: string
): Promise<{ success: boolean; plots?: PlotItem[]; availableCount?: number }> {
  const plots = runtimePlots[projectId];
  if (!plots) return { success: false };

  const plotIndex = plots.findIndex((p) => p.id === plotId);
  if (plotIndex >= 0) {
    plots[plotIndex].status = newStatus;
    if (buyerName) {
      plots[plotIndex].buyer_name = buyerName;
    } else if (newStatus === 'available') {
      plots[plotIndex].buyer_name = null;
    }
  }

  // Recalculate available plots
  const availableCount = plots.filter((p) => p.status === 'available').length;
  const projectIndex = runtimeProjects.findIndex((p) => p.id === projectId);
  if (projectIndex >= 0) {
    runtimeProjects[projectIndex].available_plots = availableCount;
  }

  return { success: true, plots: [...plots], availableCount };
}
