package manifest

import (
	"log"
	"os"
	"sync"

	"github.com/fsnotify/fsnotify"
	"gopkg.in/yaml.v3"
)

// App represents a single application in the manifest
type App struct {
	Name      string `yaml:"name" json:"name"`
	URL       string `yaml:"url" json:"url"`
	Category  string `yaml:"category" json:"category"`
	Icon      string `yaml:"icon" json:"icon"`
	CheckPath string `yaml:"check_path,omitempty" json:"checkPath,omitempty"`
	CheckType string `yaml:"check_type,omitempty" json:"checkType,omitempty"` // "http" (default) or "tcp"
	SkipCheck bool   `yaml:"skip_check,omitempty" json:"skipCheck,omitempty"` // skip health checks (e.g. for NAS that may wake up)
}

// Manifest represents the apps.yaml file structure
type Manifest struct {
	Apps []App `yaml:"apps" json:"apps"`
}

// Manager handles loading and watching the manifest file
type Manager struct {
	path     string
	manifest *Manifest
	mu       sync.RWMutex
	onChange func(*Manifest)
	watcher  *fsnotify.Watcher
}

// NewManager creates a new manifest manager
func NewManager(path string) *Manager {
	return &Manager{
		path:     path,
		manifest: &Manifest{Apps: []App{}},
	}
}

// Load reads and parses the manifest file
func (m *Manager) Load() error {
	data, err := os.ReadFile(m.path)
	if err != nil {
		return err
	}

	var manifest Manifest
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		return err
	}

	// Set defaults
	for i := range manifest.Apps {
		if manifest.Apps[i].Icon == "" {
			manifest.Apps[i].Icon = "box"
		}
		if manifest.Apps[i].Category == "" {
			manifest.Apps[i].Category = "Uncategorized"
		}
		if manifest.Apps[i].CheckType == "" {
			manifest.Apps[i].CheckType = "http"
		}
	}

	m.mu.Lock()
	m.manifest = &manifest
	m.mu.Unlock()

	log.Printf("Loaded %d apps from manifest", len(manifest.Apps))
	return nil
}

// GetApps returns a copy of the current apps list
func (m *Manager) GetApps() []App {
	m.mu.RLock()
	defer m.mu.RUnlock()

	apps := make([]App, len(m.manifest.Apps))
	copy(apps, m.manifest.Apps)
	return apps
}

// Watch starts watching the manifest file for changes
func (m *Manager) Watch(onChange func(*Manifest)) error {
	m.onChange = onChange

	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	m.watcher = watcher

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Op&(fsnotify.Write|fsnotify.Create) != 0 {
					log.Printf("Manifest file changed, reloading...")
					if err := m.Load(); err != nil {
						log.Printf("Error reloading manifest: %v", err)
					} else if m.onChange != nil {
						m.mu.RLock()
						m.onChange(m.manifest)
						m.mu.RUnlock()
					}
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Printf("Manifest watcher error: %v", err)
			}
		}
	}()

	return watcher.Add(m.path)
}

// Close stops the file watcher
func (m *Manager) Close() error {
	if m.watcher != nil {
		return m.watcher.Close()
	}
	return nil
}
