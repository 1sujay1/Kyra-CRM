'use client';

import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logoutAction } from '@/lib/auth/actions';

export type UserRole = 'admin' | 'digital_marketing' | 'manager' | 'sales_executive' | 'channel_partner';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  orgName?: string;
  onToggleMobileMenu?: () => void;
}

const roleBadgeVariantMap: Record<UserRole, 'default' | 'success' | 'warning' | 'info'> = {
  admin: 'default',
  digital_marketing: 'info',
  manager: 'info',
  sales_executive: 'success',
  channel_partner: 'warning',
};

export function Header({
  userName = 'Admin User',
  userEmail = 'admin@kyragroup.com',
  userRole = 'admin',
  orgName = 'Kyra Group (Coimbatore Farmlands)',
  onToggleMobileMenu,
}: HeaderProps) {
  const handleSignOut = async () => {
    try {
      await logoutAction();
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  return (
    <header className="h-16 border-b bg-card px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left side: Mobile Hamburger + Brand / Desktop Org Name */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Mobile Logo Mark */}
        <div className="lg:hidden flex items-center gap-2 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-emerald-950 p-1 flex items-center justify-center shadow-xs">
            <img src="/kyra-icon.png" alt="Kyra" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold text-sm text-slate-900 tracking-tight hidden xs:inline sm:hidden">
            Kyra CRM
          </span>
        </div>

        {/* Desktop / Tablet Org Details */}
        <div className="hidden sm:flex items-center gap-2.5 min-w-0">
          <span className="text-sm font-semibold text-foreground tracking-tight truncate max-w-[240px] md:max-w-none">
            {orgName}
          </span>
          <span className="text-muted-foreground text-sm">/</span>
        </div>

        <Badge
          variant={roleBadgeVariantMap[userRole] || 'default'}
          className="uppercase tracking-wider text-[9px] sm:text-[10px] px-2 py-0.5 shrink-0"
        >
          {userRole.replace('_', ' ')}
        </Badge>
      </div>

      {/* Right side: User Profile + Logout */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 text-right">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-300 shadow-2xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-foreground leading-tight">{userName}</p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">{userEmail}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-muted-foreground hover:text-destructive h-8 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
