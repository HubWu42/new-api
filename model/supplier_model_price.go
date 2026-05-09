package model

import (
	"time"

	"gorm.io/gorm"
)

type SupplierModelPrice struct {
	ID                         int       `json:"id" gorm:"primaryKey;autoIncrement"`
	SupplierChannelId   int       `json:"supplier_channel_id" gorm:"uniqueIndex:idx_supplier_channel_model;not null"`
	ModelName           string    `json:"model_name" gorm:"uniqueIndex:idx_supplier_channel_model;type:varchar(255);not null"`
	ModelRatio          float64   `json:"model_ratio" gorm:"not null;default:0"`
	UseFixedPrice       bool      `json:"use_fixed_price" gorm:"not null;default:false"`
	BaseInputPrice      float64   `json:"base_input_price" gorm:"not null;default:0"`
	BaseOutputPrice     float64   `json:"base_output_price" gorm:"not null;default:0"`
	BaseCacheReadPrice  float64   `json:"base_cache_read_price" gorm:"not null;default:0"`
	BaseCacheWritePrice float64   `json:"base_cache_write_price" gorm:"not null;default:0"`
	OfficialInputPriceUsd      float64   `json:"official_input_price_usd" gorm:"not null;default:0"`
	OfficialOutputPriceUsd     float64   `json:"official_output_price_usd" gorm:"not null;default:0"`
	OfficialCacheReadPriceUsd  float64   `json:"official_cache_read_price_usd" gorm:"not null;default:0"`
	OfficialCacheWritePriceUsd float64   `json:"official_cache_write_price_usd" gorm:"not null;default:0"`
	Remark                     string    `json:"remark" gorm:"type:varchar(255)"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
}

type SupplierModelCost struct {
	SupplierModelPrice
	SupplierId              int     `json:"supplier_id"`
	SupplierRatio           float64 `json:"supplier_ratio"`
	EffectiveInputCny       float64 `json:"effective_input_cny"`
	EffectiveOutputCny      float64 `json:"effective_output_cny"`
	EffectiveCacheReadCny   float64 `json:"effective_cache_read_cny"`
	EffectiveCacheWriteCny  float64 `json:"effective_cache_write_cny"`
	InputCostRatio          float64 `json:"input_cost_ratio"`
	OutputCostRatio         float64 `json:"output_cost_ratio"`
	CacheReadCostRatio      float64 `json:"cache_read_cost_ratio"`
	CacheWriteCostRatio     float64 `json:"cache_write_cost_ratio"`
}

func (SupplierModelPrice) TableName() string {
	return "supplier_model_prices"
}

func init() {
	RegisterMigration(&SupplierModelPrice{})
}

func GetSupplierModelPricesByChannel(channelId int) ([]SupplierModelPrice, error) {
	var prices []SupplierModelPrice
	err := DB.Where("supplier_channel_id = ?", channelId).Order("model_name").Find(&prices).Error
	return prices, err
}

func GetSupplierModelPriceByChannel(channelId int, modelName string) (*SupplierModelPrice, *Supplier, *SupplierChannel, bool) {
	var sc SupplierChannel
	if err := DB.Where("channel_id = ?", channelId).First(&sc).Error; err != nil {
		return nil, nil, nil, false
	}
	var supplier Supplier
	if err := DB.First(&supplier, sc.SupplierId).Error; err != nil {
		return nil, nil, nil, false
	}
	var price SupplierModelPrice
	err := DB.Where("supplier_channel_id = ? AND model_name = ?", sc.ID, modelName).First(&price).Error
	if err != nil {
		return nil, nil, nil, false
	}
	return &price, &supplier, &sc, true
}

func BatchUpsertSupplierModelPrices(channelId int, prices []SupplierModelPrice) error {
	return DB.Transaction(func(tx *gorm.DB) error {
		for _, price := range prices {
			price.SupplierChannelId = channelId
			err := tx.Where("supplier_channel_id = ? AND model_name = ?", channelId, price.ModelName).
				Assign(map[string]interface{}{
					"base_input_price":             price.BaseInputPrice,
					"base_output_price":            price.BaseOutputPrice,
					"base_cache_read_price":        price.BaseCacheReadPrice,
					"base_cache_write_price":       price.BaseCacheWritePrice,
					"official_input_price_usd":     price.OfficialInputPriceUsd,
					"official_output_price_usd":    price.OfficialOutputPriceUsd,
					"official_cache_read_price_usd": price.OfficialCacheReadPriceUsd,
					"official_cache_write_price_usd": price.OfficialCacheWritePriceUsd,
					"model_ratio":                  price.ModelRatio,
					"use_fixed_price":              price.UseFixedPrice,
					"remark":                       price.Remark,
				}).
				FirstOrCreate(&price).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteSupplierModelPrice(channelId int, modelName string) error {
	return DB.Where("supplier_channel_id = ? AND model_name = ?", channelId, modelName).Delete(&SupplierModelPrice{}).Error
}
