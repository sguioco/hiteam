import { normalizeWidgetLocale } from "./locale";

export type SupportProgressStep = {
  key: string;
  message: string;
  status: "started" | "done" | "failed";
  ok: boolean;
  sequence: number;
};

export type SupportProgressEvent = {
  type?: string;
  step_id?: string;
  stage?: string;
  status?: string;
  message?: string;
  ok?: boolean;
  sequence?: number;
  visibility?: string;
};

export function normalizeProgressEvent(event: SupportProgressEvent): SupportProgressStep | null {
  if (String(event.visibility || "user") !== "user") {
    return null;
  }
  const message = String(event.message || "").trim();
  if (!message) {
    return null;
  }
  const key = String(event.step_id || event.stage || message).trim();
  if (!key) {
    return null;
  }
  const rawStatus = String(event.status || "started").toLowerCase();
  const ok = event.ok !== false && rawStatus !== "failed";
  const status: SupportProgressStep["status"] =
    rawStatus === "failed" || !ok ? "failed" : rawStatus === "done" || rawStatus === "completed" ? "done" : "started";
  return {
    key,
    message,
    status,
    ok,
    sequence: Number(event.sequence || 0),
  };
}

export function mergeProgressSteps(
  previous: SupportProgressStep[],
  incoming: SupportProgressStep[],
): SupportProgressStep[] {
  const byKey = new Map<string, SupportProgressStep>();
  for (const step of previous) {
    byKey.set(step.key, step);
  }
  for (const step of incoming) {
    byKey.set(step.key, step);
  }
  return Array.from(byKey.values()).sort((left, right) => left.sequence - right.sequence);
}

export function progressStepsFromMetadata(metadata: Record<string, unknown> | undefined): SupportProgressStep[] {
  const raw = metadata?.progress;
  if (!Array.isArray(raw)) {
    return [];
  }
  const steps: SupportProgressStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const normalized = normalizeProgressEvent(item as SupportProgressEvent);
    if (normalized) {
      steps.push(normalized);
    }
  }
  return steps.sort((left, right) => left.sequence - right.sequence);
}

/** Fallback chips when older turns only have tool_trace. */
export function progressStepsFromToolTrace(metadata: Record<string, unknown> | undefined, locale: string): SupportProgressStep[] {
  const raw = metadata?.tool_trace;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const prefix = { ru: "Проверка", en: "Checked", de: "Geprüft" }[normalizeWidgetLocale(locale)];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const tool = String((item as { tool?: string }).tool || "").trim();
      if (!tool) {
        return null;
      }
      const result = (item as { result?: { outcome?: string } }).result;
      const outcome = String(result?.outcome || "").toLowerCase();
      const ok = outcome !== "error" && outcome !== "unavailable";
      return {
        key: `tool-trace-${index}-${tool}`,
        message: `${prefix}: ${friendlyToolName(tool, locale)}`,
        status: (ok ? "done" : "failed") as SupportProgressStep["status"],
        ok,
        sequence: index + 1,
      };
    })
    .filter((step): step is SupportProgressStep => Boolean(step));
}

function friendlyToolName(tool: string, locale: string): string {
  const language = normalizeWidgetLocale(locale);
  const labels: Record<string, { ru: string; en: string; de: string }> = {
    hub_get_ui_guidance: { ru: "подсказка по интерфейсу", en: "UI guidance", de: "Bedienungshilfe" },
    pbc3_get_ui_guidance: { ru: "подсказка по интерфейсу", en: "UI guidance", de: "Bedienungshilfe" },
    hub_mcp_my_quatropbc_get_monitor_overview: { ru: "монитор", en: "monitor", de: "Produktionsübersicht" },
    hub_mcp_my_quatropbc_get_plant_status: { ru: "статус завода", en: "plant status", de: "Werksstatus" },
    pbc3_read_panel_projection: { ru: "панель", en: "panel", de: "Panel" },
  };
  const hit = labels[tool];
  if (hit) {
    return hit[language];
  }
  return { ru: "данные продукта", en: "product data", de: "Produktdaten" }[language];
}
