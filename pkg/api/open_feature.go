package api

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	"github.com/grafana/grafana/pkg/api/response"
	"github.com/grafana/grafana/pkg/api/routing"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/web"
)

// TODO: figure out if new config item is needed for this:
// >we might need to be able to change the root (/foo/bar/ofrep/v1/...) - this'll likely just need to be a config item.
const section = ""

func (hs *HTTPServer) registerOpenFeatureRoutes(apiRoute routing.RouteRegister) {
	// TODO: access control?
	apiRoute.Group("/ofrep/v1", func(apiRoute routing.RouteRegister) {
		apiRoute.Post("/evaluate/flags", hs.EvalAllFlags)
		apiRoute.Post("/evaluate/flags/:flagKey", hs.EvalFlag)
	})
}

func (hs *HTTPServer) EvalFlag(c *contextmodel.ReqContext) response.Response {
	flagKey := web.Params(c.Req)[":flagKey"]
	if flagKey == "" {
		return response.Error(http.StatusBadRequest, "flagKey is required", nil)
	}

	flags, err := hs.openFeature.EvalFlag(c.Req.Context(), flagKey)
	if err != nil {
		return response.Error(http.StatusInternalServerError, "failed to evaluate feature flag", err)
	}

	return response.JSON(http.StatusOK, flags)
}

func (hs *HTTPServer) EvalAllFlags(c *contextmodel.ReqContext) response.Response {
	if hs.openFeature.ProviderType == "static" {
		flags, err := hs.openFeature.EvalAllFlags(c.Req.Context())
		if err != nil {
			return response.Error(http.StatusInternalServerError, "failed to evaluate feature flags", err)
		}

		return response.JSON(http.StatusOK, flags)
	}

	u, _ := url.Parse(hs.openFeature.URL)
	proxy := httputil.NewSingleHostReverseProxy(u)
	proxy.ServeHTTP(c.Resp, c.Req)
}
