package manifest

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"
	"gopkg.in/yaml.v3"
)

type App struct {
	Name      string `yaml:"name" json:"name"`
	URL       string `yaml:"url" json:"url"`
	Category  string `yaml:"category" json:"category"`
	Icon      string `yaml:"icon" json:"icon"`
	Notes     string `yaml:"notes,omitempty" json:"notes,omitempty"`
	CheckPath string `yaml:"check_path,omitempty" json:"checkPath,omitempty"`
	CheckType string `yaml:"check_type,omitempty" json:"checkType,omitempty"`
	SkipCheck bool   `yaml:"skip_check,omitempty" json:"skipCheck,omitempty"`
}

type Manifest struct {
	CategoryOrder []string `yaml:"category_order,omitempty" json:"categoryOrder,omitempty"`
	Apps          []App    `yaml:"apps" json:"apps"`
}

type Manager struct {
	path     string
	manifest *Manifest
	mu       sync.RWMutex
	onChange func(*Manifest)
	watcher  *fsnotify.Watcher
}

func NewManager(path string) *Manager {
	return &Manager{
		path:     path,
		manifest: &Manifest{Apps: []App{}},
	}
}

func (m *Manager) Load() error {
	data, err := os.ReadFile(m.path)
	if err != nil {
		if os.IsNotExist(err) {
			manifest := Manifest{Apps: []App{}}
			if err := m.writeManifestFile(&manifest); err != nil {
				return err
			}
			m.mu.Lock()
			m.manifest = &manifest
			m.mu.Unlock()
			log.Printf("Created new manifest at %s", m.path)
			return nil
		}
		return err
	}

	if len(bytes.TrimSpace(data)) == 0 {
		manifest := Manifest{Apps: []App{}}
		m.mu.Lock()
		m.manifest = &manifest
		m.mu.Unlock()
		log.Printf("Loaded empty manifest from %s", m.path)
		return nil
	}

	var manifest Manifest
	if err := yaml.Unmarshal(data, &manifest); err != nil {
		return err
	}

	ApplyDefaults(&manifest)

	m.mu.Lock()
	m.manifest = &manifest
	m.mu.Unlock()

	log.Printf("Loaded %d apps from manifest", len(manifest.Apps))
	return nil
}

func (m *Manager) GetApps() []App {
	m.mu.RLock()
	defer m.mu.RUnlock()

	apps := make([]App, len(m.manifest.Apps))
	copy(apps, m.manifest.Apps)
	return apps
}

func (m *Manager) GetManifest() Manifest {
	m.mu.RLock()
	defer m.mu.RUnlock()

	categoryOrder := make([]string, len(m.manifest.CategoryOrder))
	copy(categoryOrder, m.manifest.CategoryOrder)

	apps := make([]App, len(m.manifest.Apps))
	copy(apps, m.manifest.Apps)

	return Manifest{
		CategoryOrder: categoryOrder,
		Apps:          apps,
	}
}

func (m *Manager) Save(manifest *Manifest) error {
	if err := m.writeManifestFile(manifest); err != nil {
		return err
	}

	m.mu.Lock()
	m.manifest = manifest
	m.mu.Unlock()

	return nil
}

func (m *Manager) writeManifestFile(manifest *Manifest) error {
	ApplyDefaults(manifest)
	data, err := yaml.Marshal(manifest)
	if err != nil {
		return err
	}

	dir := filepath.Dir(m.path)
	tmpFile, err := os.CreateTemp(dir, "manifest-*.yaml")
	if err != nil {
		return err
	}
	tmpName := tmpFile.Name()

	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		os.Remove(tmpName)
		return err
	}
	if err := tmpFile.Close(); err != nil {
		os.Remove(tmpName)
		return err
	}

	if info, err := os.Stat(m.path); err == nil {
		_ = os.Chmod(tmpName, info.Mode())
	}

	if err := os.Rename(tmpName, m.path); err != nil {
		os.Remove(tmpName)
		return err
	}

	return nil
}

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

func (m *Manager) Close() error {
	if m.watcher != nil {
		return m.watcher.Close()
	}
	return nil
}

func ApplyDefaults(manifest *Manifest) {
	if manifest == nil {
		return
	}
	if len(manifest.CategoryOrder) > 0 {
		normalized := make([]string, 0, len(manifest.CategoryOrder))
		seen := make(map[string]bool, len(manifest.CategoryOrder))
		for _, category := range manifest.CategoryOrder {
			trimmed := strings.TrimSpace(category)
			if trimmed == "" {
				continue
			}
			key := strings.ToLower(trimmed)
			if seen[key] {
				continue
			}
			seen[key] = true
			normalized = append(normalized, trimmed)
		}
		manifest.CategoryOrder = normalized
	}
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
}
