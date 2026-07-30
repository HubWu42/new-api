package relay

import (
	"io"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Upstreams such as the ChatGPT Codex /responses endpoint return a 200 SSE
// stream with no Content-Type header. isResponsesEventStreamSSEBody must
// recognize those bodies from their prefix, and — whatever it decides — must
// hand back every byte it consumed, or the downstream handler would parse a
// truncated response.
func TestIsResponsesEventStreamSSEBodyDetectsAndPreservesBody(t *testing.T) {
	tests := []struct {
		name string
		body string
		want bool
	}{
		{name: "event prefix", body: "event: response.created\ndata: {\"type\":\"response.created\"}\n\n", want: true},
		{name: "data prefix", body: "data: {\"type\":\"response.output_text.delta\"}\n\n", want: true},
		{name: "leading whitespace", body: "\n\n  event: response.created\n\n", want: true},
		{name: "utf8 bom", body: "\xef\xbb\xbfevent: response.created\n\n", want: true},
		{name: "short live prefix", body: "event: ping\n\n", want: true},
		{name: "json object", body: `{"id":"resp_1","object":"response"}`, want: false},
		{name: "json array", body: `[{"id":"resp_1"}]`, want: false},
		{name: "empty", body: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rc := io.NopCloser(strings.NewReader(tt.body))
			out := rc

			got := isResponsesEventStreamSSEBody(rc, &out)
			assert.Equal(t, tt.want, got)

			require.NotNil(t, out)
			rest, err := io.ReadAll(out)
			require.NoError(t, err)
			assert.Equal(t, tt.body, string(rest), "sniffing must not consume bytes from the body")
		})
	}
}

// A nil body must not panic and must report "not SSE".
func TestIsResponsesEventStreamSSEBodyNilBody(t *testing.T) {
	var out io.ReadCloser
	assert.False(t, isResponsesEventStreamSSEBody(nil, &out))
}

// Close must reach the original ReadCloser through the peek wrapper, otherwise
// the upstream connection leaks on every sniffed response.
func TestIsResponsesEventStreamSSEBodyClosePropagates(t *testing.T) {
	tracker := &closeTracker{Reader: strings.NewReader("event: response.created\n\n")}
	var out io.ReadCloser = tracker

	require.True(t, isResponsesEventStreamSSEBody(tracker, &out))
	require.NoError(t, out.Close())
	assert.True(t, tracker.closed, "Close must propagate to the underlying body")
}

type closeTracker struct {
	*strings.Reader
	closed bool
}

func (c *closeTracker) Close() error {
	c.closed = true
	return nil
}
