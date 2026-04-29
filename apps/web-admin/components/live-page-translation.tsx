"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  getClientTranslation,
  hasClientTranslation,
  hydrateClientTranslationCache,
  setClientTranslation,
} from "@/lib/client-translation-cache";
import { type Locale, useI18n } from "@/lib/i18n";
import { getLocalTextTranslation } from "@/lib/local-text-translation";
import { localizePersonName } from "@/lib/transliteration";

const originalTextMap = new WeakMap<Text, string>();
const translatedTextMap = new WeakMap<Text, string>();
const attributeOriginalMap = new WeakMap<
  HTMLElement,
  Partial<Record<"placeholder" | "title" | "aria-label", string>>
>();
const clientCache = new Map<string, string>();
const pendingCache = new Map<string, Promise<void>>();

type TranslationPayload = {
  texts: string[];
  targetLocale: Locale;
};

function getCacheKey(locale: Locale, text: string) {
  return `${locale}:${text}`;
}

function isTranslatableText(value: string) {
  const text = value.trim();
  if (!text) {
    return false;
  }

  return /[А-Яа-яЁё]/.test(text);
}

function looksLikePersonName(value: string) {
  const normalized = value.trim();
  return /^[А-ЯЁ][а-яё-]+(?:\s+[А-ЯЁ][а-яё-]+){1,2}$/.test(normalized);
}

function getTranslatedValue(text: string, locale: Locale) {
  if (locale === "ru") {
    return text;
  }

  hydrateClientTranslationCache();

  const localTranslation = getLocalTextTranslation(text, locale);
  if (localTranslation) {
    clientCache.set(getCacheKey(locale, text), localTranslation);
    setClientTranslation(locale, text, localTranslation);
    return localTranslation;
  }

  const persistedTranslation = getClientTranslation(locale, text);
  if (persistedTranslation) {
    clientCache.set(getCacheKey(locale, text), persistedTranslation);
    return persistedTranslation;
  }

  const cached = clientCache.get(getCacheKey(locale, text));
  if (cached) {
    return cached;
  }

  if (looksLikePersonName(text)) {
    const transliterated = localizePersonName(text, locale);
    clientCache.set(getCacheKey(locale, text), transliterated);
    setClientTranslation(locale, text, transliterated);
    return transliterated;
  }

  return text;
}

function collectTextNodes(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parentElement = node.parentElement;
      if (!parentElement) {
        return NodeFilter.FILTER_REJECT;
      }

      const tagName = parentElement.tagName;
      if (
        tagName === "SCRIPT" ||
        tagName === "STYLE" ||
        tagName === "NOSCRIPT" ||
        tagName === "TEXTAREA"
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      if (parentElement.closest("[data-no-live-translate='true']")) {
        return NodeFilter.FILTER_REJECT;
      }

      return isTranslatableText(node.textContent ?? "")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function collectTranslatableAttributes(root: HTMLElement) {
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]"),
  );

  return elements.flatMap((element) =>
    (["placeholder", "title", "aria-label"] as const)
      .filter((attribute) => isTranslatableText(element.getAttribute(attribute) ?? ""))
      .map((attribute) => ({ attribute, element })),
  );
}

async function requestTranslations(texts: string[], locale: Locale) {
  hydrateClientTranslationCache();

  const missing = texts.filter(
    (text) =>
      !clientCache.has(getCacheKey(locale, text)) &&
      !hasClientTranslation(locale, text),
  );
  if (locale === "ru" || missing.length === 0) {
    return;
  }

  const requestKey = `${locale}:${missing.sort().join("|")}`;
  const existing = pendingCache.get(requestKey);
  if (existing) {
    return existing;
  }

  const payload: TranslationPayload = {
    texts: missing,
    targetLocale: locale,
  };

  const requestPromise = fetch("/api/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Translation request failed with ${response.status}`);
      }

      const body = (await response.json()) as {
        translations?: Record<string, string>;
      };

      for (const [source, translated] of Object.entries(body.translations ?? {})) {
        clientCache.set(getCacheKey(locale, source), translated || source);
        setClientTranslation(locale, source, translated || source);
      }
    })
    .finally(() => {
      pendingCache.delete(requestKey);
    });

  pendingCache.set(requestKey, requestPromise);
  return requestPromise;
}

function applyTranslations(root: HTMLElement, locale: Locale) {
  const textNodes = collectTextNodes(root);
  const attributeEntries = collectTranslatableAttributes(root);

  for (const textNode of textNodes) {
    if (!originalTextMap.has(textNode)) {
      originalTextMap.set(textNode, textNode.textContent ?? "");
    }
  }

  for (const { element, attribute } of attributeEntries) {
    const current = attributeOriginalMap.get(element) ?? {};
    if (!current[attribute]) {
      const original = element.getAttribute(attribute);
      if (original) {
        current[attribute] = original;
        attributeOriginalMap.set(element, current);
      }
    }
  }

  for (const textNode of textNodes) {
    const original = originalTextMap.get(textNode) ?? textNode.textContent ?? "";
    const nextValue = locale === "ru" ? original : getTranslatedValue(original, locale);
    if (translatedTextMap.get(textNode) !== nextValue) {
      textNode.textContent = nextValue;
      translatedTextMap.set(textNode, nextValue);
    }
  }

  for (const { element, attribute } of attributeEntries) {
    const original = attributeOriginalMap.get(element)?.[attribute];
    if (!original) {
      continue;
    }

    const nextValue = locale === "ru" ? original : getTranslatedValue(original, locale);
    if (element.getAttribute(attribute) !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  }
}

export function LivePageTranslation({
  children,
  scope = "self",
}: {
  children?: ReactNode;
  scope?: "self" | "document";
}) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);

  const shouldTranslateDocument = useMemo(() => {
    if (scope !== "document") {
      return true;
    }

    if (!pathname) {
      return false;
    }

    return !(
      pathname === "/" ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/mobile") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/join") ||
      pathname.startsWith("/hi-team")
    );
  }, [pathname, scope]);

  useEffect(() => {
    const root = scope === "document" ? document.body : rootRef.current;
    if (!root || !shouldTranslateDocument) {
      return;
    }

    let cancelled = false;
    let isApplying = false;
    let scheduledRunId: number | null = null;
    const observer = new MutationObserver(() => {
      if (cancelled || isApplying) {
        return;
      }

      if (scheduledRunId !== null) {
        window.clearTimeout(scheduledRunId);
      }

      scheduledRunId = window.setTimeout(() => {
        scheduledRunId = null;
        run();
      }, 120);
    });

    const run = () => {
      if (cancelled) {
        return;
      }

      const textNodes = collectTextNodes(root);
      const attributeEntries = collectTranslatableAttributes(root);
      const sourceTexts = Array.from(
        new Set(
          [
            ...textNodes
              .map((node) => originalTextMap.get(node) ?? node.textContent ?? "")
              .filter(isTranslatableText),
            ...attributeEntries
              .map(({ element, attribute }) => element.getAttribute(attribute) ?? "")
              .filter(isTranslatableText),
          ],
        ),
      );

      void requestTranslations(sourceTexts, locale)
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            isApplying = true;
            applyTranslations(root, locale);
            window.setTimeout(() => {
              isApplying = false;
            }, 0);
          }
        });
    };

    run();
    window.setTimeout(run, 250);
    window.setTimeout(run, 1000);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      if (scheduledRunId !== null) {
        window.clearTimeout(scheduledRunId);
      }
    };
  }, [locale, scope, shouldTranslateDocument, pathname]);

  if (scope === "document") {
    return null;
  }

  return <div ref={rootRef}>{children}</div>;
}
