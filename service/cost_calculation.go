package service

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func init() {
	RegisterPostSettleHook(costPostSettleHook)
	RegisterLogEnrichmentHook(costLogEnrichmentHook)
}

func costPostSettleHook(relayInfo *relaycommon.RelayInfo, quota int) {
	channelId := relayInfo.ChannelMeta.ChannelId
	modelName := relayInfo.OriginModelName
	price, supplier, sc, ok := model.GetSupplierModelPriceByChannel(channelId, modelName)
	if !ok {
		return
	}
	cost := NormalizeSupplierCost(supplier, sc, price)

	promptTokens := relayInfo.PriceData.PromptTokens
	completionTokens := relayInfo.PriceData.CompletionTokens
	cacheTokens := relayInfo.PriceData.CacheTokens
	cacheCreationTokens := relayInfo.PriceData.CacheCreationTokens

	// Effective input = prompt - cached, effective output = completion
	effectiveInput := promptTokens - cacheTokens
	if effectiveInput < 0 {
		effectiveInput = 0
	}

	costCny := float64(effectiveInput)/1000000*cost.EffectiveInputCny +
		float64(completionTokens)/1000000*cost.EffectiveOutputCny +
		float64(cacheTokens)/1000000*cost.EffectiveCacheReadCny +
		float64(cacheCreationTokens)/1000000*cost.EffectiveCacheWriteCny

	costQuota := int(costCny / supplier.OfficialUsdToCnyRate * float64(common.QuotaPerUnit))
	relayInfo.PriceData.CostQuota = costQuota
	relayInfo.PriceData.CostCny = costCny
	relayInfo.PriceData.CostRatio = cost.InputCostRatio
	relayInfo.PriceData.InputCostRatio = cost.InputCostRatio
	relayInfo.PriceData.OutputCostRatio = cost.OutputCostRatio
	relayInfo.PriceData.CacheReadCostRatio = cost.CacheReadCostRatio
	relayInfo.PriceData.CacheWriteCostRatio = cost.CacheWriteCostRatio
	go func() {
		if err := DeductChannelBalanceCny(channelId, costCny, modelName, relayInfo.RequestId); err != nil {
			common.SysError(fmt.Sprintf("failed to deduct channel balance for channel %d model %s: %v", channelId, modelName, err))
		}
	}()
}

func costLogEnrichmentHook(relayInfo *relaycommon.RelayInfo, other map[string]interface{}) {
	if relayInfo.PriceData.CostQuota > 0 {
		other["cost_quota"] = relayInfo.PriceData.CostQuota
		other["cost_cny"] = relayInfo.PriceData.CostCny
		other["cost_ratio"] = relayInfo.PriceData.CostRatio
		other["input_cost_ratio"] = relayInfo.PriceData.InputCostRatio
		other["output_cost_ratio"] = relayInfo.PriceData.OutputCostRatio
		other["cache_read_cost_ratio"] = relayInfo.PriceData.CacheReadCostRatio
		other["cache_write_cost_ratio"] = relayInfo.PriceData.CacheWriteCostRatio
	}
}
