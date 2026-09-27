'use client';

import React from 'react';
import { CalendarCheck, MapPin, Plus, Clock, Car } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SiteVisitsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Farmland Site Visits
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule customer farmland tours with Coimbatore airport/railway station pickup coordination.
          </p>
        </div>
        <Button size="sm" className="gap-2 text-xs bg-emerald-700 hover:bg-emerald-800 text-white">
          <Plus className="h-4 w-4" />
          <span>Schedule Visit</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-white border-emerald-100 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Karthik Subramanian</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Anaikatti Green Acres</p>
            </div>
            <Badge variant="warning" className="text-[10px]">
              Scheduled
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Tomorrow at 10:30 AM</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="h-3.5 w-3.5 text-blue-600" />
              <span>Pickup: Coimbatore Airport (CJB)</span>
            </div>
            <div className="pt-2 border-t flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Executive: Priya Raman</span>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                Manage Visit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
