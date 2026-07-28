import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Checkout } from '@/features/store/components/Checkout'

const checkoutSearchSchema = z.object({
  product: z.string(),
})

export const Route = createFileRoute('/store/checkout')({
  component: RouteComponent,
  validateSearch: checkoutSearchSchema,
})

function RouteComponent() {
  const { product } = Route.useSearch()
  return <Checkout productSlug={product} />
}
