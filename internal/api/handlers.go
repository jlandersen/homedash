package api

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"homedash/internal/health"
	"homedash/internal/manifest"
	"homedash/internal/stats"
)

type UIConfig struct {
	TimeFormat24h bool `json:"timeFormat24h"`
	ShowCPU       bool `json:"showCPU"`
	ShowRAM       bool `json:"showRAM"`
	ShowTemp      bool `json:"showTemp"`
	ShowNetTX     bool `json:"showNetTX"`
	ShowNetRX     bool `json:"showNetRX"`
	AllowEdit     bool `json:"allowEdit"`
}

type Handler struct {
	checker       *health.Checker
	stats         *stats.Collector
	manifest      *manifest.Manager
	uiConfig      UIConfig
	statsInterval time.Duration
	clients       map[chan []byte]bool
	clientsMu     sync.RWMutex
}

func NewHandler(checker *health.Checker, statsCollector *stats.Collector, manifestMgr *manifest.Manager, uiConfig UIConfig, statsInterval time.Duration) *Handler {
	return &Handler{
		checker:       checker,
		stats:         statsCollector,
		manifest:      manifestMgr,
		uiConfig:      uiConfig,
		statsInterval: statsInterval,
		clients:       make(map[chan []byte]bool),
	}
}

func (h *Handler) RegisterRoutes(mux *http.ServeMux, webFS fs.FS) {
	mux.HandleFunc("/api/apps", h.handleApps)
	mux.HandleFunc("/api/manifest", h.handleManifest)
	mux.HandleFunc("/api/config", h.handleConfig)
	mux.HandleFunc("/api/events", h.handleSSE)
	mux.HandleFunc("/api/stats", h.handleStats)
	mux.Handle("/", NewStaticHandler(webFS))
}

func writeJSONHeaders(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

func (h *Handler) handleApps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writeJSONHeaders(w)

	statuses := h.checker.GetStatuses()
	if err := json.NewEncoder(w).Encode(statuses); err != nil {
		log.Printf("Error encoding apps response: %v", err)
	}
}

func (h *Handler) handleManifest(w http.ResponseWriter, r *http.Request) {
	if !h.uiConfig.AllowEdit {
		http.Error(w, "Editing is disabled", http.StatusForbidden)
		return
	}

	writeJSONHeaders(w)

	switch r.Method {
	case http.MethodGet:
		manifestCopy := h.manifest.GetManifest()
		if err := json.NewEncoder(w).Encode(manifestCopy); err != nil {
			log.Printf("Error encoding manifest response: %v", err)
		}
		return
	case http.MethodPut:
		var payload struct {
			Apps          *[]manifest.App `json:"apps"`
			CategoryOrder *[]string       `json:"categoryOrder"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}
		if payload.Apps == nil {
			http.Error(w, "apps field is required", http.StatusBadRequest)
			return
		}

		apps := make([]manifest.App, len(*payload.Apps))
		copy(apps, *payload.Apps)
		for i := range apps {
			apps[i].Name = strings.TrimSpace(apps[i].Name)
			apps[i].URL = strings.TrimSpace(apps[i].URL)
			apps[i].Category = strings.TrimSpace(apps[i].Category)
			apps[i].Icon = strings.TrimSpace(apps[i].Icon)
			apps[i].Notes = strings.TrimSpace(apps[i].Notes)
			apps[i].CheckPath = strings.TrimSpace(apps[i].CheckPath)
			apps[i].CheckType = strings.TrimSpace(apps[i].CheckType)
			if apps[i].Name == "" || apps[i].URL == "" {
				http.Error(w, "Each app must have name and url", http.StatusBadRequest)
				return
			}
			if apps[i].CheckType != "" && apps[i].CheckType != "http" && apps[i].CheckType != "tcp" {
				http.Error(w, "check_type must be http or tcp", http.StatusBadRequest)
				return
			}
		}

		existing := h.manifest.GetManifest()
		updated := manifest.Manifest{
			Apps:          apps,
			CategoryOrder: existing.CategoryOrder,
		}
		if payload.CategoryOrder != nil {
			order := make([]string, len(*payload.CategoryOrder))
			copy(order, *payload.CategoryOrder)
			updated.CategoryOrder = order
		}
		if err := h.manifest.Save(&updated); err != nil {
			log.Printf("Error saving manifest: %v", err)
			http.Error(w, "Failed to save manifest", http.StatusInternalServerError)
			return
		}

		if h.checker != nil {
			h.checker.RefreshApps()
		}

		if err := json.NewEncoder(w).Encode(updated); err != nil {
			log.Printf("Error encoding manifest response: %v", err)
		}
		return
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
}

func (h *Handler) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writeJSONHeaders(w)

	if err := json.NewEncoder(w).Encode(h.uiConfig); err != nil {
		log.Printf("Error encoding config response: %v", err)
	}
}

func (h *Handler) handleStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	writeJSONHeaders(w)

	history := h.stats.History()
	if err := json.NewEncoder(w).Encode(history); err != nil {
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

	statsTicker := time.NewTicker(h.statsInterval)
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
	sysStats, ok := h.stats.Latest()
	if !ok {
		return
	}
	data, err := json.Marshal(sysStats)
	if err != nil {
		log.Printf("Error marshaling stats: %v", err)
		return
	}
	fmt.Fprintf(w, "event: stats\ndata: %s\n\n", data)
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
