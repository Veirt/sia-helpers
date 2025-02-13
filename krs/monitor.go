package krs

import (
	"encoding/json"
	"log"
	"os"
	"slices"

	"github.com/veirt/sia-helpers/internal/webhook"
	"github.com/veirt/sia-helpers/types"
)

const KRSFileName = "data/krs.json"

func (km *KRSManager) CheckKRSChanges() []types.KRSItem {
	oldKRS, err := loadKRSData(KRSFileName)
	if err != nil && os.IsNotExist(err) {
		log.Println("initializing KRS tracking for the first time.")
		krsItems, err := km.FetchKRSData("")
		if err != nil {
			log.Printf("initialize KRS tracking error: %v", err)
			return nil
		}

		km.KRSItems = krsItems
		km.SaveToFile(KRSFileName)
		return nil
	} else if err != nil {
		log.Printf("error loading KRS data: %v", err)
		return nil
	}

	newKRS, err := km.FetchKRSData("")
	if changed := compareKRSData(oldKRS, newKRS, km.TrackedClasses); changed {
		km.KRSItems = newKRS
		km.SaveToFile(KRSFileName)
	}

	return newKRS
}

func loadKRSData(filename string) ([]types.KRSItem, error) {
	b, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var krs []types.KRSItem
	err = json.Unmarshal(b, &krs)
	if err != nil {
		return nil, err
	}

	return krs, nil
}

func compareKRSData(oldKRS, newKRS []types.KRSItem, trackedClasses []string) bool {
	changed := false
	for _, new := range newKRS {
		idx := slices.IndexFunc(oldKRS, func(item types.KRSItem) bool {
			return item.Class == new.Class
		})

		if idx == -1 {
			log.Printf("new course detected: %s", new.Course)
			changed = true
			continue
		}

		old := oldKRS[idx]
		if old.QuotaNow != new.QuotaNow {
			changed = true

			if len(trackedClasses) > 0 {
				if slices.Index(trackedClasses, new.Class) == -1 {
					log.Printf("[UNTRACKED] Quota change detected for course %s %s: %s -> %s", new.Course, new.Class, old.QuotaNow, new.QuotaNow)
					continue
				}
			}

			log.Printf("[TRACKED] Quota change detected for course %s %s: %s -> %s", new.Course, new.Class, old.QuotaNow, new.QuotaNow)
			notifyChange(old, new)
		}
	}

	return changed
}

func notifyChange(old, new types.KRSItem) {
	webhook.NotifyDiscord(webhook.BuildKRSDiscordEmbed(old, new))
	webhook.NotifyWhatsApp(webhook.BuildKRSWhatsAppMessage(old, new))
}
