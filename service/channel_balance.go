package service

import (
	"github.com/QuantumNous/new-api/model"
	"gorm.io/gorm"
)

func DeductChannelBalanceCny(channelId int, costCny float64, modelName string, requestId string) error {
	result := model.DB.Model(&model.Channel{}).Where("id = ?", channelId).Update("balance", gorm.Expr("balance - ?", costCny))
	return result.Error
}
