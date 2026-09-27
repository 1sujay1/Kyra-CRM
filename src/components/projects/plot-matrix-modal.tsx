'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Layers,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Search,
  Filter,
  IndianRupee,
  RefreshCw,
  Edit2,
  X,
} from 'lucide-react';
import { formatCurrencyINR } from '@/lib/utils';
import {
  FarmlandProjectItem,
  PlotItem,
  fetchProjectPlotsAction,
  updatePlotStatusAction,
} from '@/lib/projects/actions';

interface PlotMatrixModalProps {
  project: FarmlandProjectItem | null;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: (updatedProject: FarmlandProjectItem) => void;
}

export function PlotMatrixModal({
  project,
  isOpen,
  onClose,
  onProjectUpdated,
}: PlotMatrixModalProps) {
  const [plots, setPlots] = useState<PlotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedPlotForEdit, setSelectedPlotForEdit] = useState<PlotItem | null>(null);
  const [editStatus, setEditStatus] = useState<PlotItem['status']>('available');
  const [editBuyerName, setEditBuyerName] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (project && isOpen) {
      loadPlots();
    }
  }, [project, isOpen]);

  const loadPlots = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const data = await fetchProjectPlotsAction(project.id);
      setPlots(data);
    } catch (err) {
      console.error('Failed to load plots:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!project) return null;

  const handleOpenEditPlot = (plot: PlotItem) => {
    setSelectedPlotForEdit(plot);
    setEditStatus(plot.status);
    setEditBuyerName(plot.buyer_name || '');
  };

  const handleSavePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotForEdit) return;

    setIsUpdating(true);
    const res = await updatePlotStatusAction(
      project.id,
      selectedPlotForEdit.id,
      editStatus,
      editBuyerName.trim() || undefined
    );
    setIsUpdating(false);

    if (res.success && res.plots) {
      setPlots(res.plots);
      setSelectedPlotForEdit(null);
      if (res.availableCount !== undefined) {
        onProjectUpdated({
          ...project,
          available_plots: res.availableCount,
        });
      }
    }
  };

  // Plot counters
  const availableCount = plots.filter((p) => p.status === 'available').length;
  const bookedCount = plots.filter((p) => p.status === 'booked').length;
  const soldCount = plots.filter((p) => p.status === 'sold').length;
  const blockedCount = plots.filter((p) => p.status === 'blocked').length;

  const filteredPlots = plots.filter((p) => {
    const matchesFilter = filterStatus === 'all' ? true : p.status === filterStatus;
    const matchesSearch =
      p.plot_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.buyer_name && p.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>{project.name}</span>
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                    Plot Inventory Matrix
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  <span>{project.location}</span>
                  <span className="mx-1">•</span>
                  <span>Price: {formatCurrencyINR(project.price_per_cent)} / Cent</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Inventory Legend & Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-xs" />
            <div>
              <span className="text-[11px] text-muted-foreground block">Available</span>
              <strong className="text-emerald-700 font-bold text-sm">{availableCount} plots</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-amber-500 shadow-xs" />
            <div>
              <span className="text-[11px] text-muted-foreground block">Booked / Token</span>
              <strong className="text-amber-700 font-bold text-sm">{bookedCount} plots</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-slate-400 shadow-xs" />
            <div>
              <span className="text-[11px] text-muted-foreground block">Sold & Registered</span>
              <strong className="text-slate-700 font-bold text-sm">{soldCount} plots</strong>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100">
            <span className="h-3 w-3 rounded-full bg-blue-500 shadow-xs" />
            <div>
              <span className="text-[11px] text-muted-foreground block">Reserved / Hold</span>
              <strong className="text-blue-700 font-bold text-sm">{blockedCount} plots</strong>
            </div>
          </div>
        </div>

        {/* Toolbar: Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {(['all', 'available', 'booked', 'sold'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1 rounded-md capitalize transition-all ${
                  filterStatus === tab
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plot # or buyer..."
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>

        {/* Interactive Plot Matrix Grid */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>Loading plot layout and boundary coordinates...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[50vh] overflow-y-auto p-1">
            {filteredPlots.map((plot) => {
              const isAvail = plot.status === 'available';
              const isBooked = plot.status === 'booked';
              const isSold = plot.status === 'sold';
              const isBlocked = plot.status === 'blocked';

              return (
                <div
                  key={plot.id}
                  onClick={() => handleOpenEditPlot(plot)}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all hover:scale-[1.03] hover:shadow-md flex flex-col justify-between ${
                    isAvail
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-100/70'
                      : isBooked
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100/70'
                      : isSold
                      ? 'bg-slate-100/80 border-slate-200 text-slate-600 opacity-80'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100/70'
                  }`}
                  title="Click to change plot status or assign buyer"
                >
                  <div className="flex justify-between items-center text-[10px] mb-1">
                    <span className="font-mono font-bold">{plot.plot_no}</span>
                    <span className="capitalize text-muted-foreground">{plot.facing}</span>
                  </div>

                  <div className="my-1">
                    <span className="text-xs font-bold block">{plot.size_cents} Cents</span>
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {formatCurrencyINR(plot.price)}
                    </span>
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-200/50">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isAvail
                          ? 'bg-emerald-200/70 text-emerald-900'
                          : isBooked
                          ? 'bg-amber-200/70 text-amber-900'
                          : isSold
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-blue-200 text-blue-900'
                      }`}
                    >
                      {plot.status}
                    </span>
                    {plot.buyer_name && (
                      <span className="text-[9px] text-slate-600 truncate block mt-0.5">
                        {plot.buyer_name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Plot Status Editor Drawer / Inline Popup */}
        {selectedPlotForEdit && (
          <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-lg mt-2">
            <form onSubmit={handleSavePlotStatus} className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-emerald-400">
                    Modifying {selectedPlotForEdit.plot_no}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({selectedPlotForEdit.size_cents} Cents • {formatCurrencyINR(selectedPlotForEdit.price)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlotForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <Label className="text-[11px] text-slate-300">Set Plot Status</Label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-xs h-8 rounded-md bg-slate-800 border border-slate-700 text-white px-2 mt-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="available">🟢 Available for Sale</option>
                    <option value="booked">🟡 Booked (Token Paid)</option>
                    <option value="sold">⚪ Sold & Registered</option>
                    <option value="blocked">🔵 Blocked / Inspection Hold</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-[11px] text-slate-300">Buyer Name / Notes (Optional)</Label>
                  <Input
                    value={editBuyerName}
                    onChange={(e) => setEditBuyerName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Natarajan (Token Advance ₹5,00,000)"
                    className="text-xs h-8 bg-slate-800 border-slate-700 text-white mt-1"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPlotForEdit(null)}
                  className="text-xs text-slate-300 hover:bg-slate-800 h-7"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7 gap-1"
                >
                  {isUpdating ? 'Saving...' : 'Update Plot Status'}
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Matrix
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
