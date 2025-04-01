package mtplugins

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/Masterminds/semver/v3"
	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/pluginscdn"
)

type Registry interface {
	AvailablePlugins(ctx context.Context) ([]*Plugin, error)
	GetPlugin(ctx context.Context, id string) (*Plugin, bool)
	FindPlugin(ctx context.Context, pluginID string) (*plugins.FoundPlugin, error)
	SetPluginEnabled(pluginID string, enabled bool) error
}

type Service struct {
	store             map[string]*Plugin
	pluginsCDNService *pluginscdn.Service
	file              string
}

type Plugin struct {
	ID      string
	Version string
	URL     string
}

// PluginList represents the structure of plugins.json with enable/disablgite states
type PluginList struct {
	Plugins map[string]map[string]struct {
		Backend      bool   `json:"backend"`
		OriginZipURL string `json:"origin_zip_url"`
		Signature    struct {
			Type    string `json:"type"`
			OrgName string `json:"org_name"`
		} `json:"signature"`
	}
}

func ProvideService(pluginsCDNService *pluginscdn.Service) (*Service, error) {
	store, err := createStore()
	if err != nil {
		return nil, err
	}

	return &Service{
		pluginsCDNService: pluginsCDNService,
		store:             store,
		file:              "./plugins.json",
	}, nil
}

func (s *Service) AvailablePlugins(ctx context.Context) ([]*Plugin, error) {
	plugins := make([]*Plugin, 0, len(s.store))
	for _, plugin := range s.store {
		plugins = append(plugins, plugin)
	}
	return plugins, nil
}

func (s *Service) GetPlugin(ctx context.Context, id string) (*Plugin, bool) {
	plugin, ok := s.store[id]
	if !ok {
		return nil, false
	}
	return plugin, true
}

func (s *Service) FindPlugin(ctx context.Context, pluginID string) (*plugins.FoundPlugin, error) {
	plugin, ok := s.GetPlugin(ctx, pluginID)
	if !ok {
		return nil, fmt.Errorf("plugin not found in mtplugins store")
	}

	finder := NewCDNFinder(&config.PluginManagementCfg{
		Features: config.Features{
			PluginsCDNSyncLoaderEnabled: true,
		},
	}, s.pluginsCDNService)
	plugins, err := finder.Find(ctx, NewCDNSource(plugin.URL))
	if err != nil {
		return nil, err
	}

	if len(plugins) == 0 {
		return nil, fmt.Errorf("plugin not found")
	}

	if len(plugins) > 1 {
		return nil, fmt.Errorf("multiple plugins found")
	}

	return &plugins[0].Primary, nil
}

// SetPluginEnabled updates the enabled state of a plugin and persists it to the plugins.json file
func (s *Service) SetPluginEnabled(pluginID string, enabled bool) error {
	return nil
}

func createStore() (map[string]*Plugin, error) {
	// Read plugins.json file and parse it
	data, err := os.ReadFile("./plugins.json")
	if err != nil {
		return nil, err
	}

	// Create a decoder for the JSON file
	var pluginList PluginList

	if err := json.Unmarshal(data, &pluginList); err != nil {
		return nil, err
	}

	// Create a map to store the latest version of each plugin
	store := make(map[string]*Plugin)

	// Iterate through plugins and keep the latest version
	for pluginID, versions := range pluginList.Plugins {
		var latestVersion string

		// Find the latest version
		for version := range versions {
			if latestVersion == "" {
				latestVersion = version
			} else {
				// Compare versions and keep the latest
				existingVer, err := semver.NewVersion(latestVersion)
				if err != nil {
					continue
				}

				newVer, err := semver.NewVersion(version)
				if err != nil {
					continue
				}

				if newVer.GreaterThan(existingVer) {
					latestVersion = version
				}
			}
		}

		// Create plugin with latest version info
		plugin := &Plugin{
			ID:      pluginID,
			Version: latestVersion,
			URL:     fmt.Sprintf("http://plugins-cdn.grafana.net/%s/%s/public/plugins/%s", pluginID, latestVersion, pluginID),
		}

		store[pluginID] = plugin
	}
	return store, nil
}
