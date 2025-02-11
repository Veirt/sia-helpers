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

	krsMonitor := exec.Command("/app/krs_monitor")
	krsMonitor.Stdout = os.Stdout
	krsMonitor.Stderr = os.Stderr
	if err := krsMonitor.Start(); err != nil {
		log.Fatalf("Failed to start krs_monitor: %v", err)
	}

	khsMonitor := exec.Command("/app/khs_monitor")
	khsMonitor.Stdout = os.Stdout
	khsMonitor.Stderr = os.Stderr
	if err := khsMonitor.Start(); err != nil {
		log.Fatalf("Failed to start khs_monitor: %v", err)
	}

	// Wait for both processes to exit
	if err := cmdServer.Wait(); err != nil {
		log.Printf("Server exited with error: %v", err)
	}
	if err := krsMonitor.Wait(); err != nil {
		log.Printf("KRS Monitor exited with error: %v", err)
	}
	if err := khsMonitor.Wait(); err != nil {
		log.Printf("KHS Monitor exited with error: %v", err)
	}
}
