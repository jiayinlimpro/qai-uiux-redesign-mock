import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getGlobalSettings } from '@/data/api';
import type { GlobalSettings } from '@/data/types';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from './hooks/useAsync';
import { paths, to } from './routes';

interface SettingsContextValue {
  settings: GlobalSettings;
  /** Re-read after a change (save, reset, restore). The current settings stay on screen meanwhile. */
  reload: () => Promise<GlobalSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useGlobalSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useGlobalSettings must be used inside SettingsRoot');
  return value;
}

/** Loads global settings once for the whole app and applies the theme choice to <html data-theme>. */
export function SettingsRoot({ children }: { children?: ReactNode }) {
  const initial = useAsync(getGlobalSettings, []);
  const [latest, setLatest] = useState<GlobalSettings | null>(null);
  const settings = latest ?? (initial.status === 'ready' ? initial.data : null);

  const reload = useCallback(async () => {
    const next = await getGlobalSettings();
    setLatest(next);
    return next;
  }, []);

  useEffect(() => {
    // Dark theme colours come with the design phase (08); the attribute is the hook for them.
    if (settings) document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  if (!settings) {
    if (initial.status === 'error') {
      return (
        <main className="flex h-full items-start justify-center bg-bg pt-24">
          <ErrorState title="Couldn't load your settings" message={initial.error.message} onRetry={initial.retry} />
        </main>
      );
    }
    return <LoadingState label="Starting QAI…" />;
  }
  return <SettingsContext.Provider value={{ settings, reload }}>{children ?? <Outlet />}</SettingsContext.Provider>;
}

/**
 * First launch (03): with no AI provider configured every screen goes to Welcome,
 * and Welcome is only shown while no provider exists.
 */
export function FirstLaunchGate() {
  const { settings } = useGlobalSettings();
  const onWelcome = useLocation().pathname === paths.welcome;
  const firstLaunch = settings.providers.length === 0;
  if (firstLaunch && !onWelcome) return <Navigate to={to.welcome()} replace />;
  if (!firstLaunch && onWelcome) return <Navigate to={to.projects()} replace />;
  return <Outlet />;
}
