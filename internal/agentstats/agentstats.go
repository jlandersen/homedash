package agentstats

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"homedash/internal/manifest"
	"homedash/internal/stats"
)

type AgentStats struct {
	Name  string            `json:"name"`
	Stats stats.SystemStats `json:"stats"`
	Error string            `json:"error,omitempty"`
}

type Collector struct {
	manifestMgr *manifest.Manager
	httpClient  *http.Client
	mu          sync.RWMutex
	agentStats  []AgentStats
	interval    time.Duration
	stopChan    chan struct{}
}

func NewCollector(manifestMgr *manifest.Manager, interval time.Duration) *Collector {
	return &Collector{
		manifestMgr: manifestMgr,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		agentStats: []AgentStats{},
		interval:   interval,
		stopChan:   make(chan struct{}),
	}
}

func (c *Collector) Start() {
	// Initial collection
	c.collect()

	ticker := time.NewTicker(c.interval)
	go func() {
		for {
			select {
			case <-ticker.C:
				c.collect()
			case <-c.stopChan:
				ticker.Stop()
				return
			}
		}
	}()
}

func (c *Collector) Stop() {
	close(c.stopChan)
}

func (c *Collector) collect() {
	agents := c.manifestMgr.GetAgents()
	newStats := make([]AgentStats, len(agents))

	var wg sync.WaitGroup
	for i, agent := range agents {
		wg.Add(1)
		go func(idx int, ag manifest.Agent) {
			defer wg.Done()

			url := fmt.Sprintf("%s/api/stats", ag.URL)
			resp, err := c.httpClient.Get(url)
			if err != nil {
				newStats[idx] = AgentStats{
					Name:  ag.Name,
					Error: err.Error(),
					Stats: stats.SystemStats{CPU: "--", RAM: "--", Temp: "--"},
				}
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusOK {
				newStats[idx] = AgentStats{
					Name:  ag.Name,
					Error: fmt.Sprintf("HTTP %d", resp.StatusCode),
					Stats: stats.SystemStats{CPU: "--", RAM: "--", Temp: "--"},
				}
				return
			}

			var sysStats stats.SystemStats
			if err := json.NewDecoder(resp.Body).Decode(&sysStats); err != nil {
				newStats[idx] = AgentStats{
					Name:  ag.Name,
					Error: err.Error(),
					Stats: stats.SystemStats{CPU: "--", RAM: "--", Temp: "--"},
				}
				return
			}

			newStats[idx] = AgentStats{
				Name:  ag.Name,
				Stats: sysStats,
			}
		}(i, agent)
	}

	wg.Wait()

	c.mu.Lock()
	c.agentStats = newStats
	c.mu.Unlock()
}

func (c *Collector) Get() []AgentStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	result := make([]AgentStats, len(c.agentStats))
	copy(result, c.agentStats)
	return result
}
