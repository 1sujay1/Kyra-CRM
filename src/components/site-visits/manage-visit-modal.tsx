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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Car,
  MapPin,
  MessageSquareQuote,
  Trash2,
  Loader2,
  Save,
  User,
  Phone,
  Building2,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  updateSiteVisitReportAction,
  deleteSiteVisitAction,
  SiteVisitItem,
} from '@/lib/site-visits/actions';

interface ManageVisitModalProps {
  visit: SiteVisitItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedVisit: SiteVisitItem) => void;
  onDeleted?: (deletedVisitId: string) => void;
  userRole?: string;
}

export function ManageVisitModal({
  visit,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  userRole = 'digital_marketing',
}: ManageVisitModalProps) {
  const [status, setStatus] = useState<SiteVisitItem['status']>('scheduled');
  const [feedback, setFeedback] = useState<string>('');
  const [interestLevel, setInterestLevel] = useState<'hot' | 'warm' | 'cold' | 'booked'>('warm');
  const [plotsShown, setPlotsShown] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (visit) {
      setStatus(visit.status || 'scheduled');
      setFeedback(visit.feedback || '');
      setInterestLevel((visit.interest_level as any) || 'warm');
      setPlotsShown(visit.plots_shown ? visit.plots_shown.join(', ') : '');
      setNotes(visit.notes || '');
      setErrorMsg(null);
    }
  }, [visit]);

  if (!visit) return null;

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'completed' && !feedback.trim()) {
      setErrorMsg('Please enter customer feedback and comments before marking the visit as completed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const plotsArray = plotsShown
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const res = await updateSiteVisitReportAction(visit.id, {
      status,
      feedback: feedback.trim() || null,
      interest_level: interestLevel,
      plots_shown: plotsArray,
      notes: notes.trim() || null,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      onUpdated(res.data);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save visit report.');
    }
  };

  const handleDelete = async () => {
    if (userRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin (Adminkyra) has permission to delete site visits.');
      return;
    }

    if (!confirm('Are you sure you want to delete this site visit record? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    const res = await deleteSiteVisitAction(visit.id);
    setIsDeleting(false);

    if (res.success) {
      if (onDeleted) onDeleted(visit.id);
      onClose();
    } else {
      alert(res.error || 'Delete failed.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Site Visit Report & Details
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Update tour outcome, record customer feedback, and sync with CRM pipeline.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        {/* Customer & Visit Overview Card */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                {visit.visitor_name}
              </h3>
              <p className="text-slate-600 flex items-center gap-1 mt-0.5">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {visit.visitor_phone}
              </p>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-700" />
                {visit.project_name}
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Executive: {visit.assigned_executive}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-600" />
              <span>
                {new Date(visit.scheduled_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            {visit.pickup_required && (
              <div className="flex items-center gap-1 text-blue-700">
                <Car className="h-3 w-3" />
                <span>Pickup: {visit.pickup_location}</span>
                {visit.vehicle_number && <span>({visit.vehicle_number})</span>}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveReport} className="space-y-4 pt-1">
          {/* Status Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">Site Visit Status *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: 'scheduled', label: 'Scheduled', color: 'bg-amber-100 text-amber-900 border-amber-300' },
                { val: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-bold' },
                { val: 'rescheduled', label: 'Rescheduled', color: 'bg-blue-100 text-blue-900 border-blue-300' },
                { val: 'cancelled', label: 'Cancelled', color: 'bg-rose-100 text-rose-900 border-rose-300' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => setStatus(s.val as any)}
                  className={`px-3 py-2 rounded-lg text-xs border text-center transition-all ${
                    status === s.val
                      ? `${s.color} ring-2 ring-emerald-600 shadow-sm font-semibold`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Feedback & Comments Section */}
          <div className="space-y-1.5 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <MessageSquareQuote className="h-4 w-4 text-emerald-700" />
                <span>Customer Feedback & Comments {status === 'completed' && <span className="text-rose-600">*</span>}</span>
              </Label>
              <span className="text-[10px] text-emerald-800 font-medium">Post-Visit Observations</span>
            </div>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What was the client's direct feedback? E.g., 'Loved the Western Ghats mountain breeze and drip coconut setup. Concerned about road width; requested survey map and negotiable pricing on Plot 14.'"
              className="w-full text-xs p-3 rounded-lg border border-input bg-white text-slate-900 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required={status === 'completed'}
            />
          </div>

          {/* Interest Level & Plots Inspected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Customer Interest Level</Label>
              <select
                value={interestLevel}
                onChange={(e) => setInterestLevel(e.target.value as any)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 focus:outline-none focus:ring-1 focus:ring-emerald-600 font-medium"
              >
                <option value="hot">🔥 Hot (Ready to book within 15-30 days)</option>
                <option value="warm">⚡ Warm (Interested, evaluating budget)</option>
                <option value="cold">❄️ Cold (Browsing / budget mismatch)</option>
                <option value="booked">🎉 Booked Plot (Advance token paid!)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Plots Shown / Inspected</Label>
              <Input
                value={plotsShown}
                onChange={(e) => setPlotsShown(e.target.value)}
                placeholder="e.g. Plot 12, Plot 14, Plot 18"
                className="text-xs"
              />
            </div>
          </div>

          {/* Executive Follow-up Action Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Executive Follow-Up Notes & Action Items</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Share certified FMB sketch on WhatsApp by Monday. Follow up on Tuesday regarding plot blockage."
              className="w-full text-xs p-2.5 rounded-md border border-input bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          {/* Actions & Permissions */}
          <div className="flex justify-between items-center pt-3 border-t">
            {userRole === 'admin' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Report...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Visit Report</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
