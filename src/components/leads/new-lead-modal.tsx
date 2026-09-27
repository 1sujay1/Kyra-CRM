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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizeIndianPhone } from '@/lib/security/phone';
import { LeadDetailed } from './lead-360-drawer';

interface NewLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: (newLead: LeadDetailed) => void;
}

export function NewLeadModal({
  open,
  onOpenChange,
  onLeadCreated,
}: NewLeadModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Coimbatore');
  const [project, setProject] = useState('Anaikatti Green Acres');
  const [purpose, setPurpose] = useState<'investment' | 'farmhouse' | 'agriculture'>('farmhouse');
  const [budget, setBudget] = useState('₹35L - ₹50L');
  const [source, setSource] = useState('manual');
  const [assignedTo, setAssignedTo] = useState('Priya Raman');
  const [initialNote, setInitialNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setError('Please provide a valid 10-digit Indian phone number (e.g. 98421XXXXX or +91...)');
      return;
    }

    const leadId = `lead-${Date.now()}`;
    const newLead: LeadDetailed = {
      id: leadId,
      full_name: fullName.trim(),
      phone: normalizedPhone,
      email: email.trim(),
      city: city.trim(),
      project_name: project,
      purpose,
      budget_range: budget,
      source: source as any,
      quality: 'warm',
      status: 'new',
      assigned_to_name: assignedTo,
      created_at: new Date().toISOString(),
      status_history: [
        {
          id: `hist-${Date.now()}`,
          from_status: null,
          to_status: 'new',
          comment: initialNote.trim() || 'Direct lead creation in CRM',
          changed_by: 'Current User',
          created_at: new Date().toISOString(),
        },
      ],
      activities: initialNote.trim()
        ? [
            {
              id: `act-${Date.now()}`,
              type: 'note',
              outcome: 'Initial Enquiry Details',
              notes: initialNote.trim(),
              created_by: 'Current User',
              created_at: new Date().toISOString(),
            },
          ]
        : [],
    };

    onLeadCreated(newLead);
    onOpenChange(false);

    // Reset form
    setFullName('');
    setPhone('');
    setEmail('');
    setInitialNote('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground">
            Create Farmland Lead
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a direct walk-in, phone call, or referral buyer for Kyra Group farmlands.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          {error && (
            <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Buyer Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Senthil Nathan"
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mobile Number <span className="text-destructive">*</span></Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9842100000"
                className="text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="buyer@example.com"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buyer Location / City</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Coimbatore, Tiruppur, Chennai..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Farmland Project Preference</Label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
              >
                <option value="Anaikatti Green Acres">Anaikatti Green Acres</option>
                <option value="Pollachi Coconut Groves">Pollachi Coconut Groves</option>
                <option value="Siruvani Valley Estates">Siruvani Valley Estates</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buyer Purpose</Label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as any)}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
              >
                <option value="farmhouse">Farmhouse Retreat</option>
                <option value="agriculture">Commercial Agriculture / Coconut</option>
                <option value="investment">Long-term Capital Investment</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Budget Bracket</Label>
              <select
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
              >
                <option value="₹25L - ₹35L">₹25L - ₹35L</option>
                <option value="₹35L - ₹50L">₹35L - ₹50L</option>
                <option value="₹50L - ₹75L">₹50L - ₹75L</option>
                <option value="₹75L+">₹75L+</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assigned Sales Executive</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-transparent px-3"
              >
                <option value="Priya Raman">Priya Raman</option>
                <option value="Vignesh Kumar">Vignesh Kumar</option>
                <option value="Suresh Narayanan">Suresh Narayanan</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Initial Notes / Requirements</Label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="e.g. Enquired for 25-50 cents red-soil farmland with mountain view."
              className="w-full text-xs p-2.5 rounded-lg border border-input bg-transparent placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-600"
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
              Create Lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
