'use client';

import React, { useState } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { UserRole } from '@/types/database.types';

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  orgName: string;
}

export function DashboardShell({
  children,
  userName,
  userEmail,
  userRole,
  orgName,
}: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar: persistent on desktop (lg:), slide-over drawer on mobile */}
      <AppSidebar
        userRole={userRole}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Container: pl-0 on mobile, lg:pl-64 on desktop */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 transition-all">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          orgName={orgName}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Content Area: extra bottom padding on mobile for bottom navigation bar */}
        <main className="flex-1 p-3 sm:p-5 lg:p-8 pb-24 lg:pb-8 min-w-0 overflow-y-auto">
          {children}
        </main>

        {/* Mobile-only Bottom Navigation Bar */}
        <MobileBottomNav onOpenMenu={() => setIsMobileMenuOpen(true)} />
      </div>
    </div>
  );
}
