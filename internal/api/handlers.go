package api

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"sync"
	"time"

	"homedash/internal/agentstats"
	"homedash/internal/health"
	"homedash/internal/stats"
)

type UIConfig struct {
	TimeFormat24h bool `json:"timeFormat24h"`
	ShowCPU       bool `json:"showCPU"`
	ShowRAM       bool `json:"showRAM"`
	ShowTemp      bool `json:"showTemp"`
	ShowNetTX     bool `json:"showNetTX"`
	ShowNetRX     bool `json:"showNetRX"`
}

type Handler struct {
	checker    *health.Checker
	stats      *stats.Collector
	agentStats *agentstats.Collector
	uiConfig   UIConfig
	clients    map[chan []byte]bool
	clientsMu  sync.RWMutex
}

func NewHandler(checker *health.Checker, statsCollector *stats.Collector, agentStatsCollector *agentstats.Collector, uiConfig UIConfig) *Handler {
	return &Handler{
		checker:    checker,
		stats:      statsCollector,
		agentStats: agentStatsCollector,
		uiConfig:   uiConfig,
		clients:    make(map[chan []byte]bool),
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, webFS fs.FS) {
	mux.HandleFunc("/api/apps", h.handleApps)
	mux.HandleFunc("/api/config", h.handleConfig)
	mux.HandleFunc("/api/events", h.handleSSE)
	mux.HandleFunc("/api/stats", h.handleStats)
	mux.Handle("/", http.FileServer(http.FS(webFS)))
}

func (h *Handler) handleApps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	statuses := h.checker.GetStatuses()
	if err := json.NewEncoder(w).Encode(statuses); err != nil {
		log.Printf("Error encoding apps response: %v", err)
	}
}

func (h *Handler) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	if err := json.NewEncoder(w).Encode(h.uiConfig); err != nil {
		log.Printf("Error encoding config response: %v", err)
	}
}

func (h *Handler) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	sysStats := h.stats.Get()
	if err := json.NewEncoder(w).Encode(sysStats); err != nil {
		log.Printf("Error encoding stats response: %v", err)
	}
}

func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	clientChan := make(chan []byte, 10)

	h.clientsMu.Lock()
	h.clients[clientChan] = true
	h.clientsMu.Unlock()

	defer func() {
		h.clientsMu.Lock()
		delete(h.clients, clientChan)
		close(clientChan)
		h.clientsMu.Unlock()
	}()

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	h.sendConfigToClient(w, flusher)
	h.sendAppsToClient(w, flusher)
	h.sendStatsToClient(w, flusher)
	h.sendAgentStatsToClient(w, flusher)

	statsTicker := time.NewTicker(2 * time.Second)
	defer statsTicker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case msg := <-clientChan:
			fmt.Fprintf(w, "event: apps\ndata: %s\n\n", msg)
			flusher.Flush()
		case <-statsTicker.C:
			h.sendStatsToClient(w, flusher)
			h.sendAgentStatsToClient(w, flusher)
		}
	}
}

func (h *Handler) sendConfigToClient(w http.ResponseWriter, flusher http.Flusher) {
	data, err := json.Marshal(h.uiConfig)
	if err != nil {
		log.Printf("Error marshaling config: %v", err)
		return
	}
	fmt.Fprintf(w, "event: config\ndata: %s\n\n", data)
	flusher.Flush()
}

func (h *Handler) sendAppsToClient(w http.ResponseWriter, flusher http.Flusher) {
	statuses := h.checker.GetStatuses()
	data, err := json.Marshal(statuses)
	if err != nil {
		log.Printf("Error marshaling apps: %v", err)
		return
	}
	fmt.Fprintf(w, "event: apps\ndata: %s\n\n", data)
	flusher.Flush()
}

func (h *Handler) sendStatsToClient(w http.ResponseWriter, flusher http.Flusher) {
	sysStats := h.stats.Get()
	data, err := json.Marshal(sysStats)
	if err != nil {
		log.Printf("Error marshaling stats: %v", err)
		return
	}
	fmt.Fprintf(w, "event: stats\ndata: %s\n\n", data)
	flusher.Flush()
}

func (h *Handler) sendAgentStatsToClient(w http.ResponseWriter, flusher http.Flusher) {
	if h.agentStats == nil {
		return
	}
	agentStats := h.agentStats.Get()
	data, err := json.Marshal(agentStats)
	if err != nil {
		log.Printf("Error marshaling agent stats: %v", err)
		return
	}
	fmt.Fprintf(w, "event: agentstats\ndata: %s\n\n", data)
	flusher.Flush()
}

func (h *Handler) BroadcastApps(statuses []health.AppStatus) {
	data, err := json.Marshal(statuses)
	if err != nil {
		log.Printf("Error marshaling broadcast: %v", err)
		return
	}

	h.clientsMu.RLock()
	defer h.clientsMu.RUnlock()

	for clientChan := range h.clients {
		select {
		case clientChan <- data:
		default:
		}
	}
}
