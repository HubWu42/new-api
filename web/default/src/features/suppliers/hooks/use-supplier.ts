import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api'

export const useSuppliers = () =>
  useQuery({ queryKey: ['suppliers'], queryFn: api.getSuppliers })

export const useUpsertSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.upsertSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export const useDeleteSupplier = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSupplier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}
