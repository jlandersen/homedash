package stats

import (
	"runtime"
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

type Collector struct {
	lastNetStats net.IOCountersStat
	lastNetTime  time.Time
}

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

	return stats
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
	elapsed := now.Sub(c.lastNetTime).Seconds()

	// Avoid division by zero
	if elapsed < 0.1 {
		return nil, nil
	}

	currentStats := netIO[0]

	// Calculate bytes per second
	txRate := float64(currentStats.BytesSent-c.lastNetStats.BytesSent) / elapsed
	rxRate := float64(currentStats.BytesRecv-c.lastNetStats.BytesRecv) / elapsed

	// Update last stats
	c.lastNetStats = currentStats
	c.lastNetTime = now

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

// formatNetworkRate is no longer needed - removed
