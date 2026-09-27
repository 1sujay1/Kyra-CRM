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
import { Trees, MapPin, IndianRupee, Layers, Droplets, Sprout, Save, Loader2 } from 'lucide-react';
import {
  FarmlandProjectItem,
  updateProjectAction,
  createProjectAction,
} from '@/lib/projects/actions';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: FarmlandProjectItem | null; // null if creating a new project
  onSaved: (project: FarmlandProjectItem) => void;
}

export function EditProjectModal({
  isOpen,
  onClose,
  project,
  onSaved,
}: EditProjectModalProps) {
  const isEditing = Boolean(project);

  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [pricePerCent, setPricePerCent] = useState<number>(125000);
  const [totalPlots, setTotalPlots] = useState<number>(30);
  const [availablePlots, setAvailablePlots] = useState<number>(15);
  const [status, setStatus] = useState<FarmlandProjectItem['status']>('active');
  const [waterSource, setWaterSource] = useState<string>('');
  const [soilType, setSoilType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setLocation(project.location);
      setDescription(project.description || '');
      setPricePerCent(project.price_per_cent);
      setTotalPlots(project.total_plots);
      setAvailablePlots(project.available_plots);
      setStatus(project.status);
      setWaterSource(project.water_source || '');
      setSoilType(project.soil_type || '');
      setErrorMsg(null);
    } else {
      // Default new project
      setName('');
      setLocation('Coimbatore, Tamil Nadu');
      setDescription('');
      setPricePerCent(135000);
      setTotalPlots(30);
      setAvailablePlots(30);
      setStatus('active');
      setWaterSource('Perennial Borewells + Drip Irrigation Network');
      setSoilType('Virgin Red Loam Soil');
      setErrorMsg(null);
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) {
      setErrorMsg('Please provide a project name and location.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      name: name.trim(),
      location: location.trim(),
      description: description.trim(),
      price_per_cent: Number(pricePerCent) || 125000,
      total_plots: Number(totalPlots) || 30,
      available_plots: Number(availablePlots) || 0,
      status,
      water_source: waterSource.trim() || undefined,
      soil_type: soilType.trim() || undefined,
    };

    let res;
    if (project) {
      res = await updateProjectAction(project.id, payload);
    } else {
      res = await createProjectAction(payload);
    }

    setIsSubmitting(false);

    if (res.success && res.data) {
      onSaved(res.data);
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save project details.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-800">
              <Trees className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? `Edit Project: ${project?.name}` : 'Add New Farmland Project'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure farmland pricing, plot inventory, water resources, and estate features.
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
          {/* Project Name & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anaikatti Green Acres"
                className="text-xs font-semibold"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Anaikatti Hills Road, Coimbatore"
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Status & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project Status *</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="active">🟢 Active</option>
                <option value="upcoming">🟡 Upcoming</option>
                <option value="sold_out">⚪ Sold Out</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Price / Cent (₹) *</Label>
              <Input
                type="number"
                value={pricePerCent}
                onChange={(e) => setPricePerCent(Number(e.target.value))}
                placeholder="125000"
                className="text-xs font-semibold text-emerald-800"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Total Plots</Label>
              <Input
                type="number"
                value={totalPlots}
                onChange={(e) => setTotalPlots(Number(e.target.value))}
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Available Plots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Available Plots Remaining</Label>
              <Input
                type="number"
                value={availablePlots}
                onChange={(e) => setAvailablePlots(Number(e.target.value))}
                className="text-xs font-semibold text-slate-800"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Inventory Summary</Label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex justify-between items-center">
                <span>Sold / Booked:</span>
                <strong className="text-emerald-700">{Math.max(0, totalPlots - availablePlots)} plots</strong>
              </div>
            </div>
          </div>

          {/* Water & Soil Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-blue-600" />
                <span>Water Source & Borewells</span>
              </Label>
              <Input
                value={waterSource}
                onChange={(e) => setWaterSource(e.target.value)}
                placeholder="e.g. Perennial stream + 2 Borewells (450 ft)"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                <Sprout className="h-3.5 w-3.5 text-emerald-600" />
                <span>Soil Type & Cultivation</span>
              </Label>
              <Input
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                placeholder="e.g. Virgin Red Soil, rich organic loam"
                className="text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Project Description & Marketing Highlights</Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Highlight key advantages, mountain view, proximity to Coimbatore airport, gated security, club house, etc."
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
                  <span>Saving Project...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Project Details</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
