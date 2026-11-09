import { Link } from 'react-router-dom';
import { buttonClasses } from '@/components/ui/button';
import { to } from '@/app/routes';

/** 1.1 Welcome setup: no shell, centered card (screens/01-global.md). Form and first-launch redirect: Slice 2. */
export function WelcomeScreen() {
  return (
    <main id="main" className="flex min-h-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-[560px] rounded-card border border-border bg-surface p-7">
        <h1 className="text-h1">Welcome to QAI</h1>
        <p className="mt-1 text-text-muted">Screen 1.1 · placeholder, built in Slice 2</p>
        <div className="mt-6 flex justify-end">
          <Link to={to.projects()} className={buttonClasses({ variant: 'primary' })}>
            Continue to projects
          </Link>
        </div>
      </div>
    </main>
  );
}
