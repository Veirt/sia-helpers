package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/veirt/sia-helpers/internal/httpclient"
)

func main() {
	godotenv.Load()

	// Getting credentials
	nim := os.Getenv("NIM")
	password := os.Getenv("PASSWORD")
	if nim == "" || password == "" {
		log.Fatalln("please set environment variables NIM and PASSWORD first")
	}

	lm := LoginManager{
		HttpClient: httpclient.GetClient(),
		Nim:        nim,
		Password:   password,
	}

	km := KRSManager{
		HttpClient: httpclient.GetClient(),
	}

	server := NewServer(&lm, &km)
	log.Println("Listening on", server.HTTPServer.Addr)
	if err := server.HTTPServer.ListenAndServe(); err != nil {
		panic(err)
	}
}
