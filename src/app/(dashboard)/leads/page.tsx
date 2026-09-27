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
  Clock,
  Sparkles,
  PhoneCall,
  Edit,
  Trash2,
  Shield,
  Loader2,
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

  // Load from Supabase on mount
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
        console.error('Failed to load leads from Supabase', err);
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

  // Status Change Handler with Supabase Persistence
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

    // 2. Persist to Supabase
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

  // New Lead Created Handler with Supabase Persistence
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

    const confirmDelete = window.confirm('Are you sure you want to delete this lead? This action is logged.');
    if (!confirmDelete) return;

    // Remove from UI
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    if (selectedLeadFor360?.id === leadId) {
      setDrawerOpen(false);
    }

    // Persist soft-delete to Supabase
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

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource =
      selectedSource === 'all' || lead.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Farmland Leads Pipeline
            </h2>
            <Badge
              variant={userRole === 'admin' ? 'default' : 'secondary'}
              className="text-[10px] uppercase font-mono tracking-wider ml-2"
            >
              {userRole === 'admin' ? 'Admin (Full Access + Delete)' : 'Digital Marketing (Modify Only)'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Supabase Postgres connected: Real-time Meta Lead Ads, Google Ads, and walk-in enquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-xs hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setNewLeadModalOpen(true)}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>+ New Lead</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Active Leads
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{leads.length}</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">
              {leads.filter((l) => l.quality === 'hot').length} Hot Leads requiring follow-up
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Meta Lead Ads
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              v21.0 Webhook
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.source === 'meta').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Anaikatti & Siruvani campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Google Ads Leads
            </CardTitle>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
              Search Lead Forms
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.source === 'google').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pollachi & Coimbatore keywords</p>
          </CardContent>
        </Card>

        <Card className="border-purple-100 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Site Visits Booked
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {leads.filter((l) => l.status === 'site_visit_scheduled').length}
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1">Pickup from Gandhipuram / Airport</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by buyer name, phone, project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mr-1">
                <Filter className="h-3.5 w-3.5" /> Source:
              </span>
              {(['all', 'meta', 'google', 'walk_in'] as const).map((source) => (
                <Button
                  key={source}
                  variant={selectedSource === source ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(source)}
                  className="text-xs h-8 capitalize"
                >
                  {source === 'all' ? 'All Sources' : source}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card className="shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
            <span>Connecting to Supabase Database...</span>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-xs">Buyer</TableHead>
                <TableHead className="font-semibold text-xs">Phone (Masked)</TableHead>
                <TableHead className="font-semibold text-xs">Farmland Project</TableHead>
                <TableHead className="font-semibold text-xs">Source / Campaign</TableHead>
                <TableHead className="font-semibold text-xs">Purpose & Budget</TableHead>
                <TableHead className="font-semibold text-xs">Quality</TableHead>
                <TableHead className="font-semibold text-xs">
                  Status <span className="text-[10px] font-normal text-muted-foreground">(Click to Change)</span>
                </TableHead>
                <TableHead className="font-semibold text-xs">Assigned To</TableHead>
                <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const isRevealed = revealedPhones[lead.id];
                return (
                  <TableRow
                    key={lead.id}
                    onClick={() => handleOpen360(lead)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    {/* Buyer details without DPDP text */}
                    <TableCell>
                      <div>
                        <div className="font-semibold text-sm text-foreground hover:text-emerald-700 transition-colors">
                          {lead.full_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {lead.city} • {lead.email}
                        </div>
                      </div>
                    </TableCell>

                    {/* Masked Phone with reveal trigger */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 font-medium">
                          {isRevealed ? lead.phone : maskPhone(lead.phone)}
                        </span>
                        {!isRevealed && (
                          <button
                            onClick={(e) => handleRevealPhone(e, lead.id)}
                            title="Click to reveal phone number (logged in audit trail)"
                            className="p-1 rounded text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium text-xs text-foreground">{lead.project_name}</span>
                    </TableCell>

                    <TableCell>
                      <div>
                        <Badge
                          variant={
                            lead.source === 'meta'
                              ? 'info'
                              : lead.source === 'google'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-[10px] capitalize font-medium"
                        >
                          {lead.source}
                        </Badge>
                        {lead.campaign_name && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[130px] mt-0.5" title={lead.campaign_name}>
                            {lead.campaign_name}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <span className="capitalize font-medium text-foreground">{lead.purpose}</span>
                        <p className="text-[11px] text-muted-foreground">{lead.budget_range}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          lead.quality === 'hot'
                            ? 'destructive'
                            : lead.quality === 'warm'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] uppercase font-bold"
                      >
                        {lead.quality}
                      </Badge>
                    </TableCell>

                    {/* Interactive Status Pill - Click to Change Status with Comment! */}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleOpenStatusModal(e, lead)}
                        title="Click to change status and log comment to database"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer shadow-sm hover:scale-[1.03] ${
                          statusBadgeStyles[lead.status] || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span>{lead.status.replace(/_/g, ' ')}</span>
                        <Edit className="h-2.5 w-2.5 opacity-60" />
                      </button>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-slate-700 font-medium">{lead.assigned_to_name}</span>
                    </TableCell>

                    {/* Actions: Lead 360 + Admin-Only Delete */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpen360(lead)}
                          className="h-7 text-xs px-2.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                        >
                          Lead 360
                        </Button>

                        {/* ONLY Admin has Delete Permission */}
                        {userRole === 'admin' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleDeleteLead(e, lead.id)}
                            title="Delete Lead (Admin Only)"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 1. Status Change Modal with Mandatory Comment */}
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

      {/* 2. Detailed Lead 360 Drawer */}
      <Lead360Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        lead={selectedLeadFor360}
        onUpdateLead={handleUpdateLead}
        onOpenStatusModal={() => {
          if (selectedLeadFor360) {
            setTargetLeadForStatus(selectedLeadFor360);
            setStatusModalOpen(true);
          }
        }}
      />

      {/* 3. New Lead Modal */}
      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
        onLeadCreated={handleLeadCreated}
      />
    </div>
  );
}
