package model

import "time"

type Supplier struct {
	ID                   int       `json:"id" gorm:"primaryKey;autoIncrement"`
	Name                 string    `json:"name" gorm:"type:varchar(128);uniqueIndex;not null"`
	DisplayCurrency      string    `json:"display_currency" gorm:"type:varchar(16);not null;default:'USD'"`
	SettlementCurrency   string    `json:"settlement_currency" gorm:"type:varchar(16);not null;default:'CNY'"`
	QuoteUnitToCnyRate   float64   `json:"quote_unit_to_cny_rate" gorm:"not null;default:1"`
	OfficialUsdToCnyRate float64   `json:"official_usd_to_cny_rate" gorm:"not null;default:6.9"`
	Remark               string    `json:"remark" gorm:"type:varchar(255)"`
	CreatedAt            time.Time `json:"created_at"`
	UpdatedAt            time.Time `json:"updated_at"`
}

func (Supplier) TableName() string {
	return "suppliers"
}

func init() {
	RegisterMigration(&Supplier{})
}

func GetSuppliers() ([]Supplier, error) {
	var suppliers []Supplier
	err := DB.Order("id DESC").Find(&suppliers).Error
	return suppliers, err
}

func UpsertSupplier(supplier *Supplier) error {
	if supplier.ID > 0 {
		return DB.Model(&Supplier{}).Where("id = ?", supplier.ID).Updates(supplier).Error
	}
	return DB.Create(supplier).Error
}

func DeleteSupplier(id int) error {
	return DB.Delete(&Supplier{}, id).Error
}
