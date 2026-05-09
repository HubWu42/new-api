package model

var extraMigrations []interface{}

func RegisterMigration(m interface{}) {
	extraMigrations = append(extraMigrations, m)
}

func GetExtraMigrations() []interface{} {
	return extraMigrations
}
