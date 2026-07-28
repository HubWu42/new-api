import { useTranslation } from 'react-i18next'
import { ArrowRight, Key, Ticket, User, Zap } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AnimateInView } from '@/components/animate-in-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PRODUCTS = [
  {
    slug: 'api-quota-500k',
    title: 'API 额度',
    subtitle: '50万 tokens',
    desc: '适用于所有 AI 模型，即买即用',
    price: '¥10.00',
    badge: '自动到账',
    badgeVariant: 'default' as const,
    icon: Zap,
  },
  {
    slug: 'gpt-plus-monthly',
    title: 'GPT Plus 月卡',
    subtitle: '30天有效',
    desc: 'ChatGPT Plus 订阅激活码',
    price: '¥29.90',
    badge: '卡密',
    badgeVariant: 'default' as const,
    icon: Ticket,
  },
  {
    slug: 'pro-account-monthly',
    title: 'Pro 账号',
    subtitle: '月度会员',
    desc: '专属模型 + 更高并发',
    price: '¥50.00',
    badge: '人工开通',
    badgeVariant: 'secondary' as const,
    icon: User,
  },
]

interface ProductsProps {
  className?: string
}

export function Products(_props: ProductsProps) {
  const { t } = useTranslation()

  return (
    <AnimateInView>
      <section className="py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              商店
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              API 额度 · 卡密 · 服务账号
            </p>
          </div>

          {/* Product Cards */}
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
            {PRODUCTS.map((product) => {
              const Icon = product.icon
              return (
                <div
                  key={product.slug}
                  className="group relative flex flex-col rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Icon + Badge */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant={product.badgeVariant} className="text-xs">
                      {product.badge}
                    </Badge>
                  </div>

                  {/* Title + Desc */}
                  <h3 className="text-lg font-semibold">{product.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.subtitle}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground/70 min-h-[2.5rem]">
                    {product.desc}
                  </p>

                  {/* Price + CTA */}
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      {product.price}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/store/checkout"
                        search={{ product: product.slug }}
                      >
                        立即购买
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* View all link */}
          <div className="mt-8 text-center">
            <Button variant="link" asChild>
              <Link to="/store">
                查看全部商品
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AnimateInView>
  )
}
