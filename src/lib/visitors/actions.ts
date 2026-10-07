'use server';

import { getDatabase } from '@/lib/mongodb';
import { getCurrentUserAction } from '@/lib/auth/actions';

export interface VisitorLogItem {
  id: string;
  ip: string;
  city: string;
  region: string;
  country: string;
  postal?: string;
  isp?: string;
  user_agent: string;
  device_type: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  os: string;
  screen_resolution?: string;
  page_url?: string;
  referrer?: string;
  project_name: string;
  visit_count?: number;
  visited_at: string;
}

export async function fetchVisitorLogsAction(): Promise<VisitorLogItem[]> {
  const user = await getCurrentUserAction();
  if (!user || user.role !== 'admin') {
    return [];
  }

  try {
    const db = await getDatabase();
    const rawLogs = await db
      .collection('visitor_logs')
      .find({})
      .sort({ visited_at: -1 })
      .limit(500)
      .toArray();

    if (!rawLogs || rawLogs.length === 0) {
      return [];
    }

    return rawLogs.map((log: any) => ({
      id: log.id || log._id.toString(),
      ip: log.ip || 'Unknown IP',
      city: log.city || 'Coimbatore',
      region: log.region || 'Tamil Nadu',
      country: log.country || 'India',
      postal: log.postal || '',
      isp: log.isp || '',
      user_agent: log.user_agent || '',
      device_type: log.device_type || 'Desktop',
      browser: log.browser || 'Browser',
      os: log.os || 'OS',
      screen_resolution: log.screen_resolution || '',
      page_url: log.page_url || '',
      referrer: log.referrer || 'Direct Visit',
      project_name: log.project_name || 'Kyra Farmlands',
      visit_count: Number(log.visit_count) || 1,
      visited_at: log.visited_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Visitor Actions] Failed to fetch visitor logs:', err?.message);
    return [];
  }
}

export async function deleteVisitorLogAction(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUserAction();

  if (!user || user.role !== 'admin') {
    return {
      success: false,
      error: 'ACCESS DENIED: Only Admin permissions can delete visitor logs.',
    };
  }

  try {
    const db = await getDatabase();
    await db.collection('visitor_logs').deleteOne({ id });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete visitor log.' };
  }
}
