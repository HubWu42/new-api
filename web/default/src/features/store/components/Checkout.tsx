'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  QrCode,
  ShoppingBag,
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
import { cn } from '@/lib/utils'
import {
  getStoreProduct,
  previewGuestOrder,
  getPaymentChannels,
  createGuestOrderAndPay,
  queryPaymentStatus,
} from '../api'
import type { StoreProduct, PaymentChannel } from '../types'

// ---- Constants ----
const PAYMENT_ICONS: Record<string, string> = {
  wxpay: '💚',
  alipay: '💙',
}

const PAYMENT_LABELS: Record<string, string> = {
  wxpay: '微信支付',
  alipay: '支付宝',
}

interface CheckoutProps {
  productSlug: string
}

export function Checkout({ productSlug }: CheckoutProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Product & price
  const [product, setProduct] = useState<StoreProduct | null>(null)
  const [orderPreview, setOrderPreview] = useState<{
    originalAmount: number
    discountAmount: number
    totalAmount: number
    currency: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Form
  const [email, setEmail] = useState('')
  const [orderPassword, setOrderPassword] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, string>>({})

  // Payment
  const [channels, setChannels] = useState<PaymentChannel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentState, setPaymentState] = useState<
    'idle' | 'waiting' | 'success' | 'failed'
  >('idle')
  const [orderNo, setOrderNo] = useState('')
  const [paymentId, setPaymentId] = useState(0)

  // Load product + channels
  useEffect(() => {
    Promise.all([
      getStoreProduct(productSlug),
      previewGuestOrder(productSlug, 1),
      getPaymentChannels(),
    ]).then(([prod, preview, chs]) => {
      setProduct(prod)
      setOrderPreview(preview)
      setChannels(chs)
      if (chs.length > 0) setSelectedChannel(chs[0].type)
      setLoading(false)
    })
  }, [productSlug])

  const handlePay = useCallback(async () => {
    if (!email || !orderPassword || !selectedChannel || !product) return
    setSubmitting(true)
    try {
      const result = await createGuestOrderAndPay({
        slug: product.slug,
        quantity: 1,
        email,
        orderPassword,
        customFields,
        paymentChannel: selectedChannel,
      })
      setOrderNo(result.orderNo)
      setPaymentId(result.paymentId)
      setPaymentState('waiting')
      setShowPaymentModal(true)

      // Poll payment status
      let attempts = 0
      const maxAttempts = 60 // 5 minutes at 5s intervals
      const poll = setInterval(async () => {
        attempts++
        const status = await queryPaymentStatus(result.paymentId)
        if (status === 'success') {
          clearInterval(poll)
          setPaymentState('success')
        } else if (status === 'failed' || attempts >= maxAttempts) {
          clearInterval(poll)
          setPaymentState('failed')
        }
      }, 5000)
    } finally {
      setSubmitting(false)
    }
  }, [email, orderPassword, selectedChannel, product, customFields])

  if (loading) {
    return (
      <SectionPageLayout>
        <SectionPageLayout.Content>
          <div className="mx-auto max-w-lg space-y-4">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )
  }

  if (!product) {
    return (
      <SectionPageLayout>
        <SectionPageLayout.Content>
          <div className="text-center text-muted-foreground py-12">
            商品未找到
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/store' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          结账
        </div>
      </SectionPageLayout.Title>
      <SectionPageLayout.Description>
        填写信息，选择支付方式
      </SectionPageLayout.Description>

      <SectionPageLayout.Content>
        <div className="mx-auto max-w-lg space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{product.title}</p>
                    <p className="text-xs text-muted-foreground">×1</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">
                  ¥{product.price.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">联系信息</Label>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="邮箱（用于接收卡密/订单通知）"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="订单密码（用于查询订单）"
                value={orderPassword}
                onChange={(e) => setOrderPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              游客购买无需注册。请记住订单密码，用于后续查询订单和下载卡密。
            </p>
          </div>

          {/* Custom Fields (e.g. Casdoor ID for API quota) */}
          {product.manualFormSchema && product.manualFormSchema.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">补充信息</Label>
              {product.manualFormSchema.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-0.5">*</span>
                    )}
                  </Label>
                  <Input
                    type={field.type === 'email' ? 'email' : 'text'}
                    placeholder={field.placeholder}
                    value={customFields[field.key] ?? ''}
                    onChange={(e) =>
                      setCustomFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">支付方式</Label>
            <div className="grid grid-cols-2 gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.type}
                  type="button"
                  onClick={() => setSelectedChannel(ch.type)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all',
                    selectedChannel === ch.type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/30',
                  )}
                >
                  <span className="text-lg">
                    {PAYMENT_ICONS[ch.type] ?? '💳'}
                  </span>
                  {PAYMENT_LABELS[ch.type] ?? ch.name}
                </button>
              ))}
            </div>
          </div>

          {/* Pay Button */}
          <Button
            className="w-full h-12 text-base"
            disabled={
              !email ||
              !orderPassword ||
              !selectedChannel ||
              submitting
            }
            onClick={handlePay}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                ¥{orderPreview?.totalAmount.toFixed(2) ?? product.price.toFixed(2)} 立即支付
              </>
            )}
          </Button>

          {/* Payment Modal */}
          <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>
                  {paymentState === 'waiting'
                    ? `扫码支付 - ${PAYMENT_LABELS[selectedChannel] ?? ''}`
                    : paymentState === 'success'
                      ? '支付成功'
                      : '支付失败'}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 py-4">
                {paymentState === 'waiting' && (
                  <>
                    {/* QR Code Placeholder */}
                    <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <QrCode className="h-12 w-12" />
                        <span className="text-xs">
                          {PAYMENT_LABELS[selectedChannel]}扫码
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      等待支付中...
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      订单号: {orderNo}
                      <br />
                      请勿关闭此窗口，支付完成后自动跳转
                    </p>
                  </>
                )}

                {paymentState === 'success' && (
                  <>
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      支付成功！
                    </p>
                    {product.fulfillmentType === 'auto' ? (
                      <p className="text-sm text-muted-foreground text-center">
                        卡密已发送至 {email}
                        <br />
                        也可在订单查询页面查看
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">
                        我们将尽快处理您的订单
                        <br />
                        处理完成后会通知您
                      </p>
                    )}
                    <Button
                      className="mt-2 w-full"
                      onClick={() => {
                        setShowPaymentModal(false)
                        navigate({ to: '/store/orders' })
                      }}
                    >
                      查看订单
                    </Button>
                  </>
                )}

                {paymentState === 'failed' && (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                      <span className="text-2xl">✕</span>
                    </div>
                    <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                      支付失败
                    </p>
                    <p className="text-sm text-muted-foreground text-center">
                      请重试或选择其他支付方式
                    </p>
                    <div className="flex w-full gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowPaymentModal(false)}
                      >
                        关闭
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setShowPaymentModal(false)
                          setPaymentState('idle')
                          handlePay()
                        }}
                      >
                        重试
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
