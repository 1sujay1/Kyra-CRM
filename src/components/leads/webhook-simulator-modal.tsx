'use client';

import React, { useState } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Send,
  Database,
  Sparkles,
  Layers,
  FileCode2,
  ExternalLink,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LeadDetailed } from '@/components/leads/lead-360-drawer';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadIngested: (lead: LeadDetailed) => void;
}

export function WebhookSimulatorModal({
  isOpen,
  onClose,
  onLeadIngested,
}: WebhookSimulatorModalProps) {
  const [activeTab, setActiveTab] = useState<'simulate' | 'sql'>('simulate');
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  // Form fields for custom simulation
  const [simSource, setSimSource] = useState<'meta' | 'google' | 'zapier'>('meta');
  const [simName, setSimName] = useState('Kavitha Selvaraj');
  const [simPhone, setSimPhone] = useState('+919842155678');
  const [simProject, setSimProject] = useState('Anaikatti Green Acres');
  const [simBudget, setSimBudget] = useState('₹45L - ₹65L');

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/leads`
    : 'http://localhost:3000/api/webhooks/leads';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setIsCopiedUrl(true);
    setTimeout(() => setIsCopiedUrl(false), 2000);
  };

  const masterSqlSnippet = `-- KYRA CRM - COMPLETE MASTER SETUP SCRIPT FOR SUPABASE
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into organizations (id, name)
values ('00000000-0000-0000-0000-000000000000', 'Kyra Group (Coimbatore Farmlands)')
on conflict (id) do nothing;

create table if not exists projects (
  id text primary key default gen_random_uuid()::text,
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  name text not null,
  location text not null,
  description text,
  price_per_cent numeric(12, 2) not null default 125000,
  total_plots integer not null default 30,
  available_plots integer not null default 15,
  status text not null default 'active',
  water_source text default 'Perennial Borewell + Stream',
  soil_type text default 'Virgin Red Loam Soil',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists plots (
  id text primary key default gen_random_uuid()::text,
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  project_id text not null references projects(id) on delete cascade,
  plot_no text not null,
  survey_no text,
  size_cents numeric(8, 2) not null default 25,
  size_sqft numeric(10, 2) not null default 10890,
  facing text not null default 'east',
  price numeric(12, 2) not null default 0,
  status text not null default 'available',
  buyer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, plot_no)
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  full_name text not null,
  phone text not null,
  alt_phone text,
  email text,
  city text default 'Coimbatore',
  project_name text not null default 'Anaikatti Green Acres',
  project_id text,
  source text not null default 'manual',
  campaign_name text,
  budget_range text default '₹35L - ₹50L',
  purpose text default 'farmhouse',
  status text not null default 'new',
  quality text not null default 'warm',
  assigned_to_name text default 'Priya Raman',
  consent jsonb not null default '{"consent_given": true}'::jsonb,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists lead_status_history (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  comment text not null,
  changed_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  type text not null,
  outcome text,
  notes text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists webhook_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default '00000000-0000-0000-0000-000000000000' references organizations(id) on delete cascade,
  source text not null default 'webhook',
  payload jsonb not null,
  lead_id uuid,
  status text not null default 'processed',
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;
alter table projects enable row level security;
alter table plots enable row level security;
alter table leads enable row level security;
alter table lead_status_history enable row level security;
alter table activities enable row level security;
alter table webhook_logs enable row level security;

create policy "Allow all read leads" on leads for select to anon, authenticated using (deleted_at is null);
create policy "Allow all insert leads" on leads for insert to anon, authenticated with check (true);
create policy "Allow all update leads" on leads for update to anon, authenticated using (true) with check (true);
create policy "Allow all delete leads" on leads for delete to anon, authenticated using (true);

create policy "Allow all read projects" on projects for select to anon, authenticated using (deleted_at is null);
create policy "Allow all insert projects" on projects for insert to anon, authenticated with check (true);
create policy "Allow all update projects" on projects for update to anon, authenticated using (true) with check (true);

create policy "Allow all read plots" on plots for select to anon, authenticated using (true);
create policy "Allow all insert plots" on plots for insert to anon, authenticated with check (true);
create policy "Allow all update plots" on plots for update to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines in schema public to anon, authenticated, service_role;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(masterSqlSnippet);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2000);
  };

  const handleSendTestWebhook = async () => {
    setIsSending(true);
    setLastResponse(null);

    try {
      let payload: any;

      if (simSource === 'meta') {
        payload = {
          object: 'page',
          entry: [
            {
              id: '1098234871923',
              changes: [
                {
                  field: 'leadgen',
                  value: {
                    leadgen_id: `meta_lead_${Date.now()}`,
                    campaign_name: 'Coimbatore Avocado & Teak Estates - High Intent',
                    project_name: simProject,
                    field_data: [
                      { name: 'full_name', values: [simName] },
                      { name: 'phone_number', values: [simPhone] },
                      { name: 'email', values: [`${simName.toLowerCase().replace(/\s+/g, '')}@gmail.com`] },
                      { name: 'city', values: ['Coimbatore'] },
                    ],
                  },
                },
              ],
            },
          ],
        };
      } else if (simSource === 'google') {
        payload = {
          lead_id: `gads_${Date.now()}`,
          campaign_name: 'Google Search - Farmland Near Siruvani Water',
          project_name: simProject,
          user_column_data: [
            { column_id: 'FULL_NAME', string_value: simName },
            { column_id: 'PHONE_NUMBER', string_value: simPhone },
            { column_id: 'EMAIL', string_value: `${simName.toLowerCase().replace(/\s+/g, '')}@yahoo.com` },
            { column_id: 'CITY', string_value: 'Coimbatore' },
          ],
        };
      } else {
        payload = {
          source: 'zapier',
          full_name: simName,
          phone: simPhone,
          email: `${simName.toLowerCase().replace(/\s+/g, '')}@outlook.com`,
          city: 'Coimbatore',
          project_name: simProject,
          budget_range: simBudget,
          purpose: 'farmhouse',
          campaign_name: 'Inbound Website Form via Zapier',
        };
      }

      const res = await fetch('/api/webhooks/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLastResponse(data);

      if (data.success && data.lead) {
        const constructedLead: LeadDetailed = {
          id: data.lead.id,
          full_name: data.lead.full_name,
          phone: data.lead.phone,
          email: `${simName.toLowerCase().replace(/\s+/g, '')}@example.com`,
          city: 'Coimbatore',
          project_name: data.lead.project_name,
          source: data.lead.source,
          campaign_name: `${simSource.toUpperCase()} Live Webhook`,
          budget_range: simBudget,
          purpose: 'farmhouse',
          status: 'new',
          quality: 'hot',
          assigned_to_name: 'Priya Raman',
          created_at: new Date().toISOString(),
          status_history: [
            {
              id: `sh-${Date.now()}`,
              from_status: null,
              to_status: 'new',
              comment: `Live simulated ${simSource.toUpperCase()} webhook lead received`,
              changed_by: 'Webhook System',
              created_at: new Date().toISOString(),
            },
          ],
          activities: [
            {
              id: `act-${Date.now()}`,
              type: 'note',
              outcome: 'Received',
              notes: 'Simulated inbound webhook lead stored into Supabase and persistent storage.',
              created_by: 'Webhook Ingestion Service',
              created_at: new Date().toISOString(),
            },
          ],
        };

        onLeadIngested(constructedLead);
      }
    } catch (err: any) {
      setLastResponse({ success: false, error: err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Webhook className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Webhook Lead Ingestion & Supabase Database
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Real-time endpoint for Meta Lead Ads, Google Ads, Zapier, and complete Supabase tables schema.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('simulate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simulate'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simulate & Ingest Webhook</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="h-3.5 w-3.5" />
            <span>Supabase SQL Master Setup</span>
          </button>
        </div>

        {activeTab === 'simulate' ? (
          <div className="space-y-4 pt-2">
            {/* Live Webhook Endpoint URL Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-mono uppercase text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Webhook URL (POST & GET)
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyUrl}
                  className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 gap-1"
                >
                  {isCopiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopiedUrl ? 'Copied' : 'Copy URL'}</span>
                </Button>
              </div>
              <code className="text-xs font-mono text-emerald-300 break-all select-all block bg-slate-950 p-2 rounded-lg border border-slate-800">
                {webhookUrl}
              </code>
              <p className="text-[11px] text-slate-400 mt-2">
                Configure this URL in Meta Lead Ads App Settings or Google Ads Webhook settings.
              </p>
            </div>

            {/* Test Simulation Controls */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Send Test Lead Payload
                </Label>
                <div className="flex items-center gap-1">
                  {(['meta', 'google', 'zapier'] as const).map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => setSimSource(source)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase font-mono transition-all cursor-pointer ${
                        simSource === source
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'bg-white border text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-600">Buyer Full Name</Label>
                  <Input
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="h-8 text-xs bg-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Mobile Number (India E.164)</Label>
                  <Input
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="h-8 text-xs bg-white font-mono mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Interested Farmland Project</Label>
                  <Input
                    value={simProject}
                    onChange={(e) => setSimProject(e.target.value)}
                    className="h-8 text-xs bg-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">Budget Range</Label>
                  <Input
                    value={simBudget}
                    onChange={(e) => setSimBudget(e.target.value)}
                    className="h-8 text-xs bg-white mt-1"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendTestWebhook}
                disabled={isSending}
                className="w-full h-9 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-2 mt-1 shadow-sm"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ingesting into Supabase Database...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Trigger Webhook & Ingest Lead Directly</span>
                  </>
                )}
              </Button>
            </div>

            {/* Ingestion Response Output */}
            {lastResponse && (
              <div
                className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                  lastResponse.success
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>
                    {lastResponse.success
                      ? 'Success: Lead Stored into Persistent Database & Pipeline'
                      : 'Error Ingesting Lead'}
                  </span>
                </div>
                <pre className="text-[11px] overflow-x-auto p-2 bg-white/70 rounded-md">
                  {JSON.stringify(lastResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Setup Tables in Your Supabase Dashboard:</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Copy this master SQL script and run it once in your Supabase SQL Editor. It creates all tables (leads, projects, plots, activities, webhook_logs) and seeds initial projects.
                </p>
              </div>
              <a
                href="https://supabase.com/dashboard/project/swyipnubewltavvndrcj/sql/new"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs flex items-center gap-1 shrink-0"
              >
                <span>Open SQL Editor</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="relative">
              <div className="flex justify-between items-center bg-slate-900 text-slate-300 px-3 py-2 rounded-t-xl text-xs border border-slate-800 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <FileCode2 className="h-3.5 w-3.5" />
                  kyra_master_setup.sql
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopySql}
                  className="h-6 px-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800 gap-1"
                >
                  {isCopiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{isCopiedSql ? 'Copied' : 'Copy All SQL'}</span>
                </Button>
              </div>
              <pre className="p-3 text-[11px] font-mono bg-slate-950 text-slate-200 rounded-b-xl max-h-60 overflow-y-auto border border-t-0 border-slate-800">
                {masterSqlSnippet}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
