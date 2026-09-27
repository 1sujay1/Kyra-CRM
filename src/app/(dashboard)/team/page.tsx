'use client';

import React from 'react';
import { ShieldCheck, UserPlus, Mail, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const teamMembers = [
  {
    id: 'u-1',
    full_name: 'Suresh Narayanan',
    email: 'suresh.n@kyragroup.com',
    role: 'admin',
    is_active: true,
  },
  {
    id: 'u-2',
    full_name: 'Meenakshi Sundaram',
    email: 'meenakshi.s@kyragroup.com',
    role: 'manager',
    is_active: true,
  },
  {
    id: 'u-3',
    full_name: 'Priya Raman',
    email: 'priya.raman@kyragroup.com',
    role: 'sales_executive',
    is_active: true,
  },
  {
    id: 'u-4',
    full_name: 'Vignesh Kumar',
    email: 'vignesh.k@kyragroup.com',
    role: 'sales_executive',
    is_active: true,
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Team & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Admin invitation workflow. Sales executives only access their explicitly assigned farmland leads.
          </p>
        </div>
        <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </Button>
      </div>

      <Card className="bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs">Full Name</TableHead>
              <TableHead className="text-xs">Work Email</TableHead>
              <TableHead className="text-xs">Assigned Role</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamMembers.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="text-xs font-semibold">{member.full_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{member.email}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'admin' ? 'default' : member.role === 'manager' ? 'info' : 'success'} className="text-[10px] uppercase">
                    {member.role.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Edit Permissions
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
