'use server';

import { getDatabase } from '@/lib/mongodb';
import { getCurrentUserAction } from '@/lib/auth/actions';

export interface ExecutiveItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  designation: string;
  is_active: boolean;
  created_at: string;
}

export async function fetchExecutivesAction(): Promise<ExecutiveItem[]> {
  try {
    const db = await getDatabase();
    const docs = await db
      .collection('executives')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    return docs.map((doc: any) => ({
      id: doc.id || doc._id.toString(),
      name: doc.name || '',
      phone: doc.phone || '',
      email: doc.email || '',
      designation: doc.designation || 'Sales Executive',
      is_active: doc.is_active !== false,
      created_at: doc.created_at || new Date().toISOString(),
    }));
  } catch (err: any) {
    console.warn('[Executives] Failed to fetch executives:', err?.message);
    return [];
  }
}

export async function createExecutiveAction(data: {
  name: string;
  phone: string;
  email?: string;
  designation?: string;
}): Promise<{ success: boolean; error?: string; executive?: ExecutiveItem }> {
  const currentUser = await getCurrentUserAction();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  const name = (data.name || '').trim();
  const phone = (data.phone || '').trim();
  const email = (data.email || '').trim();
  const designation = (data.designation || 'Sales Executive').trim();

  if (!name || !phone) {
    return { success: false, error: 'Executive Name and Phone number are required.' };
  }

  try {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newExec = {
      id,
      name,
      phone,
      email,
      designation,
      is_active: true,
      created_at: now,
      created_by: currentUser.username,
    };

    await db.collection('executives').insertOne(newExec);

    return {
      success: true,
      executive: {
        id,
        name,
        phone,
        email,
        designation,
        is_active: true,
        created_at: now,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create executive.' };
  }
}

export async function deleteExecutiveAction(id: string): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserAction();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  try {
    const db = await getDatabase();
    await db.collection('executives').deleteOne({ id });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete executive.' };
  }
}

export async function toggleExecutiveStatusAction(
  id: string,
  is_active: boolean
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUserAction();
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, error: 'Unauthorized: Admin privileges required.' };
  }

  try {
    const db = await getDatabase();
    await db.collection('executives').updateOne(
      { id },
      { $set: { is_active, updated_at: new Date().toISOString() } }
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update executive status.' };
  }
}

