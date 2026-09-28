'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Trees, CalendarCheck, CreditCard, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export function MobileBottomNav({ onOpenMenu }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Leads',
      href: '/leads',
      icon: Users,
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: Trees,
    },
    {
      label: 'Site Visits',
      href: '/site-visits',
      icon: CalendarCheck,
    },
    {
      label: 'Bookings',
      href: '/bookings',
      icon: CreditCard,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 select-none min-w-[56px]',
              isActive
                ? 'text-emerald-800 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            )}
          >
            <div
              className={cn(
                'p-1 rounded-lg transition-colors',
                isActive ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500'
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
          </Link>
        );
      })}

      {/* Menu / Drawer Toggle */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 font-medium transition-all select-none min-w-[56px]"
      >
        <div className="p-1 rounded-lg text-slate-500 hover:bg-slate-100">
          <Menu className="h-4 w-4" />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
      </button>
    </nav>
  );
}
