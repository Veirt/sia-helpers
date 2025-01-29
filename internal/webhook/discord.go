package webhook

import (
	"fmt"
	"log"
	"os"

	"github.com/veirt/sia-helpers/types"
)

type DiscordWebhookPayload struct {
	Embeds []DiscordEmbed `json:"embeds"`
}
type DiscordEmbedField struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}
type DiscordEmbed struct {
	Title  string              `json:"title"`
	Fields []DiscordEmbedField `json:"fields"`
}

func BuildDiscordEmbed(old types.KHSItem, new types.KHSItem) DiscordEmbed {
	return DiscordEmbed{
		Title: old.Course,
		Fields: []DiscordEmbedField{
			{
				Name:  "Nilai",
				Value: fmt.Sprintf("%s -> %s", old.Score, new.Score),
			},
			{
				Name:  "Predikat",
				Value: new.Grade,
			},
			{
				Name:  "Bobot",
				Value: new.Weight,
			},
			{
				Name:  "SKS x Bobot",
				Value: new.WeightedScore,
			},
		},
	}
}

func NotifyDiscordWithKHSUpdate(old types.KHSItem, new types.KHSItem) {
	webhookURL := os.Getenv("DISCORD_WEBHOOK_URL")
	if webhookURL == "" {
		log.Println("DISCORD_WEBHOOK_URL is not set. Cannot send Discord notification.")
		return
	}

	embed := BuildDiscordEmbed(old, new)
	payload := DiscordWebhookPayload{
		Embeds: []DiscordEmbed{embed},
	}

	webhook := Webhook{
		URL: webhookURL,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: payload,
	}

	if err := webhook.Send(); err != nil {
		log.Printf("Failed to send Discord webhook: %v", err)
	}
}
