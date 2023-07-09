#!/bin/bash
export TARGET=http://$(cat ../node/lb_dns)
export DATADOG_API_KEY=2ba41ac6c1b4018a46d28a4023a4fb37
export DEBUG=plugin:publish-metrics:datadog-statsd
npm run artillery run $1.yaml
