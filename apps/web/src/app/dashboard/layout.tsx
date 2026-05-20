import { DashboardProvider } from './DashboardContext'
import HelpChatLoader from '@/components/HelpChatLoader'
import DashboardShell from '@/components/dashboard/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>
        {children}
        <HelpChatLoader />
      </DashboardShell>
    </DashboardProvider>
  )
}
