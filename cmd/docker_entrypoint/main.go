package main

import (
	"log"
	"os"
	"os/exec"
)

func main() {
	cmdServer := exec.Command("/app/server")
	cmdServer.Stdout = os.Stdout
	cmdServer.Stderr = os.Stderr
	if err := cmdServer.Start(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}

	cmdMonitor := exec.Command("/app/khs_monitor")
	cmdMonitor.Stdout = os.Stdout
	cmdMonitor.Stderr = os.Stderr
	if err := cmdMonitor.Start(); err != nil {
		log.Fatalf("Failed to start khs_monitor: %v", err)
	}

	// Wait for both processes to exit
	if err := cmdServer.Wait(); err != nil {
		log.Printf("Server exited with error: %v", err)
	}
	if err := cmdMonitor.Wait(); err != nil {
		log.Printf("KHS Monitor exited with error: %v", err)
	}
}
