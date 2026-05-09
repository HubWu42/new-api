export interface Supplier {
  id?: number
  name: string
  display_currency: string
  settlement_currency: string
  quote_unit_to_cny_rate: number
  official_usd_to_cny_rate: number
  remark?: string
}

export interface SupplierChannel {
  id?: number
  supplier_id: number
  channel_id: number
  ratio: number
  remark?: string
}

export interface SupplierModelPrice {
  id?: number
  supplier_channel_id: number
  model_name: string
  base_input_price: number
  base_output_price: number
  base_cache_read_price: number
  base_cache_write_price: number
  official_input_price_usd: number
  official_output_price_usd: number
  official_cache_read_price_usd: number
  official_cache_write_price_usd: number
  model_ratio: number
  use_fixed_price: boolean
  remark?: string
}

export interface SupplierModelCost extends SupplierModelPrice {
  supplier_id: number
  supplier_ratio: number
  effective_input_cny: number
  effective_output_cny: number
  effective_cache_read_cny: number
  effective_cache_write_cny: number
  input_cost_ratio: number
  output_cost_ratio: number
  cache_read_cost_ratio: number
  cache_write_cost_ratio: number
}

export interface ParsedLogEntry {
  model_name: string
  input_price: number
  output_price: number
  cache_read_price: number
  cache_write_price: number
  supplier_ratio: number
}
