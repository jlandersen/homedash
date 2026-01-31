package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"homedash/internal/agentstats"
	"homedash/internal/api"
	"homedash/internal/config"
	"homedash/internal/health"
	"homedash/internal/manifest"
	"homedash/internal/stats"
)

//go:embed web/*
var webContent embed.FS

func main() {
	cfg := config.Load()

	log.Printf("HomeDash starting...")
	log.Printf("  Port: %d", cfg.Port)
	log.Printf("  Manifest: %s", cfg.ManifestPath)
	log.Printf("  Check interval: %s", cfg.CheckInterval)
	log.Printf("  Agent mode: %v", cfg.AgentMode)

	manifestMgr := manifest.NewManager(cfg.ManifestPath)
	if err := manifestMgr.Load(); err != nil {
		log.Fatalf("Failed to load manifest: %v", err)
	}

	statsCollector := stats.NewCollector()

	var agentStatsCollector *agentstats.Collector
	var checker *health.Checker

	if cfg.AgentMode {
		// In agent mode, we only expose stats endpoint
		log.Printf("Running in agent mode - only exposing /api/stats endpoint")
	} else {
		// In dashboard mode, we do health checks and poll agents
		checker = health.NewChecker(manifestMgr, cfg.CheckInterval, cfg.CheckTimeout)
		agentStatsCollector = agentstats.NewCollector(manifestMgr, cfg.CheckInterval)
		agentStatsCollector.Start()
	}

	uiConfig := api.UIConfig{
		TimeFormat24h: cfg.TimeFormat24h,
		ShowCPU:       cfg.ShowCPU,
		ShowRAM:       cfg.ShowRAM,
		ShowTemp:      cfg.ShowTemp,
	}
	handler := api.NewHandler(checker, statsCollector, agentStatsCollector, uiConfig)

	if !cfg.AgentMode {
		checker.Start(func(statuses []health.AppStatus) {
			handler.BroadcastApps(statuses)
		})

		if err := manifestMgr.Watch(func(m *manifest.Manifest) {
			log.Printf("Manifest updated, refreshing checks...")
			checker.RefreshApps()
			// Restart agent stats collector to pick up new agents
			if agentStatsCollector != nil {
				agentStatsCollector.Stop()
				agentStatsCollector = agentstats.NewCollector(manifestMgr, cfg.CheckInterval)
				agentStatsCollector.Start()
			}
		}); err != nil {
			log.Printf("Warning: Could not watch manifest file: %v", err)
		}
	}

	mux := http.NewServeMux()

	webFS, err := fs.Sub(webContent, "web")
	if err != nil {
		log.Fatalf("Failed to get web filesystem: %v", err)
	}

	handler.RegisterRoutes(mux, webFS)

	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: mux,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("Shutting down...")
		if checker != nil {
			checker.Stop()
		}
		if agentStatsCollector != nil {
			agentStatsCollector.Stop()
		}
		manifestMgr.Close()
		server.Close()
	}()

	if cfg.TLSEnabled {
		if cfg.TLSRedirectPort > 0 {
			go func() {
				redirectHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					target := fmt.Sprintf("https://%s:%d%s", r.Host, cfg.Port, r.URL.RequestURI())
					// Strip port from host if present
					if host := r.Host; host != "" {
						if colonIdx := len(host) - 1; colonIdx > 0 {
							for i := len(host) - 1; i >= 0; i-- {
								if host[i] == ':' {
									target = fmt.Sprintf("https://%s:%d%s", host[:i], cfg.Port, r.URL.RequestURI())
									break
								}
								if host[i] == ']' || host[i] == '.' {
									break
								}
							}
						}
					}
					http.Redirect(w, r, target, http.StatusMovedPermanently)
				})
				redirectServer := &http.Server{
					Addr:    fmt.Sprintf(":%d", cfg.TLSRedirectPort),
					Handler: redirectHandler,
				}
				log.Printf("HTTP->HTTPS redirect listening on http://localhost:%d", cfg.TLSRedirectPort)
				if err := redirectServer.ListenAndServe(); err != http.ErrServerClosed {
					log.Printf("Redirect server error: %v", err)
				}
			}()
		}

		log.Printf("Server listening on https://localhost:%d", cfg.Port)
		if err := server.ListenAndServeTLS(cfg.TLSCertFile, cfg.TLSKeyFile); err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	} else {
		log.Printf("Server listening on http://localhost:%d", cfg.Port)
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}
}
