package managedplugins

import (
	"context"
	"fmt"

	"github.com/grafana/grafana/pkg/plugins/mtplugins"
)

type Manager interface {
	ManagedPlugins(ctx context.Context) []string
}

var _ Manager = (*Noop)(nil)

type Noop struct {
	mtp mtplugins.Registry
}

func NewNoop(mtp mtplugins.Registry) *Noop {
	return &Noop{mtp: mtp}
}

func (s *Noop) ManagedPlugins(ctx context.Context) []string {
	plugins, err := s.mtp.AvailablePlugins(ctx)
	if err != nil {
		fmt.Println("Error getting available plugins", err)
		return []string{}
	}

	var managedPlugins []string
	for _, plugin := range plugins {
		managedPlugins = append(managedPlugins, plugin.ID)
	}

	return managedPlugins
}
