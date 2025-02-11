package krs

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-resty/resty/v2"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/types"
)

const (
	LoadClassURL    = "https://ais.unmul.ac.id/mahasiswa/krs/load_kelas"
	CheckSessionURL = "https://ais.unmul.ac.id/mahasiswa/home"
)

type LoadClassResponse struct {
	Status      bool   `json:"status"`
	Message     string `json:"message"`
	HtmlReguler string `json:"html_reguler"`
}

type KRSManager struct {
	HttpClient     *resty.Client
	LoginManager   *auth.LoginManager
	KRSItems       []types.KRSItem
	TrackedClasses []string
}

func (km *KRSManager) FetchKRSData(search string) ([]types.KRSItem, error) {
	client := km.HttpClient.Clone().SetRedirectPolicy(resty.NoRedirectPolicy())
	resp, err := client.R().Get(CheckSessionURL)
	if errors.Is(err, resty.ErrAutoRedirectDisabled) {
		if err := km.LoginManager.RefreshSession(); err != nil {
			return nil, fmt.Errorf("refresh session: %w", err)
		}
		resp, err = client.R().Get(CheckSessionURL)
		if err != nil {
			return nil, fmt.Errorf("fetch after refresh: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("initial fetch: %w", err)
	}

	// TODO: Figure out about semester, prodi later.
	formData := map[string]string{
		"kurikulum": "1143",
		"semester":  "20242",
		"prodi":     "191",
		"fakultas":  "7",
		"search":    search,
	}

	client = km.HttpClient
	resp, err = client.R().SetFormData(formData).Post(LoadClassURL)
	if err != nil {
		log.Printf("failed to fetch KRS: %v", err)
		return nil, err
	}

	var result LoadClassResponse
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		log.Printf("failed to parse response: %v", err)
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(result.HtmlReguler))
	if err != nil {
		log.Printf("failed to parse KRS HTML content: %v", err)
		return nil, err
	}

	return extractKRSItems(doc), nil
}

func (km *KRSManager) SaveToFile(name string) {
	krs, err := json.Marshal(km.KRSItems)
	if err != nil {
		log.Printf("error marshaling KRS items: %v", err)
		return
	}

	err = os.WriteFile(name, krs, 0644)
	if err != nil {
		log.Printf("error writing KRS items to file: %v", err)
	}
}

func getTrimmedText(sel *goquery.Selection, prefixToRemove, suffixToRemove string) string {
	text := strings.TrimSpace(sel.Text())
	text = strings.TrimPrefix(text, prefixToRemove)
	return strings.TrimSuffix(text, suffixToRemove)
}

func extractKRSItems(doc *goquery.Document) []types.KRSItem {
	var items []types.KRSItem

	doc.Find("#paginated-list > li").Each(func(i int, s *goquery.Selection) {
		item := types.KRSItem{
			Semester:   getTrimmedText(s.Find(".inbox-user > .form-check.form-check-inline.m-0 > span"), "Smt. ", ""),
			Course:     strings.TrimSpace(s.Find(".inbox-user p").Text()),
			Class:      strings.TrimSpace(s.Find(".inbox-message > .email-data > span").Contents().Not("span").Text()),
			Curriculum: strings.TrimSpace(s.Find(".inbox-message > .email-data > span > span").Text()),
			Credits:    getTrimmedText(s.Find(".inbox-message > .email-data > .badge-light-primary"), "", " SKS"),
			CourseType: strings.TrimSpace(s.Find(".inbox-message > .email-data > .badge-light-success,.badge-light-warning").Text()),
		}

		quotaString := strings.TrimSpace(s.Find(".inbox-message > .email-data > .badge-light-info,.badge-light-danger").Text())
		if parts := strings.SplitN(quotaString, "/", 2); len(parts) == 2 {
			item.QuotaNow = strings.TrimSpace(parts[0])
			item.QuotaMax = strings.TrimSpace(parts[1])
		}

		s.Find(".inbox-message > .email-dosen > ul > li").Each(func(i int, sel *goquery.Selection) {
			if lecturer := strings.TrimSpace(sel.Text()); lecturer != "" {
				item.Lecturers = append(item.Lecturers, lecturer)
			}
		})

		items = append(items, item)
	})

	return items
}
