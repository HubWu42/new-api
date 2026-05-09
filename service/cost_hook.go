package service

import relaycommon "github.com/QuantumNous/new-api/relay/common"

type PostSettleHook func(relayInfo *relaycommon.RelayInfo, quota int)

var postSettleHooks []PostSettleHook

func RegisterPostSettleHook(hook PostSettleHook) {
	postSettleHooks = append(postSettleHooks, hook)
}

func RunPostSettleHooks(relayInfo *relaycommon.RelayInfo, quota int) {
	for _, hook := range postSettleHooks {
		hook(relayInfo, quota)
	}
}

type LogEnrichmentHook func(relayInfo *relaycommon.RelayInfo, other map[string]interface{})

var logEnrichmentHooks []LogEnrichmentHook

func RegisterLogEnrichmentHook(hook LogEnrichmentHook) {
	logEnrichmentHooks = append(logEnrichmentHooks, hook)
}

func RunLogEnrichmentHooks(relayInfo *relaycommon.RelayInfo, other map[string]interface{}) {
	for _, hook := range logEnrichmentHooks {
		hook(relayInfo, other)
	}
}
