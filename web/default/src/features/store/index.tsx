'use client'

import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ShoppingBag } from 'lucide-react'
import { SectionPageLayout } from '@/components/layout'
import { ProductCard } from './components/ProductCard'
import { getStoreProducts } from './api'
import type { StoreProduct } from './types'

export function Store() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoreProducts()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  const handleBuy = (product: StoreProduct) => {
    navigate({
      to: '/store/checkout',
      search: { product: product.slug },
    })
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <ShoppingBag className="mr-2 inline-block h-5 w-5" />
        商店
      </SectionPageLayout.Title>
      <SectionPageLayout.Description>
        API 额度 · 卡密 · 服务账号
      </SectionPageLayout.Description>

      <SectionPageLayout.Content>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onBuy={handleBuy}
              />
            ))}
          </div>
        )}
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
