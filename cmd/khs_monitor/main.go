package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/internal/httpclient"
	"github.com/veirt/sia-helpers/khs"
)

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

	khsm := khs.KHSManager{
		HttpClient:      httpClient,
		LoginManager:    &lm,
		TrackedSemester: os.Getenv("CURRENT_SEMESTER"),
	}
	log.Println("[KHS Monitor] Currently tracked semester:", khsm.TrackedSemester)
	c := cron.New()

	expr := os.Getenv("KHS_CHECK_INTERVAL")
	if expr == "" {
		expr = "@every 00h05m00s" // default to every 5 minutes
	}
	log.Println("[KHS Monitor] Interval:", expr)

	c.AddFunc(expr, func() {
		khsm.CheckKHSChanges()
	})

	c.Start()

	select {}
}
