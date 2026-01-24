package health

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"homedash/internal/manifest"
)

// Status represents the health status of an app
type Status string

const (
	StatusUp      Status = "UP"
	StatusDown    Status = "DOWN"
	StatusUnknown Status = "UNKNOWN"
)

// AppStatus holds the current status of an app
type AppStatus struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	URL      string `json:"url"`
	Category string `json:"category"`
	Icon     string `json:"icon"`
	Status   Status `json:"status"`
	Ping     string `json:"ping"`
}

// Checker performs health checks on apps
type Checker struct {
	manifest      *manifest.Manager
	statuses      map[string]*AppStatus
	mu            sync.RWMutex
	checkInterval time.Duration
	checkTimeout  time.Duration
	httpClient    *http.Client
	onChange      func([]AppStatus)
	stopChan      chan struct{}
}

// NewChecker creates a new health checker
func NewChecker(m *manifest.Manager, interval, timeout time.Duration) *Checker {
	return &Checker{
		manifest:      m,
		statuses:      make(map[string]*AppStatus),
		checkInterval: interval,
		checkTimeout:  timeout,
		httpClient: &http.Client{
			Timeout: timeout,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
			},
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse // Don't follow redirects
			},
		},
		stopChan: make(chan struct{}),
	}
}

// Start begins the periodic health checking
func (c *Checker) Start(onChange func([]AppStatus)) {
	c.onChange = onChange

	c.checkAll()

	go func() {
		ticker := time.NewTicker(c.checkInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				c.checkAll()
			case <-c.stopChan:
				return
			}
		}
	}()
}

// Stop stops the health checker
func (c *Checker) Stop() {
	close(c.stopChan)
}

// RefreshApps triggers a re-check when manifest changes
func (c *Checker) RefreshApps() {
	go c.checkAll()
}

// GetStatuses returns the current status of all apps
func (c *Checker) GetStatuses() []AppStatus {
	c.mu.RLock()
	defer c.mu.RUnlock()

	apps := c.manifest.GetApps()
	result := make([]AppStatus, 0, len(apps))

	for i, app := range apps {
		key := app.URL
		if status, ok := c.statuses[key]; ok {
			status.ID = i + 1
			result = append(result, *status)
		} else {
			result = append(result, AppStatus{
				ID:       i + 1,
				Name:     app.Name,
				URL:      app.URL,
				Category: app.Category,
				Icon:     app.Icon,
				Status:   StatusUnknown,
				Ping:     "--",
			})
		}
	}

	return result
}

func (c *Checker) checkAll() {
	apps := c.manifest.GetApps()
	var wg sync.WaitGroup

	for i, app := range apps {
		wg.Add(1)
		go func(idx int, a manifest.App) {
			defer wg.Done()
			c.checkApp(idx, a)
		}(i, app)
	}

	wg.Wait()

	if c.onChange != nil {
		c.onChange(c.GetStatuses())
	}
}

func (c *Checker) checkApp(idx int, app manifest.App) {
	var status Status
	var ping string

	start := time.Now()

	if app.CheckType == "tcp" {
		status, ping = c.checkTCP(app.URL)
	} else {
		status, ping = c.checkHTTP(app.URL, app.CheckPath)
	}

	if ping == "" {
		ping = fmt.Sprintf("%dms", time.Since(start).Milliseconds())
	}

	c.mu.Lock()
	c.statuses[app.URL] = &AppStatus{
		ID:       idx + 1,
		Name:     app.Name,
		URL:      app.URL,
		Category: app.Category,
		Icon:     app.Icon,
		Status:   status,
		Ping:     ping,
	}
	c.mu.Unlock()
}

func (c *Checker) checkHTTP(appURL, checkPath string) (Status, string) {
	parsedURL, err := url.Parse(appURL)
	if err != nil {
		log.Printf("Invalid URL %s: %v", appURL, err)
		return StatusDown, "--"
	}

	if checkPath != "" {
		parsedURL.Path = checkPath
	}

	start := time.Now()

	ctx, cancel := context.WithTimeout(context.Background(), c.checkTimeout)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", parsedURL.String(), nil)
	if err != nil {
		return StatusDown, "--"
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return StatusDown, "--"
	}
	defer resp.Body.Close()

	ping := fmt.Sprintf("%dms", time.Since(start).Milliseconds())

	if resp.StatusCode >= 200 && resp.StatusCode < 400 {
		return StatusUp, ping
	}

	return StatusDown, ping
}

func (c *Checker) checkTCP(appURL string) (Status, string) {
	parsedURL, err := url.Parse(appURL)
	if err != nil {
		return StatusDown, "--"
	}

	host := parsedURL.Hostname()
	port := parsedURL.Port()
	if port == "" {
		switch parsedURL.Scheme {
		case "https":
			port = "443"
		default:
			port = "80"
		}
	}

	start := time.Now()

	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), c.checkTimeout)
	if err != nil {
		return StatusDown, "--"
	}
	defer conn.Close()

	ping := fmt.Sprintf("%dms", time.Since(start).Milliseconds())
	return StatusUp, ping
}
