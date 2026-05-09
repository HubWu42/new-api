import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api'
import type { SupplierModelPrice } from '../types'

export const useSupplierChannels = (supplierId: number) =>
  useQuery({
    queryKey: ['supplier-channels', supplierId],
    queryFn: () => api.getSupplierChannels(supplierId),
    enabled: !!supplierId,
  })

export const useCreateSupplierChannel = (supplierId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSupplierChannel,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['supplier-channels', supplierId] }),
  })
}

export const useUpdateSupplierChannel = (supplierId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.updateSupplierChannel,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['supplier-channels', supplierId] }),
  })
}

export const useDeleteSupplierChannel = (supplierId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSupplierChannel,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['supplier-channels', supplierId] }),
  })
}

export const useSupplierChannelPrices = (channelId: number) =>
  useQuery({
    queryKey: ['supplier-channel-prices', channelId],
    queryFn: () => api.getSupplierChannelPrices(channelId),
    enabled: !!channelId,
  })

export const useUpdateSupplierChannelPrices = (channelId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prices: SupplierModelPrice[]) =>
      api.updateSupplierChannelPrices(channelId, prices),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ['supplier-channel-prices', channelId],
      }),
  })
}

export const useParseSupplierLog = (channelId: number) =>
  useMutation({
    mutationFn: (text: string) => api.parseSupplierLog(channelId, text),
  })
