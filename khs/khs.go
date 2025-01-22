package khs

import (
	"encoding/json"
	"log"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-resty/resty/v2"
	"github.com/veirt/sia-helpers/internal/httpclient"
)

const (
	khsListURL   = "https://ais.unmul.ac.id/mahasiswa/khs"
	khsDetailURL = "https://ais.unmul.ac.id/mahasiswa/khs/detail/"
)

type KHSDetailResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Html    string `json:"html"`
}

type KHSManager struct {
	HttpClient      *resty.Client
	TrackedSemester string
}

type KHSItem struct {
	No            string   `json:"no"`
	Class         string   `json:"class"`
	Course        string   `json:"course"`
	Lecturers     []string `json:"lecturers"`
	CourseType    string   `json:"course_type"`
	Credits       string   `json:"credits"`
	Score         string   `json:"score"`
	Grade         string   `json:"grade"`
	Weight        string   `json:"weight"`
	WeightedScore string   `json:"weighted_score"`
}

func (khsm *KHSManager) FetchKHSData() []KHSItem {
	client := httpclient.GetClient().SetDoNotParseResponse(true)
	resp, err := client.R().Get(khsListURL)
	if err != nil {
		log.Printf("failed to fetch KHS: %v", err)
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(resp.RawBody())
	if err != nil {
		log.Printf("failed to parse KHS HTML content: %v", err)
		return nil
	}

	matchingElement := doc.Find(".inbox-data.lihat").FilterFunction(func(i int, s *goquery.Selection) bool {
		semester := s.Find(".inbox-message > .email-data > span").Text()
		return semester == khsm.TrackedSemester
	}).First()

	key, exists := matchingElement.Attr("data-key")
	if !exists {
		log.Fatalln("failed to find data-key attribute")
	}

	client.SetDoNotParseResponse(false)
	resp, err = client.R().Get(khsDetailURL + key)
	log.Println(khsDetailURL + key)
	if err != nil {
		log.Printf("failed to fetch KHS detail: %v", err)
	}

	var result KHSDetailResponse
	if err := json.Unmarshal(resp.Body(), &result); err != nil {
		log.Printf("failed to parse response: %v", err)
		return nil
	}

	doc, err = goquery.NewDocumentFromReader(strings.NewReader(result.Html))
	if err != nil {
		log.Printf("failed to parse KHS HTML content: %v", err)
		return nil
	}

	return extractKHSItems(doc)
}

func extractKHSItems(doc *goquery.Document) []KHSItem {
	var items []KHSItem

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

		item := KHSItem{
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
