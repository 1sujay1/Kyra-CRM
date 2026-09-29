'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  EyeOff,
  CalendarCheck,
  PhoneCall,
  Edit,
  Trash2,
  Loader2,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
  MapPin,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { maskPhone } from '@/lib/security/phone';
import { StatusChangeModal, LeadStatusType } from '@/components/leads/status-change-modal';
import { Lead360Drawer, LeadDetailed, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { ScheduleVisitModal } from '@/components/site-visits/schedule-visit-modal';
import { LeadPipelineDiagram } from '@/components/leads/lead-pipeline-diagram';
import { DeleteLeadModal } from '@/components/leads/delete-lead-modal';
import {
  fetchLeadsAction,
  updateLeadStatusAction,
  createLeadAction,
  deleteLeadAction,
} from '@/lib/leads/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { createClient } from '@/lib/supabase/client';

const statusBadgeStyles: Record<LeadStatusType, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200/80 hover:bg-sky-100/80',
  contacted: 'bg-purple-50 text-purple-700 border-purple-200/80 hover:bg-purple-100/80',
  qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100/80',
  site_visit_scheduled: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold',
  site_visit_completed: 'bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100/80',
  negotiation: 'bg-orange-50 text-orange-800 border-orange-200/80 hover:bg-orange-100/80',
  booked: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold',
  lost: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
  junk: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
  number_not_valid: 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 font-bold',
  duplicate_number: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200 font-bold',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'digital_marketing'>('digital_marketing');
  const [currentUsername, setCurrentUsername] = useState<string>('Adminkyra');

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetLeadForStatus, setTargetLeadForStatus] = useState<LeadDetailed | null>(null);

  // Delete Lead Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetLeadForDelete, setTargetLeadForDelete] = useState<LeadDetailed | null>(null);

  // Schedule Visit Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleVisitLead, setScheduleVisitLead] = useState<{
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    project_name: string;
  } | null>(null);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);

  // Lead 360 Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<LeadDetailed | null>(null);

  // New Lead Modal State
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  // Load leads from server & database
  const loadData = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const [fetchedLeads, user] = await Promise.all([
        fetchLeadsAction(),
        getCurrentUserAction(),
      ]);
      setLeads(fetchedLeads);
      if (user) {
        setUserRole(user.role);
        setCurrentUsername(user.username);
      }
      setLastSyncedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load + Realtime Supabase Database Sync & Polling Fallback
  useEffect(() => {
    loadData(true);

    // Setup Supabase Realtime Listener on leads table
    const supabase = createClient();
    const channel = supabase
      .channel('leads-realtime-crm')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('[Supabase Realtime] Leads table update detected:', payload.eventType);
          loadData(false);
        }
      )
      .subscribe();

    // Secondary Polling Heartbeat every 12 seconds so webhook leads appear automatically
    const interval = setInterval(() => {
      loadData(false);
    }, 12000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadData]);

  // Reveal or Hide Phone
  const handleToggleRevealPhone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copy Phone Number
  const handleCopyPhone = (e: React.MouseEvent, leadId: string, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(leadId);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  // WhatsApp quick trigger
  const handleWhatsAppClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const cleanDigits = phone.replace(/\D/g, '');
    const waNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent('Hello from Kyra Group Farmlands. Regarding your enquiry:')}`, '_blank');
  };

  // Open Status Change Modal
  const handleOpenStatusModal = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    setTargetLeadForStatus(lead);
    setStatusModalOpen(true);
  };

  // Open Delete Modal (Admin Only)
  const handleOpenDeleteModal = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    if (userRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin (Adminkyra) has permission to delete leads.');
      return;
    }
    setTargetLeadForDelete(lead);
    setDeleteModalOpen(true);
  };

  // Status Change Handler with Persistence
  const handleStatusChanged = async (leadId: string, newStatus: LeadStatusType, comment: string) => {
    let targetUpdatedLead: LeadDetailed | null = null;
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id === leadId) {
          const newHistoryItem: StatusHistoryItem = {
            id: `sh-${Date.now()}`,
            from_status: lead.status,
            to_status: newStatus,
            comment: comment,
            changed_by: currentUsername,
            created_at: new Date().toISOString(),
          };

          const updated: LeadDetailed = {
            ...lead,
            status: newStatus,
            status_history: [newHistoryItem, ...lead.status_history],
          };

          targetUpdatedLead = updated;

          if (selectedLeadFor360?.id === leadId) {
            setSelectedLeadFor360(updated);
          }

          return updated;
        }
        return lead;
      })
    );

    // Persist to Supabase Database
    await updateLeadStatusAction(leadId, newStatus, comment);

    // AUTOMATIC SCHEDULE SITE VISIT POPUP:
    if (newStatus === 'site_visit_scheduled') {
      const selected = targetUpdatedLead || leads.find((l) => l.id === leadId);
      if (selected) {
        setScheduleVisitLead({
          id: selected.id,
          full_name: selected.full_name,
          phone: selected.phone,
          email: selected.email,
          project_name: selected.project_name,
        });
        setScheduleModalOpen(true);
      }
    }
  };

  // Called when site visit is submitted
  const handleSiteVisitCreated = (newVisit: any) => {
    setScheduleSuccessMsg(
      `Site visit scheduled for ${newVisit.visitor_name} at ${newVisit.project_name} on ${new Date(newVisit.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}! Automatically synced across database.`
    );
    setTimeout(() => setScheduleSuccessMsg(null), 9000);
  };

  // Direct schedule visit trigger
  const handleDirectScheduleVisit = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    setScheduleVisitLead({
      id: lead.id,
      full_name: lead.full_name,
      phone: lead.phone,
      email: lead.email,
      project_name: lead.project_name,
    });
    setScheduleModalOpen(true);
  };

  // Lead 360 Update Handler
  const handleUpdateLead = (updatedLead: LeadDetailed) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
    );
    setSelectedLeadFor360(updatedLead);
  };

  // Open 360 Drawer
  const handleOpen360 = (lead: LeadDetailed) => {
    setSelectedLeadFor360(lead);
    setDrawerOpen(true);
  };

  // New Lead Created Handler
  const handleLeadCreated = async (newLead: LeadDetailed) => {
    // Add to UI immediately
    setLeads((prev) => [newLead, ...prev]);
    // Persist to Supabase and server
    await createLeadAction(newLead);
    loadData(false);
  };

  // Delete Lead from Server and Database
  const handleConfirmDelete = async (leadId: string) => {
    // 1. Remove from UI immediately
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (selectedLeadFor360?.id === leadId) {
      setDrawerOpen(false);
    }

    // 2. Perform complete deletion on Supabase and server
    const res = await deleteLeadAction(leadId);
    if (!res.success) {
      alert(res.error || 'Failed to delete lead from server.');
      loadData(false);
    } else {
      setScheduleSuccessMsg('Lead permanently removed from server and database.');
      setTimeout(() => setScheduleSuccessMsg(null), 5000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Buyer Name',
      'Phone',
      'Email',
      'City',
      'Farmland Project',
      'Source',
      'Campaign',
      'Purpose',
      'Budget',
      'Quality',
      'Status',
      'Assigned Executive',
      'Created At',
    ];

    const rows = leads.map((l) => [
      `"${l.full_name}"`,
      `"${l.phone}"`,
      `"${l.email}"`,
      `"${l.city}"`,
      `"${l.project_name}"`,
      `"${l.source}"`,
      `"${l.campaign_name || ''}"`,
      `"${l.purpose}"`,
      `"${l.budget_range}"`,
      `"${l.quality}"`,
      `"${l.status}"`,
      `"${l.assigned_to_name}"`,
      `"${l.created_at}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kyra_farmland_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Source filters
  const sourceMatches = (leadSource: string, filter: string) => {
    if (filter === 'all') return true;
    if (filter === 'meta') return leadSource === 'meta';
    if (filter === 'google') return leadSource === 'google';
    if (filter === 'online') return leadSource === 'webhook' || leadSource === 'website' || leadSource === 'zapier';
    if (filter === 'direct') return leadSource === 'manual' || leadSource === 'walk_in' || leadSource === 'referral';
    return leadSource === filter;
  };

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.project_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceMatches(lead.source, selectedSource);

    const matchesStage =
      selectedStageFilter === 'all' ||
      (selectedStageFilter === 'site_visit'
        ? lead.status === 'site_visit_scheduled' || lead.status === 'site_visit_completed'
        : lead.status === selectedStageFilter);

    return matchesSearch && matchesSource && matchesStage;
  });

  // Initials generator
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Schedule / Action Feedback Alert */}
      {scheduleSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="font-semibold">{scheduleSuccessMsg}</span>
          </div>
          <button
            onClick={() => setScheduleSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span>Farmland Leads Pipeline</span>
            </h2>
            <Badge
              variant={userRole === 'admin' ? 'default' : 'secondary'}
              className="text-[10px] uppercase font-mono tracking-wider bg-slate-900 text-white"
            >
              {userRole === 'admin' ? 'Admin Access' : 'Marketing Executive'}
            </Badge>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live DB Sync: {lastSyncedTime}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time lead tracking across social media campaigns, Google search ads, webhooks, and direct enquiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="gap-1.5 text-xs hover:bg-slate-100 shadow-xs cursor-pointer"
            title="Refresh and sync data from Supabase database"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync with Server'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs hover:bg-slate-100 shadow-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setNewLeadModalOpen(true)}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-md shadow-emerald-700/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Farmland Lead</span>
          </Button>
        </div>
      </div>

      {/* MODERN STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Leads */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Active Leads
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {leads.length}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{leads.filter((l) => l.quality === 'hot').length} Hot High-Intent Buyers</span>
            </div>
          </div>
        </div>

        {/* Card 2: Meta Campaigns */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meta Lead Ads
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold border border-sky-200">
              Live Webhook
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {leads.filter((l) => l.source === 'meta').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Anaikatti & Siruvani Ad Sets</p>
          </div>
        </div>

        {/* Card 3: Google Ads / Webhooks */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Google & Webhooks
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200">
              High Intent
            </span>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {leads.filter((l) => l.source === 'google' || l.source === 'webhook' || l.source === 'website').length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Direct Search & Website Enquiries</p>
          </div>
        </div>

        {/* Card 4: Site Visits */}
        <Link
          href="/site-visits"
          className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 block cursor-pointer"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site Tours Booked
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition-transform">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-purple-950">
              {leads.filter((l) => l.status === 'site_visit_scheduled' || l.status === 'site_visit_completed').length}
            </div>
            <div className="flex items-center justify-between text-[11px] text-purple-700 mt-1 font-medium">
              <span>View Site Visits Schedule</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* ENHANCED INTERACTIVE PIPELINE CONVERSION DIAGRAM */}
      <LeadPipelineDiagram
        leads={leads}
        selectedStatus={selectedStageFilter}
        onSelectStatus={setSelectedStageFilter}
      />

      {/* Search and Source Filter Navigation */}
      <Card className="shadow-xs border-slate-200/80 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search buyer name, phone, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" /> Source:
              </span>
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'meta', label: 'Meta Ads' },
                { id: 'google', label: 'Google Search' },
                { id: 'online', label: 'Online / Webhooks' },
                { id: 'direct', label: 'Direct / Walk-In' },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={selectedSource === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(item.id)}
                  className={`text-xs h-8 rounded-lg cursor-pointer transition-all ${
                    selectedSource === item.id
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Button>
              ))}

              {selectedStageFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-emerald-100 text-emerald-800 ml-1.5 cursor-pointer hover:bg-emerald-200 rounded-lg py-1 px-2.5"
                  onClick={() => setSelectedStageFilter('all')}
                  title="Click to clear stage filter"
                >
                  Stage: {selectedStageFilter} ✕
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODERN STYLISH ANIMATED LEADS TABLE */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            <span className="font-semibold text-slate-700 text-sm">Loading prospective farmland enquiries...</span>
            <span className="text-[11px] text-slate-400">Syncing with Supabase PostgreSQL</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5 pl-5">Buyer</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Contact</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Farmland Project</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Source / Channel</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Budget & Fit</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Quality</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">
                    Status <span className="text-[10px] font-normal text-slate-400">(Click to Advance)</span>
                  </TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Executive</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5 text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100">
                          <Users className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">No Leads Match this Filter</p>
                          <p className="text-slate-500 text-xs mt-1">
                            Adjust your search or filter selection, or create a new farmland buyer enquiry.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setNewLeadModalOpen(true)}
                          className="mt-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-2 rounded-xl shadow-md shadow-emerald-700/20 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Add Farmland Lead</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead, index) => {
                    const isRevealed = revealedPhones[lead.id];
                    const isCopied = copiedPhoneId === lead.id;

                    // Project color accent
                    const isAnaikatti = lead.project_name.toLowerCase().includes('anaikatti');
                    const isPollachi = lead.project_name.toLowerCase().includes('pollachi');
                    const isSiruvani = lead.project_name.toLowerCase().includes('siruvani');

                    return (
                      <TableRow
                        key={lead.id}
                        onClick={() => handleOpen360(lead)}
                        className="group hover:bg-slate-50/80 transition-all duration-200 cursor-pointer border-b border-slate-100"
                        style={{
                          animationDelay: `${Math.min(index * 40, 400)}ms`,
                        }}
                      >
                        {/* 1. Buyer Name & Location */}
                        <TableCell className="py-3 pl-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                              {getInitials(lead.full_name)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                {lead.full_name}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                  <span>{lead.city}</span>
                                </span>
                                {lead.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[130px] flex items-center gap-0.5" title={lead.email}>
                                      <Mail className="h-2.5 w-2.5 text-slate-400" />
                                      {lead.email}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Phone + Actions (WhatsApp & Copy) */}
                        <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded-md">
                              {isRevealed ? lead.phone : maskPhone(lead.phone)}
                            </span>

                            {/* Eye reveal toggle */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleRevealPhone(e, lead.id)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                              title={isRevealed ? 'Mask phone number' : 'Reveal full phone number'}
                            >
                              {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyPhone(e, lead.id, lead.phone)}
                              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Copy phone to clipboard"
                            >
                              {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>

                            {/* WhatsApp button */}
                            <button
                              type="button"
                              onClick={(e) => handleWhatsAppClick(e, lead.phone)}
                              className="text-emerald-600 hover:text-emerald-700 p-1 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5 fill-emerald-100 text-emerald-600" />
                            </button>
                          </div>
                        </TableCell>

                        {/* 3. Farmland Project */}
                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                              isAnaikatti
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                : isPollachi
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : isSiruvani
                                ? 'bg-sky-50 text-sky-800 border-sky-200/80'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{lead.project_name}</span>
                          </span>
                        </TableCell>

                        {/* 4. Source / Channel */}
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono capitalize w-fit px-2 py-0.5 rounded-md ${
                                lead.source === 'meta'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : lead.source === 'google'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : lead.source === 'webhook' || lead.source === 'website'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {lead.source === 'meta'
                                ? 'Meta Ads'
                                : lead.source === 'google'
                                ? 'Google Ads'
                                : lead.source === 'webhook' || lead.source === 'website'
                                ? 'Online Webhook'
                                : 'Direct / Walk-In'}
                            </Badge>
                            {lead.campaign_name && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[120px]" title={lead.campaign_name}>
                                {lead.campaign_name}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Purpose & Budget */}
                        <TableCell className="py-3">
                          <div>
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {lead.budget_range}
                            </div>
                            <div className="text-[10px] capitalize text-slate-500 font-medium mt-0.5">
                              {lead.purpose}
                            </div>
                          </div>
                        </TableCell>

                        {/* 6. Quality */}
                        <TableCell className="py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              lead.quality === 'hot'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : lead.quality === 'warm'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                lead.quality === 'hot'
                                  ? 'bg-rose-500 animate-ping'
                                  : lead.quality === 'warm'
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                            <span>{lead.quality}</span>
                          </span>
                        </TableCell>

                        {/* 7. Status (Interactive Status Changer) */}
                        <TableCell className="py-3" onClick={(e) => handleOpenStatusModal(e, lead)}>
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                              statusBadgeStyles[lead.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            title="Click to update lead status"
                          >
                            {lead.status === 'number_not_valid' ? (
                              <span className="flex items-center gap-1 text-rose-700 font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                                <span>Invalid Phone</span>
                              </span>
                            ) : lead.status === 'duplicate_number' ? (
                              <span className="flex items-center gap-1 text-purple-700 font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                                <span>Duplicate</span>
                              </span>
                            ) : (
                              <span>{lead.status.replace(/_/g, ' ')}</span>
                            )}
                            <Edit className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          </button>
                        </TableCell>

                        {/* 8. Executive */}
                        <TableCell className="py-3">
                          <span className="text-xs text-slate-700 font-medium">
                            {lead.assigned_to_name}
                          </span>
                        </TableCell>

                        {/* 9. Actions */}
                        <TableCell className="py-3 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Schedule Visit */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDirectScheduleVisit(e, lead)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg cursor-pointer transition-colors"
                              title="Schedule Farmland Site Visit"
                            >
                              <CalendarCheck className="h-4 w-4" />
                            </Button>

                            {/* Open 360 */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpen360(lead)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                              title="Open Lead 360 View"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>

                            {/* Delete (Admin Only) */}
                            {userRole === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleOpenDeleteModal(e, lead)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                title="Delete Lead from CRM & Database (Admin Only)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modals & Drawers */}
      {selectedLeadFor360 && (
        <Lead360Drawer
          lead={selectedLeadFor360}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onUpdateLead={handleUpdateLead}
          onOpenStatusModal={() => {
            setTargetLeadForStatus(selectedLeadFor360);
            setStatusModalOpen(true);
          }}
        />
      )}

      {targetLeadForStatus && (
        <StatusChangeModal
          open={statusModalOpen}
          onOpenChange={setStatusModalOpen}
          leadId={targetLeadForStatus.id}
          leadName={targetLeadForStatus.full_name}
          currentStatus={targetLeadForStatus.status}
          onStatusChanged={handleStatusChanged}
        />
      )}

      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
        onLeadCreated={handleLeadCreated}
      />

      {/* Modern Animated Delete Confirmation Modal */}
      <DeleteLeadModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        lead={targetLeadForDelete}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* Schedule Farmland Site Visit Modal */}
      <ScheduleVisitModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onCreated={handleSiteVisitCreated}
        leads={leads.map((l) => ({
          id: l.id,
          full_name: l.full_name,
          phone: l.phone,
          email: l.email,
          project_name: l.project_name,
        }))}
        preselectedLead={scheduleVisitLead}
      />
    </div>
  );
}
