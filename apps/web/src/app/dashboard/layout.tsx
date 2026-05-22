import { DashboardProvider } from './DashboardContext'
import HelpChatLoader from '@/components/HelpChatLoader'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { AuthFetchPatch } from '@/components/AuthFetchPatch'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <AuthFetchPatch />
      <DashboardShell>
        {children}
        <HelpChatLoader />
      </DashboardShell>
    </DashboardProvider>
  )
}
