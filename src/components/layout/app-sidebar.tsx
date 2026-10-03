'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  CalendarCheck,
  CreditCard,
  Trees,
  X,
  MapPin,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type UserRole = 'admin' | 'digital_marketing' | 'manager' | 'sales_executive' | 'channel_partner';

interface SidebarProps {
  userRole?: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({
  userRole = 'admin',
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  // Core operational menu: Leads, Meta Campaigns, Farmland Projects, Site Visits, Bookings
  const navItems = [
    {
      title: 'Leads Pipeline',
      href: '/leads',
      icon: Users,
      roles: ['admin', 'manager', 'sales_executive', 'channel_partner', 'digital_marketing'],
    },
    {
      title: 'Meta Campaigns',
      href: '/meta-leads',
      icon: Megaphone,
      roles: ['admin', 'manager', 'sales_executive', 'channel_partner', 'digital_marketing'],
    },
    {
      title: 'Farmland Projects',
      href: '/projects',
      icon: Trees,
      roles: ['admin', 'manager', 'sales_executive', 'channel_partner', 'digital_marketing'],
    },
    {
      title: 'Site Visits',
      href: '/site-visits',
      icon: CalendarCheck,
      roles: ['admin', 'manager', 'sales_executive', 'digital_marketing'],
    },
    {
      title: 'Bookings',
      href: '/bookings',
      icon: CreditCard,
      roles: ['admin', 'manager', 'sales_executive', 'digital_marketing'],
    },
  ];

  const allowedItems = navItems.filter((item) => item.roles.includes(userRole));

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="h-16 border-b px-5 flex items-center justify-between bg-emerald-950 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
            <img src="/kyra-icon.png" alt="Kyra Group" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-base leading-tight tracking-wide truncate">Kyra Group</h1>
            <p className="text-[11px] text-emerald-300 font-medium truncate">Coimbatore Farmlands</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
          Operations
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
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
      <div className="p-4 border-t text-xs text-muted-foreground bg-muted/20 shrink-0">
        <p className="font-semibold text-foreground">Kyra Farmland CRM</p>
        <p className="text-[11px] mt-0.5 text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 text-emerald-600" />
          <span>Coimbatore Foothills Estates</span>
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 border-r bg-card hidden lg:flex flex-col h-screen fixed left-0 top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Slide-Over) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-card border-r shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
