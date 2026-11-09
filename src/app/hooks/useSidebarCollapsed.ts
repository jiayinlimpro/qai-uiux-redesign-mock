import { useCallback, useState } from 'react';

/** UI preference, not domain data: stays in the UI layer, not in data/api.ts. */
const KEY = 'qai.sidebarCollapsed';

function read(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

function write(collapsed: boolean): void {
  try {
    globalThis.localStorage?.setItem(KEY, String(collapsed));
  } catch {
    // Storage unavailable (private mode): the state still works for this session.
  }
}

/** Collapsed state is remembered across screens and app restarts (docs/03-navigation.md). */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(read);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      write(!c);
      return !c;
    });
  }, []);
  return [collapsed, toggle];
}
