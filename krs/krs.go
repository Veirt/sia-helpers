package krs

import (
	"encoding/json"
	"log"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-resty/resty/v2"
)

const loadClassURL = "https://ais.unmul.ac.id/mahasiswa/krs/load_kelas"

type LoadClassResponse struct {
	Status      bool   `json:"status"`
	Message     string `json:"message"`
	HtmlReguler string `json:"html_reguler"`
}

type KRSItem struct {
	Semester   string   `json:"semester"`
	Course     string   `json:"course"`
	Class      string   `json:"class"`
	Curriculum string   `json:"curriculum"`
	Credits    string   `json:"credits"`
	CourseType string   `json:"course_type"` // Wajib / Pilihan (WP)
	QuotaNow   string   `json:"quota_now"`
	QuotaMax   string   `json:"quota_max"`
	Lecturers  []string `json:"lecturers"`
}

type KRSManager struct {
	HttpClient *resty.Client
}

func (km *KRSManager) FetchKRSData(search string) []KRSItem {
	// TODO: Figure out about semester, prodi later.
	formData := map[string]string{
		"kurikulum": "1143",
		"semester":  "20242",
		"prodi":     "191",
		"fakultas":  "7",
		"search":    search,
	}

	client := km.HttpClient.SetDoNotParseResponse(false)
	resp, err := client.R().SetFormData(formData).Post(loadClassURL)
	if err != nil {
		log.Printf("failed to fetch KRS: %v", err)
		return nil
	}

	var result LoadClassResponse
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		log.Printf("failed to parse response: %v", err)
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(result.HtmlReguler))
	if err != nil {
		log.Printf("failed to parse KRS HTML content: %v", err)
		return nil
	}

	return extractKRSItems(doc)
}

func getTrimmedText(sel *goquery.Selection, prefixToRemove, suffixToRemove string) string {
	text := strings.TrimSpace(sel.Text())
	text = strings.TrimPrefix(text, prefixToRemove)
	return strings.TrimSuffix(text, suffixToRemove)
}

func extractKRSItems(doc *goquery.Document) []KRSItem {
	var items []KRSItem

	doc.Find("#paginated-list > li").Each(func(i int, s *goquery.Selection) {
		item := KRSItem{
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
