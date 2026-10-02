'use server';

import { cookies, headers } from 'next/headers';
import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: {
    username: string;
    email: string;
    role: 'admin' | 'digital_marketing';
  };
}

/**
 * Record user login/logout activity directly in MongoDB `user_logins` collection.
 */
async function recordLoginInDatabase(data: {
  username: string;
  email: string;
  role: string;
  status: 'success' | 'failed';
  ipAddress?: string;
  userAgent?: string;
  failureReason?: string;
}) {
  try {
    const db = await getDatabase();
    await db.collection('user_logins').insertOne({
      username: data.username,
      email: data.email,
      role: data.role,
      status: data.status,
      ip_address: data.ipAddress || '127.0.0.1',
      user_agent: data.userAgent || 'Web Browser',
      failure_reason: data.failureReason || null,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[AUTH_DB_LOG]: Could not persist login record to MongoDB:', err?.message);
  }
}

/**
 * Dynamic MongoDB Database Authentication
 */
export async function loginAction(identifierRaw: string, passwordRaw: string): Promise<LoginResult> {
  const identifier = identifierRaw.trim();
  const password = passwordRaw.trim();

  if (!identifier || !password) {
    return {
      success: false,
      error: 'Username/Email and Password are required.',
    };
  }

  // Extract client IP and device user agent
  let clientIp = '127.0.0.1 (Coimbatore)';
  let clientUserAgent = 'Web Browser';
  try {
    const headerList = await headers();
    const rawIp = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip');
    if (rawIp) clientIp = rawIp;
    const ua = headerList.get('user-agent');
    if (ua) clientUserAgent = ua;
  } catch {
    // headers optional
  }

  let targetEmail = identifier.toLowerCase();
  if (!targetEmail.includes('@')) {
    targetEmail = `${targetEmail}@kyragroup.com`;
  }

  try {
    const db = await getDatabase();
    
    // Query by username or email
    const userDoc = await db.collection('users').findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        { email: { $regex: new RegExp(`^${targetEmail}$`, 'i') } },
        { email: { $regex: new RegExp(`^${identifier}$`, 'i') } },
      ],
    });

    if (!userDoc) {
      await recordLoginInDatabase({
        username: identifier,
        email: targetEmail,
        role: 'unauthorized',
        status: 'failed',
        failureReason: 'User not found',
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      });

      return {
        success: false,
        error: 'Invalid username/email or password.',
      };
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, userDoc.passwordHash);

    if (!isPasswordValid) {
      await recordLoginInDatabase({
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role || 'unauthorized',
        status: 'failed',
        failureReason: 'Invalid password',
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      });

      return {
        success: false,
        error: 'Invalid username/email or password.',
      };
    }

    const userObj = {
      username: userDoc.username,
      email: userDoc.email,
      role: (userDoc.role as 'admin' | 'digital_marketing') || 'admin',
    };

    // Record successful login in MongoDB
    await recordLoginInDatabase({
      username: userObj.username,
      email: userObj.email,
      role: userObj.role,
      status: 'success',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    });

    // Set secure cookie session
    const cookieStore = await cookies();
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
    };

    cookieStore.set('kyra_user_role', userObj.role, cookieOptions);
    cookieStore.set('kyra_username', userObj.username, cookieOptions);
    cookieStore.set('kyra_email', userObj.email, cookieOptions);

    return {
      success: true,
      user: userObj,
    };
  } catch (err: any) {
    console.error('MongoDB authentication exception:', err?.message);
    return {
      success: false,
      error: `MongoDB authentication error: ${err?.message || 'Failed to connect to MongoDB.'}`,
    };
  }
}

export async function getCurrentUserAction() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('kyra_username')?.value;
    const role = cookieStore.get('kyra_user_role')?.value as 'admin' | 'digital_marketing' | undefined;
    const email = cookieStore.get('kyra_email')?.value;

    if (!username || !role) {
      return null;
    }

    return {
      username,
      role,
      email: email || `${username.toLowerCase()}@kyragroup.com`,
    };
  } catch {
    return null;
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const username = cookieStore.get('kyra_username')?.value || 'User';
  const role = cookieStore.get('kyra_user_role')?.value || 'admin';
  const email = cookieStore.get('kyra_email')?.value || 'user@kyragroup.com';

  cookieStore.delete({ name: 'kyra_user_role', path: '/' });
  cookieStore.delete({ name: 'kyra_username', path: '/' });
  cookieStore.delete({ name: 'kyra_email', path: '/' });

  try {
    let clientIp = '127.0.0.1 (Coimbatore)';
    let clientUserAgent = 'Web Browser';
    try {
      const headerList = await headers();
      const rawIp = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip');
      if (rawIp) clientIp = rawIp;
      const ua = headerList.get('user-agent');
      if (ua) clientUserAgent = ua;
    } catch {}

    await recordLoginInDatabase({
      username,
      email,
      role,
      status: 'success',
      failureReason: 'User signed out',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    });
  } catch {
    // ignore
  }
}

export async function fetchLoginAuditLogsAction() {
  try {
    const db = await getDatabase();
    const logs = await db
      .collection('user_logins')
      .find({})
      .sort({ created_at: -1 })
      .limit(50)
      .toArray();

    return logs.map((item: any) => ({
      id: item._id.toString(),
      user: `${item.username} (${item.role})`,
      action: item.status === 'success' ? 'login_success' : 'login_failed',
      entity: `Session: ${item.user_agent ? item.user_agent.slice(0, 30) : 'Browser Login'}`,
      ip: item.ip_address || '127.0.0.1 (Coimbatore)',
      time: formatRelativeTime(item.created_at),
      createdAt: item.created_at,
    }));
  } catch (err) {
    console.warn('Could not fetch login audit logs from MongoDB:', err);
    return [];
  }
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } catch {
    return 'Recently';
  }
}
