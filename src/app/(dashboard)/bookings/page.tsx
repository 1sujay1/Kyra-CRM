'use client';

import React from 'react';
import { CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrencyINR } from '@/lib/utils';

export default function BookingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Plot Bookings & Approvals
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Booking requests submitted by Sales Executives awaiting Admin or Manager confirmation.
          </p>
        </div>
      </div>

      <Card className="bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">Vikram Chandrasekar</h4>
                <Badge variant="success" className="text-[10px]">Confirmed</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Plot #A-14 (25 Cents) — Anaikatti Green Acres
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-muted-foreground block">Agreed Price</span>
              <span className="font-bold text-sm text-emerald-800">
                {formatCurrencyINR(3125000)}
              </span>
            </div>
          </div>
          <div className="pt-3 flex flex-wrap justify-between items-center text-xs text-muted-foreground">
            <span>Advance Token: {formatCurrencyINR(200000)} via NEFT</span>
            <span className="text-[11px]">Approved by Admin on 26 Sep 2026</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
