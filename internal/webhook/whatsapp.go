package webhook

import (
	"fmt"
	"os"

	"github.com/veirt/sia-helpers/types"
)

type WhatsAppWebhookPayload struct {
	Message string `json:"message"`
}

func BuildKRSWhatsAppMessage(old, new types.KRSItem) string {
	return fmt.Sprintf(`*[KRS Monitor]*
*%s - %s*

Kuota: %s -> %s`,
		old.Course, old.Class, old.QuotaNow, new.QuotaNow)
}

func BuildKHSWhatsAppMessage(old, new types.KHSItem) string {
	return fmt.Sprintf(`*%s*

Nilai: %s -> %s
Predikat: %s
Bobot: %s
SKS x Bobot: %s`,
		old.Course, old.Score, new.Score, new.Grade, new.Weight, new.WeightedScore,
	)
}

func NotifyWhatsApp(message string) error {
	webhookURL := os.Getenv("WHATSAPP_WEBHOOK_URL")
	if webhookURL == "" {
		return fmt.Errorf("WHATSAPP_WEBHOOK_URL is not set. Cannot send WhatsApp notification")
	}

	webhook := Webhook{
		URL: webhookURL,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: map[string]string{
			"message": message,
		},
	}

	if err := webhook.Send(); err != nil {
		return fmt.Errorf("failed to send WhatsApp webhook: %w", err)
	}

	return nil
}
