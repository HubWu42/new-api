package model

import "time"

type CostVerification struct {
	ID                int       `json:"id" gorm:"primaryKey;autoIncrement"`
	ChannelId         int       `json:"channel_id" gorm:"index;not null"`
	ModelName         string    `json:"model_name" gorm:"type:varchar(255);index;not null"`
	RequestId         string    `json:"request_id" gorm:"type:varchar(128);index"`
	BalanceBefore     float64   `json:"balance_before" gorm:"not null;default:0"`
	BalanceAfter      float64   `json:"balance_after" gorm:"not null;default:0"`
	ActualCostCny     float64   `json:"actual_cost_cny" gorm:"not null;default:0"`
	CalculatedCostCny float64   `json:"calculated_cost_cny" gorm:"not null;default:0"`
	DeviationRate     float64   `json:"deviation_rate" gorm:"not null;default:0"`
	Remark            string    `json:"remark" gorm:"type:varchar(255)"`
	CreatedAt         time.Time `json:"created_at"`
}

func (CostVerification) TableName() string {
	return "cost_verifications"
}

func init() {
	RegisterMigration(&CostVerification{})
}

func CreateCostVerification(item *CostVerification) error {
	if item.ActualCostCny > 0 {
		item.DeviationRate = (item.CalculatedCostCny - item.ActualCostCny) / item.ActualCostCny * 100
	}
	return DB.Create(item).Error
}

func GetCostVerifications(channelId int, limit, offset int) ([]CostVerification, error) {
	var items []CostVerification
	err := DB.Where("channel_id = ?", channelId).Order("created_at DESC").Limit(limit).Offset(offset).Find(&items).Error
	return items, err
}
