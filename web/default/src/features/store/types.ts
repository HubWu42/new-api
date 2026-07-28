// ============================================================================
// Store Type Definitions
// ============================================================================

/** Fulfillment type for product delivery */
export type FulfillmentType = 'auto' | 'manual'

/** Product in the store */
export interface StoreProduct {
  id: number
  slug: string
  title: string
  description: string
  price: number
  currency: string
  fulfillmentType: FulfillmentType
  stockStatus: 'in_stock' | 'out_of_stock' | 'limited'
  manualFormSchema?: ManualFormField[]
  imageUrl?: string
}

/** Custom form field for product-specific info (e.g. Casdoor ID for API quota) */
export interface ManualFormField {
  key: string
  type: 'text' | 'email' | 'textarea' | 'number' | 'select'
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
}

/** Guest checkout form data */
export interface GuestCheckoutForm {
  email: string
  orderPassword: string
  customFields: Record<string, string>
}

/** Payment channel */
export interface PaymentChannel {
  id: number
  name: string
  type: 'alipay' | 'wxpay' | 'other'
  interactionMode: 'qr' | 'redirect'
}

/** Order summary */
export interface StoreOrder {
  orderNo: string
  status: 'pending_payment' | 'paid' | 'fulfilling' | 'delivered' | 'completed' | 'canceled'
  totalAmount: number
  currency: string
  items: StoreOrderItem[]
  createdAt: string
  fulfillment?: {
    type: FulfillmentType
    status: string
    payload: string
  }
}

export interface StoreOrderItem {
  title: string
  quantity: number
  price: number
  fulfillmentType: FulfillmentType
}

/** API response wrapper matching Dujiao-Next format */
export interface StoreApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}
