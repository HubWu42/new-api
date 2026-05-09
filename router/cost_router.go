package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterCostRoutes(apiRouter *gin.RouterGroup) {
	gmrRoute := apiRouter.Group("/group_model_ratio")
	gmrRoute.Use(middleware.RootAuth())
	{
		gmrRoute.GET("/cost_averages", controller.GetModelCostAverages)
	}

	supplierRoute := apiRouter.Group("/suppliers")
	supplierRoute.Use(middleware.AdminAuth())
	{
		supplierRoute.GET("/", controller.GetSuppliers)
		supplierRoute.POST("/", controller.UpsertSupplier)
		supplierRoute.PUT("/:id", controller.UpsertSupplier)
		supplierRoute.DELETE("/:id", controller.DeleteSupplier)
	}

	supplierChannelRoute := apiRouter.Group("/supplier-channels")
	supplierChannelRoute.Use(middleware.AdminAuth())
	{
		supplierChannelRoute.GET("/", controller.GetSupplierChannels)
		supplierChannelRoute.POST("/", controller.CreateSupplierChannel)
		supplierChannelRoute.PUT("/:id", controller.UpdateSupplierChannel)
		supplierChannelRoute.DELETE("/:id", controller.DeleteSupplierChannel)
		supplierChannelRoute.GET("/:id/prices", controller.GetSupplierChannelModelPrices)
		supplierChannelRoute.PUT("/:id/prices", controller.UpdateSupplierChannelModelPrices)
		supplierChannelRoute.DELETE("/:id/prices/:model", controller.DeleteSupplierChannelModelPrice)
		supplierChannelRoute.POST("/:id/parse-log", controller.ParseSupplierChannelLog)
	}

	channelRoute := apiRouter.Group("/channel")
	channelRoute.Use(middleware.AdminAuth())
	{
		channelRoute.POST("/:id/cost-verifications", controller.CreateCostVerification)
	}

	apiRouter.GET("/profit/dashboard", middleware.RootAuth(), controller.GetProfitDashboard)
	apiRouter.GET("/profit/stats", middleware.RootAuth(), controller.GetProfitStats)
}
