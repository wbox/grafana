package mtplugins

import (
	"context"

	"github.com/grafana/grafana/pkg/plugins"
)

type Source struct {
	pluginCDNURLs []string
}

func NewCDNSource(pluginCDNURLs ...string) *Source {
	return &Source{
		pluginCDNURLs: pluginCDNURLs,
	}
}

func (s *Source) PluginClass(_ context.Context) plugins.Class {
	return plugins.ClassCDN
}

func (s *Source) PluginURIs(_ context.Context) []string {
	return s.pluginCDNURLs
}

func (s *Source) DefaultSignature(_ context.Context, _ string) (plugins.Signature, bool) {
	return plugins.Signature{
		Status: plugins.SignatureStatusValid,
	}, true
}
