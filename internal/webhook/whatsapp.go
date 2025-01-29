package webhook

import (
	"fmt"
	"log"
	"os"

	"github.com/veirt/sia-helpers/types"
)

type WhatsAppWebhookPayload struct {
	Message string `json:"message"`
}

func BuildWhatsAppMessage(old types.KHSItem, new types.KHSItem) string {
	return fmt.Sprintf(`*%s*

Nilai: %s -> %s
Predikat: %s
Bobot: %s
SKS x Bobot: %s`,
		old.Course, old.Score, new.Score, new.Grade, new.Weight, new.WeightedScore,
	)
}

func NotifyWhatsAppWithKHSUpdate(old types.KHSItem, new types.KHSItem) {
	webhookURL := os.Getenv("WHATSAPP_WEBHOOK_URL")
	if webhookURL == "" {
		log.Println("WHATSAPP_WEBHOOK_URL is not set. Cannot send WhatsApp notification.")
		return
	}

	message := BuildWhatsAppMessage(old, new)

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
		log.Printf("Failed to send WhatsApp webhook: %v", err)
	}
}
