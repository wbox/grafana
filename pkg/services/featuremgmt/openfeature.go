package featuremgmt

import (
	"context"
	"fmt"

	"github.com/grafana/grafana/pkg/setting"
	"github.com/open-feature/go-sdk/openfeature"
)

const (
	staticProviderType = "static"
	goffProviderType   = "goff"

	configSectionName  = "feature_toggles.openfeature"
	contextSectionName = "feature_toggles.openfeature.context"
)

type OpenFeatureService struct {
	ProviderType string
	URL          string
	Client       openfeature.IClient
	provider     openfeature.FeatureProvider
}

func ProvideOpenFeatureService(cfg *setting.Cfg) (*OpenFeatureService, error) {
	conf := cfg.Raw.Section(configSectionName)
	provType := conf.Key("provider").MustString(staticProviderType)
	url := conf.Key("url").MustString("")
	key := conf.Key("targetingKey").MustString(cfg.AppURL)

	var provider openfeature.FeatureProvider
	var err error
	if provType == goffProviderType {
		provider, err = newGOFFProvider(url)
	} else {
		provider, err = newStaticProvider(cfg)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create %s feature provider: %w", provType, err)
	}

	if err := openfeature.SetProviderAndWait(provider); err != nil {
		return nil, fmt.Errorf("failed to set global %s feature provider: %w", provType, err)
	}

	attrs := ctxAttrs(cfg)
	openfeature.SetEvaluationContext(openfeature.NewEvaluationContext(key, attrs))

	client := openfeature.NewClient("grafana-openfeature-client")

	return &OpenFeatureService{
		URL:          url,
		ProviderType: provType,
		Client:       client,
		provider:     provider,
	}, nil
}

// ctxAttrs uses config.ini [feature_toggles.openfeature.context] section to build the eval context attributes
func ctxAttrs(cfg *setting.Cfg) map[string]any {
	ctxConf := cfg.Raw.Section(contextSectionName)

	attrs := map[string]any{}
	for _, key := range ctxConf.KeyStrings() {
		attrs[key] = ctxConf.Key(key).String()
	}

	// Some default attributes
	if _, ok := attrs["grafana_version"]; !ok {
		attrs["grafana_version"] = setting.BuildVersion
	}

	return attrs
}

func (s *OpenFeatureService) EvalFlag(ctx context.Context, flagKey string) (openfeature.BooleanEvaluationDetails, error) {
	result, err := s.Client.BooleanValueDetails(ctx, flagKey, false, openfeature.TransactionContext(ctx))
	if err != nil {
		return openfeature.BooleanEvaluationDetails{}, fmt.Errorf("failed to evaluate flag %s: %w", flagKey, err)
	}

	return result, nil
}

func (s *OpenFeatureService) EvalAllFlags(ctx context.Context) (AllFlagsGOFFResp, error) {
	if s.ProviderType != goffProviderType {
		// TODO: evaluate static provider flags
	}
	return AllFlagsGOFFResp{}, nil
}

type AllFlagsGOFFResp struct {
	Flags map[string]*FlagGOFF `json:"flags"`
}

type FlagGOFF struct {
	VariationType string `json:"variationType"`
	Timestamp     int    `json:"timestamp"`
	TrackEvents   bool   `json:"trackEvents"`
	Value         bool   `json:"value"`
}
