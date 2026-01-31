package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Port          int
	ManifestPath  string
	CheckInterval time.Duration
	CheckTimeout  time.Duration

	TLSEnabled      bool
	TLSCertFile     string
	TLSKeyFile      string
	TLSRedirectPort int // Port to listen on for HTTP->HTTPS redirect (0 = disabled)

	TimeFormat24h bool
	ShowCPU       bool
	ShowRAM       bool
	ShowTemp      bool

	// Agent mode - exposes stats endpoint only, no UI
	AgentMode bool
}

func Load() *Config {
	return &Config{
		Port:          getEnvInt("HOMEDASH_PORT", 8080),
		ManifestPath:  getEnvString("HOMEDASH_MANIFEST", "./apps.yaml"),
		CheckInterval: getEnvDuration("HOMEDASH_CHECK_INTERVAL", 30*time.Second),
		CheckTimeout:  getEnvDuration("HOMEDASH_CHECK_TIMEOUT", 5*time.Second),

		// TLS - enabled if both cert and key are provided
		TLSCertFile:     getEnvString("HOMEDASH_TLS_CERT", ""),
		TLSKeyFile:      getEnvString("HOMEDASH_TLS_KEY", ""),
		TLSEnabled:      getEnvString("HOMEDASH_TLS_CERT", "") != "" && getEnvString("HOMEDASH_TLS_KEY", "") != "",
		TLSRedirectPort: getEnvInt("HOMEDASH_TLS_REDIRECT", 0),

		// UI settings
		TimeFormat24h: getEnvBool("HOMEDASH_TIME_24H", false),
		ShowCPU:       getEnvBool("HOMEDASH_SHOW_CPU", true),
		ShowRAM:       getEnvBool("HOMEDASH_SHOW_RAM", true),
		ShowTemp:      getEnvBool("HOMEDASH_SHOW_TEMP", true),

		// Agent mode
		AgentMode: getEnvBool("HOMEDASH_AGENT_MODE", false),
	}
}

func getEnvString(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvBool(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}
