package auth

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/go-resty/resty/v2"
)

var (
	loginServiceURL = os.Getenv("LOGIN_SERVICE_URL")
)

type LoginManager struct {
	HttpClient *resty.Client
	Nim        string
	Password   string
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
	u := fmt.Sprintf("%s/api/login", loginServiceURL)

	client := resty.New()
	resp, err := client.R().Get(u)
	if err != nil {
		return "", fmt.Errorf("failed to get login cookie: %w", err)
	}

	cookie := string(resp.Body())
	formatted := fmt.Sprintf("ci_session=%s", strings.ReplaceAll(cookie, "\"", ""))

	return formatted, nil
}
