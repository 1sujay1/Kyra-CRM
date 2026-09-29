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
  Trash2,
  RefreshCw,
  Droplets,
  Sprout,
  CheckCircle2,
  Sparkles,
  BarChart2,
  PieChart,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrencyINR } from '@/lib/utils';
import {
  FarmlandProjectItem,
  fetchProjectsAction,
  deleteProjectAction,
} from '@/lib/projects/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { EditProjectModal } from '@/components/projects/edit-project-modal';
import { PlotMatrixModal } from '@/components/projects/plot-matrix-modal';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<FarmlandProjectItem[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('digital_marketing');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<FarmlandProjectItem | null>(null);

  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState<boolean>(false);
  const [selectedProjectForMatrix, setSelectedProjectForMatrix] = useState<FarmlandProjectItem | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const [data, user] = await Promise.all([
        fetchProjectsAction(),
        getCurrentUserAction(),
      ]);
      setProjects(data);
      if (user?.role) {
        setCurrentUserRole(user.role);
      }
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

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = async (e: React.MouseEvent, project: FarmlandProjectItem) => {
    e.stopPropagation();

    if (currentUserRole !== 'admin') {
      alert('ACCESS DENIED: Only Admin (Adminkyra) has permission to delete projects.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis will remove the project and its plot inventory from the system and server database.`
    );
    if (!confirmed) return;

    setDeletingProjectId(project.id);
    try {
      // Optimistic UI update
      setProjects((prev) => prev.filter((p) => p.id !== project.id));

      const res = await deleteProjectAction(project.id);
      if (!res.success) {
        alert(res.error || 'Failed to delete project from server.');
        loadProjects();
      }
    } catch (err: any) {
      alert('Error deleting project. Please try again.');
      loadProjects();
    } finally {
      setDeletingProjectId(null);
    }
  };

  // KPI Calculations
  const totalProjects = projects.length;
  const totalInventory = projects.reduce((acc, p) => acc + (p.total_plots || 0), 0);
  const availableInventory = projects.reduce((acc, p) => acc + (p.available_plots || 0), 0);
  const bookedOrSold = Math.max(0, totalInventory - availableInventory);
  const occupancyRate = totalInventory > 0 ? Math.round((bookedOrSold / totalInventory) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Farmland Projects & Inventory</span>
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                Coimbatore Farmlands
              </Badge>
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage Coimbatore agro estate locations, price per cent, water/borewell infrastructure, and live plot matrices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProjects}
            disabled={isLoading}
            className="text-xs gap-1.5 shadow-xs"
            title="Refresh projects"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Project</span>
          </Button>
        </div>
      </div>

      {/* MODERN ANIMATED INVENTORY STATS BOXES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Estates */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 border border-emerald-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Estates
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <Trees className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
              {totalProjects} <span className="text-xs sm:text-sm font-sans font-medium text-slate-500">Locations</span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-700 mt-1 font-medium truncate">Coimbatore & Pollachi</p>
          </div>
        </div>

        {/* Card 2: Total Plots Master */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 border border-blue-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Master Plots
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 group-hover:scale-110 transition-transform">
              <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-blue-800">
              {totalInventory} <span className="text-xs sm:text-sm font-sans font-medium text-slate-500">Plots</span>
            </div>
            <p className="text-[11px] sm:text-xs text-blue-600 mt-1 font-medium truncate">Total Inventory</p>
          </div>
        </div>

        {/* Card 3: Available for Sale */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 border border-emerald-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Available
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-700">
              {availableInventory} <span className="text-xs sm:text-sm font-sans font-medium text-slate-500">Plots</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-emerald-700 font-medium truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">Ready for registry</span>
            </div>
          </div>
        </div>

        {/* Card 4: Booked / Registered */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-white p-3.5 sm:p-5 border border-amber-100 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
              Occupancy
            </span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 group-hover:scale-110 transition-transform">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-amber-800">
              {occupancyRate}% <span className="text-xs sm:text-sm font-sans font-medium text-slate-500 truncate">({bookedOrSold})</span>
            </div>
            <p className="text-[11px] sm:text-xs text-amber-700 mt-1 font-medium truncate">Token or Registry</p>
          </div>
        </div>
      </div>

      {/* INVENTORY DISTRIBUTION DIAGRAM */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl border border-slate-700/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/50">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
                Farmland Inventory Allocation & Distribution Diagram
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live capacity and plot availability across all active project estates.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Available ({availableInventory})
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Booked / Sold ({bookedOrSold})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {projects.map((proj) => {
            const sold = (proj.total_plots || 0) - (proj.available_plots || 0);
            const pct = proj.total_plots > 0 ? Math.round((sold / proj.total_plots) * 100) : 0;
            return (
              <div
                key={proj.id}
                className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-slate-600 transition-colors"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-xs text-white truncate max-w-[170px]" title={proj.name}>
                    {proj.name}
                  </span>
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {formatCurrencyINR(proj.price_per_cent)}/cent
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                  <span>{proj.available_plots} Available</span>
                  <span>{sold} Booked ({pct}%)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700/80 h-2 rounded-full overflow-hidden flex">
                  <div
                    className="bg-amber-400 h-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                    title={`Booked/Sold: ${sold} (${pct}%)`}
                  />
                  <div
                    className="bg-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${100 - pct}%` }}
                    title={`Available: ${proj.available_plots}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PROJECTS GRID */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-muted-foreground bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
          <span>Loading farmland estates and plot inventories...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <Trees className="h-10 w-10 text-emerald-600 mx-auto mb-3 opacity-80" />
          <h3 className="text-base font-semibold text-slate-900">No Farmland Projects Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            All projects have been removed from the server database. Click below to add a new farmland project.
          </p>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="mt-4 gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add New Project</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white flex flex-col justify-between border-slate-200"
            >
              <div>
                {/* Project Header Banner */}
                <div className="h-32 bg-gradient-to-r from-emerald-950/10 via-emerald-800/10 to-teal-900/10 p-5 flex flex-col justify-between relative border-b">
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
                        className="h-8 px-2.5 text-xs bg-white/90 hover:bg-white text-slate-700 shadow-xs gap-1 cursor-pointer"
                        title="Edit Project Details"
                      >
                        <Edit className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Edit</span>
                      </Button>

                      {currentUserRole === 'admin' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleDeleteProject(e, project)}
                          disabled={deletingProjectId === project.id}
                          className="h-8 px-2.5 text-xs bg-white/90 hover:bg-red-50 text-red-600 hover:text-red-700 hover:border-red-200 shadow-xs gap-1 cursor-pointer transition-colors"
                          title="Delete Project and Plot Inventory from Server (Admin Only)"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          <span>Delete</span>
                        </Button>
                      )}

                      <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                        <Trees className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 leading-snug">
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
                    <div className="space-y-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
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

                  {/* Price and Plot Ratio Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        Price Per Cent
                      </span>
                      <p className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                        {formatCurrencyINR(project.price_per_cent)}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                        Availability
                      </span>
                      <p className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                        <span className="text-emerald-700">{project.available_plots}</span>
                        <span className="text-slate-400 font-normal"> / {project.total_plots}</span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="p-5 pt-0">
                <Button
                  onClick={() => handleOpenMatrix(project)}
                  className="w-full text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white gap-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Open Interactive Plot Matrix</span>
                  <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={selectedProjectForEdit}
        onSaved={handleProjectSaved}
      />

      {/* Interactive Plot Matrix Modal */}
      {selectedProjectForMatrix && (
        <PlotMatrixModal
          isOpen={isMatrixModalOpen}
          onClose={() => setIsMatrixModalOpen(false)}
          project={selectedProjectForMatrix}
          onProjectUpdated={(updatedProject) => {
            handleProjectSaved(updatedProject);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
