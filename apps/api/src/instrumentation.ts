import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { requestTelemetryAttributes } from './observability/request-attributes';

const tracesEnabled = process.env.OTEL_TRACES_ENABLED === 'true';
const tracesEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim();

if (tracesEnabled && !tracesEndpoint) {
  throw new Error(
    'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is required when OTEL_TRACES_ENABLED=true.',
  );
}

if (tracesEnabled && tracesEndpoint) {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'hiteam-api',
      [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION?.trim() || 'unknown',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: tracesEndpoint,
      timeoutMillis: 5_000,
    }),
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook: (request) =>
          request.url?.startsWith('/api/v1/health') ?? false,
        startIncomingSpanHook: (request) => requestTelemetryAttributes(request.headers),
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    void sdk.shutdown();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
