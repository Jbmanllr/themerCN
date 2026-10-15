// Proves the editor store's contract: the undo rules (MAX_HISTORY_COUNT
// entries, HISTORY_DEBOUNCE_MS batching, mode-only changes not recorded,
// redo dropped on any recorded edit), preset apply and reset, the
// shared-style and CSS import actions, default-preset adoption,
// refreshUntouchedPreset and host extra colours in the theme.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defaultHSLAdjustments, defaultThemeState } from "../config/defaults";
import { MAX_HISTORY_COUNT, HISTORY_DEBOUNCE_MS } from "../config/constants";
import { configurePresets, resolvePresetStyles } from "../config/presets";
import {
  selectCanResetToPreset,
  selectHasUnsavedChanges,
} from "../selectors/editor-selectors";
import { applySidebarSync, isSidebarSynced } from "../utils/sidebar-sync";
import type { ThemeEditorState } from "../types";
import { useEditorStore } from "./editor-store";

const store = useEditorStore;

function setRadius(value: string) {
  store.getState().setThemeState((prev) => ({
    ...prev,
    styles: {
      ...prev.styles,
      light: { ...prev.styles.light, radius: value },
    },
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-03T12:00:00Z"));
  configurePresets({});
  store.setState({
    themeState: defaultThemeState,
    themeCheckpoint: null,
    presetBaseline: null,
    history: [],
    future: [],
    restoredFromStorage: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("undo history", () => {
  it("batches changes within the debounce window into one entry", () => {
    setRadius("1rem");
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS - 100);
    setRadius("2rem");
    expect(store.getState().history).toHaveLength(1);

    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    setRadius("3rem");
    expect(store.getState().history).toHaveLength(2);

    store.getState().undo();
    expect(store.getState().themeState.styles.light.radius).toBe("2rem");
    store.getState().undo();
    expect(store.getState().themeState.styles.light.radius).toBe(
      defaultThemeState.styles.light.radius,
    );
    store.getState().redo();
    expect(store.getState().themeState.styles.light.radius).toBe("2rem");
  });

  it("drops redo on an edit batched into the last entry", () => {
    setRadius("1rem");
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    setRadius("2rem");
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    store.getState().undo();
    store.getState().undo();
    store.getState().redo();
    expect(store.getState().future).toHaveLength(1);

    // Inside the window of the entry redo just recorded: batched, not new.
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS - 100);
    setRadius("4rem");
    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().future).toEqual([]);
    expect(store.getState().canRedo()).toBe(false);
  });

  it(`keeps at most ${MAX_HISTORY_COUNT} entries`, () => {
    for (let i = 0; i < MAX_HISTORY_COUNT + 5; i++) {
      setRadius(`${i}px`);
      vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    }
    expect(store.getState().history).toHaveLength(MAX_HISTORY_COUNT);
  });

  it("does not record a change of mode only", () => {
    store.getState().setThemeState((prev) => ({
      ...prev,
      currentMode: "dark",
    }));
    store.getState().setCurrentMode("light");
    expect(store.getState().history).toHaveLength(0);
  });

  it("keeps the current mode when undoing", () => {
    setRadius("1rem");
    store.getState().setCurrentMode("dark");
    store.getState().undo();
    expect(store.getState().themeState.currentMode).toBe("dark");
  });
});

describe("presets", () => {
  it("applies resolved styles with an undo entry and a new checkpoint", () => {
    store.getState().applyThemePreset("neo-brutalism");
    const state = store.getState();
    expect(state.themeState.preset).toBe("neo-brutalism");
    expect(state.themeState.styles).toEqual(
      resolvePresetStyles("neo-brutalism"),
    );
    expect(state.themeCheckpoint).toBe(state.themeState);
    expect(state.history).toHaveLength(1);
    expect(selectHasUnsavedChanges(state)).toBe(false);
  });

  it("ignores an unknown preset id", () => {
    store.getState().applyThemePreset("no-such-preset");
    expect(store.getState().themeState).toBe(defaultThemeState);
  });

  it("reports unsaved changes against the resolved preset", () => {
    store.getState().applyThemePreset("neo-brutalism");
    store.getState().updateCommonStyle("radius", "2rem");
    expect(selectHasUnsavedChanges(store.getState())).toBe(true);
  });

  it("resets to the preset and clears history", () => {
    store.getState().applyThemePreset("neo-brutalism");
    store.getState().updateCommonStyle("radius", "2rem");
    store.getState().resetToCurrentPreset();
    const state = store.getState();
    expect(state.themeState.styles).toEqual(
      resolvePresetStyles("neo-brutalism"),
    );
    expect(state.history).toHaveLength(0);
  });

  it("resets a stale preset id to the host's default preset", () => {
    configurePresets({ defaultPreset: "neo-brutalism" });
    store.setState({
      themeState: { ...defaultThemeState, preset: "removed-host-preset" },
    });
    store.getState().resetToCurrentPreset();
    expect(store.getState().themeState.preset).toBe("neo-brutalism");
  });
});

describe("Reset with Sidebar Sync", () => {
  // useSidebarSyncAlignment writes the aligned styles in place after a preset
  // is applied; this does the same by hand.
  function applyAligned(preset: string) {
    store.getState().applyThemePreset(preset);
    const { themeState } = store.getState();
    store.setState({
      themeState: {
        ...themeState,
        styles: applySidebarSync(themeState.styles),
      },
    });
  }

  it("has nothing to do on an applied preset", () => {
    store.getState().applyThemePreset("neo-brutalism");
    expect(isSidebarSynced(resolvePresetStyles("neo-brutalism"))).toBe(false);
    applyAligned("neo-brutalism");

    // The "*" marker still sees the aligned sidebar as a difference ...
    expect(selectHasUnsavedChanges(store.getState())).toBe(true);
    // ... but Reset would only wipe history to land on the same theme.
    expect(selectCanResetToPreset(true)(store.getState())).toBe(false);
    // Without Sync the same theme is a real difference from its preset.
    expect(selectCanResetToPreset(false)(store.getState())).toBe(true);
  });

  it("still resets after a real edit", () => {
    applyAligned("neo-brutalism");
    store.getState().updateCommonStyle("radius", "2rem");
    expect(selectCanResetToPreset(true)(store.getState())).toBe(true);
  });
});

describe("updateCommonStyle", () => {
  it("writes the value to both modes in one undo entry", () => {
    store.getState().updateCommonStyle("letter-spacing", "0.02em");
    const { styles } = store.getState().themeState;
    expect(styles.light["letter-spacing"]).toBe("0.02em");
    expect(styles.dark["letter-spacing"]).toBe("0.02em");
    expect(store.getState().history).toHaveLength(1);
  });

  it("builds on the latest state, not a stale snapshot", () => {
    store.getState().updateCommonStyle("radius", "1rem");
    store.getState().updateCommonStyle("shadow-blur", "8px");
    const { styles } = store.getState().themeState;
    expect(styles.dark.radius).toBe("1rem");
    expect(styles.dark["shadow-blur"]).toBe("8px");
  });
});

describe("importThemeStyles", () => {
  it("merges onto the current styles with history, checkpoint and HSL reset", () => {
    store.setState({
      themeState: {
        ...defaultThemeState,
        hslAdjustments: { hueShift: 30, saturationScale: 1, lightnessScale: 1 },
      },
    });
    setRadius("2rem");
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);

    store.getState().importThemeStyles({
      light: { primary: "#111111", "font-sans": "Inter, sans-serif" },
      dark: { primary: "#eeeeee" },
    });
    const state = store.getState();
    expect(state.themeState.styles.light.radius).toBe("2rem");
    expect(state.themeState.styles.light.primary).toBe("#111111");
    expect(state.themeState.styles.dark.primary).toBe("#eeeeee");
    // Shared keys declared only in :root reach dark too.
    expect(state.themeState.styles.dark["font-sans"]).toBe("Inter, sans-serif");
    expect(state.themeState.hslAdjustments).toEqual(defaultHSLAdjustments);
    expect(state.themeCheckpoint).toBe(state.themeState);
    expect(state.history).toHaveLength(2);
  });

  it("starts from the default preset when replacing", () => {
    setRadius("2rem");
    store
      .getState()
      .importThemeStyles({ light: { primary: "#111111" } }, { replace: true });
    const { styles } = store.getState().themeState;
    expect(styles.light.radius).toBe(
      resolvePresetStyles("default").light.radius,
    );
    expect(styles.light.primary).toBe("#111111");
  });
});

describe("adoptDefaultPreset", () => {
  it("starts a fresh store on the host preset without an undo entry", () => {
    store.getState().adoptDefaultPreset("neo-brutalism");
    const state = store.getState();
    expect(state.themeState.preset).toBe("neo-brutalism");
    expect(state.history).toHaveLength(0);
    expect(selectHasUnsavedChanges(state)).toBe(false);
  });

  it("leaves a restored or edited store alone", () => {
    store.setState({ restoredFromStorage: true });
    store.getState().adoptDefaultPreset("neo-brutalism");
    expect(store.getState().themeState.preset).toBe("default");

    store.setState({ restoredFromStorage: false });
    setRadius("2rem");
    store.getState().adoptDefaultPreset("neo-brutalism");
    expect(store.getState().themeState.preset).toBe("default");
  });
});

describe("host extra colours in the theme", () => {
  const brand = {
    id: "brand",
    label: "Brand",
    styles: {
      light: { primary: "#111111", signal: "#3457FF" },
      dark: { signal: "#6E86FF" },
    },
  };
  const plain = {
    id: "plain",
    label: "Plain",
    styles: { light: { primary: "#222222" }, dark: {} },
  };

  beforeEach(() => {
    configurePresets({ presets: [brand, plain] });
  });

  it("carries a preset's extras and leaves them absent on a preset without", () => {
    store.getState().applyThemePreset("brand");
    expect(store.getState().themeState.styles.light.signal).toBe("#3457FF");
    expect(store.getState().themeState.styles.dark.signal).toBe("#6E86FF");

    store.getState().applyThemePreset("plain");
    const { light, dark } = store.getState().themeState.styles;
    expect("signal" in light).toBe(false);
    expect("signal" in dark).toBe(false);
  });

  it("undoes an extra edit and counts it as unsaved", () => {
    store.getState().applyThemePreset("plain");
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    store.getState().setThemeState((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        light: { ...prev.styles.light, success: "#3F6B4A" },
      },
    }));
    expect(selectHasUnsavedChanges(store.getState())).toBe(true);

    store.getState().undo();
    expect("success" in store.getState().themeState.styles.light).toBe(false);
    expect(selectHasUnsavedChanges(store.getState())).toBe(false);
  });
});

describe("refreshUntouchedPreset", () => {
  const v1 = {
    id: "brand",
    label: "Brand",
    styles: { light: { destructive: "#FF927F" }, dark: {} },
  };
  const v2 = {
    ...v1,
    styles: { light: { destructive: "#B23A2A", signal: "#3457FF" }, dark: {} },
  };

  // A restored session: the preset was applied (which records the baseline
  // refreshUntouchedPreset compares with), then the page reloaded.
  function restoreOn(
    preset: typeof v1,
    edit?: (s: ThemeEditorState) => ThemeEditorState,
  ) {
    configurePresets({ presets: [preset] });
    store.getState().applyThemePreset(preset.id);
    const applied: ThemeEditorState = {
      ...store.getState().themeState,
      currentMode: "dark",
    };
    store.setState({
      themeState: edit ? edit(applied) : structuredClone(applied),
      themeCheckpoint: applied,
      history: [],
      restoredFromStorage: true,
    });
  }

  it("brings an unedited stored preset up to its changed source", () => {
    restoreOn(v1);
    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();

    const { themeState, themeCheckpoint, history } = store.getState();
    expect(themeState.styles.light.destructive).toBe("#B23A2A");
    expect(themeState.styles.light.signal).toBe("#3457FF");
    expect(themeState.currentMode).toBe("dark");
    expect(themeCheckpoint).toBe(themeState);
    expect(history).toEqual([]);
  });

  it("leaves an edited theme alone", () => {
    restoreOn(v1, (state) => ({
      ...state,
      styles: {
        ...state.styles,
        light: { ...state.styles.light, primary: "#000000" },
      },
    }));
    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();

    const { light } = store.getState().themeState.styles;
    expect(light.destructive).toBe("#FF927F");
    expect(light.primary).toBe("#000000");
  });

  it("seeds the baseline of a stored theme that already is its preset", () => {
    configurePresets({ presets: [v1] });
    store.setState({
      themeState: {
        ...defaultThemeState,
        preset: "brand",
        styles: structuredClone(resolvePresetStyles("brand")),
      },
      presetBaseline: null,
      restoredFromStorage: true,
    });
    store.getState().refreshUntouchedPreset();
    expect(store.getState().presetBaseline?.preset).toBe("brand");

    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();
    expect(store.getState().themeState.styles.light.destructive).toBe(
      "#B23A2A",
    );
  });

  it("keeps an imported theme", () => {
    restoreOn(v1);
    store.getState().importThemeStyles({ light: { primary: "#FF0000" } });
    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();

    const { light } = store.getState().themeState.styles;
    expect(light.primary).toBe("#FF0000");
    expect(light.destructive).toBe("#FF927F");
  });

  it("keeps a state undo restored", () => {
    restoreOn(v1);
    store.getState().importThemeStyles({ light: { primary: "#FF0000" } });
    vi.advanceTimersByTime(HISTORY_DEBOUNCE_MS);
    setRadius("2rem");
    store.getState().undo();
    expect(store.getState().themeState.styles.light.primary).toBe("#FF0000");

    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();
    expect(store.getState().themeState.styles.light.primary).toBe("#FF0000");
  });

  it("keeps an edit after HSL returns to neutral", () => {
    restoreOn(v1);
    store.getState().updateCommonStyle("radius", "2rem");
    store.getState().setThemeState((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        light: { ...prev.styles.light, primary: "#000000" },
      },
    }));
    // The HSL controls checkpoint the edited theme, adjust, then come back to
    // neutral: the styles equal the checkpoint again.
    store.getState().saveThemeCheckpoint();
    const edited = store.getState().themeState;
    store.getState().setThemeState((prev) => ({
      ...prev,
      hslAdjustments: { hueShift: 30, saturationScale: 1, lightnessScale: 1 },
    }));
    store.getState().setThemeState({
      ...edited,
      hslAdjustments: defaultHSLAdjustments,
    });

    configurePresets({ presets: [v2] });
    store.getState().refreshUntouchedPreset();
    const { light } = store.getState().themeState.styles;
    expect(light.primary).toBe("#000000");
    expect(light.radius).toBe("2rem");
  });
});
