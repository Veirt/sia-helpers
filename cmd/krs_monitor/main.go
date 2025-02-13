package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/internal/httpclient"
	"github.com/veirt/sia-helpers/krs"
)

type TrackedClasses struct {
	Classes []string `json:"classes"`
}

func main() {
	godotenv.Load()

	// Getting credentials
	nim := os.Getenv("NIM")
	password := os.Getenv("PASSWORD")
	if nim == "" || password == "" {
		log.Fatalln("please set environment variables NIM and PASSWORD first")
	}

	httpClient := httpclient.GetClient()
	lm := auth.LoginManager{
		HttpClient: httpClient,
		Nim:        nim,
		Password:   password,
	}

	trackedClasses, err := loadTrackedClasses("data/krs_tracked_classes.json")
	if err != nil {
		log.Println("error when loading tracked classes:", err)
		return
	}

	krsm := krs.KRSManager{
		HttpClient:     httpClient,
		LoginManager:   &lm,
		TrackedClasses: trackedClasses.Classes,
	}

	c := cron.New()

	expr := os.Getenv("KRS_CHECK_INTERVAL")
	if expr == "" {
		expr = "@every 00h05m00s" // default to every 5 minutes
	}
	log.Println("[KRS Monitor] Interval:", expr)
	log.Println("[KRS Monitor] Tracked Classes:", trackedClasses.Classes)

	c.AddFunc(expr, func() {
		krsm.CheckKRSChanges()
	})

	c.Start()

	select {}
}

func loadTrackedClasses(filepath string) (*TrackedClasses, error) {
	file, err := os.Open(filepath)
	if os.IsNotExist(err) {
		defaultData := TrackedClasses{Classes: []string{}}
		if err := saveTrackedClasses(filepath, &defaultData); err != nil {
			return nil, err
		}
		return &defaultData, nil
	} else if err != nil {
		return nil, err
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	var data TrackedClasses
	if err := decoder.Decode(&data); err != nil {
		return nil, err
	}

	return &data, nil
}

func saveTrackedClasses(filepath string, data *TrackedClasses) error {
	file, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	return encoder.Encode(data)
}
