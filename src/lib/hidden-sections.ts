// Persistent hide/restore for individual sections (insight cards, charts).
import { useEffect, useState, useCallback } from "react";

const KEY = "lb_hidden_sections_v1";
const EVT = "lb:hidden-sections-changed";

export interface HiddenItem { id: string; label: string; hiddenAt: number }

function read(): Record<string, HiddenItem> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function write(map: Record<string, HiddenItem>) {
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(EVT));
}

export function hideSection(id: string, label: string) {
  const map = read();
  map[id] = { id, label, hiddenAt: Date.now() };
  write(map);
}
export function restoreSection(id: string) {
  const map = read();
  delete map[id];
  write(map);
}
export function restoreAll() { write({}); }

export function useHiddenSections() {
  const [map, setMap] = useState<Record<string, HiddenItem>>(() => read());
  useEffect(() => {
    const sync = () => setMap(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return map;
}

export function useIsHidden(id: string) {
  const map = useHiddenSections();
  return Boolean(map[id]);
}

export function useHiddenList() {
  const map = useHiddenSections();
  return Object.values(map).sort((a, b) => b.hiddenAt - a.hiddenAt);
}
