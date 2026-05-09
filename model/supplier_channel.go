package model

import "time"

type SupplierChannel struct {
	ID         int       `json:"id" gorm:"primaryKey;autoIncrement"`
	SupplierId int       `json:"supplier_id" gorm:"index;not null"`
	ChannelId  int       `json:"channel_id" gorm:"uniqueIndex;not null"`
	Ratio      float64   `json:"ratio" gorm:"not null;default:1"`
	Remark     string    `json:"remark" gorm:"type:varchar(255)"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (SupplierChannel) TableName() string {
	return "supplier_channels"
}

func init() {
	RegisterMigration(&SupplierChannel{})
}

func GetSupplierChannels(supplierId int) ([]SupplierChannel, error) {
	var channels []SupplierChannel
	err := DB.Where("supplier_id = ?", supplierId).Order("id DESC").Find(&channels).Error
	return channels, err
}

func GetSupplierChannel(id int) (*SupplierChannel, error) {
	var sc SupplierChannel
	err := DB.First(&sc, id).Error
	return &sc, err
}

func GetSupplierChannelByChannelId(channelId int) (*SupplierChannel, error) {
	var sc SupplierChannel
	err := DB.Where("channel_id = ?", channelId).First(&sc).Error
	return &sc, err
}

func CreateSupplierChannel(sc *SupplierChannel) error {
	return DB.Create(sc).Error
}

func UpdateSupplierChannel(sc *SupplierChannel) error {
	return DB.Model(&SupplierChannel{}).Where("id = ?", sc.ID).Updates(map[string]interface{}{
		"ratio":  sc.Ratio,
		"remark": sc.Remark,
	}).Error
}

func DeleteSupplierChannel(id int) error {
	return DB.Delete(&SupplierChannel{}, id).Error
}
