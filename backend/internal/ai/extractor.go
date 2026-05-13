package ai

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

const defaultProxyURL = "https://ai-gateway.vercel.sh/v1/chat/completions"
const model = "anthropic/claude-sonnet-4-5"

type Extractor struct {
	proxyKey string
	proxyURL string
	client   *http.Client
}

func NewExtractor(proxyKey, proxyURL string) *Extractor {
	if proxyURL == "" {
		proxyURL = defaultProxyURL
	}
	return &Extractor{proxyKey: proxyKey, proxyURL: proxyURL, client: &http.Client{}}
}

type ExtractionResult struct {
	Employer  *string  `json:"employer"`
	StartDate *string  `json:"start_date"`
	EndDate   *string  `json:"end_date"`
	Hours     *float64 `json:"hours"`
	Notes     string   `json:"notes"`
}

// OpenAI-compatible request structures
type chatRequest struct {
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	Messages  []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string      `json:"role"`
	Content interface{} `json:"content"` // string for system, []contentPart for user
}

type contentPart struct {
	Type     string    `json:"type"`
	Text     string    `json:"text,omitempty"`
	ImageURL *imageURL `json:"image_url,omitempty"`
}

type imageURL struct {
	URL string `json:"url"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

var fenceRe = regexp.MustCompile("(?s)```(?:json)?\\s*(\\{.*?\\})\\s*```")

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if m := fenceRe.FindStringSubmatch(s); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return s
}

const systemPrompt = `You are a document parser for a Medicaid work-requirement compliance tracker.
Respond ONLY with valid JSON. No markdown fences, no explanation, no extra text.`

const userPrompt = `Extract from this document and return exactly this JSON shape:
{
  "employer": "<organization or employer name, or null>",
  "start_date": "<YYYY-MM-DD or null>",
  "end_date": "<YYYY-MM-DD or null>",
  "hours": <total numeric hours as decimal, or null>,
  "notes": "<one sentence describing confidence and any caveats>"
}

Document rules:
- Pay stubs: use the "hours worked" field for the pay period shown.
- Employer letters: use the stated date range and total hours.
- Volunteer certificates: use the date of service and hours listed.
- School/training docs: set hours to null (enrollment verified separately).
- Dates must be YYYY-MM-DD. Hours must be a positive decimal or null.`

func (e *Extractor) Extract(ctx context.Context, fileBytes []byte, mimeType string) (*ExtractionResult, error) {
	encoded := base64.StdEncoding.EncodeToString(fileBytes)
	dataURL := fmt.Sprintf("data:%s;base64,%s", mimeType, encoded)

	userContent := []contentPart{
		{
			Type:     "image_url",
			ImageURL: &imageURL{URL: dataURL},
		},
		{
			Type: "text",
			Text: userPrompt,
		},
	}

	payload := chatRequest{
		Model:     model,
		MaxTokens: 512,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, e.proxyURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+e.proxyKey)

	resp, err := e.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call Vercel AI gateway: %w", err)
	}
	defer resp.Body.Close()

	var rb chatResponse
	if err := json.NewDecoder(resp.Body).Decode(&rb); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if rb.Error != nil {
		return nil, fmt.Errorf("gateway error: %s", rb.Error.Message)
	}

	if len(rb.Choices) == 0 || rb.Choices[0].Message.Content == "" {
		return nil, fmt.Errorf("empty response from gateway")
	}

	text := stripFences(rb.Choices[0].Message.Content)

	var result ExtractionResult
	if err := json.Unmarshal([]byte(text), &result); err != nil {
		notes := "Could not parse structured data: " + text
		return &ExtractionResult{Notes: notes}, nil
	}

	return &result, nil
}
