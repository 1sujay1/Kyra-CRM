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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { LeadDetailed } from './lead-360-drawer';

interface DeleteLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: LeadDetailed | null;
  onConfirmDelete: (leadId: string) => Promise<void>;
}

export function DeleteLeadModal({
  open,
  onOpenChange,
  lead,
  onConfirmDelete,
}: DeleteLeadModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!lead) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(lead.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md bg-white border border-rose-100 shadow-2xl p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 shadow-inner">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-lg font-bold text-slate-900">
            Delete Lead from Server & Database?
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500 max-w-sm mx-auto">
            This will permanently remove this enquiry and all linked audit logs, notes, and history from the Supabase database and local server.
          </DialogDescription>
        </DialogHeader>

        {/* Lead Summary Badge Box */}
        <div className="my-2 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">{lead.full_name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-100/70 text-rose-700 font-semibold border border-rose-200/60">
              Admin Removal
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
            <div>
              <span className="text-slate-400 block text-[10px]">Mobile:</span>
              <span className="font-mono">{lead.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Project:</span>
              <span className="truncate block font-medium">{lead.project_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Warning: This action cannot be reversed once executed.</span>
        </div>

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="text-xs border-slate-200 hover:bg-slate-100"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isDeleting}
            onClick={handleDelete}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5 shadow-md shadow-rose-600/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Removing from Database...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Permanently</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
