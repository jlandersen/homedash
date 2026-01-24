package api

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"sync"
	"time"

	"homedash/internal/health"
	"homedash/internal/stats"
)

// UIConfig represents frontend configuration sent to the client
type UIConfig struct {
	TimeFormat24h bool `json:"timeFormat24h"`
	ShowCPU       bool `json:"showCPU"`
	ShowRAM       bool `json:"showRAM"`
	ShowTemp      bool `json:"showTemp"`
}

// Handler manages HTTP endpoints
type Handler struct {
	checker   *health.Checker
	stats     *stats.Collector
	uiConfig  UIConfig
	clients   map[chan []byte]bool
	clientsMu sync.RWMutex
}

// NewHandler creates a new API handler
func NewHandler(checker *health.Checker, statsCollector *stats.Collector, uiConfig UIConfig) *Handler {
	return &Handler{
		checker:  checker,
		stats:    statsCollector,
		uiConfig: uiConfig,
		clients:  make(map[chan []byte]bool),
	}
}

// RegisterRoutes sets up all HTTP routes
func (h *Handler) RegisterRoutes(mux *http.ServeMux, webFS fs.FS) {
	mux.HandleFunc("/api/apps", h.handleApps)
	mux.HandleFunc("/api/config", h.handleConfig)
	mux.HandleFunc("/api/events", h.handleSSE)

	// Serve static files from embedded filesystem
	fileServer := http.FileServer(http.FS(webFS))
	mux.Handle("/", fileServer)
}

// handleApps returns the current app statuses as JSON
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

// handleConfig returns UI configuration
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

// handleSSE handles Server-Sent Events for real-time updates
func (h *Handler) handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a channel for this client
	clientChan := make(chan []byte, 10)

	// Register client
	h.clientsMu.Lock()
	h.clients[clientChan] = true
	h.clientsMu.Unlock()

	// Cleanup on disconnect
	defer func() {
		h.clientsMu.Lock()
		delete(h.clients, clientChan)
		close(clientChan)
		h.clientsMu.Unlock()
	}()

	// Get flusher for streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send initial data
	h.sendConfigToClient(w, flusher)
	h.sendAppsToClient(w, flusher)
	h.sendStatsToClient(w, flusher)

	// Start stats ticker
	statsTicker := time.NewTicker(2 * time.Second)
	defer statsTicker.Stop()

	// Listen for events
	for {
		select {
		case <-r.Context().Done():
			return
		case msg := <-clientChan:
			fmt.Fprintf(w, "event: apps\ndata: %s\n\n", msg)
			flusher.Flush()
		case <-statsTicker.C:
			h.sendStatsToClient(w, flusher)
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

// BroadcastApps sends app updates to all connected SSE clients
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
			// Client buffer full, skip
		}
	}
}
