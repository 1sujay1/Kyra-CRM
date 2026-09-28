import { DashboardShell } from '@/components/layout/dashboard-shell';
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
      <DashboardShell
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        orgName={orgName}
      >
        {children}
      </DashboardShell>
    </SessionTimeoutProvider>
  );
}
