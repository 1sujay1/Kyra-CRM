'use client';

import React, { useState } from 'react';
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
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Trees,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  FileText,
  Car,
  User,
  Save,
  Tag,
  History,
  Sparkles,
  Volume2,
  Loader2,
} from 'lucide-react';
import { LeadStatusType } from './status-change-modal';
import { createSiteVisitAction } from '@/lib/site-visits/actions';
import { initiateClickToCallAction } from '@/lib/leads/actions';

export interface StatusHistoryItem {
  id: string;
  from_status: LeadStatusType | null;
  to_status: LeadStatusType;
  comment: string;
  changed_by: string;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  type: 'call' | 'whatsapp' | 'meeting' | 'note' | 'site_visit';
  outcome?: string;
  notes: string;
  recording_url?: string;
  duration_seconds?: number;
  transcript?: string;
  summary?: string;
  direction?: 'inbound' | 'outbound';
  call_uuid?: string;
  created_by: string;
  created_at: string;
}

export interface LeadDetailed {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  region?: string;
  country?: string;
  location?: string;
  ip?: string;
  source: string;
  campaign_name?: string;
  project_name: string;
  budget_range: string;
  purpose: 'investment' | 'farmhouse' | 'agriculture';
  status: LeadStatusType;
  quality: 'hot' | 'warm' | 'cold';
  assigned_to_name: string;
  created_at: string;
  scheduled_visit_date?: string | null;
  status_history: StatusHistoryItem[];
  activities: ActivityItem[];
}

interface Lead360DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDetailed | null;
  onUpdateLead: (updatedLead: LeadDetailed) => void;
  onOpenStatusModal: () => void;
}

export function Lead360Drawer({
  open,
  onOpenChange,
  lead,
  onUpdateLead,
  onOpenStatusModal,
}: Lead360DrawerProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'edit' | 'add_activity' | 'schedule_visit'>('timeline');

  // Edit form state
  const [formData, setFormData] = useState({
    full_name: lead?.full_name || '',
    phone: lead?.phone || '',
    email: lead?.email || '',
    city: lead?.city || '',
    project_name: lead?.project_name || '',
    budget_range: lead?.budget_range || '',
    purpose: lead?.purpose || 'farmhouse',
    quality: lead?.quality || 'warm',
    assigned_to_name: lead?.assigned_to_name || '',
  });

  // New activity state
  const [newActivity, setNewActivity] = useState({
    type: 'call' as 'call' | 'whatsapp' | 'meeting' | 'note',
    outcome: 'Connected - Positive Interest',
    notes: '',
  });

  // Site visit state
  const [newVisit, setNewVisit] = useState({
    date: '2026-09-30T10:30',
    pickup_required: true,
    pickup_location: 'Coimbatore International Airport (CJB)',
    notes: '',
  });

  // Click-to-Call state
  const [isCalling, setIsCalling] = useState(false);
  const [callAlert, setCallAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleInitiateCall = async () => {
    if (!lead) return;
    setIsCalling(true);
    setCallAlert({
      type: 'success',
      message: `Dialing your phone first (+91 90085 39579)... Please pick up to connect to ${lead.full_name}.`,
    });

    try {
      const res = await initiateClickToCallAction({
        leadId: lead.id,
        leadName: lead.full_name,
        leadPhone: lead.phone,
      });

      if (res.success) {
        setCallAlert({
          type: 'success',
          message: `📞 Call connected to ${res.agentPhone || 'your phone'}! Pick up your phone to bridge with ${lead.full_name} (${lead.phone}). Call will be recorded & transcribed.`,
        });
      } else {
        setCallAlert({
          type: 'error',
          message: `⚠️ Call failed: ${res.error || 'Could not place call'}`,
        });
      }
    } catch (err: any) {
      setCallAlert({
        type: 'error',
        message: `⚠️ Call error: ${err?.message || 'Failed to place call'}`,
      });
    } finally {
      setIsCalling(false);
    }
  };

  // Sync formData when lead changes
  React.useEffect(() => {
    if (lead) {
      setFormData({
        full_name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        project_name: lead.project_name,
        budget_range: lead.budget_range,
        purpose: lead.purpose,
        quality: lead.quality,
        assigned_to_name: lead.assigned_to_name,
      });
    }
  }, [lead]);

  if (!lead) return null;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LeadDetailed = {
      ...lead,
      ...formData,
    };
    onUpdateLead(updated);
    setActiveTab('timeline');
  };

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.notes.trim()) return;

    const activity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: newActivity.type,
      outcome: newActivity.outcome,
      notes: newActivity.notes.trim(),
      created_by: 'Current Agent',
      created_at: new Date().toISOString(),
    };

    const updated: LeadDetailed = {
      ...lead,
      activities: [activity, ...lead.activities],
    };

    onUpdateLead(updated);
    setNewActivity({ type: 'call', outcome: 'Connected', notes: '' });
    setActiveTab('timeline');
  };

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    try {
      await createSiteVisitAction({
        lead_id: lead.id,
        visitor_name: lead.full_name,
        visitor_phone: lead.phone,
        visitor_email: lead.email,
        project_name: lead.project_name,
        scheduled_at: newVisit.date,
        pickup_required: newVisit.pickup_required,
        pickup_location: newVisit.pickup_required ? newVisit.pickup_location : null,
        notes: newVisit.notes,
      });
    } catch (err) {
      console.warn('Could not schedule visit action:', err);
    }

    const visitActivity: ActivityItem = {
      id: `visit-${Date.now()}`,
      type: 'site_visit',
      outcome: `Scheduled for ${new Date(newVisit.date).toLocaleString('en-IN')}`,
      notes: `Farmland Tour at ${lead.project_name}. ${newVisit.pickup_required ? `Pickup: ${newVisit.pickup_location}. ` : ''}${newVisit.notes}`,
      created_by: 'Current Agent',
      created_at: new Date().toISOString(),
    };

    const statusHistoryEntry: StatusHistoryItem = {
      id: `hist-${Date.now()}`,
      from_status: lead.status,
      to_status: 'site_visit_scheduled',
      comment: `Site visit scheduled for ${new Date(newVisit.date).toLocaleString('en-IN')}. Pickup: ${newVisit.pickup_location}`,
      changed_by: 'Current Agent',
      created_at: new Date().toISOString(),
    };

    const updated: LeadDetailed = {
      ...lead,
      status: 'site_visit_scheduled',
      activities: [visitActivity, ...lead.activities],
      status_history: [statusHistoryEntry, ...lead.status_history],
    };

    onUpdateLead(updated);
    setActiveTab('timeline');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-white p-0 rounded-2xl shadow-2xl border-slate-200">
        {/* Top Header Card */}
        <div className="bg-emerald-900 text-white p-6 rounded-t-2xl relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">{lead.full_name}</h3>
                <Badge
                  variant={lead.quality === 'hot' ? 'destructive' : 'warning'}
                  className="uppercase text-[10px] font-bold tracking-wide"
                >
                  {lead.quality}
                </Badge>
              </div>
              <p className="text-xs text-emerald-200 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-mono">{lead.phone}</span>
                {lead.email && (
                  <>
                    <span>•</span>
                    <span>{lead.email}</span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span>{lead.location || `${lead.city}${lead.region ? `, ${lead.region}` : ''}`}</span>
                </span>
                {lead.ip && (
                  <>
                    <span>•</span>
                    <span className="font-mono bg-emerald-800/80 px-2 py-0.5 rounded text-[11px] text-emerald-100 border border-emerald-700">
                      IP: {lead.ip}
                    </span>
                  </>
                )}
              </p>

              {lead.scheduled_visit_date && (
                <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-medium shadow-sm">
                  <Calendar className="h-3.5 w-3.5 text-amber-300" />
                  <span>Scheduled Site Visit: <strong className="text-amber-100">{new Date(lead.scheduled_visit_date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInitiateCall}
                disabled={isCalling}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-900 transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                title="Place bridged call to lead via Vobiz Bangalore landline (+918064264233)"
              >
                {isCalling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
                ) : (
                  <PhoneCall className="h-3.5 w-3.5 text-slate-900" />
                )}
                <span>{isCalling ? 'Dialing...' : 'Call Now'}</span>
              </button>

              <button
                onClick={onOpenStatusModal}
                className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-xs font-semibold text-emerald-100 border border-emerald-600 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Status:</span>
                <span className="uppercase text-[11px] underline tracking-wider font-bold">
                  {lead.status.replace(/_/g, ' ')}
                </span>
              </button>
            </div>
          </div>

          {/* Click-to-call notification banner */}
          {callAlert && (
            <div
              className={`mt-3 p-3 rounded-xl text-xs flex items-center justify-between border ${
                callAlert.type === 'error'
                  ? 'bg-rose-950/80 border-rose-500/80 text-rose-200'
                  : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm shrink-0">{callAlert.type === 'error' ? '⚠️' : '📞'}</span>
                <span className="leading-snug">{callAlert.message}</span>
              </div>
              <button
                onClick={() => setCallAlert(null)}
                className="text-xs opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-white/10 shrink-0 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick Badges Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-emerald-800/80 text-xs">
            <div>
              <span className="text-emerald-300 text-[10px] block">Project</span>
              <span className="font-semibold">{lead.project_name}</span>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Location / IP</span>
              <span className="font-semibold block truncate" title={lead.location || lead.city}>{lead.location || lead.city}</span>
              {lead.ip && <span className="font-mono text-[10px] text-emerald-200 block">({lead.ip})</span>}
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Purpose</span>
              <span className="font-semibold capitalize">{lead.purpose}</span>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Budget</span>
              <span className="font-semibold">{lead.budget_range}</span>
            </div>
            <div>
              <span className="text-emerald-300 text-[10px] block">Assigned Executive</span>
              <span className="font-semibold">{lead.assigned_to_name}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b px-6 bg-slate-50 gap-2">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Timeline & Status History ({lead.status_history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Edit Lead Details</span>
          </button>
          <button
            onClick={() => setActiveTab('add_activity')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'add_activity'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>+ Log Activity</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule_visit')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'schedule_visit'
                ? 'border-emerald-700 text-emerald-800'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Schedule Site Visit</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* 1. TIMELINE & COMMENTS */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Status History with Comments */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Pipeline Status Progression & Comments</span>
                </h4>
                {lead.status_history.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No status changes recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {lead.status_history.map((hist) => (
                      <div
                        key={hist.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {hist.from_status && (
                              <>
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] uppercase">
                                  {hist.from_status.replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-400">→</span>
                              </>
                            )}
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono text-[10px] uppercase">
                              {hist.to_status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(hist.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-800 font-medium mt-1 bg-white p-2 rounded-lg border border-slate-100">
                          &quot;{hist.comment}&quot;
                        </p>
                        <span className="text-[10px] text-muted-foreground text-right mt-0.5">
                          Logged by: {hist.changed_by}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CRM Activities Timeline */}
              <div className="pt-4 border-t">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-blue-700" />
                  <span>Interaction Activities ({lead.activities.length})</span>
                </h4>
                {lead.activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No activities logged yet.</p>
                ) : (
                  <div className="space-y-3">
                    {lead.activities.map((act) => (
                      <div
                        key={act.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col gap-1.5 text-xs shadow-sm hover:border-slate-300 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`capitalize text-[10px] ${
                              act.type === 'call' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' : ''
                            }`}>
                              {act.direction ? `${act.direction} call` : act.type.replace('_', ' ')}
                            </Badge>
                            {act.outcome && (
                              <span className="font-semibold text-slate-800">{act.outcome}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(act.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* Audio Player for Call Recordings */}
                        {act.recording_url && (
                          <div className="mt-2 p-3 rounded-xl bg-slate-900 text-white shadow-sm border border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Call Recording ({act.direction === 'outbound' ? 'Outbound' : 'Inbound'})</span>
                                </span>
                              </div>
                              {act.duration_seconds ? (
                                <span className="text-[10px] font-mono bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-700">
                                  {Math.floor(act.duration_seconds / 60)}m {act.duration_seconds % 60}s
                                </span>
                              ) : null}
                            </div>
                            <audio
                              controls
                              preload="metadata"
                              src={act.recording_url}
                              className="w-full h-8 rounded accent-emerald-500"
                            />
                          </div>
                        )}

                        {/* AI Call Summary Card */}
                        {act.summary && (
                          <div className="mt-2 p-3 rounded-xl bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-blue-50/80 border border-indigo-200/90 text-xs shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
                              <span>AI Call Summary & Action Items</span>
                            </div>
                            <div className="text-indigo-950 whitespace-pre-line text-[11px] leading-relaxed">
                              {act.summary}
                            </div>
                          </div>
                        )}

                        {/* Collapsible Full Transcript */}
                        {act.transcript && (
                          <details className="mt-1 text-xs group">
                            <summary className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer select-none py-1 flex items-center gap-1.5">
                              <FileText className="h-3 w-3 text-slate-400" />
                              <span>View Full Speech-to-Text Transcript</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({act.transcript.split(/\s+/).length} words)
                              </span>
                            </summary>
                            <div className="mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                              {act.transcript}
                            </div>
                          </details>
                        )}

                        {/* Notes if not already displayed as summary */}
                        {(!act.summary || !act.notes.includes(act.summary)) && (
                          <p className="text-slate-700 mt-1">{act.notes}</p>
                        )}

                        <span className="text-[10px] text-muted-foreground text-right mt-0.5">
                          Logged by: {act.created_by}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. EDIT LEAD DETAILS */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveDetails} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone (E.164)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Project Name</Label>
                  <select
                    value={formData.project_name}
                    onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                    className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
                  >
                    <option value="Anaikatti Green Acres">Anaikatti Green Acres</option>
                    <option value="Pollachi Coconut Groves">Pollachi Coconut Groves</option>
                    <option value="Siruvani Valley Estates">Siruvani Valley Estates</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Buyer Purpose</Label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value as any })}
                    className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
                  >
                    <option value="farmhouse">Farmhouse Retreat</option>
                    <option value="agriculture">Commercial Agriculture / Coconut</option>
                    <option value="investment">Long-term Capital Investment</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Budget Range</Label>
                  <Input
                    value={formData.budget_range}
                    onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Quality</Label>
                  <select
                    value={formData.quality}
                    onChange={(e) => setFormData({ ...formData, quality: e.target.value as any })}
                    className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
                  >
                    <option value="hot">Hot (Ready to purchase within 30 days)</option>
                    <option value="warm">Warm (Exploring multiple plots)</option>
                    <option value="cold">Cold (Casual enquiry)</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Assigned Sales Executive</Label>
                  <Input
                    value={formData.assigned_to_name}
                    onChange={(e) => setFormData({ ...formData, assigned_to_name: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('timeline')}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Lead Updates</span>
                </Button>
              </div>
            </form>
          )}

          {/* 3. LOG NEW ACTIVITY */}
          {activeTab === 'add_activity' && (
            <form onSubmit={handleAddActivity} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Activity Channel</Label>
                <div className="flex gap-2">
                  {(['call', 'whatsapp', 'meeting', 'note'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={newActivity.type === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setNewActivity({ ...newActivity, type })}
                      className="text-xs capitalize h-8"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Outcome / Headline</Label>
                <Input
                  value={newActivity.outcome}
                  onChange={(e) => setNewActivity({ ...newActivity, outcome: e.target.value })}
                  placeholder="e.g. Discussed water availability & drip system"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Detailed Discussion Notes</Label>
                <textarea
                  rows={4}
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                  placeholder="Document key points of conversation, customer requirements, plot preferences..."
                  className="w-full text-xs p-3 rounded-lg border border-input bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('timeline')}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
                >
                  Save Activity Log
                </Button>
              </div>
            </form>
          )}

          {/* 4. SCHEDULE SITE VISIT */}
          {activeTab === 'schedule_visit' && (
            <form onSubmit={handleScheduleVisit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Visit Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={newVisit.date}
                    onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Farmland Project Location</Label>
                  <Input
                    value={lead.project_name}
                    disabled
                    className="text-xs bg-slate-50 text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pickup"
                    checked={newVisit.pickup_required}
                    onChange={(e) => setNewVisit({ ...newVisit, pickup_required: e.target.checked })}
                    className="rounded text-emerald-700 focus:ring-emerald-600 h-4 w-4"
                  />
                  <Label htmlFor="pickup" className="text-xs font-semibold cursor-pointer">
                    Arrange Coimbatore Transportation / Pickup
                  </Label>
                </div>

                {newVisit.pickup_required && (
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs">Pickup Location</Label>
                    <select
                      value={newVisit.pickup_location}
                      onChange={(e) => setNewVisit({ ...newVisit, pickup_location: e.target.value })}
                      className="w-full text-xs h-9 rounded-md border border-input bg-white px-3"
                    >
                      <option value="Coimbatore International Airport (CJB)">Coimbatore International Airport (CJB)</option>
                      <option value="Coimbatore Junction Railway Station (CBE)">Coimbatore Junction Railway Station (CBE)</option>
                      <option value="Gandhipuram Central Bus Stand">Gandhipuram Central Bus Stand</option>
                      <option value="Buyer Residence / Hotel Pickup">Buyer Residence / Hotel Pickup (Coimbatore City)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Special Instructions / Plot Numbers</Label>
                <Input
                  value={newVisit.notes}
                  onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
                  placeholder="e.g. Buyer wants to see east-facing plots near perimeter fence"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('timeline')}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium gap-1.5"
                >
                  <Car className="h-3.5 w-3.5" />
                  <span>Confirm Site Visit</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
