'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  FileText,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
} from 'lucide-react'
import { SectionPageLayout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { lookupGuestOrders, getGuestOrderDetail } from '../api'
import type { StoreOrder } from '../types'

const STATUS_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }
> = {
  pending_payment: { label: '待支付', variant: 'secondary', icon: Clock },
  paid: { label: '已支付', variant: 'default', icon: CheckCircle2 },
  fulfilling: { label: '处理中', variant: 'secondary', icon: Loader2 },
  delivered: { label: '已发货', variant: 'default', icon: Package },
  completed: { label: '已完成', variant: 'default', icon: CheckCircle2 },
  canceled: { label: '已取消', variant: 'destructive', icon: XCircle },
}

export function OrderLookup() {
  const { t } = useTranslation()

  // Search
  const [email, setEmail] = useState('')
  const [orderPassword, setOrderPassword] = useState('')
  const [searching, setSearching] = useState(false)
  const [orders, setOrders] = useState<StoreOrder[]>([])
  const [searched, setSearched] = useState(false)

  // Detail
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const handleSearch = async () => {
    if (!email || !orderPassword) return
    setSearching(true)
    setSearched(false)
    try {
      const result = await lookupGuestOrders(email, orderPassword)
      setOrders(result)
      setSearched(true)
    } finally {
      setSearching(false)
    }
  }

  const handleViewDetail = async (order: StoreOrder) => {
    const detail = await getGuestOrderDetail(order.orderNo, email, orderPassword)
    setSelectedOrder(detail ?? order)
    setShowDetail(true)
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <FileText className="mr-2 inline-block h-5 w-5" />
        订单查询
      </SectionPageLayout.Title>
      <SectionPageLayout.Description>
        输入购买时填写的邮箱和密码查询订单
      </SectionPageLayout.Description>

      <SectionPageLayout.Content>
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Search Form */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] space-y-1">
              <Label className="text-xs">邮箱</Label>
              <Input
                type="email"
                placeholder="购买时填写的邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex-1 min-w-[150px] space-y-1">
              <Label className="text-xs">订单密码</Label>
              <Input
                type="password"
                placeholder="购买时设置的密码"
                value={orderPassword}
                onChange={(e) => setOrderPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              查询
            </Button>
          </div>

          {/* Order List */}
          {searched && orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-10 w-10 mb-2 opacity-30" />
              <p>暂无订单记录</p>
              <p className="text-xs mt-1">
                请确认邮箱和密码是否正确
              </p>
            </div>
          )}

          {orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending_payment
                const StatusIcon = statusInfo.icon
                return (
                  <Card
                    key={order.orderNo}
                    className="cursor-pointer transition-all hover:shadow-sm"
                    onClick={() => handleViewDetail(order)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-mono">{order.orderNo}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.items?.[0]?.title ?? '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          ¥{order.totalAmount.toFixed(2)}
                        </span>
                        <Badge variant={statusInfo.variant} className="text-xs">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Order Detail Dialog */}
          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>订单详情</DialogTitle>
              </DialogHeader>

              {selectedOrder && (
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      订单号
                    </span>
                    <span className="text-sm font-mono">
                      {selectedOrder.orderNo}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">状态</span>
                    <Badge
                      variant={
                        STATUS_MAP[selectedOrder.status]?.variant ?? 'secondary'
                      }
                      className="text-xs"
                    >
                      {STATUS_MAP[selectedOrder.status]?.label ??
                        selectedOrder.status}
                    </Badge>
                  </div>

                  {/* Items */}
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      商品
                    </p>
                    {selectedOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-sm">{item.title}</span>
                        <span className="text-sm text-muted-foreground">
                          ×{item.quantity} ¥{item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-medium">合计</span>
                    <span className="text-lg font-bold text-primary">
                      ¥{selectedOrder.totalAmount.toFixed(2)}
                    </span>
                  </div>

                  {/* Fulfillment */}
                  {selectedOrder.fulfillment && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        交付内容
                      </p>
                      <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs font-mono">
                        {selectedOrder.fulfillment.payload}
                      </pre>
                      {selectedOrder.fulfillment.status === 'delivered' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                        >
                          <Download className="mr-2 h-3 w-3" />
                          下载卡密
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground">
                      创建时间：{selectedOrder.createdAt}
                    </p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
