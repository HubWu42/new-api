import { createFileRoute } from '@tanstack/react-router'
import { OrderLookup } from '@/features/store/components/OrderLookup'

export const Route = createFileRoute('/store/orders')({
  component: RouteComponent,
})

function RouteComponent() {
  return <OrderLookup />
}
