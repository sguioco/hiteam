import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api';

const tracer = trace.getTracer('hiteam-api.business');

/**
 * Creates a short, bounded business span. Callers must never pass tenant,
 * employee, location, email, token, phone, or request payload identifiers.
 */
export async function withBusinessSpan<T>(
  name: string,
  attributes: Attributes,
  operation: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await operation();
    } catch (error) {
      // Do not record exception messages: external APIs can echo PII or secrets.
      span.setAttribute('error.type', error instanceof Error ? error.name : 'UnknownError');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'operation_failed' });
      throw error;
    } finally {
      span.end();
    }
  });
}
