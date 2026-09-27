'use server';

import { cookies } from 'next/headers';
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

export async function loginAction(identifierRaw: string, passwordRaw: string): Promise<LoginResult> {
  const identifier = identifierRaw.trim().toLowerCase();
  const password = passwordRaw.trim();

  // 1. Strict Login Whitelist Check: Only Adminkyra and dmkyra permitted
  const validAccount = VALID_USERS[identifier];
  if (!validAccount) {
    return {
      success: false,
      error: 'Access Denied: Only Adminkyra (Admin) and dmkyra (Digital Marketing) are authorized.',
    };
  }

  // 2. Strict Password Check
  if (password !== 'Kyra@1234#') {
    return {
      success: false,
      error: 'Invalid credentials. Password is case-sensitive: Kyra@1234#',
    };
  }

  // 3. Attempt Supabase Auth session creation if configured
  try {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({
      email: validAccount.email,
      password: password,
    });
  } catch (err: any) {
    console.warn('Supabase auth signin notice (proceeding with verified session):', err?.message);
  }

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
  cookieStore.delete({ name: 'kyra_user_role', path: '/' });
  cookieStore.delete({ name: 'kyra_username', path: '/' });
  cookieStore.delete({ name: 'kyra_email', path: '/' });

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
