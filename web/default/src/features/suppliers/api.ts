import { api } from '@/lib/api'
import type {
  Supplier,
  SupplierChannel,
  SupplierModelCost,
  SupplierModelPrice,
  ParsedLogEntry,
} from './types'

// Supplier CRUD

export async function getSuppliers() {
  const res = await api.get('/api/suppliers/')
  return res.data as { success: boolean; message?: string; data?: Supplier[] }
}

export async function upsertSupplier(supplier: Supplier) {
  const res = supplier.id
    ? await api.put(`/api/suppliers/${supplier.id}`, supplier)
    : await api.post('/api/suppliers/', supplier)
  return res.data as { success: boolean; message?: string; data?: Supplier }
}

export async function deleteSupplier(id: number) {
  const res = await api.delete(`/api/suppliers/${id}`)
  return res.data as { success: boolean; message?: string }
}

// Supplier Channels

export async function getSupplierChannels(supplierId: number) {
  const res = await api.get('/api/supplier-channels/', {
    params: { supplier_id: supplierId },
  })
  return res.data as {
    success: boolean
    message?: string
    data?: SupplierChannel[]
  }
}

export async function createSupplierChannel(sc: SupplierChannel) {
  const res = await api.post('/api/supplier-channels/', sc)
  return res.data as {
    success: boolean
    message?: string
    data?: SupplierChannel
  }
}

export async function updateSupplierChannel(sc: SupplierChannel) {
  const res = await api.put(`/api/supplier-channels/${sc.id}`, sc)
  return res.data as {
    success: boolean
    message?: string
    data?: SupplierChannel
  }
}

export async function deleteSupplierChannel(id: number) {
  const res = await api.delete(`/api/supplier-channels/${id}`)
  return res.data as { success: boolean; message?: string }
}

// Model Prices

export async function getSupplierChannelPrices(channelId: number) {
  const res = await api.get(`/api/supplier-channels/${channelId}/prices`)
  return res.data as {
    success: boolean
    message?: string
    data?: SupplierModelCost[]
  }
}

export async function updateSupplierChannelPrices(
  channelId: number,
  prices: SupplierModelPrice[]
) {
  const res = await api.put(
    `/api/supplier-channels/${channelId}/prices`,
    prices
  )
  return res.data as { success: boolean; message?: string }
}

export async function deleteSupplierChannelModelPrice(
  channelId: number,
  model: string
) {
  const res = await api.delete(
    `/api/supplier-channels/${channelId}/prices/${encodeURIComponent(model)}`
  )
  return res.data as { success: boolean; message?: string }
}

// Log Parsing

export async function parseSupplierLog(channelId: number, text: string) {
  const res = await api.post(`/api/supplier-channels/${channelId}/parse-log`, {
    text,
  })
  return res.data as {
    success: boolean
    message?: string
    data?: ParsedLogEntry
  }
}
