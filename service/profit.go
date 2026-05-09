package service

import (
	"fmt"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

type ProfitQuery struct {
	StartTime int64  `form:"start_time"`
	EndTime   int64  `form:"end_time"`
	GroupBy   string `form:"group_by"`
	ModelName string `form:"model_name"`
	ChannelId int    `form:"channel_id"`
	GroupName string `form:"group_name"`
}

type ProfitRow struct {
	Key          string  `json:"key"`
	Revenue      int64   `json:"revenue"`
	Cost         int64   `json:"cost"`
	Profit       int64   `json:"profit"`
	ProfitRate   float64 `json:"profit_rate"`
	RequestCount int64   `json:"request_count"`
	PromptTokens int64   `json:"prompt_tokens"`
	CompTokens   int64   `json:"comp_tokens"`
	Untracked    int64   `json:"untracked"`
}

var profitCache sync.Map
var profitCacheTTL = 5 * time.Minute

type profitCacheEntry struct {
	data     []ProfitRow
	cachedAt time.Time
}

func GetProfitStats(query ProfitQuery) ([]ProfitRow, error) {
	cacheKey := fmt.Sprintf("%+v", query)
	if entry, ok := profitCache.Load(cacheKey); ok {
		e := entry.(*profitCacheEntry)
		if time.Since(e.cachedAt) < profitCacheTTL {
			return e.data, nil
		}
	}
	rows, err := queryProfitFromDB(query)
	if err != nil {
		return nil, err
	}
	profitCache.Store(cacheKey, &profitCacheEntry{data: rows, cachedAt: time.Now()})
	return rows, nil
}

func jsonExtractCostQuota() string {
	if common.UsingPostgreSQL {
		return `CAST(CAST(other AS json)->>'cost_quota' AS BIGINT)`
	}
	if common.UsingSQLite {
		return `CAST(json_extract(other, '$.cost_quota') AS INTEGER)`
	}
	return `CAST(JSON_EXTRACT(other, '$.cost_quota') AS SIGNED)`
}

func jsonExtractCostQuotaNull() string {
	if common.UsingPostgreSQL {
		return `CAST(other AS json)->>'cost_quota' IS NULL`
	}
	if common.UsingSQLite {
		return `json_extract(other, '$.cost_quota') IS NULL`
	}
	return `JSON_EXTRACT(other, '$.cost_quota') IS NULL`
}

func getGroupCol() string {
	if common.UsingPostgreSQL {
		return `"group"`
	}
	return "`group`"
}

func queryProfitFromDB(query ProfitQuery) ([]ProfitRow, error) {
	groupByCol := "model_name"
	switch query.GroupBy {
	case "channel":
		groupByCol = "channel"
	case "group":
		groupByCol = getGroupCol()
	case "date":
		groupByCol = "DATE(FROM_UNIXTIME(created_at))"
		if common.UsingPostgreSQL {
			groupByCol = "TO_CHAR(TO_TIMESTAMP(created_at), 'YYYY-MM-DD')"
		} else if common.UsingSQLite {
			groupByCol = "DATE(created_at, 'unixepoch')"
		}
	}

	costQuotaExpr := jsonExtractCostQuota()
	costQuotaNullExpr := jsonExtractCostQuotaNull()
	sql := fmt.Sprintf(
		`SELECT %s AS key, COALESCE(SUM(quota), 0) AS revenue, COALESCE(SUM(%s), 0) AS cost, COALESCE(SUM(quota), 0) - COALESCE(SUM(%s), 0) AS profit, COUNT(*) AS request_count, COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens, COALESCE(SUM(completion_tokens), 0) AS comp_tokens, SUM(CASE WHEN %s THEN 1 ELSE 0 END) AS untracked FROM logs WHERE type = 2 AND created_at BETWEEN ? AND ?`,
		groupByCol, costQuotaExpr, costQuotaExpr, costQuotaNullExpr,
	)
	args := []interface{}{query.StartTime, query.EndTime}
	if query.ModelName != "" {
		sql += " AND model_name = ?"
		args = append(args, query.ModelName)
	}
	if query.ChannelId != 0 {
		sql += " AND channel = ?"
		args = append(args, query.ChannelId)
	}
	if query.GroupName != "" {
		sql += fmt.Sprintf(" AND %s = ?", getGroupCol())
		args = append(args, query.GroupName)
	}
	sql += " GROUP BY " + groupByCol + " ORDER BY profit DESC"

	var results []ProfitRow
	err := model.DB.Raw(sql, args...).Scan(&results).Error
	for i := range results {
		if results[i].Revenue > 0 {
			results[i].ProfitRate = float64(results[i].Profit) / float64(results[i].Revenue) * 100
		}
	}
	return results, err
}
