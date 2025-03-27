const SOURCE_UID = 'grafanacloud-traces';
const correlations = [
  {
    uid: 'appo11y-namespace-and-name',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Application observability > Service overview',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.namespace"]}---${__span.tags["service.name"]}',
      },
    },
  },
  {
    uid: 'appo11y-name',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Application observability > Service overview',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: '/a/grafana-app-observability-app/services/service/${__span.tags["service.name"]}',
      },
    },
  },
  {
    uid: 'k8s-cluster',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Kubernetes monitoring > Cluster view',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/cluster/${__span.tags["k8s.cluster.name"]}',
      },
    },
  },
  {
    uid: 'k8s-namespace',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Kubernetes monitoring > Namespace view',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}',
      },
    },
  },
  {
    uid: 'k8s-node',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Kubernetes monitoring > Node view',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/nodes/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.node.name"]}',
      },
    },
  },
  {
    uid: 'k8s-deployment',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Kubernetes monitoring > Deployment view',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}',
      },
    },
  },
  {
    uid: 'k8s-pod',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Kubernetes monitoring > Pod view',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11ydev01.grafana-dev.net/a/grafana-k8s-app/navigation/namespace/${__span.tags["k8s.cluster.name"]}/${__span.tags["k8s.namespace.name"]}/deployment/${__span.tags["k8s.deployment.name"]}/${__span.tags["k8s.pod.name"]}',
      },
    },
  },
  {
    uid: 'fe-o11y',
    sourceUID: SOURCE_UID,
    orgId: 1,
    label: 'Frontend observability',
    type: 'external',
    provisioned: false,
    config: {
      field: 'traceID',
      target: {
        url: 'https://appo11y.grafana.net/a/grafana-kowalski-app/apps/${__span.tags["gf.feo11y.app.id"]}',
      },
    },
  },
];

correlations.forEach((correlation) => {
  fetch('http://localhost:3000/api/datasources/uid/grafanacloud-traces/correlations', {
    headers: {
      'content-type': 'application/json',
      'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'x-grafana-device-id': 'f381752252d81e08a5d770fa271d3302',
      'x-grafana-org-id': '1',
    },
    referrer: 'http://localhost:3000/datasources/correlations',
    referrerPolicy: 'strict-origin-when-cross-origin',
    //"body": "{\"type\":\"external\",\"config\":{\"target\":{\"url\":\"/a/app/view\"},\"field\":\"TraceID\",\"transformations\":[]},\"label\":\"Name\",\"description\":\"\",\"id\":\"\"}",
    body: JSON.stringify(correlation),
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });
});
