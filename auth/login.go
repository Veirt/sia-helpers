package auth

import (
	"bytes"
	"encoding/json"
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

func (lm *LoginManager) ExtractCaptcha(r io.Reader) (string, error) {
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

func (lm *LoginManager) RefreshSession() error {
	valid, err := lm.CheckSession()
	if !valid && err == nil {
		log.Println("session is invalid, refreshing...")
		cookie, err := lm.GetCookie()
		if err != nil {
			return fmt.Errorf("failed to get cookie: %w", err)
		}

		// setting cookie
		err = os.WriteFile("./data/cookie.txt", []byte(cookie), 0644)
		if err != nil {
			return fmt.Errorf("failed to write cookie to file: %w", err)
		}
		lm.HttpClient.SetHeader("Cookie", cookie)

		return nil
	}

	return err

}

func (lm *LoginManager) GetCookie() (string, error) {
	log.Println("getting login cookie...")
	u, _ := url.Parse(loginPageURL)

	client := resty.New()
	resp, err := client.R().Get(loginPageURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch login page: %w", err)
	}

	t := client.GetClient().Jar.Cookies(u)
	cookie := t[0].String()

	captcha, err := lm.ExtractCaptcha(bytes.NewBuffer(resp.Body()))
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
		SetHeader("Cookie", cookie).
		SetFormData(formData).
		Post(loginPostURL)
	if err != nil {
		return "", fmt.Errorf("login request failed: %w", err)
	}

	var result struct {
		Status  bool
		Message string
	}
	if err := json.Unmarshal(loginResp.Body(), &result); err != nil {
		return "", errors.New("failed to parse login response")
	}

	if result.Status == false {
		return "", errors.New(result.Message)
	}

	return cookie, nil
}
