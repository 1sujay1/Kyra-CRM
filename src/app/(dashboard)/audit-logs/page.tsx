'use client';

import React from 'react';
import { Shield, FileText, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const auditEntries = [
  {
    id: 'log-1',
    user: 'Adminkyra (Admin)',
    action: 'phone_reveal',
    entity: 'Customer Phone Mask Decrypted',
    ip: '122.178.45.10 (Coimbatore)',
    time: '2 mins ago',
  },
  {
    id: 'log-2',
    user: 'dmkyra (Marketing)',
    action: 'status_change',
    entity: 'Farmland Lead Status Updated',
    ip: '122.178.45.10 (Coimbatore)',
    time: '45 mins ago',
  },
  {
    id: 'log-3',
    user: 'Adminkyra (Admin)',
    action: 'booking_approve',
    entity: 'Farmland Plot Reservation Approved',
    ip: '122.178.45.10 (Coimbatore)',
    time: '1 hour ago',
  },
  {
    id: 'log-4',
    user: 'Meta Ads Webhook',
    action: 'lead_create',
    entity: 'Campaign: Coimbatore_Foothills_Farmplots',
    ip: 'Meta Graph Webhook Server',
    time: '3 hours ago',
  },
];

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Security & Compliance Audit Trail
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable log of all sensitive user actions: logins, phone reveals, status transitions, and data exports.
        </p>
      </div>

      <Card className="bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs">User / Actor</TableHead>
              <TableHead className="text-xs">Action Taken</TableHead>
              <TableHead className="text-xs">Target Entity</TableHead>
              <TableHead className="text-xs">Client IP / Origin</TableHead>
              <TableHead className="text-xs text-right">Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditEntries.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs font-semibold">{log.user}</TableCell>
                <TableCell>
                  <Badge variant={log.action === 'phone_reveal' ? 'warning' : 'secondary'} className="text-[10px] uppercase font-mono">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-foreground font-mono">{log.entity}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.ip}</TableCell>
                <TableCell className="text-xs text-right text-muted-foreground">{log.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
