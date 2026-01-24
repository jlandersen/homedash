package stats

import (
	"fmt"
	"runtime"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
)

type SystemStats struct {
	CPU  string `json:"cpu"`
	RAM  string `json:"ram"`
	Temp string `json:"temp"`
}

type Collector struct{}

func NewCollector() *Collector {
	return &Collector{}
}

func (c *Collector) Get() SystemStats {
	stats := SystemStats{
		CPU:  "--",
		RAM:  "--",
		Temp: "--",
	}

	cpuPercent, err := cpu.Percent(0, false)
	if err == nil && len(cpuPercent) > 0 {
		stats.CPU = fmt.Sprintf("%.0f", cpuPercent[0])
	}

	memInfo, err := mem.VirtualMemory()
	if err == nil {
		stats.RAM = fmt.Sprintf("%.0f", memInfo.UsedPercent)
	}

	stats.Temp = c.getTemperature()

	return stats
}

func (c *Collector) getTemperature() string {
	// Temperature sensors are platform-specific
	if runtime.GOOS == "darwin" {
		// macOS - gopsutil has limited support, try anyway
		temps, err := host.SensorsTemperatures()
		if err == nil && len(temps) > 0 {
			// Find CPU temperature
			for _, temp := range temps {
				if temp.Temperature > 0 {
					return fmt.Sprintf("%.0f", temp.Temperature)
				}
			}
		}
		// Fallback - temperature not available on macOS without additional tools
		return "--"
	}

	// Linux and other platforms
	temps, err := host.SensorsTemperatures()
	if err == nil && len(temps) > 0 {
		// Try to find CPU/core temperature
		for _, temp := range temps {
			if temp.Temperature > 0 {
				return fmt.Sprintf("%.0f", temp.Temperature)
			}
		}
	}

	return "--"
}
