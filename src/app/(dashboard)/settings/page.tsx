'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Shield,
  Briefcase,
  Loader2,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  fetchExecutivesAction,
  createExecutiveAction,
  deleteExecutiveAction,
  toggleExecutiveStatusAction,
  ExecutiveItem,
} from '@/lib/executives/actions';
import { getCurrentUserAction } from '@/lib/auth/actions';

export default function SettingsPage() {
  const [executives, setExecutives] = useState<ExecutiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Sales Executive');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, user] = await Promise.all([
        fetchExecutivesAction(),
        getCurrentUserAction(),
      ]);
      setExecutives(list);
      if (user) setCurrentUserRole(user.role);
    } catch (err) {
      console.error('Failed to load executives:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await createExecutiveAction({
        name,
        phone,
        email,
        designation,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create executive.');
      } else {
        setIsAddModalOpen(false);
        setName('');
        setPhone('');
        setEmail('');
        setDesignation('Sales Executive');
        loadData();
      }
    } catch {
      setFormError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, execName: string) => {
    if (!confirm(`Are you sure you want to remove executive "${execName}"?`)) return;
    setExecutives((prev) => prev.filter((ex) => ex.id !== id));
    await deleteExecutiveAction(id);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setExecutives((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, is_active: nextStatus } : ex))
    );
    await toggleExecutiveStatusAction(id, nextStatus);
  };

  const filteredExecutives = executives.filter(
    (ex) =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.phone.includes(search) ||
      ex.email.toLowerCase().includes(search.toLowerCase()) ||
      ex.designation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-emerald-700" />
            <span>Settings & Executive Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create and manage sales executives for lead assignment across farmland projects.
          </p>
        </div>

        {currentUserRole === 'admin' && (
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Create Executive</span>
          </Button>
        )}
      </div>

      {/* Main Card */}
      <Card className="bg-white border-slate-200 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Sales Executives Directory</span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {executives.length} {executives.length === 1 ? 'Executive' : 'Executives'}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Executives added here will appear in the Lead Assignment and Site Visit scheduling dropdowns.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search executive name, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-xs h-8 bg-white border-slate-200 rounded-lg"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-8 w-8 p-0 shrink-0"
                title="Refresh List"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-700' : 'text-slate-600'}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-2.5 text-slate-500 text-xs">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
              <span className="font-semibold text-slate-700">Loading executives...</span>
            </div>
          ) : filteredExecutives.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                <Briefcase className="h-7 w-7" />
              </div>
              <p className="font-bold text-slate-900 text-base">No Sales Executives Found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search ? 'No executives match your search criteria.' : 'Click "+ Create Executive" above to add your first sales executive.'}
              </p>
              {!search && currentUserRole === 'admin' && (
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-2 font-semibold"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Create Executive</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/90 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-800 py-3 pl-5">Executive Name</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 py-3">Phone Number</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 py-3">Work Email</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 py-3">Designation</TableHead>
                    <TableHead className="text-xs font-bold text-slate-800 py-3">Status</TableHead>
                    {currentUserRole === 'admin' && (
                      <TableHead className="text-xs font-bold text-slate-800 py-3 text-right pr-5">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExecutives.map((exec) => (
                    <TableRow key={exec.id} className="hover:bg-slate-50/70 border-b border-slate-100">
                      {/* Name */}
                      <TableCell className="py-3 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
                            {exec.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 block">{exec.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Added {new Date(exec.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-mono">
                          <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span>{exec.phone}</span>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3">
                        {exec.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{exec.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </TableCell>

                      {/* Designation */}
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {exec.designation}
                        </span>
                      </TableCell>

                      {/* Status Toggle */}
                      <TableCell className="py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(exec.id, exec.is_active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                            exec.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle active / inactive"
                        >
                          {exec.is_active ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 text-slate-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </TableCell>

                      {/* Actions */}
                      {currentUserRole === 'admin' && (
                        <TableCell className="py-3 text-right pr-5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exec.id, exec.name)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Remove Executive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE EXECUTIVE MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Create Sales Executive
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Add a new executive for lead follow-ups and site visit inspections.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {formError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Full Name *</Label>
              <Input
                placeholder="e.g. Anandha Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Phone Number *</Label>
              <Input
                placeholder="e.g. +91 98421 23456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Work Email (Optional)</Label>
              <Input
                type="email"
                placeholder="e.g. anand.k@kyragroup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Designation / Role</Label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-white px-3"
              >
                <option value="Sales Executive">Sales Executive</option>
                <option value="Senior Farmland Consultant">Senior Farmland Consultant</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Field Specialist">Field Specialist</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold gap-1.5"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{submitting ? 'Creating...' : 'Save Executive'}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


