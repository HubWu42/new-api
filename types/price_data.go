package types

import "fmt"

type GroupRatioInfo struct {
	GroupRatio        float64
	GroupSpecialRatio float64
	HasSpecialRatio   bool
}

type PriceData struct {
	FreeModel            bool
	ModelPrice           float64
	ModelRatio           float64
	CompletionRatio      float64
	CacheRatio           float64
	CacheCreationRatio   float64
	CacheCreation5mRatio float64
	CacheCreation1hRatio float64
	ImageRatio           float64
	AudioRatio           float64
	AudioCompletionRatio float64
	OtherRatios          map[string]float64
	UsePrice             bool
	Quota                int // 按次计费的最终额度（MJ / Task）
	QuotaToPreConsume    int // 按量计费的预消耗额度
	GroupRatioInfo       GroupRatioInfo
	CostQuota            int
	CostRatio            float64
	CostCny              float64
	InputCostRatio       float64
	OutputCostRatio      float64
	CacheReadCostRatio   float64
	CacheWriteCostRatio  float64

	// ActualTokenBreakdown stores the real token counts from the upstream
	// usage response. Populated during quota calculation, before post-settle
	// hooks run. Used by the supplier cost hook to compute accurate costs.
	PromptTokens        int
	CompletionTokens    int
	CacheTokens         int
	CacheCreationTokens int
}

func (p *PriceData) AddOtherRatio(key string, ratio float64) {
	if p.OtherRatios == nil {
		p.OtherRatios = make(map[string]float64)
	}
	if ratio <= 0 {
		return
	}
	p.OtherRatios[key] = ratio
}

func (p *PriceData) ToSetting() string {
	return fmt.Sprintf("ModelPrice: %f, ModelRatio: %f, CompletionRatio: %f, CacheRatio: %f, GroupRatio: %f, UsePrice: %t, CacheCreationRatio: %f, CacheCreation5mRatio: %f, CacheCreation1hRatio: %f, QuotaToPreConsume: %d, ImageRatio: %f, AudioRatio: %f, AudioCompletionRatio: %f, CostQuota: %d, CostRatio: %f, CostCny: %f, InputCostRatio: %f, OutputCostRatio: %f, CacheReadCostRatio: %f, CacheWriteCostRatio: %f", p.ModelPrice, p.ModelRatio, p.CompletionRatio, p.CacheRatio, p.GroupRatioInfo.GroupRatio, p.UsePrice, p.CacheCreationRatio, p.CacheCreation5mRatio, p.CacheCreation1hRatio, p.QuotaToPreConsume, p.ImageRatio, p.AudioRatio, p.AudioCompletionRatio, p.CostQuota, p.CostRatio, p.CostCny, p.InputCostRatio, p.OutputCostRatio, p.CacheReadCostRatio, p.CacheWriteCostRatio)
}
