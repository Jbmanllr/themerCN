// A minimal DOM for the apply-theme and font-loader tests. Component and hook
// tests opt into happy-dom per file; these two modules only touch inline
// style, classList, attributes, <head> children, link "load" and "error"
// events, document.fonts and the rules of document.styleSheets, so this fake
// covers exactly that surface and lets their tests control every rule and
// event. A module under test that reaches for anything else needs this fake
// extended, or its own happy-dom test.

type Listener = () => void

/** A stylesheet as apply-theme reads it: CSSOM-like rules, set by a test. */
export type FakeStyleSheet = Readonly<{
  ownerNode?: unknown
  cssRules: readonly unknown[]
}>

class FakeStyle {
  readonly values = new Map<string, string>()

  setProperty(name: string, value: string) {
    this.values.set(name, value)
  }

  removeProperty(name: string) {
    this.values.delete(name)
    return ""
  }

  getPropertyValue(name: string) {
    return this.values.get(name) ?? ""
  }

  get length() {
    return this.values.size
  }

  item(index: number) {
    return [...this.values.keys()][index] ?? ""
  }
}

class FakeClassList {
  readonly names = new Set<string>()

  toggle(name: string, force?: boolean) {
    const on = force ?? !this.names.has(name)
    if (on) this.names.add(name)
    else this.names.delete(name)
    return on
  }

  contains(name: string) {
    return this.names.has(name)
  }
}

export class FakeElement {
  readonly style = new FakeStyle()
  readonly classList = new FakeClassList()
  readonly attributes = new Map<string, string>()
  readonly listeners = new Map<string, Listener[]>()
  textContent = ""
  parent: FakeHead | null = null

  constructor(
    readonly tagName: string,
    readonly ownerDocument: FakeDocument
  ) {}

  get isConnected() {
    return this.parent !== null
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value)
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  dispatch(type: string) {
    const listeners = this.listeners.get(type) ?? []
    this.listeners.delete(type)
    for (const listener of listeners) listener()
  }

  remove() {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }
}

class FakeHead {
  readonly children: FakeElement[] = []

  appendChild(element: FakeElement) {
    element.remove()
    this.children.push(element)
    element.parent = this
    return element
  }
}

export class FakeDocument {
  readonly head = new FakeHead()
  readonly documentElement = new FakeElement("html", this)
  styleSheets: FakeStyleSheet[] = []
  fonts?: {
    check: (font: string) => boolean
    load: (font: string) => Promise<unknown>
  }

  createElement(tagName: string) {
    return new FakeElement(tagName, this)
  }

  getElementById(id: string) {
    return (
      this.head.children.find((child) => child.getAttribute("id") === id) ??
      null
    )
  }

  /** The <head> children with a tag name, e.g. every injected <link>. */
  headChildren(tagName: string) {
    return this.head.children.filter((child) => child.tagName === tagName)
  }

  /** Typed as the real thing for the modules under test. */
  get asDocument(): Document {
    return this as unknown as Document
  }
}
