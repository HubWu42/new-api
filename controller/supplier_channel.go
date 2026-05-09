package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetSupplierChannels(c *gin.Context) {
	supplierId, _ := strconv.Atoi(c.Query("supplier_id"))
	if supplierId == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "supplier_id required"})
		return
	}
	channels, err := model.GetSupplierChannels(supplierId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": channels})
}

func CreateSupplierChannel(c *gin.Context) {
	var sc model.SupplierChannel
	if err := c.ShouldBindJSON(&sc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	existing, _ := model.GetSupplierChannelByChannelId(sc.ChannelId)
	if existing != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": "channel already bound to a supplier"})
		return
	}
	if err := model.CreateSupplierChannel(&sc); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": sc})
}

func UpdateSupplierChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	var sc model.SupplierChannel
	if err := c.ShouldBindJSON(&sc); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	sc.ID = id
	if err := model.UpdateSupplierChannel(&sc); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": sc})
}

func DeleteSupplierChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	if err := model.DeleteSupplierChannel(id); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetSupplierChannelModelPrices(c *gin.Context) {
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	costs, err := service.GetSupplierModelCostsByChannel(channelId)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": []interface{}{}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": costs})
}

func UpdateSupplierChannelModelPrices(c *gin.Context) {
	channelId, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid id"})
		return
	}
	var prices []model.SupplierModelPrice
	if err := c.ShouldBindJSON(&prices); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	if err := model.BatchUpsertSupplierModelPrices(channelId, prices); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteSupplierChannelModelPrice(c *gin.Context) {
	channelId, _ := strconv.Atoi(c.Param("id"))
	modelName := c.Param("model")
	if err := model.DeleteSupplierModelPrice(channelId, modelName); err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func ParseSupplierChannelLog(c *gin.Context) {
	var req struct {
		Text string `json:"text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "invalid request"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": service.ParseSupplierLog(req.Text)})
}
