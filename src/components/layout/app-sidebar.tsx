'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Trees,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types/database.types';

interface SidebarProps {
  userRole?: UserRole;
}

export function AppSidebar({ userRole = 'admin' }: SidebarProps) {
  const pathname = usePathname();

  // Core operational menu: Leads, Farmland Projects, Site Visits, Bookings, Team
  const navItems = [
    {
      title: 'Leads Pipeline',
      href: '/leads',
      icon: Users,
      roles: ['admin', 'manager', 'sales_executive', 'channel_partner'],
    },
    {
      title: 'Farmland Projects',
      href: '/projects',
      icon: Trees,
      roles: ['admin', 'manager', 'sales_executive', 'channel_partner'],
    },
    {
      title: 'Site Visits',
      href: '/site-visits',
      icon: CalendarCheck,
      roles: ['admin', 'manager', 'sales_executive'],
    },
    {
      title: 'Bookings',
      href: '/bookings',
      icon: CreditCard,
      roles: ['admin', 'manager', 'sales_executive'],
    },
    {
      title: 'Team Management',
      href: '/team',
      icon: ShieldCheck,
      roles: ['admin'],
    },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Brand Header */}
      <div className="h-16 border-b px-5 flex items-center gap-3 bg-emerald-950 text-white">
        <div className="h-10 w-10 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
          <img src="/kyra-icon.png" alt="Kyra Group" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-base leading-tight tracking-wide truncate">Kyra Group</h1>
          <p className="text-[11px] text-emerald-300 font-medium truncate">Coimbatore Farmlands</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-50 text-emerald-900 font-semibold border-l-4 border-emerald-700'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-700' : 'text-muted-foreground')} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t text-xs text-muted-foreground bg-muted/20">
        <p className="font-semibold text-foreground">Kyra Farmland CRM</p>
        <p className="text-[11px] mt-0.5">Coimbatore Foothills Estates</p>
      </div>
    </aside>
  );
}
