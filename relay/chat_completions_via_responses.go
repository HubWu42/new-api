package relay

import (
	"bufio"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/relay/channel"
	openaichannel "github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

func applySystemPromptIfNeeded(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) {
	if info == nil || request == nil {
		return
	}
	if info.ChannelSetting.SystemPrompt == "" {
		return
	}

	systemRole := request.GetSystemRoleName()

	containSystemPrompt := false
	for _, message := range request.Messages {
		if message.Role == systemRole {
			containSystemPrompt = true
			break
		}
	}
	if !containSystemPrompt {
		systemMessage := dto.Message{
			Role:    systemRole,
			Content: info.ChannelSetting.SystemPrompt,
		}
		request.Messages = append([]dto.Message{systemMessage}, request.Messages...)
		return
	}

	if !info.ChannelSetting.SystemPromptOverride {
		return
	}

	common.SetContextKey(c, constant.ContextKeySystemPromptOverride, true)
	for i, message := range request.Messages {
		if message.Role != systemRole {
			continue
		}
		if message.IsStringContent() {
			request.Messages[i].SetStringContent(info.ChannelSetting.SystemPrompt + "\n" + message.StringContent())
			return
		}
		contents := message.ParseContent()
		contents = append([]dto.MediaContent{
			{
				Type: dto.ContentTypeText,
				Text: info.ChannelSetting.SystemPrompt,
			},
		}, contents...)
		request.Messages[i].Content = contents
		return
	}
}

func chatCompletionsViaResponses(c *gin.Context, info *relaycommon.RelayInfo, adaptor channel.Adaptor, request *dto.GeneralOpenAIRequest) (*dto.Usage, *types.NewAPIError) {
	chatJSON, err := common.Marshal(request)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}

	chatJSON, err = relaycommon.RemoveDisabledFields(chatJSON, info.ChannelOtherSettings, info.ChannelSetting.PassThroughBodyEnabled)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}

	if len(info.ParamOverride) > 0 {
		chatJSON, err = relaycommon.ApplyParamOverrideWithRelayInfo(chatJSON, info)
		if err != nil {
			return nil, newAPIErrorFromParamOverride(err)
		}
	}

	var overriddenChatReq dto.GeneralOpenAIRequest
	if err := common.Unmarshal(chatJSON, &overriddenChatReq); err != nil {
		return nil, types.NewError(err, types.ErrorCodeChannelParamOverrideInvalid, types.ErrOptionWithSkipRetry())
	}

	result, err := service.ConvertRequestVia(c, info, &overriddenChatReq, types.RelayFormatOpenAI, types.RelayFormatOpenAIResponses)
	if err != nil {
		return nil, types.NewErrorWithStatusCode(err, types.ErrorCodeInvalidRequest, http.StatusBadRequest, types.ErrOptionWithSkipRetry())
	}
	responsesReq, ok := result.Value.(*dto.OpenAIResponsesRequest)
	if !ok {
		return nil, types.NewError(fmt.Errorf("expected OpenAI responses request, got %T", result.Value), types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}

	savedRelayMode := info.RelayMode
	savedRequestURLPath := info.RequestURLPath
	defer func() {
		info.RelayMode = savedRelayMode
		info.RequestURLPath = savedRequestURLPath
	}()

	info.RelayMode = relayconstant.RelayModeResponses
	info.RequestURLPath = "/v1/responses"

	convertedRequest, err := adaptor.ConvertOpenAIResponsesRequest(c, info, *responsesReq)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}
	relaycommon.AppendRequestConversionFromRequest(info, convertedRequest)

	jsonData, err := common.Marshal(convertedRequest)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}

	jsonData, err = relaycommon.RemoveDisabledFields(jsonData, info.ChannelOtherSettings, info.ChannelSetting.PassThroughBodyEnabled)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}

	body, size, closer, err := relaycommon.NewOutboundJSONBody(jsonData)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeConvertRequestFailed, types.ErrOptionWithSkipRetry())
	}
	defer closer.Close()
	jsonData = nil
	info.UpstreamRequestBodySize = size
	var requestBody io.Reader = body

	var httpResp *http.Response
	resp, err := adaptor.DoRequest(c, info, requestBody)
	if err != nil {
		return nil, types.NewOpenAIError(err, types.ErrorCodeDoRequestFailed, http.StatusInternalServerError)
	}
	if resp == nil {
		return nil, types.NewOpenAIError(nil, types.ErrorCodeBadResponse, http.StatusInternalServerError)
	}

	statusCodeMappingStr := c.GetString("status_code_mapping")

	httpResp = resp.(*http.Response)
	clientStream := info.IsStream
	upstreamStream := isResponsesEventStreamContentType(httpResp.Header.Get("Content-Type"))
	if !upstreamStream {
		// Some backends (e.g. the ChatGPT Codex /responses endpoint) return a
		// 200 SSE stream with no Content-Type header at all. The header check
		// above misses this and the caller then treats the SSE body as JSON,
		// failing with "invalid character 'e'". Sniff the body prefix instead.
		upstreamStream = isResponsesEventStreamSSEBody(httpResp.Body, &httpResp.Body)
	}
	info.IsStream = clientStream || upstreamStream
	if httpResp.StatusCode != http.StatusOK {
		newApiErr := service.RelayErrorHandler(c.Request.Context(), httpResp, false)
		service.ResetStatusCode(newApiErr, statusCodeMappingStr)
		return nil, newApiErr
	}

	if upstreamStream && clientStream {
		usage, newApiErr := openaichannel.OaiResponsesToChatStreamHandler(c, info, httpResp)
		if newApiErr != nil {
			service.ResetStatusCode(newApiErr, statusCodeMappingStr)
			return nil, newApiErr
		}
		return usage, nil
	}
	if upstreamStream {
		info.IsStream = false
		usage, newApiErr := openaichannel.OaiResponsesToChatBufferedStreamHandler(c, info, httpResp)
		if newApiErr != nil {
			service.ResetStatusCode(newApiErr, statusCodeMappingStr)
			return nil, newApiErr
		}
		return usage, nil
	}

	usage, newApiErr := openaichannel.OaiResponsesToChatHandler(c, info, httpResp)
	if newApiErr != nil {
		service.ResetStatusCode(newApiErr, statusCodeMappingStr)
		return nil, newApiErr
	}
	return usage, nil
}

func isResponsesEventStreamContentType(contentType string) bool {
	return strings.Contains(strings.ToLower(contentType), "text/event-stream")
}

// sseSniffLimit bounds how far into the body we look for an SSE marker. A
// leading BOM plus whitespace still leaves ample room for "event:"/"data:".
const sseSniffLimit = 64

// isResponsesEventStreamSSEBody detects an SSE response body (a leading
// "event:" or "data:" prefix, after an optional BOM and/or whitespace) when the
// upstream omits the Content-Type header — as the ChatGPT Codex /responses
// endpoint does.
//
// It uses bufio.Reader.Peek, which buffers without advancing, so the body is
// left byte-for-byte intact for whichever handler runs next. This matters in
// both directions: the stream handler must see the first event, and the JSON
// handler must see the opening brace. Peeking one extra byte at a time (rather
// than a single Peek(64)) keeps a short live prefix such as "event: ping\n\n"
// detectable without blocking for bytes the upstream has not sent yet.
//
// JSON-like bodies (leading '{', '[', '"') are rejected as soon as they are
// recognizable. The wrapped body is written back through out; the caller must
// use out for subsequent reads.
func isResponsesEventStreamSSEBody(rc io.ReadCloser, out *io.ReadCloser) bool {
	if rc == nil {
		return false
	}
	br := bufio.NewReader(rc)
	// Hand the wrapper back regardless of the verdict: it holds the full body.
	*out = &peekReadCloser{Reader: br, closer: rc}

	for n := 1; n <= sseSniffLimit; n++ {
		buf, err := br.Peek(n)
		trimmed := strings.TrimPrefix(string(buf), "\xef\xbb\xbf")
		trimmed = strings.TrimLeft(trimmed, " \t\r\n")

		if strings.HasPrefix(trimmed, "event:") || strings.HasPrefix(trimmed, "data:") {
			return true
		}
		if len(trimmed) > 0 && (trimmed[0] == '{' || trimmed[0] == '[' || trimmed[0] == '"') {
			return false
		}
		if err != nil {
			return false // EOF or read error: not enough to confirm SSE
		}
	}
	return false
}

// peekReadCloser wraps a bufio.Reader plus the original closer so downstream
// consumers read from the buffer (which still holds every byte) and close
// correctly.
type peekReadCloser struct {
	Reader *bufio.Reader
	closer io.ReadCloser
}

func (p *peekReadCloser) Read(b []byte) (int, error) {
	return p.Reader.Read(b)
}

func (p *peekReadCloser) Close() error {
	return p.closer.Close()
}
