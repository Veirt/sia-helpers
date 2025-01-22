package server

import (
	"encoding/json"
	"net/http"

	"github.com/veirt/sia-helpers/auth"
	"github.com/veirt/sia-helpers/khs"
	"github.com/veirt/sia-helpers/krs"
)

func (s *Server) krsHandler(w http.ResponseWriter, r *http.Request) {
	s.LoginManager.RefreshSession()
	search := r.URL.Query().Get("search")
	krsData := s.KRSManager.FetchKRSData(search)

	jsonData, err := json.Marshal(krsData)
	if err != nil {
		http.Error(w, "failed to marshal json", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(jsonData)
}

func (s *Server) khsHandler(w http.ResponseWriter, r *http.Request) {
	s.LoginManager.RefreshSession()
	khsData := s.KHSManager.FetchKHSData()

	jsonData, err := json.Marshal(khsData)
	if err != nil {
		http.Error(w, "failed to marshal json", http.StatusInternalServerError)
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
