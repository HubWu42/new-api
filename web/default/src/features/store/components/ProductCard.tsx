import { useTranslation } from 'react-i18next'
import { ShoppingBag, Key, Ticket, User, Zap } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StoreProduct } from '../types'

const iconMap: Record<string, typeof Zap> = {
  'api-quota-500k': Zap,
  'gpt-plus-monthly': Ticket,
  'pro-account-monthly': User,
}

const fulfillmentBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  auto: { label: '自动发货', variant: 'default' },
  manual: { label: '人工开通', variant: 'secondary' },
}

interface ProductCardProps {
  product: StoreProduct
  onBuy: (product: StoreProduct) => void
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
  const { t } = useTranslation()
  const Icon = iconMap[product.slug] ?? Key
  const badge = fulfillmentBadge[product.fulfillmentType]

  return (
    <Card
      className={cn(
        'group relative flex flex-col overflow-hidden',
        'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      <CardContent className="flex flex-col gap-3 p-5">
        {/* Icon + Badge Row */}
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <Badge variant={badge.variant} className="text-xs">
            {badge.label}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold leading-tight">{product.title}</h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {product.description}
        </p>

        {/* Stock */}
        {product.stockStatus === 'out_of_stock' ? (
          <Badge variant="destructive" className="w-fit text-xs">
            已售罄
          </Badge>
        ) : product.stockStatus === 'limited' ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            库存紧张
          </p>
        ) : null}

        {/* Price */}
        <div className="mt-1">
          <span className="text-2xl font-bold text-primary">
            ¥{product.price.toFixed(2)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-5 pt-0">
        <Button
          className="w-full"
          disabled={product.stockStatus === 'out_of_stock'}
          onClick={() => onBuy(product)}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          立即购买
        </Button>
      </CardFooter>
    </Card>
  )
}
