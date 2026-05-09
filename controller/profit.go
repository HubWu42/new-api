package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

type ProfitQueryForm struct {
	StartTime int64  `form:"start_time"`
	EndTime   int64  `form:"end_time"`
	GroupBy   string `form:"group_by"`
	ModelName string `form:"model_name"`
	ChannelId int    `form:"channel_id"`
	GroupName string `form:"group_name"`
}

func GetProfitStats(c *gin.Context) {
	var form ProfitQueryForm
	if err := c.ShouldBindQuery(&form); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": err.Error()})
		return
	}
	if form.EndTime == 0 {
		form.EndTime = time.Now().Unix()
	}
	if form.StartTime == 0 {
		form.StartTime = form.EndTime - 30*24*3600
	}
	if form.GroupBy == "" {
		form.GroupBy = "model"
	}
	rows, err := service.GetProfitStats(service.ProfitQuery{
		StartTime: form.StartTime,
		EndTime:   form.EndTime,
		GroupBy:   form.GroupBy,
		ModelName: form.ModelName,
		ChannelId: form.ChannelId,
		GroupName: form.GroupName,
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": rows})
}

func GetProfitDashboard(c *gin.Context) {
	endTime := time.Now().Unix()
	startTime := endTime - 30*24*3600
	modelStats, _ := service.GetProfitStats(service.ProfitQuery{StartTime: startTime, EndTime: endTime, GroupBy: "model"})
	channelStats, _ := service.GetProfitStats(service.ProfitQuery{StartTime: startTime, EndTime: endTime, GroupBy: "channel"})
	dailyStats, _ := service.GetProfitStats(service.ProfitQuery{StartTime: startTime, EndTime: endTime, GroupBy: "date"})
	var totalRevenue, totalCost int64
	for _, row := range modelStats {
		totalRevenue += row.Revenue
		totalCost += row.Cost
	}
	totalProfit := totalRevenue - totalCost
	profitRate := 0.0
	if totalRevenue > 0 {
		profitRate = float64(totalProfit) / float64(totalRevenue) * 100
	}
	if len(modelStats) > 10 {
		modelStats = modelStats[:10]
	}
	if len(channelStats) > 10 {
		channelStats = channelStats[:10]
	}
	alerts := make([]service.ProfitRow, 0)
	for _, row := range modelStats {
		if row.ProfitRate < 10 && row.RequestCount > 0 {
			alerts = append(alerts, row)
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"total_revenue":      totalRevenue,
		"total_cost":         totalCost,
		"total_profit":       totalProfit,
		"profit_rate":        profitRate,
		"top_profit_models":  modelStats,
		"top_cost_channels":  channelStats,
		"daily_trend":        dailyStats,
		"low_profit_alerts":  alerts,
	}})
}
