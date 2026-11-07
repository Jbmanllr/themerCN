"use client"

// One MutationObserver on <html> per document, shared by every Themer reader
// of its `class`, `style` and `dir` attributes (the paths ADR's Page load
// contract). Built on the first subscriber, disconnected after the last. A
// batch of mutations calls each listener of the changed attributes once.

export type HtmlAttribute = "class" | "style" | "dir"

const OBSERVED_ATTRIBUTES: HtmlAttribute[] = ["class", "style", "dir"]

interface SharedObserver {
  observer: MutationObserver
  listeners: Map<string, Set<() => void>>
}

const observers = new WeakMap<Document, SharedObserver>()

function connect(doc: Document): SharedObserver {
  const listeners = new Map<string, Set<() => void>>()
  const observer = new MutationObserver((records) => {
    const woken = new Set<() => void>()
    for (const record of records) {
      listeners
        .get(record.attributeName ?? "")
        ?.forEach((listener) => woken.add(listener))
    }
    woken.forEach((listener) => listener())
  })
  observer.observe(doc.documentElement, {
    attributes: true,
    attributeFilter: OBSERVED_ATTRIBUTES,
  })
  const shared = { observer, listeners }
  observers.set(doc, shared)
  return shared
}

/**
 * Calls `listener` after each batch of mutations that changes `attribute` on
 * the document's <html>. Returns the unsubscribe. Fits the `subscribe` shape
 * of React's useSyncExternalStore once the attribute is bound.
 */
export function subscribeToHtmlAttribute(
  attribute: HtmlAttribute,
  listener: () => void
): () => void {
  const doc = document
  const shared = observers.get(doc) ?? connect(doc)
  let attributeListeners = shared.listeners.get(attribute)
  if (!attributeListeners) {
    attributeListeners = new Set()
    shared.listeners.set(attribute, attributeListeners)
  }
  attributeListeners.add(listener)

  return () => {
    attributeListeners.delete(listener)
    if (attributeListeners.size === 0) shared.listeners.delete(attribute)
    if (shared.listeners.size === 0 && observers.get(doc) === shared) {
      shared.observer.disconnect()
      observers.delete(doc)
    }
  }
}
