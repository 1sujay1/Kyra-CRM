'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { UserRole } from '@/types/database.types';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  orgName?: string;
}

const roleBadgeVariantMap: Record<UserRole, 'default' | 'success' | 'warning' | 'info'> = {
  admin: 'default',
  manager: 'info',
  sales_executive: 'success',
  channel_partner: 'warning',
};

export function Header({
  userName = 'Admin User',
  userEmail = 'admin@kyragroup.com',
  userRole = 'admin',
  orgName = 'Kyra Farmland Estates Ltd',
}: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push('/login');
  };

  return (
    <header className="h-16 border-b bg-card px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground tracking-tight">{orgName}</span>
        <span className="text-muted-foreground text-sm">/</span>
        <Badge variant={roleBadgeVariantMap[userRole] || 'default'} className="uppercase tracking-wider text-[10px]">
          {userRole.replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-right">
          <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs border border-emerald-300">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{userName}</p>
            <p className="text-[11px] text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="text-xs gap-1.5 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
