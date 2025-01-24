package auth

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/url"
	"os"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-resty/resty/v2"
)

const (
	loginPageURL = "https://ais.unmul.ac.id"
	loginPostURL = "https://ais.unmul.ac.id/login/check"
)

type LoginManager struct {
	HttpClient *resty.Client
	Nim        string
	Password   string
}

func (lm *LoginManager) ExtractCaptcha(r io.ReadCloser) (string, error) {
	doc, err := goquery.NewDocumentFromReader(r)
	if err != nil {
		return "", err
	}

	captcha := doc.Find(".badge.badge-primary").Text()
	if captcha == "" {
		return "", errors.New("captcha not found")
	}

	return captcha, nil
}

func (lm *LoginManager) CheckSession() (bool, error) {
	homeURL := "https://ais.unmul.ac.id/mahasiswa/home"

	client := lm.HttpClient.Clone().SetRedirectPolicy(resty.NoRedirectPolicy())
	_, err := client.R().Get(homeURL)

	// If redirected, session is not valid.
	if errors.Is(err, resty.ErrAutoRedirectDisabled) {
		return false, nil
	}

	if err != nil {
		return false, fmt.Errorf("failed to check session: %w\n", err)
	}

	return true, nil
}

func (lm *LoginManager) RefreshSession() {
	if valid, err := lm.CheckSession(); !valid && err == nil {
		_, err := lm.GetCookie()
		if err != nil {
			log.Println(err)
		}
	}
}

func (lm *LoginManager) GetCookie() (string, error) {
	log.Println("getting login cookie...")
	u, _ := url.Parse(loginPageURL)

	// remove cookies
	lm.HttpClient.GetClient().Jar.SetCookies(u, nil)

	client := lm.HttpClient.SetDoNotParseResponse(true)
	resp, err := client.R().Get(loginPageURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch login page: %w", err)
	}

	defer resp.RawBody().Close()

	t := client.GetClient().Jar.Cookies(u)
	cookies := t[0].String()

	captcha, err := lm.ExtractCaptcha(resp.RawBody())
	if err != nil {
		return "", fmt.Errorf("failed to get captcha: %w", err)
	}

	// Log in
	formData := map[string]string{
		"login[username]": lm.Nim,
		"login[password]": lm.Password,
		"login[sc]":       captcha,
	}
	loginResp, err := client.R().
		SetHeader("Cookie", cookies).
		SetFormData(formData).
		Post(loginPostURL)
	if err != nil {
		return "", fmt.Errorf("login request failed: %w", err)
	}

	if !loginResp.IsSuccess() {
		return "", errors.New("login failed")
	}

	err = os.WriteFile("./data/cookie.txt", []byte(cookies), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to save cookie to file: %w", err)
	}

	log.Println("setting cookie...")
	lm.HttpClient.SetHeader("Cookie", cookies)

	return cookies, nil
}
