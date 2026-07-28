// ============================================================================
// Store API Functions
//
// Calls Dujiao-Next backend at /store/api/v1/*
// Traefik routes /store/api/* → Dujiao-Next container
// ============================================================================

import { api } from '@/lib/api'
import type {
  StoreProduct,
  StoreOrder,
  PaymentChannel,
  StoreApiResponse,
} from './types'

// ---- Mock data (remove when Dujiao-Next backend is live) ----

const MOCK_PRODUCTS: StoreProduct[] = [
  {
    id: 1,
    slug: 'api-quota-500k',
    title: 'API 额度 50万 tokens',
    description: '适用于所有 AI 模型的通用额度，自动到账',
    price: 10.0,
    currency: 'CNY',
    fulfillmentType: 'manual',
    stockStatus: 'in_stock',
    manualFormSchema: [
      {
        key: 'casdoor_user_id',
        type: 'text',
        label: 'Casdoor 用户 ID',
        placeholder: '在 LinkSail 个人设置中查看',
        required: true,
      },
    ],
  },
  {
    id: 2,
    slug: 'gpt-plus-monthly',
    title: 'GPT Plus 月卡',
    description: 'ChatGPT Plus 订阅激活码，有效期 30 天',
    price: 29.9,
    currency: 'CNY',
    fulfillmentType: 'auto',
    stockStatus: 'in_stock',
  },
  {
    id: 3,
    slug: 'pro-account-monthly',
    title: 'Pro 账号 月度会员',
    description: '高级会员账号，享专属模型和更高并发',
    price: 50.0,
    currency: 'CNY',
    fulfillmentType: 'manual',
    stockStatus: 'in_stock',
    manualFormSchema: [
      {
        key: 'target_email',
        type: 'email',
        label: '开通邮箱',
        placeholder: '用于接收账号信息的邮箱',
        required: true,
      },
    ],
  },
]

const MOCK_CHANNELS: PaymentChannel[] = [
  { id: 1, name: '微信支付', type: 'wxpay', interactionMode: 'qr' },
  { id: 2, name: '支付宝', type: 'alipay', interactionMode: 'qr' },
]

// ---- Product API ----

const STORE_API_BASE = '/store/api/v1'

/**
 * Fetch all available products from the store
 */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  // TODO: Replace mock with real API call when backend is live
  // const res = await api.get(`${STORE_API_BASE}/public/products`)
  // return (res.data as StoreApiResponse<StoreProduct[]>).data
  return new Promise((resolve) => setTimeout(() => resolve(MOCK_PRODUCTS), 300))
}

/**
 * Get a single product by slug
 */
export async function getStoreProduct(
  slug: string,
): Promise<StoreProduct | null> {
  const products = await getStoreProducts()
  return products.find((p) => p.slug === slug) ?? null
}

/**
 * Get product price preview with discounts
 */
export async function previewGuestOrder(slug: string, quantity: number) {
  // TODO: Replace with real API
  // const res = await api.post(`${STORE_API_BASE}/guest/orders/preview`, { items: [{ slug, quantity }] })
  // return res.data
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug)
  return {
    originalAmount: (product?.price ?? 0) * quantity,
    discountAmount: 0,
    totalAmount: (product?.price ?? 0) * quantity,
    currency: 'CNY',
  }
}

// ---- Payment API ----

/**
 * Get available payment channels
 */
export async function getPaymentChannels(): Promise<PaymentChannel[]> {
  // TODO: Replace with real API
  return MOCK_CHANNELS
}

/**
 * Create a guest order and initiate payment
 * Returns QR code URL/data for the selected payment channel
 */
export async function createGuestOrderAndPay(params: {
  slug: string
  quantity: number
  email: string
  orderPassword: string
  customFields: Record<string, string>
  paymentChannel: string
}): Promise<{ orderNo: string; qrCodeUrl: string; paymentId: number }> {
  // TODO: Replace with real API call to Dujiao-Next
  // const res = await api.post(`${STORE_API_BASE}/guest/orders/create-and-pay`, {
  //   items: [{ slug: params.slug, quantity: params.quantity }],
  //   email: params.email,
  //   order_password: params.orderPassword,
  //   manual_form_submissions: [{ slug: params.slug, fields: params.customFields }],
  //   payment_channel_id: params.paymentChannel,
  // })
  // return res.data

  // Mock: simulate API delay then return fake QR url
  await new Promise((resolve) => setTimeout(resolve, 800))
  return {
    orderNo: `DJ${Date.now()}`,
    qrCodeUrl: '',
    paymentId: 1,
  }
}

/**
 * Query payment status
 */
export async function queryPaymentStatus(
  paymentId: number,
): Promise<'pending' | 'success' | 'failed'> {
  // TODO: Replace with real API
  // const res = await api.post(`${STORE_API_BASE}/guest/payments/${paymentId}/capture`)
  // return res.data.status
  await new Promise((resolve) => setTimeout(resolve, 500))
  return 'success'
}

// ---- Order API ----

/**
 * Look up guest orders by email + password
 */
export async function lookupGuestOrders(
  email: string,
  orderPassword: string,
): Promise<StoreOrder[]> {
  // TODO: Replace with real API
  // const res = await api.get(`${STORE_API_BASE}/guest/orders`, {
  //   params: { email, order_password: orderPassword },
  // })
  // return (res.data as StoreApiResponse<StoreOrder[]>).data

  await new Promise((resolve) => setTimeout(resolve, 500))
  return []
}

/**
 * Get guest order detail
 */
export async function getGuestOrderDetail(
  orderNo: string,
  email: string,
  orderPassword: string,
): Promise<StoreOrder | null> {
  // TODO: Replace with real API
  // const res = await api.get(`${STORE_API_BASE}/guest/orders/${orderNo}`, {
  //   params: { email, order_password: orderPassword },
  // })
  // return (res.data as StoreApiResponse<StoreOrder>).data
  return null
}
