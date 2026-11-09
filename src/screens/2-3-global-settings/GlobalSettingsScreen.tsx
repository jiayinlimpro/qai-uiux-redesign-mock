import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { buttonClasses } from '@/components/ui/button';
import { to } from '@/app/routes';

/**
 * 2.3 Global settings (screens/01-global.md): page header "← Back" + "Global settings · Applies to all projects".
 * Back returns to the screen it was opened from, or Projects. Sections: Slice 2.
 */
export function GlobalSettingsScreen() {
  const from = (useLocation().state as { from?: string } | null)?.from;
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-topbar shrink-0 items-center gap-4 border-b border-border bg-surface px-5">
        <Link to={from ?? to.projects()} className={buttonClasses({ size: 'sm' })}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-h3">Global settings</h1>
        <p className="text-text-muted">Applies to all projects</p>
      </header>
      <main id="main" tabIndex={-1} className="min-h-0 flex-1 overflow-auto bg-bg focus:outline-none">
        <div className="mx-auto max-w-[900px] p-6">
          <p className="text-text-muted">Screen 2.3 · placeholder, built in Slice 2</p>
        </div>
      </main>
    </div>
  );
}
