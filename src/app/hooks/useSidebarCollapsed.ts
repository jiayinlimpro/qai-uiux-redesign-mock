import { useCallback, useState } from 'react';

/** UI preference, not domain data: stays in the UI layer, not in data/api.ts. */
const PROJECT_SIDEBAR_KEY = 'qai.sidebarCollapsed';

function read(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function write(key: string, collapsed: boolean): void {
  try {
    globalThis.localStorage?.setItem(key, String(collapsed));
  } catch {
    // Storage unavailable (private mode): the state still works for this session.
  }
}

/**
 * Collapsed state is remembered across screens and app restarts (docs/03-navigation.md). Each sidebar has its own key:
 * the project sidebar (default) and the AI explore chat list (`qai.exploreSidebarCollapsed`, D71).
 */
export function useSidebarCollapsed(key: string = PROJECT_SIDEBAR_KEY): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => read(key));
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      write(key, !c);
      return !c;
    });
  }, [key]);
  return [collapsed, toggle];
}
