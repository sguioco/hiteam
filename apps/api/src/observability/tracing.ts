import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('hiteam-api.business');

export type BusinessSpanOptions<T> = {
  attributesFromResult?: (result: T) => Attributes;
  successEventName?: string;
};

export function setActiveBusinessSpanAttributes(attributes: Attributes): void {
  trace.getActiveSpan()?.setAttributes(attributes);
}

/**
 * Creates a short, bounded business span. Callers must never pass tenant,
 * employee, location, email, token, phone, or request payload identifiers.
 */
export async function withBusinessSpan<T>(
  name: string,
  attributes: Attributes,
  operation: () => Promise<T>,
  options: BusinessSpanOptions<T> = {},
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await operation();
      span.setAttribute('hiteam.operation.status', 'success');
      if (options.attributesFromResult) {
        span.setAttributes(options.attributesFromResult(result));
      }
      if (options.successEventName) {
        span.addEvent(options.successEventName);
      }
      return result;
    } catch (error) {
      // Do not record exception messages: external APIs can echo PII or secrets.
      span.setAttribute('hiteam.operation.status', 'error');
      span.setAttribute('error.type', error instanceof Error ? error.name : 'UnknownError');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'operation_failed' });
      throw error;
    } finally {
      span.end();
    }
  });
}
