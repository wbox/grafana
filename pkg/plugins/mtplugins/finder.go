package mtplugins

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"

	"github.com/grafana/grafana/pkg/plugins"
	"github.com/grafana/grafana/pkg/plugins/config"
	"github.com/grafana/grafana/pkg/plugins/log"
	"github.com/grafana/grafana/pkg/plugins/pluginscdn"
)

const concurrencyLimit = 32

var (
	pluginFetchDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: "grafana_mt_plugins",
		Name:      "plugin_find_duration_seconds",
		Help:      "Plugin finding/discovery duration per class",
	}, []string{"class", "total"})
)

type CDN struct {
	cdn    *pluginscdn.Service
	cfg    *config.PluginManagementCfg
	client *http.Client
	log    log.Logger
}

func NewCDNFinder(cfg *config.PluginManagementCfg, cdn *pluginscdn.Service) *CDN {
	return &CDN{
		cfg: cfg,
		cdn: cdn,
		client: &http.Client{
			Timeout:   10 * time.Second,
			Transport: &http.Transport{Proxy: http.ProxyFromEnvironment},
		},
		log: log.New("cdn.finder"),
	}
}

func (s *CDN) Find(ctx context.Context, src plugins.PluginSource) ([]*plugins.FoundBundle, error) {
	urls := s.getValidURLs(src.PluginURIs(ctx))
	if len(urls) == 0 {
		return []*plugins.FoundBundle{}, nil
	}

	startTime := time.Now()
	type jsonData struct {
		u *url.URL

		jd  plugins.JSONData
		err error
	}
	results := make(chan jsonData, len(urls))

	// If PluginsCDNSyncLoaderEnabled is enabled, fetch plugins concurrently.
	// Otherwise, fall-back to the old behaviour of fetching plugins sequentially.
	var limitSize int
	if s.cfg.Features.PluginsCDNSyncLoaderEnabled {
		limitSize = min(len(urls), concurrencyLimit)
	} else {
		limitSize = 1
	}
	limit := make(chan struct{}, limitSize)

	for _, u := range urls {
		u := u
		limit <- struct{}{}
		go func() {
			jd, err := s.fetchPlugin(ctx, u)
			results <- jsonData{
				u:   u,
				jd:  jd,
				err: err,
			}
			<-limit
		}()
	}

	foundPlugins := make(map[pluginKey]plugins.JSONData)
	for i := 0; i < len(urls); i++ {
		r := <-results
		if r.err != nil {
			s.log.Error("Could not fetch plugin", "path", r.u.String(), "error", r.err)
			continue
		}
		foundPlugins[pluginKey{
			id:      r.jd.ID,
			version: r.jd.Info.Version,
			path:    r.u.String(),
		}] = r.jd
	}

	if len(foundPlugins) == 0 {
		return []*plugins.FoundBundle{}, nil
	}

	res := make([]*plugins.FoundBundle, 0, len(foundPlugins))
	for key, data := range foundPlugins {
		var children []*plugins.FoundPlugin
		for _, include := range data.Includes {
			if !slices.Contains([]string{"panel", "datasource"}, include.Type) || include.Path == "" {
				continue
			}

			u := s.cdn.NewCDNURLConstructor(data.ID, data.Info.Version)
			baseURL, err := u.Path(filepath.Dir(include.Path))
			if err != nil {
				s.log.Error("Could not get URL for plugin dependency", "error", err)
				continue
			}
			// TODO: parallel
			jd, err := s.fetchPlugin(ctx, baseURL)
			if err != nil {
				s.log.Error("Could not fetch nested plugin", "name", include.Name, "path", include.Path, "error", err)
				continue
			}

			children = append(children, &plugins.FoundPlugin{
				JSONData: jd,
				FS:       NewFS(baseURL.String(), s.client),
			})
		}

		res = append(res, &plugins.FoundBundle{
			Primary: plugins.FoundPlugin{
				JSONData: data,
				FS:       NewFS(key.path, s.client),
			},
			Children: children,
		})

		for _, plugin := range data.Dependencies.Plugins {
			u := s.cdn.NewCDNURLConstructor(plugin.ID, plugin.Version)
			baseURL, err := u.Path("")
			if err != nil {
				s.log.Error("Could not get URL for plugin dependency", "error", err)
				continue
			}
			// TODO: parallel
			jd, err := s.fetchPlugin(ctx, baseURL)
			if err != nil {
				s.log.Error("Could not fetch plugin dependency", "pluginId", plugin.ID, "version", plugin.Version, "error", err)
				continue
			}

			res = append(res, &plugins.FoundBundle{
				Primary: plugins.FoundPlugin{
					JSONData: jd,
					FS:       NewFS(baseURL.String(), s.client),
				},
			})
		}
	}

	sort.SliceStable(res, func(i, j int) bool {
		return res[i].Primary.JSONData.ID < res[j].Primary.JSONData.ID
	})

	pluginFetchDuration.WithLabelValues("cdn", strconv.Itoa(len(res))).Observe(time.Since(startTime).Seconds())
	s.log.Debug("Plugin find complete", "class", "cdn", "total", len(res), "duration", time.Since(startTime))
	return res, nil
}

func (s *CDN) fetchPlugin(ctx context.Context, base *url.URL) (plugins.JSONData, error) {
	u := base.JoinPath("plugin.json")
	// It's safe to ignore gosec warning G107 since the path comes from the Grafana configuration and is also
	// suffixed above with "plugin.json"
	// nolint:gosec
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return plugins.JSONData{}, err
	}
	resp, err := s.client.Do(req)
	if err != nil {
		s.log.Warn("Error occurred when fetching plugin.json", "url", base, "error", err)
		return plugins.JSONData{}, err
	}
	defer func() {
		err = resp.Body.Close()
		if err != nil {
			s.log.Warn("Error occurred when closing response body", "url", base, "error", err)
		}
	}()

	if resp.StatusCode == http.StatusNotFound {
		return plugins.JSONData{}, fmt.Errorf("plugin.json not found")
	}

	if resp.StatusCode/100 != 2 {
		return plugins.JSONData{}, fmt.Errorf("could not retrieve plugin.json")
	}

	plugin, err := plugins.ReadPluginJSON(resp.Body)
	if err != nil {
		s.log.Warn("Error occurred when reading plugin.json", "url", base, "error", err)
		return plugins.JSONData{}, err
	}

	return plugin, nil
}

func (s *CDN) getValidURLs(urls []string) []*url.URL {
	if len(urls) == 0 {
		return []*url.URL{}
	}

	m := make(map[string]*url.URL)
	for _, u := range urls {
		if !strings.HasPrefix(u, "http") {
			s.log.Warn("Skipping finding plugins as path is invalid URL", "url", u)
			continue
		}

		pu, err := url.Parse(u)
		if err != nil {
			s.log.Warn("Skipping finding plugins as path is invalid URL", "url", u)
			continue
		}

		m[u] = pu
	}

	res := make([]*url.URL, 0, len(m))
	for _, u := range m {
		res = append(res, u)
	}

	return res
}

type pluginKey struct {
	path    string
	id      string
	version string
}
