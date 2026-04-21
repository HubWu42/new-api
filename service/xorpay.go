package service

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type XorPayClient struct {
	aid       string
	appSecret string
	gateway   string
}

func NewXorPayClient(aid, appSecret, gateway string) *XorPayClient {
	return &XorPayClient{
		aid:       aid,
		appSecret: appSecret,
		gateway:   strings.TrimRight(gateway, "/"),
	}
}

func (c *XorPayClient) sign(name, payType, price, orderID, notifyURL string) string {
	str := fmt.Sprintf("%s%s%s%s%s%s", name, payType, price, orderID, notifyURL, c.appSecret)
	h := md5.Sum([]byte(str))
	return hex.EncodeToString(h[:])
}

func (c *XorPayClient) verifyCallback(aoid, orderID, payPrice, payTime, sign string) bool {
	str := fmt.Sprintf("%s%s%s%s%s", aoid, orderID, payPrice, payTime, c.appSecret)
	h := md5.Sum([]byte(str))
	return hex.EncodeToString(h[:]) == sign
}

type XorPayOrderResponse struct {
	Status    string `json:"status"`
	Aoid      string `json:"aoid"`
	ExpiresIn int    `json:"expires_in"`
	Info      struct {
		QR string `json:"qr"`
	} `json:"info"`
}

func (c *XorPayClient) CreateOrder(orderID, name, payType, price, notifyURL string) (qrURL string, aoid string, err error) {
	form := url.Values{}
	form.Set("name", name)
	form.Set("pay_type", payType)
	form.Set("price", price)
	form.Set("order_id", orderID)
	form.Set("notify_url", notifyURL)
	form.Set("sign", c.sign(name, payType, price, orderID, notifyURL))

	reqURL := fmt.Sprintf("%s/api/pay/%s", c.gateway, c.aid)
	resp, err := http.PostForm(reqURL, form)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}

	var result XorPayOrderResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", fmt.Errorf("xorpay response parse error: %w, body=%s", err, string(body))
	}

	if result.Status != "ok" {
		return "", "", fmt.Errorf("xorpay api error: status=%s body=%s", result.Status, string(body))
	}

	if result.Info.QR == "" {
		return "", "", fmt.Errorf("xorpay response missing qr URL")
	}

	return result.Info.QR, result.Aoid, nil
}

func (c *XorPayClient) VerifyCallback(aoid, orderID, payPrice, payTime, sign string) bool {
	return c.verifyCallback(aoid, orderID, payPrice, payTime, sign)
}
