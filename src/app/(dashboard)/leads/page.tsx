'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Calendar,
  CalendarCheck,
  Clock,
  Sparkles,
  PhoneCall,
  Edit,
  Trash2,
  Shield,
  Loader2,
  ArrowUpRight,
  TrendingUp,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { maskPhone } from '@/lib/security/phone';
import { StatusChangeModal, LeadStatusType } from '@/components/leads/status-change-modal';
import { Lead360Drawer, LeadDetailed, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { LeadPipelineDiagram } from '@/components/leads/lead-pipeline-diagram';
import {
  fetchLeadsAction,
  updateLeadStatusAction,
  createLeadAction,
  deleteLeadAction,
} from '@/lib/leads/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';

const statusBadgeStyles: Record<LeadStatusType, string> = {
  new: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
  contacted: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
  qualified: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
  site_visit_scheduled: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  site_visit_completed: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
  negotiation: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
  booked: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
  lost: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
  junk: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});
  const [userRole, setUserRole] = useState<'admin' | 'digital_marketing'>('admin');
  const [currentUsername, setCurrentUsername] = useState<string>('Adminkyra');

  // Status Change Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetLeadForStatus, setTargetLeadForStatus] = useState<LeadDetailed | null>(null);

  // Lead 360 Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<LeadDetailed | null>(null);

  // New Lead Modal State
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  // Load leads on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
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
      } catch (err) {
        console.error('Failed to load leads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Reveal Phone
  const handleRevealPhone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({ ...prev, [id]: true }));
  };

  // Open Status Change Modal
  const handleOpenStatusModal = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    setTargetLeadForStatus(lead);
    setStatusModalOpen(true);
  };

  // Status Change Handler with Persistence
  const handleStatusChanged = async (leadId: string, newStatus: LeadStatusType, comment: string) => {
    // 1. Optimistic UI update
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

          if (selectedLeadFor360?.id === leadId) {
            setSelectedLeadFor360(updated);
          }

          return updated;
        }
        return lead;
      })
    );

    // 2. Persist update
    await updateLeadStatusAction(leadId, newStatus, comment);
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
    setLeads((prev) => [newLead, ...prev]);
    await createLeadAction(newLead);
  };

  // Delete Lead Handler (STRICTLY Admin Only)
  const handleDeleteLead = async (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();

    if (userRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin (Adminkyra) has permission to delete leads.');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to delete this lead? This action is permanently logged.');
    if (!confirmDelete) return;

    // Remove from UI
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (selectedLeadFor360?.id === leadId) {
      setDrawerOpen(false);
    }

    // Persist soft-delete
    const res = await deleteLeadAction(leadId);
    if (!res.success) {
      alert(res.error || 'Failed to delete lead.');
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

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Farmland Leads Pipeline</span>
            </h2>
            <Badge
              variant={userRole === 'admin' ? 'default' : 'secondary'}
              className="text-[10px] uppercase font-mono tracking-wider ml-1"
            >
              {userRole === 'admin' ? 'Admin Access' : 'Marketing Executive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time lead tracking across social media campaigns, search ads, and direct customer enquiries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-xs hover:bg-slate-100 shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setNewLeadModalOpen(true)}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Lead</span>
          </Button>
        </div>
      </div>

      {/* MODERN ANIMATED STATS BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Leads */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-emerald-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Active Leads
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
              {leads.length}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{leads.filter((l) => l.quality === 'hot').length} Hot priority buyers</span>
            </div>
          </div>
        </div>

        {/* Card 2: Meta Campaigns */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-blue-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Meta Campaigns
            </span>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-mono">
              Active Ads
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
              {leads.filter((l) => l.source === 'meta').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Anaikatti & Siruvani buyers</p>
          </div>
        </div>

        {/* Card 3: Google Search Ads */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-amber-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Google Search Ads
            </span>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 font-mono">
              High Intent
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-slate-900">
              {leads.filter((l) => l.source === 'google').length}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pollachi & Coimbatore search</p>
          </div>
        </div>

        {/* Card 4: Site Visits Booked */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-5 border border-purple-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Site Visits Booked
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700 group-hover:scale-110 transition-transform">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold font-mono tracking-tight text-purple-900">
              {leads.filter((l) => l.status === 'site_visit_scheduled' || l.status === 'site_visit_completed').length}
            </div>
            <div className="flex items-center justify-between text-xs text-purple-700 mt-1 font-medium">
              <span>Coimbatore Foothills & Pollachi</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* INTERACTIVE PIPELINE CONVERSION DIAGRAM */}
      <LeadPipelineDiagram
        leads={leads}
        selectedStatus={selectedStageFilter}
        onSelectStatus={setSelectedStageFilter}
      />

      {/* Filter and Search Bar */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search buyer name, phone, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mr-1">
                <Filter className="h-3.5 w-3.5" /> Source:
              </span>
              {[
                { id: 'all', label: 'All Sources' },
                { id: 'meta', label: 'Meta Ads' },
                { id: 'google', label: 'Google Search' },
                { id: 'online', label: 'Online Enquiries' },
                { id: 'direct', label: 'Direct / Walk-in' },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={selectedSource === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(item.id)}
                  className={`text-xs h-8 cursor-pointer ${
                    selectedSource === item.id ? 'bg-emerald-700 text-white' : ''
                  }`}
                >
                  {item.label}
                </Button>
              ))}

              {selectedStageFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-emerald-100 text-emerald-800 ml-2 cursor-pointer hover:bg-emerald-200"
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

      {/* Leads Table */}
      <Card className="shadow-xs border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-14 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
            <span className="font-medium text-slate-700">Loading prospective buyer enquiries...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow>
                  <TableHead className="font-semibold text-xs text-slate-700">Buyer</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Phone</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Farmland Project</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Source / Channel</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Purpose & Budget</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Quality</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">
                    Status <span className="text-[10px] font-normal text-muted-foreground">(Click to Change)</span>
                  </TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700">Executive</TableHead>
                  <TableHead className="font-semibold text-xs text-slate-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground text-xs">
                      <div className="flex flex-col items-center justify-center gap-2.5">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Users className="h-6 w-6" />
                        </div>
                        <p className="font-bold text-slate-800 text-sm">No Leads Found in this Pipeline Filter</p>
                        <p className="text-slate-500 max-w-sm text-xs">
                          Click &quot;+ New Lead&quot; to register your first farmland buyer enquiry or adjust your filter selection.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => setNewLeadModalOpen(true)}
                            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>+ New Lead</span>
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLeads.map((lead) => {
                    const isRevealed = revealedPhones[lead.id];
                    return (
                      <TableRow
                        key={lead.id}
                        onClick={() => handleOpen360(lead)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        {/* Buyer details */}
                        <TableCell>
                          <div>
                            <div className="font-semibold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {lead.full_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>{lead.city}</span>
                              {lead.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[120px]">{lead.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Phone with Unmask */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-800">
                              {isRevealed ? lead.phone : maskPhone(lead.phone)}
                            </span>
                            {!isRevealed && (
                              <button
                                onClick={(e) => handleRevealPhone(e, lead.id)}
                                className="text-muted-foreground hover:text-slate-900 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Click to view full phone"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </TableCell>

                        {/* Farmland Project */}
                        <TableCell>
                          <div className="font-medium text-xs text-slate-800">
                            {lead.project_name}
                          </div>
                        </TableCell>

                        {/* Source / Campaign */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono capitalize ${
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
                                ? 'Google Search'
                                : lead.source === 'webhook' || lead.source === 'website'
                                ? 'Online Campaign'
                                : 'Direct / Walk-in'}
                            </Badge>
                            {lead.campaign_name && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[110px]" title={lead.campaign_name}>
                                {lead.campaign_name}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Purpose & Budget */}
                        <TableCell>
                          <div>
                            <div className="font-mono text-xs font-semibold text-slate-900">
                              {lead.budget_range}
                            </div>
                            <div className="text-[10px] capitalize text-muted-foreground mt-0.5">
                              {lead.purpose}
                            </div>
                          </div>
                        </TableCell>

                        {/* Quality */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
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
                            {lead.quality}
                          </span>
                        </TableCell>

                        {/* Status (Clickable for Status Change) */}
                        <TableCell onClick={(e) => handleOpenStatusModal(e, lead)}>
                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium capitalize flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                              statusBadgeStyles[lead.status] || 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                            title="Click to advance status"
                          >
                            <span>{lead.status.replace(/_/g, ' ')}</span>
                            <Edit className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          </button>
                        </TableCell>

                        {/* Executive */}
                        <TableCell>
                          <span className="text-xs text-slate-700 font-medium">
                            {lead.assigned_to_name}
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpen360(lead)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700 cursor-pointer"
                              title="View Lead 360"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>

                            {userRole === 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteLead(e, lead.id)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete Lead (Admin Only)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
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
      </Card>

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
    </div>
  );
}
