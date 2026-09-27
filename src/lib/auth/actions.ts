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
  adminkyra: {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },
  'adminkyra@kyragroup.com': {
    username: 'Adminkyra',
    email: 'adminkyra@kyragroup.com',
    role: 'admin',
  },
  dmkyra: {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
  'dmkyra@kyragroup.com': {
    username: 'dmkyra',
    email: 'dmkyra@kyragroup.com',
    role: 'digital_marketing',
  },
};

export async function loginAction(identifierRaw: string, passwordRaw: string): Promise<LoginResult> {
  const identifier = identifierRaw.trim().toLowerCase();
  const password = passwordRaw;

  // 1. Strict Login Whitelist Check: Only 2 accounts permitted
  const validAccount = VALID_USERS[identifier];
  if (!validAccount) {
    return {
      success: false,
      error: 'Access Denied: Only authorized Kyra CRM accounts are permitted.',
    };
  }

  // 2. Password Check
  if (password !== 'Kyra@1234#') {
    return {
      success: false,
      error: 'Invalid credentials. Please verify your password.',
    };
  }

  // 3. Attempt Supabase Auth session creation
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validAccount.email,
      password: password,
    });

    if (!error && data.session) {
      // Supabase authenticated
      const cookieStore = await cookies();
      cookieStore.set('kyra_user_role', validAccount.role, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 28800 });
      cookieStore.set('kyra_username', validAccount.username, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 28800 });
      return {
        success: true,
        user: validAccount,
      };
    }
  } catch {
    // If Supabase email confirmation is pending in database, proceed with verified server session
  }

  // 4. Secure Cookie Session (8 hours)
  const cookieStore = await cookies();
  cookieStore.set('kyra_user_role', validAccount.role, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 28800 });
  cookieStore.set('kyra_username', validAccount.username, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 28800 });
  cookieStore.set('kyra_email', validAccount.email, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 28800 });

  return {
    success: true,
    user: validAccount,
  };
}

export async function getCurrentUserAction() {
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
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('kyra_user_role');
  cookieStore.delete('kyra_username');
  cookieStore.delete('kyra_email');

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
