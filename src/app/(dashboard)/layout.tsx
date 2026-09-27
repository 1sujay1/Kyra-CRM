import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { SessionTimeoutProvider } from '@/components/layout/session-timeout-provider';
import { getCurrentUserAction } from '@/lib/auth/actions';
import { UserRole } from '@/types/database.types';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUserAction();

  const userName = currentUser?.username || 'Adminkyra';
  const userEmail = currentUser?.email || 'adminkyra@kyragroup.com';
  const userRole = (currentUser?.role || 'admin') as UserRole;
  const orgName = 'Kyra Group (Coimbatore Farmlands)';

  return (
    <SessionTimeoutProvider timeoutMinutes={480}>
      <div className="min-h-screen bg-slate-50/50 flex">
        <AppSidebar userRole={userRole} />
        <div className="flex-1 flex flex-col pl-64">
          <Header
            userName={userName}
            userEmail={userEmail}
            userRole={userRole}
            orgName={orgName}
          />
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SessionTimeoutProvider>
  );
}
