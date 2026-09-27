'use client';

import React, { useState, useEffect } from 'react';
import {
  Trees,
  MapPin,
  Layers,
  IndianRupee,
  ArrowUpRight,
  Plus,
  Edit,
  RefreshCw,
  Droplets,
  Sprout,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrencyINR } from '@/lib/utils';
import {
  FarmlandProjectItem,
  fetchProjectsAction,
} from '@/lib/projects/actions';
import { EditProjectModal } from '@/components/projects/edit-project-modal';
import { PlotMatrixModal } from '@/components/projects/plot-matrix-modal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<FarmlandProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<FarmlandProjectItem | null>(null);

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState<boolean>(false);
  const [selectedProjectForMatrix, setSelectedProjectForMatrix] = useState<FarmlandProjectItem | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjectsAction();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpenCreate = () => {
    setSelectedProjectForEdit(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (project: FarmlandProjectItem) => {
    setSelectedProjectForEdit(project);
    setIsEditModalOpen(true);
  };

  const handleOpenMatrix = (project: FarmlandProjectItem) => {
    setSelectedProjectForMatrix(project);
    setIsMatrixModalOpen(true);
  };

  const handleProjectSaved = (savedProject: FarmlandProjectItem) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === savedProject.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedProject;
        return updated;
      }
      return [...prev, savedProject];
    });
  };

  // KPI Calculations
  const totalProjects = projects.length;
  const totalInventory = projects.reduce((acc, p) => acc + (p.total_plots || 0), 0);
  const availableInventory = projects.reduce((acc, p) => acc + (p.available_plots || 0), 0);
  const bookedOrSold = Math.max(0, totalInventory - availableInventory);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Farmland Projects & Inventory</span>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
              Coimbatore Agro Estates
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage farmland locations, price per cent, water/borewell infrastructure, and plot availability matrices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjects}
            disabled={isLoading}
            className="text-xs gap-1.5"
            title="Refresh projects"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Project</span>
          </Button>
        </div>
      </div>

      {/* TOP INVENTORY STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Trees className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Farmland Estates</p>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">{totalProjects} Projects</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Plots Master</p>
              <h4 className="text-xl font-bold text-blue-700 mt-0.5">{totalInventory} Plots</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Available for Sale</p>
              <h4 className="text-xl font-bold text-emerald-700 mt-0.5">{availableInventory} Plots</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-100 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Booked / Registered</p>
              <h4 className="text-xl font-bold text-amber-700 mt-0.5">{bookedOrSold} Plots</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PROJECTS GRID */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Loading farmland estates and plot inventories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col justify-between border-slate-200"
            >
              <div>
                {/* Project Header Banner */}
                <div className="h-32 bg-emerald-900/10 p-5 flex flex-col justify-between relative border-b">
                  <div className="flex justify-between items-start">
                    <Badge
                      className={`capitalize text-xs font-semibold ${
                        project.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : project.status === 'upcoming'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-800 border-slate-300'
                      }`}
                    >
                      {project.status.replace('_', ' ')}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenEdit(project)}
                        className="h-8 px-2.5 text-xs bg-white/90 hover:bg-white text-slate-700 shadow-xs gap-1"
                        title="Edit Project Details"
                      >
                        <Edit className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Edit</span>
                      </Button>

                      <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                        <Trees className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-foreground leading-snug">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </p>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3.5">
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {project.description}
                  </p>

                  {/* Water & Soil Highlights */}
                  {(project.water_source || project.soil_type) && (
                    <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                      {project.water_source && (
                        <div className="flex items-start gap-1.5 text-slate-700">
                          <Droplets className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="truncate font-medium">{project.water_source}</span>
                        </div>
                      )}
                      {project.soil_type && (
                        <div className="flex items-start gap-1.5 text-slate-700">
                          <Sprout className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="truncate font-medium">{project.soil_type}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price and Plot Availability */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Price / Cent</span>
                      <span className="font-bold text-emerald-800 text-sm">
                        {formatCurrencyINR(project.price_per_cent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Availability</span>
                      <span className="font-bold text-foreground text-sm">
                        <span className="text-emerald-700 font-extrabold">{project.available_plots}</span>
                        <span className="text-muted-foreground font-normal"> / {project.total_plots} plots</span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 pt-0 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenMatrix(project)}
                  className="w-full text-xs gap-1.5 bg-emerald-50/50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900 font-semibold"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-700" />
                  <span>View Plot Availability Matrix</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* EDIT / CREATE PROJECT MODAL */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProjectForEdit}
        onSaved={handleProjectSaved}
      />

      {/* PLOT MATRIX & INVENTORY MODAL */}
      <PlotMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        project={selectedProjectForMatrix}
        onProjectUpdated={handleProjectSaved}
      />
    </div>
  );
}
