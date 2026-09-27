'use client';

import React, { useState } from 'react';
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
import { Calendar, Car, Clock, User, Phone, MapPin, Loader2, Sparkles } from 'lucide-react';
import { createSiteVisitAction, SiteVisitItem } from '@/lib/site-visits/actions';

interface ScheduleVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newVisit: SiteVisitItem) => void;
  leads?: Array<{
    id: string;
    full_name: string;
    phone: string;
    email?: string | null;
    project_name: string;
  }>;
}

export function ScheduleVisitModal({
  isOpen,
  onClose,
  onCreated,
  leads = [],
}: ScheduleVisitModalProps) {
  // Default to tomorrow 10:30 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 30, 0, 0);
  const defaultDateStr = tomorrow.toISOString().slice(0, 16);

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('');
  const [visitorPhone, setVisitorPhone] = useState<string>('');
  const [visitorEmail, setVisitorEmail] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('Anaikatti Green Acres');
  const [scheduledAt, setScheduledAt] = useState<string>(defaultDateStr);
  const [pickupRequired, setPickupRequired] = useState<boolean>(true);
  const [pickupLocation, setPickupLocation] = useState<string>('Coimbatore International Airport (CJB)');
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [assignedExecutive, setAssignedExecutive] = useState<string>('Priya Raman');
  const [plotsShown, setPlotsShown] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLeadChange = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) {
      return;
    }
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setVisitorName(lead.full_name);
      setVisitorPhone(lead.phone);
      setVisitorEmail(lead.email || '');
      if (lead.project_name) {
        setProjectName(lead.project_name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim() || !scheduledAt) {
      setErrorMsg('Please enter visitor name, phone number, and scheduled visit date/time.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const plotsArray = plotsShown
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const res = await createSiteVisitAction({
      lead_id: selectedLeadId || null,
      visitor_name: visitorName,
      visitor_phone: visitorPhone,
      visitor_email: visitorEmail || null,
      project_name: projectName,
      scheduled_at: scheduledAt,
      pickup_required: pickupRequired,
      pickup_location: pickupRequired ? pickupLocation : null,
      driver_name: driverName || null,
      vehicle_number: vehicleNumber || null,
      assigned_executive: assignedExecutive,
      plots_shown: plotsArray,
      notes: notes || null,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      onCreated(res.data);
      onClose();
      // Reset form
      setSelectedLeadId('');
      setVisitorName('');
      setVisitorPhone('');
      setVisitorEmail('');
      setNotes('');
      setPlotsShown('');
    } else {
      setErrorMsg(res.error || 'Failed to schedule site visit. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Schedule Farmland Site Visit
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Coordinate client farmland tour and Coimbatore airport / railway station logistics.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Select Lead Quick-Fill */}
          {leads.length > 0 && (
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Select from Existing Pipeline Leads (Optional)</span>
                <span className="text-[10px] text-emerald-700 font-normal">Auto-fills buyer info</span>
              </Label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleLeadChange(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="">-- Or enter new customer details below --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.full_name} ({l.phone}) — {l.project_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Visitor Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Visitor / Buyer Name *</Label>
              <Input
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="e.g. Karthik Subramanian"
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone Number *</Label>
              <Input
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+91 98421 45620"
                className="text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Farmland Project *</Label>
              <select
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                required
              >
                <option value="Anaikatti Green Acres">Anaikatti Green Acres (Foothills)</option>
                <option value="Pollachi Coconut Groves">Pollachi Coconut Groves</option>
                <option value="Siruvani Valley Estates">Siruvani Valley Estates</option>
                <option value="Kotagiri Agro Estates">Kotagiri Agro Estates</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Visit Date & Time *</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Coimbatore Logistics & Pickup */}
          <div className="space-y-3 p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pickup_modal"
                  checked={pickupRequired}
                  onChange={(e) => setPickupRequired(e.target.checked)}
                  className="rounded text-emerald-700 focus:ring-emerald-600 h-4 w-4"
                />
                <Label htmlFor="pickup_modal" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Arrange Kyra Group Pickup & Transportation
                </Label>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">Coimbatore Transit</span>
            </div>

            {pickupRequired && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">Pickup Location</Label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="Coimbatore International Airport (CJB)">Coimbatore International Airport (CJB)</option>
                    <option value="Coimbatore Junction Railway Station (CBE)">Coimbatore Junction Railway Station (CBE)</option>
                    <option value="Gandhipuram Central Bus Stand">Gandhipuram Central Bus Stand</option>
                    <option value="Buyer Residence / Hotel (Coimbatore City)">Buyer Residence / Hotel (Coimbatore City)</option>
                    <option value="Direct Arrival / Self-Drive to Site">Direct Arrival / Self-Drive to Site</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Driver Name (Optional)</Label>
                  <Input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Murugan"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle Details (Optional)</Label>
                  <Input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. Innova TN 38 BX 4412"
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Executive & Plots to Inspect */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned Sales Executive</Label>
              <select
                value={assignedExecutive}
                onChange={(e) => setAssignedExecutive(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3"
              >
                <option value="Priya Raman">Priya Raman (Senior Farm Specialist)</option>
                <option value="Vignesh Kumar">Vignesh Kumar (Project Manager)</option>
                <option value="Suresh Balaji">Suresh Balaji (Farmland Consultant)</option>
                <option value="Karthik Raj">Karthik Raj (Field Executive)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Plots to Inspect</Label>
              <Input
                value={plotsShown}
                onChange={(e) => setPlotsShown(e.target.value)}
                placeholder="e.g. Plot 12, Plot 14 (30 Cents)"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Special Instructions / Customer Preferences</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Client interested in natural stream border and mountain facing plots. Prefers drip irrigation demo."
              className="w-full text-xs p-2.5 rounded-md border border-input bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
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
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Confirm Site Visit</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
