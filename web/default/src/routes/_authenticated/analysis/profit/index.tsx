import { createFileRoute } from '@tanstack/react-router'
import { ProfitDashboardPage } from '@/features/profit/components/profit-dashboard'

export const Route = createFileRoute('/_authenticated/analysis/profit/')({
  component: ProfitDashboardPage,
})
