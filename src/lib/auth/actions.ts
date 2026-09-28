'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export interface LoginResult {
  success: boolean;
  error?: string;
  user?: {
    username: string;
    email: string;
    role: 'admin' | 'digital_marketing';
  };
}

// Allowed logins: STRICTLY Adminkyra and dmkyra with Kyra@1234#
const VALID_USERS: Record<string, { email: string; username: string; role: 'admin' | 'digital_marketing' }> = {
  // Adminkyra variations
  adminkyra: {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },
  admin: {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },
  'adminkyra@kyragroup.com': {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },
  'admin@kyragroup.com': {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },

  // dmkyra variations
  dmkyra: {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  dm: {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  'digital marketing': {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  digitalmarketing: {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  marketing: {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  'dmkyra@kyragroup.com': {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  'marketing@kyragroup.com': {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
};

/**
 * Record user login/logout activity directly to the Supabase database.
 * Dual-layer write ensures persistence even before dedicated SQL migrations are executed.
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
    const supabase = await createClient();

    // 1. Primary write: Attempt writing to dedicated user_logins table
    const { error: userLoginsError } = await (supabase as any)
      .from('user_logins')
      .insert({
        username: data.username,
        email: data.email,
        role: data.role,
        status: data.status,
        ip_address: data.ipAddress || '127.0.0.1',
        user_agent: data.userAgent || 'Web Browser',
        failure_reason: data.failureReason || null,
        created_at: new Date().toISOString(),
      });

    // 2. Resilient fallback: If user_logins table is pending, write to webhook_logs
    if (userLoginsError) {
      await (supabase as any)
        .from('webhook_logs')
        .insert({
          source: 'user_login',
          status: data.status === 'success' ? 'processed' : 'error',
          ip: data.ipAddress || null,
          error_message: data.failureReason || null,
          payload: {
            event: data.status === 'success' ? 'user_login_success' : 'user_login_failed',
            username: data.username,
            email: data.email,
            role: data.role,
            status: data.status,
            user_agent: data.userAgent || 'Web Browser',
            timestamp: new Date().toISOString(),
          },
        });
    }

    // 3. Keep profile updated in profiles table
    if (data.status === 'success') {
      try {
        await (supabase as any)
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('username', data.username);
      } catch {
        // Non-blocking
      }
    }
  } catch (err: any) {
    console.warn('[AUTH_DB_LOG]: Could not persist login record to database:', err?.message);
  }
}

export async function loginAction(identifierRaw: string, passwordRaw: string): Promise<LoginResult> {
  const identifier = identifierRaw.trim().toLowerCase();
  const password = passwordRaw.trim();

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
    // headers optional in some test contexts
  }

  // 1. Strict Login Whitelist Check: Only Adminkyra and dmkyra permitted
  const validAccount = VALID_USERS[identifier];
  if (!validAccount) {
    await recordLoginInDatabase({
      username: identifierRaw,
      email: identifierRaw,
      role: 'unauthorized',
      status: 'failed',
      failureReason: 'Account not authorized on CRM whitelist',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    });

    return {
      success: false,
      error: 'Access Denied: Only Adminkyra (Admin) and dmkyra (Digital Marketing) are authorized.',
    };
  }

  // 2. Authenticate directly against Supabase database
  let dbVerified = false;
  try {
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: validAccount.email,
      password: password,
    });

    if (!authError || authError.code === 'email_not_confirmed') {
      dbVerified = true;
    } else if (authError.code === 'invalid_credentials') {
      await recordLoginInDatabase({
        username: validAccount.username,
        email: validAccount.email,
        role: validAccount.role,
        status: 'failed',
        failureReason: 'Invalid password. Password did not match database record.',
        ipAddress: clientIp,
        userAgent: clientUserAgent,
      });

      return {
        success: false,
        error: 'Invalid credentials. Password did not match database record.',
      };
    }
  } catch (err: any) {
    console.warn('Database authentication check error:', err?.message);
  }

  // Fallback verification if database network is unreachable
  if (!dbVerified && password !== 'Kyra@1234#') {
    await recordLoginInDatabase({
      username: validAccount.username,
      email: validAccount.email,
      role: validAccount.role,
      status: 'failed',
      failureReason: 'Invalid credentials. Password is case-sensitive: Kyra@1234#',
      ipAddress: clientIp,
      userAgent: clientUserAgent,
    });

    return {
      success: false,
      error: 'Invalid credentials. Password is case-sensitive: Kyra@1234#',
    };
  }

  // 3. Persist Successful Login Record to Database
  await recordLoginInDatabase({
    username: validAccount.username,
    email: validAccount.email,
    role: validAccount.role,
    status: 'success',
    ipAddress: clientIp,
    userAgent: clientUserAgent,
  });

  // 4. Secure Cookie Session (7 days) with explicit path and sameSite
  const cookieStore = await cookies();
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
  };

  cookieStore.set('kyra_user_role', validAccount.role, cookieOptions);
  cookieStore.set('kyra_username', validAccount.username, cookieOptions);
  cookieStore.set('kyra_email', validAccount.email, cookieOptions);

  return {
    success: true,
    user: validAccount,
  };
}

export async function getCurrentUserAction() {
  try {
    const cookieStore = await cookies();
    const username = cookieStore.get('kyra_username')?.value;
    const role = cookieStore.get('kyra_user_role')?.value as 'admin' | 'digital_marketing' | undefined;
    const email = cookieStore.get('kyra_email')?.value;

    if (!username || !role) {
      // Default to Adminkyra for development/first render
      return {
        username: 'Adminkyra',
        role: 'admin' as const,
        email: 'adminkyra@kyragroup.com',
      };
    }

    return {
      username,
      role,
      email: email || `${username.toLowerCase()}@kyragroup.com`,
    };
  } catch {
    return {
      username: 'Adminkyra',
      role: 'admin' as const,
      email: 'adminkyra@kyragroup.com',
    };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const username = cookieStore.get('kyra_username')?.value || 'Adminkyra';
  const role = cookieStore.get('kyra_user_role')?.value || 'admin';
  const email = cookieStore.get('kyra_email')?.value || 'adminkyra@kyragroup.com';

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

    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export async function fetchLoginAuditLogsAction() {
  try {
    const supabase = await createClient();

    // 1. Try from user_logins
    const { data: userLogins, error: userLoginsError } = await (supabase as any)
      .from('user_logins')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!userLoginsError && userLogins && userLogins.length > 0) {
      return userLogins.map((item: any) => ({
        id: item.id,
        user: `${item.username} (${item.role})`,
        action: item.status === 'success' ? 'login_success' : 'login_failed',
        entity: `Session: ${item.user_agent ? item.user_agent.slice(0, 30) : 'Browser Login'}`,
        ip: item.ip_address || '127.0.0.1 (Coimbatore)',
        time: formatRelativeTime(item.created_at),
        createdAt: item.created_at,
      }));
    }

    // 2. Fallback to webhook_logs where source = 'user_login'
    const { data: webhookLogs } = await (supabase as any)
      .from('webhook_logs')
      .select('*')
      .eq('source', 'user_login')
      .order('created_at', { ascending: false })
      .limit(50);

    if (webhookLogs && webhookLogs.length > 0) {
      return webhookLogs.map((item: any) => {
        const payload = item.payload || {};
        return {
          id: item.id,
          user: `${payload.username || 'User'} (${payload.role || 'Staff'})`,
          action: item.status === 'processed' ? 'login_success' : 'login_failed',
          entity: `Session: ${payload.event || 'user_login'}`,
          ip: item.ip || '127.0.0.1 (Coimbatore)',
          time: formatRelativeTime(item.created_at),
          createdAt: item.created_at,
        };
      });
    }

    return [];
  } catch (err) {
    console.warn('Could not fetch login audit logs from database:', err);
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

