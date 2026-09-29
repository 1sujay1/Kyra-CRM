'use client';

import React from 'react';
import {
  Sparkles,
  PhoneCall,
  CheckCircle,
  CalendarCheck,
  BadgeDollarSign,
  Trophy,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight,
  Flame,
  Check,
} from 'lucide-react';
import { LeadDetailed } from '@/components/leads/lead-360-drawer';
import { LeadStatusType } from '@/components/leads/status-change-modal';

interface LeadPipelineDiagramProps {
  leads: LeadDetailed[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
}

interface StageConfig {
  key: string;
  stepNumber: number;
  statusValues: LeadStatusType[];
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  accentBg: string;
  activeBorder: string;
  gradient: string;
  glow: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'new',
    stepNumber: 1,
    statusValues: ['new'],
    label: 'New Inbound',
    sublabel: 'Meta & Search Ads',
    icon: Sparkles,
    color: 'text-sky-400',
    accentBg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    activeBorder: 'border-sky-400 shadow-sky-500/20 ring-sky-400/40',
    gradient: 'from-sky-500 to-blue-600',
    glow: 'rgba(56, 189, 248, 0.35)',
  },
  {
    key: 'contacted',
    stepNumber: 2,
    statusValues: ['contacted'],
    label: 'Contacted',
    sublabel: 'First Call / WhatsApp',
    icon: PhoneCall,
    color: 'text-purple-400',
    accentBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    activeBorder: 'border-purple-400 shadow-purple-500/20 ring-purple-400/40',
    gradient: 'from-purple-500 to-indigo-600',
    glow: 'rgba(168, 85, 247, 0.35)',
  },
  {
    key: 'qualified',
    stepNumber: 3,
    statusValues: ['qualified'],
    label: 'Qualified',
    sublabel: 'Budget & Farmland Fit',
    icon: CheckCircle,
    color: 'text-indigo-400',
    accentBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
    activeBorder: 'border-indigo-400 shadow-indigo-500/20 ring-indigo-400/40',
    gradient: 'from-indigo-500 to-violet-600',
    glow: 'rgba(99, 102, 241, 0.35)',
  },
  {
    key: 'site_visit',
    stepNumber: 4,
    statusValues: ['site_visit_scheduled', 'site_visit_completed'],
    label: 'Site Visit',
    sublabel: 'Estate Inspection Tour',
    icon: CalendarCheck,
    color: 'text-amber-400',
    accentBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    activeBorder: 'border-amber-400 shadow-amber-500/20 ring-amber-400/40',
    gradient: 'from-amber-400 to-orange-500',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  {
    key: 'negotiation',
    stepNumber: 5,
    statusValues: ['negotiation'],
    label: 'Negotiation',
    sublabel: 'Plot Block & Advance',
    icon: BadgeDollarSign,
    color: 'text-orange-400',
    accentBg: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
    activeBorder: 'border-orange-400 shadow-orange-500/20 ring-orange-400/40',
    gradient: 'from-orange-500 to-rose-600',
    glow: 'rgba(249, 115, 22, 0.35)',
  },
  {
    key: 'booked',
    stepNumber: 6,
    statusValues: ['booked'],
    label: 'Booked / Sold',
    sublabel: 'Registry & Ownership',
    icon: Trophy,
    color: 'text-emerald-400',
    accentBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    activeBorder: 'border-emerald-400 shadow-emerald-500/25 ring-emerald-400/40',
    gradient: 'from-emerald-400 to-teal-500',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
];

export function LeadPipelineDiagram({
  leads,
  selectedStatus,
  onSelectStatus,
}: LeadPipelineDiagramProps) {
  const totalLeads = leads.length;

  const stageData = STAGES.map((stage) => {
    const count = leads.filter((l) => stage.statusValues.includes(l.status as any)).length;
    const share = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    return { ...stage, count, share };
  });

  const siteVisitsCount = leads.filter(
    (l) => l.status === 'site_visit_scheduled' || l.status === 'site_visit_completed'
  ).length;

  const bookedCount = leads.filter((l) => l.status === 'booked').length;
  const visitToBookRatio = siteVisitsCount > 0 ? Math.round((bookedCount / siteVisitsCount) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 p-5 sm:p-6 text-white shadow-2xl border border-slate-800 transition-all duration-300">
      {/* Decorative Radial Background Accent */}
      <div className="absolute top-0 right-1/4 -mt-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 -mb-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>Interactive Pipeline Conversion Diagram</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold tracking-wide">
              LIVE FUNNEL
            </span>
            {selectedStatus !== 'all' && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Filtered: {STAGES.find((s) => s.key === selectedStatus)?.label || selectedStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Click any stage card below to filter prospective buyers instantly. Visualizes stage progression and deal velocity.
          </p>
        </div>

        {/* Funnel Metrics & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch lg:self-auto justify-between lg:justify-end">
          {selectedStatus !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectStatus('all')}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors font-medium cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>✕ Show All Leads</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-300 font-mono shadow-sm">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-semibold text-white">{totalLeads}</span>
              <span className="text-slate-400">Total Leads</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs text-slate-300 font-mono shadow-sm">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span className="font-semibold text-white">{visitToBookRatio}%</span>
              <span className="text-slate-400">Visit-to-Book</span>
            </div>
          </div>
        </div>
      </div>

      {/* Six Funnel Stage Cards */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5">
        {stageData.map((stage, idx) => {
          const isSelected = selectedStatus === stage.key;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="relative group flex flex-col">
              <button
                type="button"
                onClick={() => onSelectStatus(isSelected ? 'all' : stage.key)}
                className={`relative w-full flex flex-col justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected
                    ? `bg-slate-800/95 ${stage.activeBorder} shadow-xl ring-2 translate-y-[-2px]`
                    : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/70 hover:border-slate-500 hover:-translate-y-1 hover:shadow-lg'
                }`}
              >
                {/* Glow backdrop on select or hover */}
                {isSelected && (
                  <div
                    className="absolute -top-10 -right-10 h-24 w-24 rounded-full blur-2xl opacity-40 pointer-events-none"
                    style={{ backgroundColor: stage.glow }}
                  />
                )}

                {/* Top: Icon + Percentage Tag */}
                <div className="flex items-center justify-between gap-1 mb-2.5">
                  <div className={`p-2 rounded-lg border ${stage.accentBg} transition-transform duration-300 group-hover:scale-110 shadow-inner`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/70 text-slate-300">
                    <span>{stage.share}%</span>
                  </div>
                </div>

                {/* Middle: Count & Label */}
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                      {stage.count}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      leads
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1 flex items-center gap-1">
                    <span>{stage.stepNumber}. {stage.label}</span>
                  </div>

                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-normal">
                    {stage.sublabel}
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden mt-3 p-0.5 border border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${stage.gradient} ${
                      isSelected ? 'shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''
                    }`}
                    style={{ width: `${Math.max(6, stage.share)}%` }}
                  />
                </div>

                {/* Active Selection Checkmark Badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-sm animate-in zoom-in-75">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Step Flow Arrow to next stage (visible on large screen) */}
              {idx < stageData.length - 1 && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 group-hover:border-emerald-500/50 transition-colors">
                    <ChevronRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
