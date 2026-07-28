import { createFileRoute } from '@tanstack/react-router'
import { Store } from '@/features/store'

export const Route = createFileRoute('/store/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Store />
}
