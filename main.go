package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/internal/httpclient"
	"github.com/veirt/sia-helpers/internal/server"
	"github.com/veirt/sia-helpers/khs"
	"github.com/veirt/sia-helpers/krs"
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

	km := krs.KRSManager{
		HttpClient: httpClient,
	}

	khsm := khs.KHSManager{
		HttpClient:      httpClient,
		TrackedSemester: os.Getenv("CURRENT_SEMESTER"),
	}

	server := server.NewServer(&lm, &km, &khsm)
	log.Println("Listening on", server.HTTPServer.Addr)
	if err := server.HTTPServer.ListenAndServe(); err != nil {
		panic(err)
	}
}
