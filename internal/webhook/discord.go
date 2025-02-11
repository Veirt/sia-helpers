package webhook

import (
	"fmt"
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

func BuildKRSDiscordEmbed(old, new types.KRSItem) DiscordEmbed {
	return DiscordEmbed{
		Title: fmt.Sprintf("%s - %s", old.Course, old.Class),
		Fields: []DiscordEmbedField{
			{"Kuota", fmt.Sprintf("%s -> %s", old.QuotaNow, new.QuotaNow)},
		},
	}
}

func BuildKHSDiscordEmbed(old, new types.KHSItem) DiscordEmbed {
	return DiscordEmbed{
		Title: old.Course,
		Fields: []DiscordEmbedField{
			{"Nilai", fmt.Sprintf("%s -> %s", old.Score, new.Score)},
			{"Predikat", new.Grade},
			{"Bobot", new.Weight},
			{"SKS x Bobot", new.WeightedScore},
		},
	}
}

func NotifyDiscord(message DiscordEmbed) error {
	webhookURL := os.Getenv("DISCORD_WEBHOOK_URL")
	if webhookURL == "" {
		return fmt.Errorf("DISCORD_WEBHOOK_URL is not set. Cannot send Discord notification")
	}

	payload := DiscordWebhookPayload{Embeds: []DiscordEmbed{message}}

	webhook := Webhook{
		URL: webhookURL,
		Headers: map[string]string{
			"Content-Type": "application/json",
		},
		Body: payload,
	}

	if err := webhook.Send(); err != nil {
		return fmt.Errorf("failed to send Discord webhook: %w", err)
	}

	return nil
}
