package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"os"
	"time"

	"github.com/go-resty/resty/v2"
)

const (
	loginPageURL = "https://ais.unmul.ac.id"

	loginPostURL = "https://ais.unmul.ac.id/login/check"
)

type LoginManager struct {
	HttpClient         *resty.Client
	Nim                string
	Password           string
	TurnstileSolverURL string
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
	siteKey := "0x4AAAAAABh_QvAf9mC6eC5w"
	u := fmt.Sprintf("%s/turnstile?url=https://ais.unmul.ac.id/&sitekey=%s", lm.TurnstileSolverURL, siteKey)

	client := resty.New()
	resp, err := client.R().Get(u)
	if err != nil {
		return "", fmt.Errorf("failed to request turnstile solver: %w", err)
	}

	if resp.StatusCode() != 202 {
		return "", fmt.Errorf("failed to request turnstile solver: expected status 202, got %d", resp.StatusCode())
	}

	type QueueSolverResponse struct {
		TaskID string `json:"task_id"`
	}
	var response QueueSolverResponse
	err = json.Unmarshal(resp.Body(), &response)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}
	taskId := response.TaskID

	checkURL := fmt.Sprintf("%s/result?id=%s", lm.TurnstileSolverURL, taskId)
	resp, err = client.R().Get(checkURL)
	if err != nil {
		return "", fmt.Errorf("failed to check turnstile result: %w", err)
	}

	for {
		if string(resp.Body()) == "CAPTCHA_NOT_READY" {
			log.Println("turnstile solver is still processing, waiting for 3 seconds...")
			resp, err = client.R().Get(checkURL)
			if err != nil {
				return "", fmt.Errorf("failed to check turnstile result: %w", err)
			}
			time.Sleep(3 * time.Second)
			continue
		} else {
			break
		}

	}

	type TurnstileResult struct {
		ElapsedTime float32 `json:"elapsed_time"`
		Value       string  `json:"value"`
	}

	var result TurnstileResult
	err = json.Unmarshal(resp.Body(), &result)
	if err != nil {
		return "", fmt.Errorf("failed to unmarshal turnstile result: %w", err)
	}

	if result.Value == "" {
		return "", fmt.Errorf("turnstile solver returned empty value, please try again later")
	}

	log.Println("turnstile solver result:", result.Value)
	formData := map[string]string{
		"login[username]":       lm.Nim,
		"login[password]":       lm.Password,
		"cf-turnstile-response": result.Value,
	}

	parsedLoginPostURL, _ := url.Parse(loginPostURL)
	loginResp, err := client.R().
		SetHeaders(map[string]string{
			"X-Requested-With": "XMLHttpRequest",
			"Referer":          loginPageURL,
		}).
		SetFormData(formData).
		Post(loginPostURL)

	if err != nil {
		return "", fmt.Errorf("login request failed: %w", err)

	}
	var loginResult struct {
		Status  bool
		Message string
	}

	if err := json.Unmarshal(loginResp.Body(), &loginResult); err != nil {
		return "", errors.New("failed to parse login response")

	}

	t := client.GetClient().Jar.Cookies(parsedLoginPostURL)
	cookie := t[0].String()

	return cookie, nil

}
