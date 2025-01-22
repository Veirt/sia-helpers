package main

import (
	"encoding/json"
	"net/http"
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

type Server struct {
	HTTPServer   *http.Server
	LoginManager *LoginManager
	KRSManager   *KRSManager
}

func NewServer(lm *LoginManager, km *KRSManager) *Server {
	server := &Server{
		LoginManager: lm,
		KRSManager:   km,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/krs", server.krsHandler)

	httpServer := &http.Server{
		Addr:    ":33125",
		Handler: mux,
	}

	server.HTTPServer = httpServer
	return server
}
