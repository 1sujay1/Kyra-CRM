'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Download,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  MessageCircle,
  Megaphone,
  Layers,
  ExternalLink,
  ArrowLeft,
  Maximize2,
  Copy,
  Check,
  Info,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { maskPhone } from '@/lib/security/phone';
import { StatusChangeModal, LeadStatusType } from '@/components/leads/status-change-modal';
import { Lead360Drawer, LeadDetailed, StatusHistoryItem } from '@/components/leads/lead-360-drawer';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { ScheduleVisitModal } from '@/components/site-visits/schedule-visit-modal';
import { DeleteLeadModal } from '@/components/leads/delete-lead-modal';
import {
  fetchLeadsAction,
  updateLeadStatusAction,
  deleteLeadAction,
} from '@/lib/leads/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';

const statusBadgeStyles: Record<LeadStatusType, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  contacted: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  site_visit_scheduled: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold',
  site_visit_completed: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100',
  negotiation: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
  booked: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold',
  lost: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  duplicate_number: 'bg-amber-100 text-amber-900 border-amber-400 font-bold',
  number_not_valid: 'bg-red-100 text-red-900 border-red-400 font-bold',
  junk: 'bg-slate-100 text-slate-700 border-slate-300',
};

const statusLabels: Record<LeadStatusType, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit_scheduled: 'Site Visit Scheduled',
  site_visit_completed: 'Site Visit Completed',
  negotiation: 'In Negotiation',
  booked: 'Booked / Closed',
  lost: 'Lost / Closed',
  duplicate_number: 'Duplicate Number',
  number_not_valid: 'Number Not Valid',
  junk: 'Junk / Spam',
};

// Active Meta Campaigns for Kyra Group
const ACTIVE_KYRA_CAMPAIGNS = [
  { name: 'Leads Campaign Pollachi', subtitle: 'Pollachi Region Lead Ads', color: 'from-amber-500 to-orange-600' },
  { name: 'Leads Campaign Tiruppur', subtitle: 'Tiruppur Region Lead Ads', color: 'from-purple-500 to-indigo-600' },
  { name: 'Leads Campaign CBE-2', subtitle: 'Coimbatore Phase 2 Lead Ads', color: 'from-emerald-500 to-teal-600' },
  { name: 'Leads Campaign Coimbatore', subtitle: 'Coimbatore Metro Lead Ads', color: 'from-pink-500 to-rose-600' },
];

/**
 * Reusable Tooltip + Text Truncation Component
 * Shows custom hover tooltip when text is hovered, with option to open enlarge modal
 */
function TruncatedTextWithTooltip({
  text,
  maxLength = 24,
  className = '',
  onEnlarge,
  showEnlargeIcon = true,
}: {
  text: string;
  maxLength?: number;
  className?: string;
  onEnlarge?: (text: string) => void;
  showEnlargeIcon?: boolean;
}) {
  const isLong = text && text.length > maxLength;
  const displayText = isLong ? `${text.slice(0, maxLength)}...` : text;

  return (
    <div className="group/tooltip relative inline-flex items-center gap-1.5 max-w-full">
      <span
        title={text}
        className={`truncate ${className}`}
      >
        {displayText}
      </span>

      {/* Floating Hover Tooltip */}
      {isLong && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 opacity-0 transition-all duration-200 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 translate-y-1">
          <div className="relative max-w-xs sm:max-w-sm rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 shadow-xl border border-slate-800 break-words text-center">
            {text}
            <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-slate-900" />
          </div>
        </div>
      )}

      {/* Optional Enlarge Icon Button */}
      {showEnlargeIcon && onEnlarge && isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEnlarge(text);
          }}
          className="opacity-0 group-hover/tooltip:opacity-100 p-0.5 rounded text-sky-600 hover:bg-sky-100 transition-all shrink-0"
          title="Enlarge text in modal"
        >
          <Maximize2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function MetaLeadsPage() {
  const [leads, setLeads] = useState<LeadDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('');

  // Enlarge Text / Campaign Modal State
  const [enlargeModalOpen, setEnlargeModalOpen] = useState(false);
  const [enlargedData, setEnlargedData] = useState<{
    title: string;
    subtitle?: string;
    type: 'campaign' | 'text';
    details?: Record<string, string | number>;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Modals & Drawers State
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<LeadDetailed | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetLeadForStatus, setTargetLeadForStatus] = useState<LeadDetailed | null>(null);
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetLeadForDelete, setTargetLeadForDelete] = useState<LeadDetailed | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'digital_marketing'>('admin');
  const [currentUsername, setCurrentUsername] = useState('Adminkyra');

  // Fetch current logged in user & role
  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUserAction();
      if (user) {
        setUserRole(user.role as 'admin' | 'digital_marketing');
        setCurrentUsername(user.username);
      }
    }
    loadUser();
  }, []);

  // Fetch all Meta leads from MongoDB
  const loadData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const dbLeads = await fetchLeadsAction();
      setLeads(dbLeads || []);
      setLastSyncedTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load Meta leads:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Polling Heartbeat
  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter only Meta leads
  const allMetaLeads = useMemo(() => {
    return leads.filter(
      (l) =>
        l.source === 'meta' ||
        l.campaign_name?.toLowerCase().includes('meta') ||
        l.campaign_name?.toLowerCase().includes('facebook') ||
        l.campaign_name?.toLowerCase().includes('instagram') ||
        l.campaign_name?.toLowerCase().includes('lead')
    );
  }, [leads]);

  /**
   * Dynamically Extract Campaign Names for Kyra Group Active Campaigns & Live Webhooks
   */
  const dynamicCampaigns = useMemo(() => {
    const metaLeads = allMetaLeads;

    // Extract unique campaign names from API leads in DB
    const apiCampaignNames = Array.from(
      new Set(metaLeads.map((l) => (l.campaign_name || '').trim()).filter(Boolean))
    );

    const campaignMap = new Map<
      string,
      { id: string; name: string; subtitle: string; color: string; badge: string; count: number }
    >();

    const colors = [
      'from-amber-500 to-orange-600',
      'from-purple-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-pink-500 to-rose-600',
      'from-blue-500 to-cyan-600',
      'from-violet-500 to-purple-600',
    ];

    // 1. Add active Kyra Group campaigns
    ACTIVE_KYRA_CAMPAIGNS.forEach((base) => {
      const key = base.name.toLowerCase();
      const idKey = key.replace(/[^a-z0-9]/g, '_');
      const searchKey = base.name.toLowerCase().replace('leads campaign ', '');

      const count = metaLeads.filter(
        (l) =>
          (l.campaign_name || '').toLowerCase().includes(searchKey) ||
          (l.project_name || '').toLowerCase().includes(searchKey) ||
          (l.campaign_name || '').toLowerCase().includes(key)
      ).length;

      campaignMap.set(key, {
        id: idKey,
        name: base.name,
        subtitle: base.subtitle,
        color: base.color,
        badge: 'Active Campaign',
        count,
      });
    });

    // 2. Add any additional unique campaign names ingested via API webhooks
    apiCampaignNames.forEach((name, idx) => {
      const lower = name.toLowerCase();
      const existingKey = Array.from(campaignMap.keys()).find(
        (k) => k === lower || lower.includes(k) || k.includes(lower)
      );

      if (!existingKey) {
        const idKey = lower.replace(/[^a-z0-9]/g, '_');
        const count = metaLeads.filter(
          (l) => (l.campaign_name || '').trim().toLowerCase() === lower
        ).length;

        campaignMap.set(lower, {
          id: idKey,
          name: name,
          subtitle: `Meta API Live Campaign`,
          color: colors[idx % colors.length],
          badge: 'Live Meta API',
          count,
        });
      }
    });

    const campaignList = Array.from(campaignMap.values());

    return [
      {
        id: 'all',
        name: 'All Meta Campaigns',
        subtitle: 'Combined Meta API Lead Ads & Forms',
        color: 'from-sky-500 to-blue-600',
        badge: 'All Ad Sets',
        count: metaLeads.length,
      },
      ...campaignList,
    ];
  }, [allMetaLeads]);

  // Interactive filtering by active campaign card
  const filteredMetaLeads = useMemo(() => {
    return allMetaLeads.filter((lead) => {
      const matchesSearch =
        lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        (lead.campaign_name && lead.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.project_name && lead.project_name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCampaign === 'all') return true;

      const targetCamp = dynamicCampaigns.find((c) => c.id === selectedCampaign);
      if (!targetCamp) return true;

      const campNameLower = targetCamp.name.toLowerCase();
      const leadCampLower = (lead.campaign_name || '').toLowerCase();
      const leadProjLower = (lead.project_name || '').toLowerCase();
      const coreKeyword = campNameLower.replace('leads campaign ', '');

      return (
        leadCampLower.includes(campNameLower) ||
        leadCampLower.includes(coreKeyword) ||
        leadProjLower.includes(coreKeyword)
      );
    });
  }, [allMetaLeads, searchTerm, selectedCampaign, dynamicCampaigns]);

  const handleToggleRevealPhone = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleWhatsAppClick = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    const cleanDigits = phone.replace(/\D/g, '');
    const waNumber = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    window.open(
      `https://wa.me/${waNumber}?text=${encodeURIComponent('Hello from Kyra Group Farmlands. Regarding your Meta enquiry:')}`,
      '_blank'
    );
  };

  const handleOpenStatusModal = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    setTargetLeadForStatus(lead);
    setStatusModalOpen(true);
  };

  const handleOpenDeleteModal = (e: React.MouseEvent, lead: LeadDetailed) => {
    e.stopPropagation();
    if (userRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin has permission to delete leads.');
      return;
    }
    setTargetLeadForDelete(lead);
    setDeleteModalOpen(true);
  };

  const handleOpen360Drawer = (lead: LeadDetailed) => {
    setSelectedLeadFor360(lead);
    setDrawerOpen(true);
  };

  // Open Enlarged Modal for long text or campaign details
  const handleOpenEnlargeModal = (
    title: string,
    subtitle?: string,
    details?: Record<string, string | number>,
    type: 'campaign' | 'text' = 'campaign'
  ) => {
    setEnlargedData({ title, subtitle, details, type });
    setEnlargeModalOpen(true);
    setCopied(false);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusChanged = async (leadId: string, newStatus: LeadStatusType, comment: string) => {
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

    await updateLeadStatusAction(leadId, newStatus, comment);
  };

  const handleUpdateLead = (updatedLead: LeadDetailed) => {
    setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
    setSelectedLeadFor360(updatedLead);
  };

  const handleConfirmDelete = async () => {
    if (!targetLeadForDelete) return;
    await deleteLeadAction(targetLeadForDelete.id);
    setLeads((prev) => prev.filter((l) => l.id !== targetLeadForDelete.id));
    setDeleteModalOpen(false);
    setTargetLeadForDelete(null);
  };

  const handleExportCSV = () => {
    if (!filteredMetaLeads || filteredMetaLeads.length === 0) {
      alert('No Meta leads available to export.');
      return;
    }
    const headers = [
      'Lead ID',
      'Full Name',
      'Phone',
      'Email',
      'City',
      'Campaign Name',
      'Project Name',
      'Budget Range',
      'Status',
      'Quality',
      'Created At',
    ];
    const csvRows = [headers.join(',')];
    filteredMetaLeads.forEach((l) => {
      const row = [
        `"${l.id}"`,
        `"${l.full_name.replace(/"/g, '""')}"`,
        `"${l.phone}"`,
        `"${l.email || ''}"`,
        `"${l.city || 'Coimbatore'}"`,
        `"${(l.campaign_name || 'Meta Ad Set').replace(/"/g, '""')}"`,
        `"${l.project_name.replace(/"/g, '""')}"`,
        `"${l.budget_range || ''}"`,
        `"${l.status}"`,
        `"${l.quality}"`,
        `"${l.created_at}"`,
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kyra_meta_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Back Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/leads" className="hover:text-emerald-700 flex items-center gap-1 font-medium">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to All Leads</span>
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Meta Lead Ads</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-sky-600" />
              <span>Meta Ads & Campaigns Dashboard</span>
            </h2>
            <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 font-mono text-[10px]">
              Meta API Active
            </Badge>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Meta API Sync: {lastSyncedTime}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live campaign analytics & lead ingestion for Facebook & Instagram Lead Ads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="gap-1.5 text-xs hover:bg-slate-100 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : 'text-slate-600'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Meta Server'}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs hover:bg-slate-100 shadow-xs cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            <span>Export Meta CSV</span>
          </Button>
        </div>
      </div>

      {/* INTEGRATION STATUS BANNER */}
      <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Megaphone className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-white">Live Meta Lead Ads Integration</p>
            <p className="font-medium text-[11px] text-sky-300 mt-0.5">Automated real-time lead synchronization for Facebook & Instagram Lead Forms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-950/40 font-mono text-[10px]">
            Status: Live Handshake Verified
          </Badge>
        </div>
      </div>

      {/* DYNAMIC API CAMPAIGNS SUMMARY CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-sky-600" />
            <span>Active Meta Campaigns ({dynamicCampaigns.length - 1} Running via API)</span>
          </h3>
          <span className="text-xs text-slate-500">Hover for full text tooltip • Click card or 🔍 to enlarge</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {dynamicCampaigns.map((camp) => {
            const isSelected = selectedCampaign === camp.id;

            return (
              <div
                key={camp.id}
                onClick={() => setSelectedCampaign(camp.id)}
                className={`group/card relative text-left rounded-2xl bg-white p-4 border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md bg-sky-50/20'
                    : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${camp.color}`} />
                
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold truncate max-w-[120px]" title={camp.badge}>
                      {camp.badge}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Enlarge Campaign Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEnlargeModal(camp.name, camp.subtitle, {
                            'Total Lead Count': camp.count,
                            'Campaign ID': camp.id,
                            'Badge Tag': camp.badge,
                            'Source': 'Meta Ads Manager API',
                          });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Enlarge campaign modal"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </button>

                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-sky-600 animate-ping" />
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    {/* Campaign Name with Tooltip & Truncation */}
                    <div className="font-bold text-slate-900 text-sm tracking-tight leading-snug">
                      <TruncatedTextWithTooltip
                        text={camp.name}
                        maxLength={22}
                        className="font-bold text-slate-900 text-sm"
                        onEnlarge={(t) => handleOpenEnlargeModal(t, camp.subtitle, { Leads: camp.count })}
                      />
                    </div>

                    {/* Subtitle with Tooltip */}
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate" title={camp.subtitle}>
                      {camp.subtitle}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <div className="text-xl font-extrabold font-mono text-slate-900">{camp.count}</div>
                  <span className="text-[11px] font-semibold text-sky-600">
                    {isSelected ? 'Filtered' : 'Filter →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <Card className="border border-slate-200/80 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Meta leads by Name, Phone, Campaign..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>Showing:</span>
            <Badge variant="secondary" className="bg-sky-100 text-sky-900 font-mono">
              {filteredMetaLeads.length} Meta Leads
            </Badge>
            {selectedCampaign !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCampaign('all')}
                className="text-[11px] text-sky-700 hover:text-sky-900 p-0 h-auto font-medium"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DETAILED META LEADS TABLE */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-sky-600" />
            <span>Inbound Meta Lead Ads Records</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">Source: Live Meta API Webhook</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-sky-600" />
            <p className="text-xs font-medium">Fetching Meta leads from database...</p>
          </div>
        ) : filteredMetaLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <Megaphone className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">No Meta Leads Found</h4>
            <p className="text-xs max-w-md mx-auto text-slate-500">
              {selectedCampaign !== 'all'
                ? `No Meta leads match the selected campaign filter.`
                : 'No Meta leads received yet. Incoming lead ads will appear here automatically via live webhook.'}
            </p>
            {selectedCampaign !== 'all' && (
              <Button size="sm" variant="outline" onClick={() => setSelectedCampaign('all')} className="text-xs mt-2">
                Show All Meta Leads
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100/70 text-slate-700 text-[11px] uppercase tracking-wider font-semibold">
                  <TableHead className="py-3">Customer Name</TableHead>
                  <TableHead className="py-3">Phone & Contact</TableHead>
                  <TableHead className="py-3">Campaign & Ad Set</TableHead>
                  <TableHead className="py-3">Target Project</TableHead>
                  <TableHead className="py-3">Quality</TableHead>
                  <TableHead className="py-3">Status</TableHead>
                  <TableHead className="py-3">Date</TableHead>
                  <TableHead className="py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-xs">
                {filteredMetaLeads.map((lead) => {
                  const isRevealed = Boolean(revealedPhones[lead.id]);
                  const displayPhone = isRevealed ? lead.phone : maskPhone(lead.phone);
                  const campaignNameText = lead.campaign_name || 'Meta Farmland Ad';

                  return (
                    <TableRow
                      key={lead.id}
                      onClick={() => handleOpen360Drawer(lead)}
                      className="hover:bg-sky-50/40 cursor-pointer transition-colors"
                    >
                      {/* Name & Email with Tooltip & Enlarge */}
                      <TableCell className="font-semibold text-slate-900 py-3.5 max-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs shrink-0 border border-sky-200">
                            {lead.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <TruncatedTextWithTooltip
                              text={lead.full_name}
                              maxLength={20}
                              className="font-bold text-slate-900 text-xs leading-tight"
                              onEnlarge={(t) =>
                                handleOpenEnlargeModal(t, lead.email || 'Meta Lead', {
                                  Phone: lead.phone,
                                  City: lead.city || 'Coimbatore',
                                  Project: lead.project_name,
                                  Status: lead.status,
                                }, 'text')
                              }
                            />
                            <p className="text-[11px] text-slate-500 truncate" title={lead.email || `${lead.full_name.toLowerCase().replace(/\s+/g, '')}@meta.com`}>
                              {lead.email || `${lead.full_name.toLowerCase().replace(/\s+/g, '')}@meta.com`}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone & Contact Actions */}
                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-900 font-semibold">{displayPhone}</span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleRevealPhone(e, lead.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title={isRevealed ? 'Hide Phone' : 'Reveal Phone'}
                          >
                            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-emerald-600" />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleWhatsAppClick(e, lead.phone)}
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>

                      {/* Campaign Name Badge with Tooltip & Enlarge Modal */}
                      <TableCell className="py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className="bg-sky-50 text-sky-800 border-sky-200 text-[10px] font-semibold max-w-full inline-flex items-center gap-1 py-1"
                          >
                            <TruncatedTextWithTooltip
                              text={campaignNameText}
                              maxLength={22}
                              className="font-semibold text-sky-800"
                              onEnlarge={(t) =>
                                handleOpenEnlargeModal(
                                  t,
                                  `Meta Ad Campaign Record for ${lead.full_name}`,
                                  {
                                    'Customer Name': lead.full_name,
                                    'Target Project': lead.project_name,
                                    'Source Platform': lead.source.toUpperCase(),
                                    'Lead Status': lead.status,
                                    'Date Received': lead.created_at,
                                  }
                                )
                              }
                            />
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Project Name with Tooltip */}
                      <TableCell className="py-3.5 font-medium text-slate-700 max-w-[180px]">
                        <TruncatedTextWithTooltip
                          text={lead.project_name}
                          maxLength={20}
                          className="font-medium text-slate-700"
                          onEnlarge={(t) => handleOpenEnlargeModal(t, 'Project Name Detail', {}, 'text')}
                        />
                      </TableCell>

                      {/* Quality Badge */}
                      <TableCell className="py-3.5">
                        <Badge
                          variant={lead.quality === 'hot' ? 'default' : 'secondary'}
                          className={`uppercase text-[9px] font-bold tracking-wider px-2 py-0.5 ${
                            lead.quality === 'hot'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : lead.quality === 'warm'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {lead.quality}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3.5">
                        <span
                          onClick={(e) => handleOpenStatusModal(e, lead)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border cursor-pointer transition-all hover:scale-105 ${
                            statusBadgeStyles[lead.status] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{statusLabels[lead.status] || lead.status}</span>
                          <Edit className="h-3 w-3 opacity-60 ml-0.5" />
                        </span>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="py-3.5 text-slate-500 text-[11px] font-mono">
                        {new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpen360Drawer(lead)}
                            className="h-7 px-2 text-xs text-sky-700 hover:bg-sky-50"
                          >
                            360° View
                          </Button>
                          {userRole === 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleOpenDeleteModal(e, lead)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
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
          </div>
        )}
      </Card>

      {/* ENLARGE CAMPAIGN & TEXT MODAL */}
      {enlargedData && (
        <Dialog open={enlargeModalOpen} onOpenChange={setEnlargeModalOpen}>
          <DialogContent className="max-w-md bg-white border-slate-200 p-6 rounded-2xl shadow-2xl">
            <DialogHeader className="text-left space-y-2 border-b pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-300 font-mono text-[10px]">
                  {enlargedData.type === 'campaign' ? 'Meta Campaign Details' : 'Enlarged Text Detail'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyText(enlargedData.title)}
                  className="h-7 px-2.5 text-xs text-slate-600 hover:bg-slate-100 gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>

              <DialogTitle className="text-xl font-black tracking-tight text-slate-900 leading-snug break-words">
                {enlargedData.title}
              </DialogTitle>

              {enlargedData.subtitle && (
                <DialogDescription className="text-xs text-slate-500 leading-relaxed font-medium">
                  {enlargedData.subtitle}
                </DialogDescription>
              )}
            </DialogHeader>

            {enlargedData.details && Object.keys(enlargedData.details).length > 0 && (
              <div className="py-4 space-y-2.5">
                <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400">Associated Metadata</p>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
                  {Object.entries(enlargedData.details).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500 font-medium">{key}:</span>
                      <span className="text-slate-900 font-bold text-right">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnlargeModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 360 DEGREE DRAWER */}
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

      {/* STATUS CHANGE MODAL */}
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

      {/* NEW LEAD MODAL */}
      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
        onLeadCreated={() => loadData(false)}
      />

      {/* SCHEDULE VISIT MODAL */}
      <ScheduleVisitModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onCreated={() => loadData(false)}
        leads={leads.map((l) => ({
          id: l.id,
          full_name: l.full_name,
          phone: l.phone,
          email: l.email,
          project_name: l.project_name,
        }))}
      />

      {/* DELETE MODAL */}
      {targetLeadForDelete && (
        <DeleteLeadModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          lead={targetLeadForDelete}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
}
