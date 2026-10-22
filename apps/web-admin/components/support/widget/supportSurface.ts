/** Support surface snapshot builder from manifest bindings (product-agnostic). */

import { useEffect, useMemo, useRef, useState } from "react";

export type SurfaceBindingKind = "route" | "api_json" | "api_present" | "template" | "static";

export type SurfaceBinding = {
  key: string;
  kind: SurfaceBindingKind;
  api?: string;
  endpoint?: string;
  json_path?: string;
  scope_key?: string;
  template?: string;
  empty?: string;
  empty_when?: { field: string; equals: boolean | string | null };
  value?: string | number | boolean | null;
};

export type SupportSurfaceHookOptions = {
  route: string;
  scopeValues?: Record<string, string | undefined>;
  fetchEndpoint: (apiId: string, endpoint: string) => Promise<unknown>;
};

type EndpointCacheEntry = {
  data?: unknown;
  loading: boolean;
};

function jsonPathGet(payload: unknown, jsonPath: string | undefined): unknown {
  if (!jsonPath) {
    return payload;
  }
  let current: unknown = payload;
  for (const segment of jsonPath.split(".")) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function endpointCacheKey(api: string, endpoint: string, scopeKey: string | undefined, scopeValue: string | undefined): string {
  return `${api}|${endpoint}|${scopeKey ?? ""}|${scopeValue ?? ""}`;
}

function renderTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value == null) {
      return "";
    }
    return String(value);
  });
}

function isEmptyWhen(values: Record<string, unknown>, rule: SurfaceBinding["empty_when"]): boolean {
  if (!rule) {
    return false;
  }
  return values[rule.field] === rule.equals;
}

function scopeValuesSignature(scopeValues?: Record<string, string | undefined>): string {
  if (!scopeValues) {
    return "";
  }
  return Object.entries(scopeValues)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value ?? ""}`)
    .join("&");
}

export function useSupportSurfaceFromBindings<T extends Record<string, unknown>>(
  bindings: readonly SurfaceBinding[],
  options: SupportSurfaceHookOptions,
): T {
  const { route, scopeValues, fetchEndpoint } = options;
  const scopeSignature = scopeValuesSignature(scopeValues);
  // Callers often construct scope objects during render. Preserve the snapshot
  // identity while their semantic scope is unchanged.
  const stableScopeValues = useMemo(() => scopeValues, [scopeSignature]);
  const fetchEndpointRef = useRef(fetchEndpoint);
  fetchEndpointRef.current = fetchEndpoint;
  const [endpointCache, setEndpointCache] = useState<Record<string, EndpointCacheEntry>>({});

  const apiBindings = useMemo(
    () => bindings.filter((binding) => binding.kind === "api_json" || binding.kind === "api_present"),
    [bindings],
  );

  const uniqueRequests = useMemo(() => {
    const seen = new Map<string, { api: string; endpoint: string; scopeKey?: string; scopeValue?: string }>();
    for (const binding of apiBindings) {
      const api = binding.api ?? "";
      const endpoint = binding.endpoint ?? "";
      const scopeKey = binding.scope_key;
      const scopeValue = scopeKey ? stableScopeValues?.[scopeKey] : undefined;
      const key = endpointCacheKey(api, endpoint, scopeKey, scopeValue);
      if (!seen.has(key)) {
        seen.set(key, { api, endpoint, scopeKey, scopeValue });
      }
    }
    return [...seen.entries()];
  }, [apiBindings, scopeSignature]);

  const requestSignature = useMemo(
    () => uniqueRequests.map(([key]) => key).join("|"),
    [uniqueRequests],
  );

  useEffect(() => {
    let cancelled = false;
    for (const [key, request] of uniqueRequests) {
      setEndpointCache((current) => ({
        ...current,
        [key]: { ...(current[key] ?? {}), loading: true },
      }));
      fetchEndpointRef.current(request.api, request.endpoint)
        .then((data) => {
          if (cancelled) {
            return;
          }
          setEndpointCache((current) => ({
            ...current,
            [key]: { data, loading: false },
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setEndpointCache((current) => ({
            ...current,
            [key]: { data: undefined, loading: false },
          }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [requestSignature, uniqueRequests]);

  return useMemo(() => {
    const values: Record<string, unknown> = {};

    for (const binding of bindings) {
      if (binding.kind === "route") {
        values[binding.key] = route;
        continue;
      }
      if (binding.kind === "static") {
        values[binding.key] = binding.value ?? null;
        continue;
      }
      if (binding.kind === "api_json" || binding.kind === "api_present") {
        const api = binding.api ?? "";
        const endpoint = binding.endpoint ?? "";
        const scopeKey = binding.scope_key;
        const scopeValue = scopeKey ? stableScopeValues?.[scopeKey] : undefined;
        const cacheKey = endpointCacheKey(api, endpoint, scopeKey, scopeValue);
        const payload = endpointCache[cacheKey]?.data;
        if (binding.kind === "api_present") {
          const present = jsonPathGet(payload, binding.json_path);
          values[binding.key] = present != null;
          continue;
        }
        values[binding.key] = jsonPathGet(payload, binding.json_path) ?? null;
        continue;
      }
    }

    for (const binding of bindings) {
      if (binding.kind !== "template") {
        continue;
      }
      if (isEmptyWhen(values, binding.empty_when)) {
        values[binding.key] = binding.empty ?? "";
        continue;
      }
      const rendered = binding.template ? renderTemplate(binding.template, values).trim() : "";
      values[binding.key] = rendered || binding.empty || "";
    }

    return values as T;
  }, [bindings, endpointCache, route, stableScopeValues]);
}
