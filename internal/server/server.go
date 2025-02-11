package server

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/khs"
	"github.com/veirt/sia-helpers/krs"
	"github.com/veirt/sia-helpers/types"
)

func (s *Server) krsHandler(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")

	krsData, err := s.KRSManager.FetchKRSData(search)
	if err != nil {
		http.Error(w, "failed to fetch krs data", http.StatusInternalServerError)
		log.Println(err)
		return
	}

	jsonData, err := json.Marshal(krsData)
	if err != nil {
		http.Error(w, "failed to marshal json", http.StatusInternalServerError)
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonData)
}

func (s *Server) khsHandler(w http.ResponseWriter, r *http.Request) {
	var khsItems []types.KHSItem
	b, err := os.ReadFile(khs.KHSFileName)
	if err != nil && os.IsNotExist(err) {
		khsItems, err = s.KHSManager.FetchKHSData()
		if err != nil {
			http.Error(w, "failed to fetch khs data", http.StatusInternalServerError)
			log.Println(err)
			return
		}

		s.KHSManager.SaveToFile(khs.KHSFileName)
	} else if err != nil {
		http.Error(w, "failed to read khs data", http.StatusInternalServerError)
		log.Println(err)
		return
	}

	err = json.Unmarshal(b, &khsItems)
	jsonData, err := json.Marshal(khsItems)
	if err != nil {
		http.Error(w, "failed to marshal json", http.StatusInternalServerError)
		log.Println(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonData)
}

type Server struct {
	HTTPServer   *http.Server
	LoginManager *auth.LoginManager
	KRSManager   *krs.KRSManager
	KHSManager   *khs.KHSManager
}

func NewServer(lm *auth.LoginManager, km *krs.KRSManager, khsm *khs.KHSManager) *Server {
	server := &Server{
		LoginManager: lm,
		KRSManager:   km,
		KHSManager:   khsm,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/krs", server.krsHandler)
	mux.HandleFunc("/api/khs", server.khsHandler)

	httpServer := &http.Server{
		Addr:    ":33125",
		Handler: mux,
	}

	server.HTTPServer = httpServer
	return server
}
