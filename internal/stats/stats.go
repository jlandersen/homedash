package stats

import (
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/net"
)

type SystemStats struct {
	CPU   *float64 `json:"cpu"`
	RAM   *float64 `json:"ram"`
	Temp  *float64 `json:"temp"`
	NetTX *float64 `json:"netTx"`
	NetRX *float64 `json:"netRx"`
}

type Sample struct {
	Timestamp time.Time
	Stats     SystemStats
}

type Collector struct {
	lastNetStats net.IOCountersStat
	lastNetTime  time.Time
	history      []Sample
	mu           sync.Mutex
	stopCh       chan struct{}
	running      bool
}

const historyWindow = 5 * time.Minute

func NewCollector() *Collector {
	c := &Collector{
		lastNetTime: time.Now(),
	}
	// Initialize network stats
	netIO, err := net.IOCounters(false)
	if err == nil && len(netIO) > 0 {
		c.lastNetStats = netIO[0]
	}
	return c
}

func (c *Collector) Get() SystemStats {
	now := time.Now()
	stats := SystemStats{
		CPU:   nil,
		RAM:   nil,
		Temp:  nil,
		NetTX: nil,
		NetRX: nil,
	}

	cpuPercent, err := cpu.Percent(0, false)
	if err == nil && len(cpuPercent) > 0 {
		val := cpuPercent[0]
		stats.CPU = &val
	}

	memInfo, err := mem.VirtualMemory()
	if err == nil {
		val := memInfo.UsedPercent
		stats.RAM = &val
	}

	stats.Temp = c.getTemperature()

	netTx, netRx := c.getNetworkRates()
	stats.NetTX = netTx
	stats.NetRX = netRx

	c.recordSample(now, stats)

	return stats
}

func (c *Collector) Start(interval time.Duration) {
	if interval <= 0 {
		interval = 2 * time.Second
	}

	c.mu.Lock()
	if c.running {
		c.mu.Unlock()
		return
	}
	if c.stopCh == nil {
		c.stopCh = make(chan struct{})
	}
	c.running = true
	stopCh := c.stopCh
	c.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				c.Get()
			case <-stopCh:
				return
			}
		}
	}()
}

func (c *Collector) Stop() {
	c.mu.Lock()
	if !c.running {
		c.mu.Unlock()
		return
	}
	close(c.stopCh)
	c.stopCh = nil
	c.running = false
	c.mu.Unlock()
}

func (c *Collector) History() []Sample {
	now := time.Now()
	cutoff := now.Add(-historyWindow)

	c.mu.Lock()
	c.pruneLocked(cutoff)
	historyCopy := make([]Sample, len(c.history))
	copy(historyCopy, c.history)
	c.mu.Unlock()

	return historyCopy
}

func (c *Collector) Latest() (SystemStats, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.history) == 0 {
		return SystemStats{}, false
	}
	return c.history[len(c.history)-1].Stats, true
}

func (c *Collector) getTemperature() *float64 {
	// Temperature sensors are platform-specific
	if runtime.GOOS == "darwin" {
		// macOS - gopsutil has limited support, try anyway
		temps, err := host.SensorsTemperatures()
		if err == nil && len(temps) > 0 {
			// Find CPU temperature
			for _, temp := range temps {
				if temp.Temperature > 0 {
					val := temp.Temperature
					return &val
				}
			}
		}
		// Fallback - temperature not available on macOS without additional tools
		return nil
	}

	// Linux and other platforms
	temps, err := host.SensorsTemperatures()
	if err == nil && len(temps) > 0 {
		// Try to find CPU/core temperature
		for _, temp := range temps {
			if temp.Temperature > 0 {
				val := temp.Temperature
				return &val
			}
		}
	}

	return nil
}

func (c *Collector) getNetworkRates() (*float64, *float64) {
	netIO, err := net.IOCounters(false)
	if err != nil || len(netIO) == 0 {
		return nil, nil
	}

	now := time.Now()
	c.mu.Lock()
	elapsed := now.Sub(c.lastNetTime).Seconds()

	// Avoid division by zero
	if elapsed < 0.1 {
		c.mu.Unlock()
		return nil, nil
	}

	currentStats := netIO[0]

	// Calculate bytes per second
	txRate := float64(currentStats.BytesSent-c.lastNetStats.BytesSent) / elapsed
	rxRate := float64(currentStats.BytesRecv-c.lastNetStats.BytesRecv) / elapsed

	// Update last stats
	c.lastNetStats = currentStats
	c.lastNetTime = now
	c.mu.Unlock()

	// Convert to KB/s
	txKbps := txRate / 1024
	rxKbps := rxRate / 1024

	// Return nil for negative values (can happen on counter reset)
	if txKbps < 0 {
		txKbps = 0
	}
	if rxKbps < 0 {
		rxKbps = 0
	}

	return &txKbps, &rxKbps
}

func (c *Collector) recordSample(timestamp time.Time, stats SystemStats) {
	cutoff := timestamp.Add(-historyWindow)

	c.mu.Lock()
	c.history = append(c.history, Sample{Timestamp: timestamp, Stats: stats})
	c.pruneLocked(cutoff)
	c.mu.Unlock()
}

func (c *Collector) pruneLocked(cutoff time.Time) {
	idx := 0
	for idx < len(c.history) && c.history[idx].Timestamp.Before(cutoff) {
		idx++
	}
	if idx > 0 {
		c.history = c.history[idx:]
	}
}

// formatNetworkRate is no longer needed - removed
