package httpclient

import (
	"log"
	"os"

	"github.com/go-resty/resty/v2"
)

const cookieFilePath = "./data/cookie.txt"

var restyClient *resty.Client

func init() {
	restyClient = resty.New()
	setCookieIfExists()
}

func setCookieIfExists() {
	cookieFile, err := os.ReadFile(cookieFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		log.Printf("failed to read %s: %v\n", cookieFilePath, err)
		return
	}

	log.Println("Cookie exists, using it instead.")
	restyClient.SetHeader("Cookie", string(cookieFile))
}

func GetClient() *resty.Client {
	return restyClient
}
