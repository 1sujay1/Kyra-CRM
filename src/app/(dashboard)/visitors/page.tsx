'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  Trash2,
  Loader2,
  Shield,
  Activity,
  ArrowUpRight,
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
import { fetchVisitorLogsAction, deleteVisitorLogAction, VisitorLogItem } from '@/lib/visitors/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';

export default function VisitorLogsPage() {
  const [visitors, setVisitors] = useState<VisitorLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>('Just now');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeviceFilter, setSelectedDeviceFilter] = useState<string>('all');
  const [userRole, setUserRole] = useState<'admin' | 'digital_marketing'>('digital_marketing');

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const [fetchedLogs, user] = await Promise.all([
        fetchVisitorLogsAction(),
        getCurrentUserAction(),
      ]);
      setVisitors(fetchedLogs);
      if (user) {
        setUserRole(user.role);
      }
      setLastSyncedTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    } catch (err) {
      console.error('Failed to load visitor logs:', err);
    } finally {
      if (showSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [loadData]);

  const handleDelete = async (e: React.MouseEvent, ids: string[]) => {
    e.stopPropagation();
    if (userRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin has permission to delete visitor logs.');
      return;
    }
    if (!confirm(`Are you sure you want to delete this visitor log (${ids.length} entries)?`)) return;

    setVisitors((prev) => prev.filter((v) => !ids.includes(v.id)));
    for (const id of ids) {
      await deleteVisitorLogAction(id);
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.browser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.os.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDevice =
      selectedDeviceFilter === 'all' ||
      v.device_type.toLowerCase() === selectedDeviceFilter.toLowerCase();

    return matchesSearch && matchesDevice;
  });

  // Group similar visitor rows by IP + Project Name + Date
  const groupedVisitors = useMemo(() => {
    const map = new Map<string, VisitorLogItem & { total_hits: number; all_ids: string[] }>();

    for (const v of filteredVisitors) {
      const dateStr = new Date(v.visited_at).toISOString().slice(0, 10);
      const key = `${v.ip}_${v.project_name}_${dateStr}`;

      if (!map.has(key)) {
        map.set(key, {
          ...v,
          all_ids: [v.id],
          total_hits: 1,
        });
      } else {
        const existing = map.get(key)!;
        existing.all_ids.push(v.id);
        existing.total_hits = existing.all_ids.length;
        if (new Date(v.visited_at).getTime() > new Date(existing.visited_at).getTime()) {
          existing.visited_at = v.visited_at;
          existing.id = v.id;
          if (v.page_url) existing.page_url = v.page_url;
          if (v.referrer) existing.referrer = v.referrer;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.visited_at).getTime() - new Date(a.visited_at).getTime()
    );
  }, [filteredVisitors]);

  // Calculate Metrics
  const totalVisits = visitors.length;
  const uniqueIps = new Set(visitors.map((v) => v.ip)).size;
  const mobileCount = visitors.filter((v) => v.device_type === 'Mobile').length;
  const desktopCount = visitors.filter((v) => v.device_type === 'Desktop').length;

  const getDeviceIcon = (device: string) => {
    if (device === 'Mobile') return <Smartphone className="h-4 w-4 text-emerald-600" />;
    if (device === 'Tablet') return <Tablet className="h-4 w-4 text-amber-600" />;
    return <Laptop className="h-4 w-4 text-sky-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Globe className="h-6 w-6 text-emerald-700" />
              <span>Website Visitor Logs & Geo Analytics</span>
            </h2>
            <Badge className="text-[10px] uppercase font-mono tracking-wider bg-slate-900 text-white">
              Daily Capped Tracking (Max 4/day)
            </Badge>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live DB Sync: {lastSyncedTime}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time geolocation, IP address, device specs, and origin project tracking for website landing page visits.
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
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Logs'}</span>
          </Button>
        </div>
      </div>

      {/* METRIC CARDS WITH CLICK TO FILTER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Visits */}
        <div
          onClick={() => setSelectedDeviceFilter('all')}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer ${
            selectedDeviceFilter === 'all' ? 'border-emerald-500 ring-2 ring-emerald-600/30' : 'border-slate-200/80 hover:border-emerald-300'
          }`}
          title="Click to show all visitor logs"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Recorded Visits
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {totalVisits}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Logged from landing pages</p>
          </div>
        </div>

        {/* Card 2: Unique IPs */}
        <div
          onClick={() => setSelectedDeviceFilter('all')}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer ${
            selectedDeviceFilter === 'all' ? 'border-sky-500 ring-2 ring-sky-600/30' : 'border-slate-200/80 hover:border-sky-300'
          }`}
          title="Click to show all unique IP visitor logs"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Unique IP Addresses
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {uniqueIps}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Distinct IP locations</p>
          </div>
        </div>

        {/* Card 3: Mobile Traffic */}
        <div
          onClick={() => setSelectedDeviceFilter('mobile')}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer ${
            selectedDeviceFilter === 'mobile' ? 'border-purple-500 ring-2 ring-purple-600/30' : 'border-slate-200/80 hover:border-purple-300'
          }`}
          title="Click to filter mobile visitors only"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mobile Visitors
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {mobileCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalVisits > 0 ? Math.round((mobileCount / totalVisits) * 100) : 0}% of overall traffic
            </p>
          </div>
        </div>

        {/* Card 4: Desktop Traffic */}
        <div
          onClick={() => setSelectedDeviceFilter('desktop')}
          className={`group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer ${
            selectedDeviceFilter === 'desktop' ? 'border-amber-500 ring-2 ring-amber-600/30' : 'border-slate-200/80 hover:border-amber-300'
          }`}
          title="Click to filter desktop visitors only"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Desktop Visitors
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Laptop className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
              {desktopCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalVisits > 0 ? Math.round((desktopCount / totalVisits) * 100) : 0}% of overall traffic
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs border-slate-200/80 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-3.5 sm:p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search IP, city, project, browser..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3" /> Device:
              </span>
              {[
                { id: 'all', label: 'All Devices' },
                { id: 'mobile', label: 'Mobile' },
                { id: 'desktop', label: 'Desktop' },
                { id: 'tablet', label: 'Tablet' },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={selectedDeviceFilter === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDeviceFilter(item.id)}
                  className={`text-xs h-8 rounded-lg cursor-pointer transition-all ${
                    selectedDeviceFilter === item.id
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VISITOR LOGS TABLE */}
      <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
            <span className="font-semibold text-slate-700 text-sm">Loading visitor geo logs...</span>
            <span className="text-[11px] text-slate-400">Syncing with MongoDB database</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5 pl-5">Project Name</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">IP Address</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Location & Region</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Total Visits Chip</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Device Specs</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Referrer / Origin</TableHead>
                  <TableHead className="font-bold text-xs text-slate-800 py-3.5">Last Visited Time</TableHead>
                  {userRole === 'admin' && (
                    <TableHead className="font-bold text-xs text-slate-800 py-3.5 text-right pr-5">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {groupedVisitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === 'admin' ? 8 : 7} className="text-center py-20 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100">
                          <Globe className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-base">No Visitor Logs Found</p>
                          <p className="text-slate-500 text-xs mt-1">
                            Visitor logs will automatically appear here when visitors access your landing page.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedVisitors.map((v) => {
                    const visitedDate = new Date(v.visited_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <TableRow key={v.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        {/* 1. Project Name Identifier */}
                        <TableCell className="py-3.5 pl-5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            <span>{v.project_name}</span>
                          </span>
                        </TableCell>

                        {/* 2. IP Address */}
                        <TableCell className="py-3.5">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                            {v.ip}
                          </span>
                        </TableCell>

                        {/* 3. Location */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>
                              {v.city}, {v.region}
                            </span>
                            <span className="text-[10px] text-slate-400">({v.country})</span>
                          </div>
                        </TableCell>

                        {/* 4. Total Visits Count Chip */}
                        <TableCell className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold font-mono bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{v.total_hits} {v.total_hits === 1 ? 'Visit' : 'Visits'}</span>
                          </span>
                        </TableCell>

                        {/* 5. Device Specs */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(v.device_type)}
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">
                                {v.browser} on {v.os}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {v.device_type} {v.screen_resolution ? `• ${v.screen_resolution}` : ''}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 6. Referrer / Origin */}
                        <TableCell className="py-3.5">
                          <div className="flex flex-col max-w-[180px] truncate" title={v.referrer || v.page_url}>
                            <span className="text-xs text-slate-700 truncate font-medium">{v.referrer}</span>
                            {v.page_url && (
                              <span className="text-[10px] text-slate-400 truncate">{v.page_url}</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 7. Visited Date & Time */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{visitedDate}</span>
                          </div>
                        </TableCell>

                        {/* 8. Actions (Admin Delete) */}
                        {userRole === 'admin' && (
                          <TableCell className="py-3.5 text-right pr-5">
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, v.all_ids)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title={`Delete ${v.total_hits} visitor log record(s)`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
