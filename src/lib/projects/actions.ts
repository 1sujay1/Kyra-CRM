'use server';

import { getDatabase } from '@/lib/mongodb';
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

export async function fetchProjectsAction(): Promise<FarmlandProjectItem[]> {
  try {
    const db = await getDatabase();
    const data = await db
      .collection('projects')
      .find({ $or: [{ deleted_at: { $exists: false } }, { deleted_at: null }] })
      .sort({ created_at: 1 })
      .toArray();

    if (!data || data.length === 0) {
      return [];
    }

    const mapped: FarmlandProjectItem[] = data.map((d: any) => ({
      id: d.id || d._id.toString(),
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

    return mapped;
  } catch (err: any) {
    console.warn('Notice fetching projects from MongoDB:', err?.message);
    return [];
  }
}

export async function deleteProjectAction(
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUserAction();
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        success: false,
        error: 'ACCESS DENIED: Only Admin has permission to delete projects.',
      };
    }

    const db = await getDatabase();

    // Delete associated plots first
    await db.collection('plots').deleteMany({ project_id: projectId });

    // Delete the project from projects collection
    await db.collection('projects').deleteOne({ id: projectId });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete project from MongoDB.' };
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
    const db = await getDatabase();
    const updatedAt = new Date().toISOString();

    await db.collection('projects').updateOne(
      { id: projectId },
      {
        $set: {
          name: payload.name,
          location: payload.location,
          description: payload.description,
          price_per_cent: payload.price_per_cent,
          total_plots: payload.total_plots,
          available_plots: payload.available_plots,
          status: payload.status,
          water_source: payload.water_source,
          soil_type: payload.soil_type,
          updated_at: updatedAt,
        },
      }
    );

    return {
      success: true,
      data: {
        id: projectId,
        name: payload.name,
        location: payload.location,
        description: payload.description,
        price_per_cent: payload.price_per_cent,
        total_plots: payload.total_plots,
        available_plots: payload.available_plots,
        status: payload.status,
        water_source: payload.water_source,
        soil_type: payload.soil_type,
        updated_at: updatedAt,
      },
    };
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
    const newId = `proj-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const db = await getDatabase();

    await db.collection('projects').insertOne({
      id: newId,
      name: payload.name,
      location: payload.location,
      description: payload.description,
      price_per_cent: payload.price_per_cent,
      total_plots: payload.total_plots,
      available_plots: payload.available_plots,
      status: payload.status,
      water_source: payload.water_source,
      soil_type: payload.soil_type,
      created_at: createdAt,
      updated_at: createdAt,
    });

    const createdProj: FarmlandProjectItem = {
      id: newId,
      ...payload,
      created_at: createdAt,
      updated_at: createdAt,
    };

    return { success: true, data: createdProj };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchProjectPlotsAction(projectId: string): Promise<PlotItem[]> {
  try {
    const db = await getDatabase();
    const data = await db
      .collection('plots')
      .find({ project_id: projectId })
      .sort({ plot_no: 1 })
      .toArray();

    if (!data || data.length === 0) {
      return [];
    }

    const mappedPlots: PlotItem[] = data.map((d: any) => ({
      id: d.id || d._id.toString(),
      project_id: d.project_id,
      plot_no: d.plot_no,
      size_cents: Number(d.size_cents),
      facing: d.facing,
      price: Number(d.price),
      status: d.status,
      buyer_name: d.buyer_name,
    }));

    return mappedPlots;
  } catch (err: any) {
    console.warn('MongoDB fetch plots notice:', err?.message);
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
    const db = await getDatabase();
    await db.collection('plots').updateOne(
      { id: plotId },
      {
        $set: {
          status: newStatus,
          buyer_name: newStatus === 'available' ? null : buyerName || null,
          updated_at: new Date().toISOString(),
        },
      }
    );

    // Refetch updated plots
    const plots = await fetchProjectPlotsAction(projectId);
    const availableCount = plots.filter((p) => p.status === 'available').length;

    await db.collection('projects').updateOne(
      { id: projectId },
      {
        $set: {
          available_plots: availableCount,
          updated_at: new Date().toISOString(),
        },
      }
    );

    return { success: true, plots, availableCount };
  } catch (err: any) {
    return { success: false };
  }
}
