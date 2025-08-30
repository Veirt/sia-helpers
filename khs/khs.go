package khs

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-resty/resty/v2"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/types"
)

const (
	KHSListURL   = "https://ais.unmul.ac.id/mahasiswa/khs"
	KHSDetailURL = "https://ais.unmul.ac.id/mahasiswa/khs/detail/"
)

type KHSManager struct {
	HttpClient      *resty.Client
	LoginManager    *auth.LoginManager
	TrackedSemester string
	KHSItems        []types.KHSItem
}

func (khsm *KHSManager) FetchKHSData() ([]types.KHSItem, error) {
	client := khsm.HttpClient.Clone().SetRedirectPolicy(resty.NoRedirectPolicy())
	resp, err := client.R().Get(KHSListURL)
	if errors.Is(err, resty.ErrAutoRedirectDisabled) {
		if err := khsm.LoginManager.RefreshSession(); err != nil {
			return nil, fmt.Errorf("failed to refresh session: %w", err)
		}
		resp, err = client.R().Get(KHSListURL)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch after refresh: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("failed to do initial fetch: %w", err)
	}

	key, err := parseKHSList(bytes.NewBuffer(resp.Body()), khsm.TrackedSemester)
	if err != nil {
		return nil, err
	}

	resp, err = client.R().Get(KHSDetailURL + key)
	if err != nil {
		return nil, fmt.Errorf("fetch KHS detail: %w", err)
	}

	items, err := parseKHSDetail(resp.Body())
	if err != nil {
		return nil, err
	}

	khsm.KHSItems = items

	return items, nil
}

func (khsm *KHSManager) SaveToFile(name string) {
	khs, err := json.Marshal(khsm.KHSItems)
	if err != nil {
		log.Printf("error marshaling KHS items: %v", err)
		return
	}

	err = os.WriteFile(name, khs, 0644)
	if err != nil {
		log.Printf("error writing KHS items to file: %v", err)
	}
}

func parseKHSList(r io.Reader, trackedSemester string) (string, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return "", fmt.Errorf("parse KHS List HTML content: %w", err)
	}

	matchingElement := doc.Find(".inbox-data.lihat").FilterFunction(func(i int, s *goquery.Selection) bool {
		semester := s.Find(".inbox-message > .email-data > span").Text()
		return semester == trackedSemester
	}).First()

	key, exists := matchingElement.Attr("data-key")
	if !exists {
		return "", errors.New("failed to find data-key attribute")
	}

	return key, nil
}

func parseKHSDetail(body []byte) ([]types.KHSItem, error) {
	var result types.KHSDetailResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse KHS Detail response: %w", err)
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(result.Html))
	if err != nil {
		return nil, fmt.Errorf("parse KHS Detail HTML content: %w", err)
	}

	return extractKHSItems(doc), nil
}

func extractKHSItems(doc *goquery.Document) []types.KHSItem {
	var items []types.KHSItem

	doc.Find("tbody > tr").Each(func(i int, s *goquery.Selection) {
		// If the length is 7, it means the user has not filled the questionnaire.
		if s.Children().Length() == 7 {
			course := strings.TrimSpace(s.Find("td").Eq(1).Contents().Not("span").Text())
			log.Println("You have not filled questionnaire for course:", course)
			return
		}

		if s.Children().Length() != 10 {
			return
		}

		item := types.KHSItem{
			No:            strings.TrimSpace(s.Find("th").Text()),
			Class:         strings.TrimSpace(s.Find("td").Eq(0).Text()),
			Course:        strings.TrimSpace(s.Find("td").Eq(1).Contents().Not("span").Text()),
			CourseType:    strings.TrimSpace(s.Find("td").Eq(2).Text()),
			Credits:       strings.TrimSpace(s.Find("td").Eq(3).Text()),
			Score:         strings.TrimSpace(s.Find("td").Eq(4).Text()),
			Grade:         strings.TrimSpace(s.Find("td").Eq(5).Text()),
			Weight:        strings.TrimSpace(s.Find("td").Eq(6).Text()),
			WeightedScore: strings.TrimSpace(s.Find("td").Eq(7).Text()),
		}

		// Extract lecturers
		s.Find("td").Eq(1).Find("span").Each(func(i int, sel *goquery.Selection) {
			if lecturer := strings.TrimSpace(sel.Text()); lecturer != "" {
				item.Lecturers = append(item.Lecturers, lecturer)
			}
		})

		items = append(items, item)
	})

	return items
}
