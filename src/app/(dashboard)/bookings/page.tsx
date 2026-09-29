'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Phone,
  Mail,
  IndianRupee,
  Layers,
  MapPin,
  Calendar,
  Building,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrencyINR } from '@/lib/utils';
import { fetchBookingsAction, BookingItem } from '@/lib/bookings/actions';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBookingsAction();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (projectFilter !== 'all' && b.project_name !== projectFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.customer_name?.toLowerCase().includes(q);
      const matchPhone = b.customer_phone?.toLowerCase().includes(q);
      const matchPlot = b.plot_no?.toLowerCase().includes(q);
      const matchProject = b.project_name?.toLowerCase().includes(q);
      const matchRef = b.reference_no?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPlot && !matchProject && !matchRef) return false;
    }
    return true;
  });

  // Unique projects for dropdown
  const uniqueProjects = Array.from(new Set(bookings.map((b) => b.project_name).filter(Boolean)));

  // KPI Calculations
  const totalCount = bookings.length;
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length;
  const pendingCount = bookings.filter((b) => b.status === 'pending_approval').length;
  const totalAgreedValue = bookings.reduce((sum, b) => sum + (b.agreed_price || 0), 0);
  const totalAdvanceCollected = bookings.reduce((sum, b) => sum + (b.booking_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Plot Bookings & Approvals</span>
            </h2>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
              Coimbatore Agro Estates
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time tracking of token advance payments, plot allocations, and manager approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Bookings */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Bookings
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {totalCount}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {confirmedCount} Confirmed Allotted
            </p>
          </div>
        </div>

        {/* Advance Token Collected */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Token Collected
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {formatCurrencyINR(totalAdvanceCollected)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Verified Advance Tokens</p>
          </div>
        </div>

        {/* Agreed Total Value */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Booked Value
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {formatCurrencyINR(totalAgreedValue)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Cumulative Contract Value</p>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="group relative overflow-hidden rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {pendingCount}
            </div>
            <p className="text-[11px] text-purple-700 font-medium mt-1">
              Awaiting Document Signing
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <Card className="shadow-xs border-slate-200/80 bg-white rounded-2xl overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search buyer, phone, plot #, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-slate-50/70 border-slate-200 rounded-xl focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Project Filter */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="text-xs bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="all">All Farmland Projects</option>
                {uniqueProjects.map((proj) => (
                  <option key={proj} value={proj}>
                    {proj}
                  </option>
                ))}
              </select>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'confirmed', label: 'Confirmed' },
                  { id: 'pending_approval', label: 'Pending' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOOKINGS LIST */}
      {filteredBookings.length === 0 ? (
        <Card className="bg-white shadow-xs border-dashed border-slate-300">
          <CardContent className="p-12 text-center">
            <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-700">No Plot Bookings Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
                ? 'Try adjusting your search criteria or clearing filters.'
                : 'Plots converted from Lead Pipeline or registered by executives will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((item) => {
            const isConfirmed = item.status === 'confirmed';
            return (
              <Card
                key={item.id}
                className="bg-white shadow-xs hover:shadow-md transition-all border-slate-200/80 rounded-2xl overflow-hidden"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-base text-slate-900">
                          {item.customer_name}
                        </h4>
                        <Badge
                          variant={isConfirmed ? 'success' : 'warning'}
                          className="text-[10px] uppercase font-mono tracking-wider font-semibold"
                        >
                          {isConfirmed ? 'Confirmed Allotment' : 'Pending Approval'}
                        </Badge>
                        {item.reference_no && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.reference_no}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{item.project_name}</span>
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {item.plot_no} {item.plot_size ? `(${item.plot_size})` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] uppercase font-semibold text-slate-400 block tracking-wider">
                        Agreed Price
                      </span>
                      <span className="font-extrabold text-lg sm:text-xl text-emerald-900 font-mono">
                        {formatCurrencyINR(item.agreed_price)}
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom / Payment Details */}
                  <div className="pt-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-700">Advance Token:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {formatCurrencyINR(item.booking_amount)}
                        </span>
                        <span className="text-[11px] text-slate-400">({item.payment_mode})</span>
                      </div>

                      {item.customer_phone && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{item.customer_phone}</span>
                        </div>
                      )}

                      {item.customer_email && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[180px]">{item.customer_email}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {item.approved_by ? `Approved by ${item.approved_by} on ` : 'Booked on '}
                        {new Date(item.booking_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-100">
                      <span className="font-semibold text-slate-700">Notes: </span>
                      {item.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
