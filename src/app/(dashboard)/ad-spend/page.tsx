'use client';

import React from 'react';
import { BadgeDollarSign, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyINR } from '@/lib/utils';

export default function AdSpendPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Campaign Ad Spend Tracking
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log marketing spends on Meta and Google Ads to compute live CPL and CAC.
          </p>
        </div>
        <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
          <Plus className="h-4 w-4" />
          <span>Record Daily Spend</span>
        </Button>
      </div>

      <Card className="bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs">Campaign Name</TableHead>
              <TableHead className="text-xs text-right">Spend Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-xs">26 Sep 2026</TableCell>
              <TableCell>
                <Badge variant="info" className="text-[10px]">Meta</Badge>
              </TableCell>
              <TableCell className="text-xs font-medium">Coimbatore_Foothills_Farmplots_Q3</TableCell>
              <TableCell className="text-xs text-right font-bold text-emerald-800">
                {formatCurrencyINR(3500)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="text-xs">26 Sep 2026</TableCell>
              <TableCell>
                <Badge variant="warning" className="text-[10px]">Google</Badge>
              </TableCell>
              <TableCell className="text-xs font-medium">Search_Farmlands_Pollachi_Road</TableCell>
              <TableCell className="text-xs text-right font-bold text-emerald-800">
                {formatCurrencyINR(2800)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
