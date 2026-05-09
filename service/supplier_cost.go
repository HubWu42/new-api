package service

import (
	"regexp"
	"strconv"

	"github.com/QuantumNous/new-api/model"
)

type ParsedSupplierLog struct {
	ModelName        string  `json:"model_name"`
	InputPrice       float64 `json:"input_price"`
	OutputPrice      float64 `json:"output_price"`
	CacheReadPrice   float64 `json:"cache_read_price"`
	CacheWritePrice  float64 `json:"cache_write_price"`
	SupplierRatio    float64 `json:"supplier_ratio"`
}

func NormalizeSupplierCost(supplier *model.Supplier, supplierChannel *model.SupplierChannel, price *model.SupplierModelPrice) model.SupplierModelCost {
	cost := model.SupplierModelCost{SupplierModelPrice: *price, SupplierId: supplier.ID, SupplierRatio: supplierChannel.Ratio}
	quoteRate := supplier.QuoteUnitToCnyRate
	officialRate := supplier.OfficialUsdToCnyRate

	var inputPrice, outputPrice, cacheReadPrice, cacheWritePrice float64
	if price.UseFixedPrice {
		inputPrice = price.BaseInputPrice
		outputPrice = price.BaseOutputPrice
		cacheReadPrice = price.BaseCacheReadPrice
		cacheWritePrice = price.BaseCacheWritePrice
	} else if price.ModelRatio > 0 {
		inputPrice = price.OfficialInputPriceUsd * price.ModelRatio
		outputPrice = price.OfficialOutputPriceUsd * price.ModelRatio
		cacheReadPrice = price.OfficialCacheReadPriceUsd * price.ModelRatio
		cacheWritePrice = price.OfficialCacheWritePriceUsd * price.ModelRatio
	} else {
		inputPrice = price.OfficialInputPriceUsd * supplierChannel.Ratio
		outputPrice = price.OfficialOutputPriceUsd * supplierChannel.Ratio
		cacheReadPrice = price.OfficialCacheReadPriceUsd * supplierChannel.Ratio
		cacheWritePrice = price.OfficialCacheWritePriceUsd * supplierChannel.Ratio
	}

	cost.EffectiveInputCny = inputPrice * quoteRate
	cost.EffectiveOutputCny = outputPrice * quoteRate
	cost.EffectiveCacheReadCny = cacheReadPrice * quoteRate
	cost.EffectiveCacheWriteCny = cacheWritePrice * quoteRate
	cost.InputCostRatio = safeRatio(cost.EffectiveInputCny, price.OfficialInputPriceUsd*officialRate)
	cost.OutputCostRatio = safeRatio(cost.EffectiveOutputCny, price.OfficialOutputPriceUsd*officialRate)
	cost.CacheReadCostRatio = safeRatio(cost.EffectiveCacheReadCny, price.OfficialCacheReadPriceUsd*officialRate)
	cost.CacheWriteCostRatio = safeRatio(cost.EffectiveCacheWriteCny, price.OfficialCacheWritePriceUsd*officialRate)
	return cost
}

func safeRatio(value, base float64) float64 {
	if base <= 0 {
		return 0
	}
	return value / base
}

func GetSupplierModelCostsByChannel(channelId int) ([]model.SupplierModelCost, error) {
	sc, err := model.GetSupplierChannel(channelId)
	if err != nil {
		return nil, err
	}
	var supplier model.Supplier
	if err := model.DB.First(&supplier, sc.SupplierId).Error; err != nil {
		return nil, err
	}
	prices, err := model.GetSupplierModelPricesByChannel(channelId)
	if err != nil {
		return nil, err
	}
	costs := make([]model.SupplierModelCost, 0, len(prices))
	for i := range prices {
		costs = append(costs, NormalizeSupplierCost(&supplier, sc, &prices[i]))
	}
	return costs, nil
}

func ParseSupplierLog(text string) ParsedSupplierLog {
	return ParsedSupplierLog{
		ModelName:        extractModelName(text),
		InputPrice:       extractFirstFloat(text, `输入价格[^0-9]*([0-9]+(?:\.[0-9]+)?)`),
		OutputPrice:      extractFirstFloat(text, `输出价格[^0-9]*([0-9]+(?:\.[0-9]+)?)`),
		CacheReadPrice:   extractFirstFloat(text, `缓存读取价格[^0-9]*([0-9]+(?:\.[0-9]+)?)`),
		CacheWritePrice:  extractFirstFloat(text, `缓存(?:创建|写入)价格[^0-9]*([0-9]+(?:\.[0-9]+)?)`),
		SupplierRatio:    extractFirstFloat(text, `分组倍率[^0-9]*([0-9]+(?:\.[0-9]+)?)x`),
	}
}

func extractModelName(text string) string {
	patterns := []string{
		`模型[：:]\s*(\S+)`,
		`model[：:]\s*(\S+)`,
		`模型名称[：:]\s*(\S+)`,
	}
	for _, p := range patterns {
		matches := regexp.MustCompile(p).FindStringSubmatch(text)
		if len(matches) >= 2 {
			return matches[1]
		}
	}
	return ""
}

func extractFirstFloat(text, pattern string) float64 {
	matches := regexp.MustCompile(pattern).FindStringSubmatch(text)
	if len(matches) < 2 {
		return 0
	}
	value, _ := strconv.ParseFloat(matches[1], 64)
	return value
}
