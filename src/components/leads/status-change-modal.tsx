'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type LeadStatusType =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'site_visit_scheduled'
  | 'site_visit_completed'
  | 'negotiation'
  | 'booked'
  | 'lost'
  | 'junk'
  | 'number_not_valid'
  | 'duplicate_number';

interface StatusChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  currentStatus: LeadStatusType;
  onStatusChanged: (leadId: string, newStatus: LeadStatusType, comment: string) => void;
}

const statusOptions: { value: LeadStatusType; label: string; color: string }[] = [
  { value: 'new', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-100 text-purple-800' },
  { value: 'qualified', label: 'Qualified Buyer', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'site_visit_scheduled', label: 'Site Visit Scheduled', color: 'bg-amber-100 text-amber-800' },
  { value: 'site_visit_completed', label: 'Site Visit Completed', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
  { value: 'booked', label: 'Booked Plot', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'lost', label: 'Lost Opportunity', color: 'bg-rose-100 text-rose-800' },
  { value: 'junk', label: 'Junk / Not Interested', color: 'bg-slate-100 text-slate-800' },
  { value: 'number_not_valid', label: 'Number Not Valid', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { value: 'duplicate_number', label: 'Duplicate Number', color: 'bg-purple-100 text-purple-800 border-purple-300' },
];

export function StatusChangeModal({
  open,
  onOpenChange,
  leadId,
  leadName,
  currentStatus,
  onStatusChanged,
}: StatusChangeModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<LeadStatusType>(currentStatus);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state when opened
  React.useEffect(() => {
    setSelectedStatus(currentStatus);
    setComment('');
    setError(null);
  }, [currentStatus, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('A comment/note is mandatory when updating lead status.');
      return;
    }

    onStatusChanged(leadId, selectedStatus, comment.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Change Lead Status
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Update pipeline stage for <strong className="text-foreground">{leadName}</strong>. This update and comment will be logged into the Lead 360 history.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select New Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(opt.value);
                      setError(null);
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-emerald-600 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-comment" className="text-xs font-semibold flex items-center justify-between">
              <span>Reason / Discussion Comment <span className="text-destructive">*</span></span>
              <span className="text-[11px] text-muted-foreground font-normal">Shows in 360 timeline</span>
            </Label>
            <textarea
              id="status-comment"
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Spoke with buyer on phone, interested in 25 cents plot at Pollachi, scheduled site visit for Saturday morning."
              className="w-full text-xs p-3 rounded-lg border border-input bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-600"
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
            >
              Update Status & Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
