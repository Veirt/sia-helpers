package khs

import (
	"encoding/json"
	"log"
	"os"
	"slices"

	"github.com/veirt/sia-helpers/internal/webhook"
	"github.com/veirt/sia-helpers/types"
)

const KHSFileName = "data/khs.json"

func (khsm *KHSManager) CheckKHSChanges() []types.KHSItem {
	oldKHS, err := loadKHSData(KHSFileName)
	if err != nil && os.IsNotExist(err) {
		log.Println("initializing KHS tracking for the first time.")
		khsm.FetchKHSData()
		khsm.SaveToFile(KHSFileName)
		return nil
	} else if err != nil {
		log.Printf("error loading KHS data: %v", err)
		return nil
	}

	newKHS, err := khsm.FetchKHSData()
	if err != nil {
		log.Println("error fetching KHS data:", err)
	}
	if changed := compareKHSData(oldKHS, newKHS); changed {
		khsm.SaveToFile(KHSFileName)
	}

	return newKHS
}

func loadKHSData(filename string) ([]types.KHSItem, error) {
	b, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var khs []types.KHSItem
	err = json.Unmarshal(b, &khs)
	if err != nil {
		return nil, err
	}

	return khs, nil
}

func compareKHSData(oldKHS, newKHS []types.KHSItem) bool {
	changed := false
	for _, new := range newKHS {
		idx := slices.IndexFunc(oldKHS, func(item types.KHSItem) bool {
			return item.Course == new.Course
		})

		if idx == -1 {
			log.Printf("new course detected: %s", new.Course)
			changed = true
			continue
		}

		old := oldKHS[idx]
		if old.Score != new.Score {
			log.Printf("score change detected for course %s: %s -> %s", new.Course, old.Score, new.Score)
			notifyChange(old, new)
			changed = true
		}
	}

	return changed
}

func notifyChange(old, new types.KHSItem) {
	webhook.NotifyDiscord(webhook.BuildKHSDiscordEmbed(old, new))
	webhook.NotifyWhatsApp(webhook.BuildKHSWhatsAppMessage(old, new))
}
