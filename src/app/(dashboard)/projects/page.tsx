'use client';

import React from 'react';
import { Trees, MapPin, Layers, IndianRupee, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrencyINR } from '@/lib/utils';

interface FarmlandProject {
  id: string;
  name: string;
  location: string;
  description: string;
  price_per_cent: number;
  total_plots: number;
  available_plots: number;
  status: 'active' | 'upcoming' | 'sold_out';
}

const sampleProjects: FarmlandProject[] = [
  {
    id: 'proj-1',
    name: 'Anaikatti Green Acres',
    location: 'Anaikatti Hills Road, Coimbatore',
    description: 'Scenic hill-view organic farmland plots with mountain breeze and drip-irrigation infrastructure.',
    price_per_cent: 125000,
    total_plots: 32,
    available_plots: 14,
    status: 'active',
  },
  {
    id: 'proj-2',
    name: 'Pollachi Coconut Groves',
    location: 'Pollachi Main Road, Kinathukadavu',
    description: 'High-yield mature coconut farmland plots with perennial borewells and road frontage.',
    price_per_cent: 145000,
    total_plots: 45,
    available_plots: 8,
    status: 'active',
  },
  {
    id: 'proj-3',
    name: 'Siruvani Valley Farmlands',
    location: 'Siruvani Foothills, Alandurai',
    description: 'Pure crystal Siruvani water table zone ideal for wellness farmhouse estates.',
    price_per_cent: 180000,
    total_plots: 24,
    available_plots: 19,
    status: 'upcoming',
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Farmland Projects & Inventory
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Active and upcoming managed farmland estates across the Coimbatore region.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleProjects.map((project) => (
          <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
            <div>
              <div className="h-32 bg-emerald-900/10 p-6 flex flex-col justify-between relative border-b">
                <div className="flex justify-between items-start">
                  <Badge variant={project.status === 'active' ? 'success' : 'warning'} className="capitalize text-xs font-semibold">
                    {project.status}
                  </Badge>
                  <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                    <Trees className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground leading-snug">{project.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-emerald-600" />
                    <span>{project.location}</span>
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {project.description}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Price / Cent</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {formatCurrencyINR(project.price_per_cent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Availability</span>
                    <span className="font-semibold text-foreground text-sm">
                      {project.available_plots} / {project.total_plots} plots
                    </span>
                  </div>
                </div>
              </CardContent>
            </div>

            <div className="p-6 pt-0">
              <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 hover:bg-emerald-50 hover:text-emerald-800">
                <span>View Plot Availability Matrix</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
