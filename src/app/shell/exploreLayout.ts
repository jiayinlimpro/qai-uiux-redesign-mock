import { createContext, useContext } from 'react';

/** AI explore workspace layout (D74): the chat list's full / mini state lives in the workspace, whose header holds the menu button. */
export const ExploreLayoutContext = createContext<{ collapsed: boolean }>({ collapsed: false });

export function useExploreLayout(): { collapsed: boolean } {
  return useContext(ExploreLayoutContext);
}
