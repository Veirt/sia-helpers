package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/internal/httpclient"
	"github.com/veirt/sia-helpers/khs"
)

func main() {
	godotenv.Load()

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

	// Cron scheduler
	c := cron.New()
	expr := os.Getenv("KHS_CHECK_INTERVAL")
	if expr == "" {
		expr = "@every 00h05m00s"
	}
	log.Println("[KHS Monitor] Interval:", expr)
	c.AddFunc(expr, func() {
		log.Println("[KHS Monitor] Triggered by cron")
		khsm.CheckKHSChanges()
	})
	c.Start()

	// Manual trigger endpoint
	http.HandleFunc("/api/khs-monitor/trigger", func(w http.ResponseWriter, r *http.Request) {
		go khsm.CheckKHSChanges()
		fmt.Fprintln(w, "Manual check triggered")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "33126"
	}
	log.Println("[KHS Monitor] Listening for manual triggers on port", port)
	go http.ListenAndServe(":"+port, nil)

	select {}
}
