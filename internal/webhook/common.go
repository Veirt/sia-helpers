package webhook

import (
	"encoding/json"
	"fmt"

	"github.com/go-resty/resty/v2"
)

type Webhook struct {
	URL     string            `json:"-"`
	Headers map[string]string `json:"-"`
	Body    interface{}       `json:"body"`
}

func (w *Webhook) Send() error {
	payload, err := json.Marshal(w.Body)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook body: %w", err)
	}

	client := resty.New()
	resp, err := client.R().SetHeaders(w.Headers).SetBody(payload).Post(w.URL)
	if err != nil {
		return fmt.Errorf("failed to send webhook: %w ", err)
	}

	if resp.StatusCode() >= 400 {
		return fmt.Errorf("webhook returned error %d: %s", resp.StatusCode(), string(resp.Body()))
	}

	return nil
}
