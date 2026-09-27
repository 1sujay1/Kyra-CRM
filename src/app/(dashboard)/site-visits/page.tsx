'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  MapPin,
  Plus,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageSquareQuote,
  Sparkles,
  Search,
  Filter,
  Users,
  Compass,
  Building,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScheduleVisitModal } from '@/components/site-visits/schedule-visit-modal';
import { ManageVisitModal } from '@/components/site-visits/manage-visit-modal';
import { fetchSiteVisitsAction, SiteVisitItem } from '@/lib/site-visits/actions';
import { fetchLeadsAction } from '@/lib/leads/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';

export default function SiteVisitsPage() {
  const [siteVisits, setSiteVisits] = useState<SiteVisitItem[]>([]);
  const [leadsList, setLeadsList] = useState<Array<{ id: string; full_name: string; phone: string; email?: string | null; project_name: string }>>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [selectedVisitForManage, setSelectedVisitForManage] = useState<SiteVisitItem | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Load live data from Supabase / Actions
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [visits, leads, user] = await Promise.all([
        fetchSiteVisitsAction(),
        fetchLeadsAction(),
        getCurrentUserAction(),
      ]);

      setSiteVisits(visits || []);
      setLeadsList(
        (leads || []).map((l) => ({
          id: l.id,
          full_name: l.full_name,
          phone: l.phone,
          email: l.email,
          project_name: l.project_name,
        }))
      );
      if (user?.role) {
        setCurrentUserRole(user.role);
      }
    } catch (err) {
      console.error('Failed to load site visits data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreated = (newVisit: SiteVisitItem) => {
    setSiteVisits((prev) => [newVisit, ...prev]);
  };

  const handleUpdated = (updatedVisit: SiteVisitItem) => {
    setSiteVisits((prev) =>
      prev.map((v) => (v.id === updatedVisit.id ? updatedVisit : v))
    );
  };

  const handleDeleted = (deletedId: string) => {
    setSiteVisits((prev) => prev.filter((v) => v.id !== deletedId));
  };

  // Metrics Calculations for Site Visit Reports
  const totalVisits = siteVisits.length;
  const scheduledCount = siteVisits.filter((v) => v.status === 'scheduled' || v.status === 'rescheduled').length;
  const completedCount = siteVisits.filter((v) => v.status === 'completed').length;
  const hotInterestedCount = siteVisits.filter((v) => v.interest_level === 'hot' || v.interest_level === 'booked').length;
  const airportPickupsCount = siteVisits.filter((v) => v.pickup_required).length;

  // Filtered visits
  const filteredVisits = siteVisits.filter((v) => {
    const matchesSearch =
      v.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visitor_phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.feedback && v.feedback.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'upcoming'
        ? v.status === 'scheduled' || v.status === 'rescheduled'
        : v.status === statusFilter;

    const matchesProject =
      projectFilter === 'all' ? true : v.project_name === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Farmland Site Visits</span>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
              Coimbatore Logistics
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule customer farmland tours with Coimbatore airport/railway station pickup coordination & post-visit reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs gap-1.5"
            title="Refresh site visits"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Schedule Visit</span>
          </Button>
        </div>
      </div>

      {/* TOP REPORT METRICS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Scheduled Tours</p>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">{scheduledCount}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Completed Visits</p>
              <h4 className="text-xl font-bold text-emerald-700 mt-0.5">{completedCount}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Hot / Booked Interest</p>
              <h4 className="text-xl font-bold text-amber-700 mt-0.5">{hotInterestedCount}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-indigo-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Coimbatore Pickups</p>
              <h4 className="text-xl font-bold text-indigo-700 mt-0.5">{airportPickupsCount}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search visitor, phone, project, or comments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalVisits})
            </button>
            <button
              onClick={() => setStatusFilter('upcoming')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'upcoming'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming ({scheduledCount})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === 'completed'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-xs h-9 rounded-md border border-input bg-white px-2.5 text-slate-700"
          >
            <option value="all">All Projects</option>
            <option value="Anaikatti Green Acres">Anaikatti Green Acres</option>
            <option value="Pollachi Coconut Groves">Pollachi Coconut Groves</option>
            <option value="Siruvani Valley Estates">Siruvani Valley Estates</option>
            <option value="Kotagiri Agro Estates">Kotagiri Agro Estates</option>
          </select>
        </div>
      </div>

      {/* SITE VISITS GRID OR EMPTY STATE */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Loading farmland site visits and logistics...</span>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <Compass className="h-10 w-10 text-emerald-600 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-slate-900">
            {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'No matching site visits found'
              : 'No Farmland Site Visits Scheduled'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
              ? 'Try changing your filter criteria or search keywords.'
              : 'Start scheduling customer site tours with airport pickups and recording post-visit customer feedback.'}
          </p>
          <Button
            size="sm"
            onClick={() => setIsScheduleOpen(true)}
            className="mt-4 gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule First Site Visit</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisits.map((visit) => {
            const isCompleted = visit.status === 'completed';
            const isScheduled = visit.status === 'scheduled' || visit.status === 'rescheduled';
            const isCancelled = visit.status === 'cancelled' || visit.status === 'no_show';

            return (
              <Card
                key={visit.id}
                className={`bg-white transition-all hover:shadow-md ${
                  isCompleted
                    ? 'border-emerald-200 ring-1 ring-emerald-100'
                    : isScheduled
                    ? 'border-slate-200'
                    : 'border-slate-200 opacity-75'
                }`}
              >
                <CardHeader className="pb-2.5 flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      {visit.visitor_name}
                    </CardTitle>
                    <p className="text-xs font-medium text-emerald-800 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      <span>{visit.project_name}</span>
                    </p>
                  </div>

                  <div>
                    {isCompleted && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                        ✓ Completed Tour
                      </Badge>
                    )}
                    {isScheduled && (
                      <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold">
                        Scheduled
                      </Badge>
                    )}
                    {isCancelled && (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                        {visit.status.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-xs pt-1">
                  {/* Tour Date & Time */}
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      {new Date(visit.scheduled_at).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Pickup Transportation */}
                  {visit.pickup_required && (
                    <div className="flex items-start gap-2 text-slate-600 bg-blue-50/70 p-2 rounded-lg border border-blue-100 text-[11px]">
                      <Car className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-semibold text-blue-900 block">
                          Pickup: {visit.pickup_location}
                        </span>
                        {(visit.vehicle_number || visit.driver_name) && (
                          <span className="text-blue-700 text-[10px]">
                            {visit.driver_name && `Driver: ${visit.driver_name} `}
                            {visit.vehicle_number && `(${visit.vehicle_number})`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CUSTOMER FEEDBACK & POST-VISIT REPORT SECTION */}
                  {isCompleted && visit.feedback && (
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <MessageSquareQuote className="h-3.5 w-3.5 text-emerald-700" />
                          Customer Feedback:
                        </span>
                        {visit.interest_level && (
                          <Badge
                            className={`text-[9px] font-bold uppercase ${
                              visit.interest_level === 'hot' || visit.interest_level === 'booked'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {visit.interest_level === 'hot'
                              ? '🔥 Hot Lead'
                              : visit.interest_level === 'booked'
                              ? '🎉 Booked'
                              : `${visit.interest_level} interest`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-800 italic bg-white p-2 rounded-lg border border-emerald-100/80">
                        &quot;{visit.feedback}&quot;
                      </p>
                      {visit.plots_shown && visit.plots_shown.length > 0 && (
                        <p className="text-[10px] text-slate-600">
                          <span className="font-semibold">Plots Inspected:</span>{' '}
                          {visit.plots_shown.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Executive & Manage Action */}
                  <div className="pt-2 border-t flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground font-medium">
                      Executive: <strong className="text-slate-700 font-semibold">{visit.assigned_executive}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVisitForManage(visit)}
                      className="h-7 text-xs border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      {isCompleted ? 'View / Update Report' : 'Manage Visit'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* SCHEDULE VISIT POPUP MODAL */}
      <ScheduleVisitModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onCreated={handleCreated}
        leads={leadsList}
      />

      {/* MANAGE VISIT & REPORT POPUP MODAL */}
      <ManageVisitModal
        visit={selectedVisitForManage}
        isOpen={Boolean(selectedVisitForManage)}
        onClose={() => setSelectedVisitForManage(null)}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
        userRole={currentUserRole}
      />
    </div>
  );
}
