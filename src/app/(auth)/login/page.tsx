'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, ShieldAlert, ArrowRight, ShieldCheck, KeyRound, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/lib/auth/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [identifier, setIdentifier] = useState('Adminkyra');
  const [password, setPassword] = useState('Kyra@1234#');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginAction(identifier, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Perform direct window navigation to ensure cookies are immediately committed
      window.location.href = '/leads';
    } catch {
      setErrorMessage('Server authentication error. Please try again.');
      setLoading(false);
    }
  };

  const handleQuickSelect = (username: string) => {
    setIdentifier(username);
    setPassword('Kyra@1234#');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          Kyra Group Farmland CRM
        </h3>
        <p className="text-xs text-muted-foreground">
          Restricted access: Authorized administrative & marketing personnel only
        </p>
      </div>

      {reason === 'session_expired' && (
        <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>Your session has expired. Please sign in again.</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-destructive/10 p-3 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick Account Selector Chips */}
      <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <span className="text-[11px] font-semibold text-slate-700 block">
          Authorized Kyra Accounts (Click to autofill):
        </span>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleQuickSelect('Adminkyra')}
            className={`p-2 rounded-lg border text-left text-xs transition-all ${
              identifier.toLowerCase().includes('admin')
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>Adminkyra</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold uppercase">
                Admin
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Full Access + Delete</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickSelect('dmkyra')}
            className={`p-2 rounded-lg border text-left text-xs transition-all ${
              identifier.toLowerCase().includes('dm')
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold ring-1 ring-emerald-400'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>dmkyra</span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-800 font-bold uppercase">
                Marketing
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Modify & Add Only</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="identifier" className="text-xs font-semibold">
            Username or Work Email
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="identifier"
              type="text"
              placeholder="Adminkyra or dmkyra"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="pl-9 text-xs"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <span className="text-[10px] text-emerald-700 font-mono">Kyra@1234#</span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-9 text-xs font-mono"
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-semibold h-9 shadow-sm"
        >
          {loading ? 'Signing into Kyra CRM...' : 'Sign In Securely'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </form>

      <div className="border-t pt-4 text-center">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Enterprise Security & Role-Based Access Control (RBAC)</span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
          Loading authentication service...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
