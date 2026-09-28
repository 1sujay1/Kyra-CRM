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
  statusValues: LeadStatusType[];
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  borderColor: string;
  glowColor: string;
}

const STAGES: StageConfig[] = [
  {
    key: 'new',
    statusValues: ['new'],
    label: '1. New Inbound',
    sublabel: 'Meta, Google & Webhooks',
    icon: Sparkles,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    borderColor: 'border-blue-200 hover:border-blue-400',
    glowColor: 'group-hover:shadow-blue-100',
  },
  {
    key: 'contacted',
    statusValues: ['contacted'],
    label: '2. Contacted',
    sublabel: 'First Call / WhatsApp',
    icon: PhoneCall,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    borderColor: 'border-purple-200 hover:border-purple-400',
    glowColor: 'group-hover:shadow-purple-100',
  },
  {
    key: 'qualified',
    statusValues: ['qualified'],
    label: '3. Qualified',
    sublabel: 'Budget & Farmland fit',
    icon: CheckCircle,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderColor: 'border-indigo-200 hover:border-indigo-400',
    glowColor: 'group-hover:shadow-indigo-100',
  },
  {
    key: 'site_visit',
    statusValues: ['site_visit_scheduled', 'site_visit_completed'],
    label: '4. Site Visit',
    sublabel: 'Estate Tour / Inspection',
    icon: CalendarCheck,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    borderColor: 'border-amber-200 hover:border-amber-400',
    glowColor: 'group-hover:shadow-amber-100',
  },
  {
    key: 'negotiation',
    statusValues: ['negotiation'],
    label: '5. Negotiation',
    sublabel: 'Plot block & token advance',
    icon: BadgeDollarSign,
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
    borderColor: 'border-orange-200 hover:border-orange-400',
    glowColor: 'group-hover:shadow-orange-100',
  },
  {
    key: 'booked',
    statusValues: ['booked'],
    label: '6. Booked / Sold',
    sublabel: 'Sale Agreement / Registry',
    icon: Trophy,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderColor: 'border-emerald-200 hover:border-emerald-400',
    glowColor: 'group-hover:shadow-emerald-100',
  },
];

export function LeadPipelineDiagram({
  leads,
  selectedStatus,
  onSelectStatus,
}: LeadPipelineDiagramProps) {
  const totalLeads = leads.length;

  const stageCounts = STAGES.map((stage) => {
    const count = leads.filter((l) => stage.statusValues.includes(l.status as any)).length;
    const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
    return { ...stage, count, percentage };
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl border border-slate-700/60 transition-all duration-300">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

      {/* Diagram Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-700/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <span>Interactive Pipeline Conversion Diagram</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                LIVE FUNNEL
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Click any pipeline stage below to filter active leads instantly. Visualizes end-to-end customer progression.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {selectedStatus !== 'all' && (
            <button
              onClick={() => onSelectStatus('all')}
              className="text-xs text-slate-300 hover:text-white underline underline-offset-4 transition-colors font-medium cursor-pointer"
            >
              Reset Filter (Show All)
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-mono">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>{totalLeads} Total Pipeline Leads</span>
          </div>
        </div>
      </div>

      {/* Interactive Stages Flow Diagram */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
        {stageCounts.map((stage, idx) => {
          const isSelected = selectedStatus === stage.key;
          const Icon = stage.icon;

          return (
            <div key={stage.key} className="relative flex flex-col">
              <button
                type="button"
                onClick={() => onSelectStatus(isSelected ? 'all' : stage.key)}
                className={`group relative flex flex-col justify-between p-3.5 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-400 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-400/40 translate-y-[-2px]'
                    : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/70 hover:border-slate-500 hover:-translate-y-1 hover:shadow-md'
                }`}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className={`p-1.5 rounded-lg bg-slate-700/60 ${stage.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-700/80 text-slate-300">
                    {stage.percentage}%
                  </span>
                </div>

                {/* Counter & Label */}
                <div>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                    {stage.count}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {stage.sublabel}
                  </div>
                </div>

                {/* Bottom Active Indicator Bar */}
                <div className="w-full bg-slate-700/60 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                        : 'bg-gradient-to-r from-slate-500 to-slate-400 group-hover:from-emerald-500 group-hover:to-teal-400'
                    }`}
                    style={{ width: `${Math.max(8, stage.percentage)}%` }}
                  />
                </div>
              </button>

              {/* Connecting Arrow for larger screens */}
              {idx < STAGES.length - 1 && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
