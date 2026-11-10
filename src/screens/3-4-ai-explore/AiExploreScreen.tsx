import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';
import { listChats, listTrayCases } from '@/data/api';
import type { ID } from '@/data/types';
import { buttonClasses } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { formatStarted } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ChatView } from './ChatView';
import { ReadyForSuites } from './ReadyForSuites';

/**
 * 3.4 AI explore (screens/05-ai-explore.md): chat list of this project (BR-EXPLORE-01) with Running badges (BR-EXPLORE-02),
 * "Ready for Suites (n)" always visible under the chat history (opens 3.5, D65), and the conversation.
 */
export function AiExploreScreen() {
  const project = useProject();
  const { chatId } = useParams();
  const navigate = useNavigate();
  // Keep "Back to project" pointing at where AI explore was opened from while moving between chats (03 § C).
  const state = useLocation().state as unknown;
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const data = useAsync(
    async () => {
      const [chats, tray] = await Promise.all([listChats(project.id), listTrayCases(project.id)]);
      return { chats, trayCount: tray.length };
    },
    [project.id, version],
    { keepPrevious: true },
  );
  const [trayOpen, setTrayOpen] = useState(false);

  // While any chat of this project is running, keep the list (Running badges, tray count) up to date.
  const anyRunning = data.status === 'ready' && data.data.chats.some((c) => c.running);
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(refresh, 1500);
    return () => clearInterval(t);
  }, [anyRunning, refresh]);

  const openChat = (id: ID, messageIndex?: number) => navigate(to.exploreChat(project.id, id, messageIndex), { state });

  return (
    <div className="flex h-full min-h-0">
      <aside aria-label="Chats" className="flex w-60 shrink-0 flex-col gap-3 border-r border-border bg-surface-muted p-3">
        <Link to={to.explore(project.id)} state={state} className={buttonClasses({ variant: 'primary', className: 'w-full' })}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          New chat
        </Link>
        <h2 className="px-2 text-label text-text-muted">This project</h2>
        <nav aria-label="Chats of this project" className="min-h-0 flex-1 overflow-auto">
          {data.status === 'loading' && <LoadingState label="Loading chats…" />}
          {data.status === 'error' && <ErrorState title="Couldn't load the chats" message={data.error.message} onRetry={data.retry} />}
          {data.status === 'ready' && data.data.chats.length === 0 && <p className="px-2 text-text-muted">No chats yet.</p>}
          {data.status === 'ready' && (
            <ul className="flex flex-col gap-1">
              {data.data.chats.map((c) => (
                <li key={c.id}>
                  <Link
                    to={to.exploreChat(project.id, c.id)}
                    state={state}
                    aria-current={c.id === chatId ? 'page' : undefined}
                    className={cn('block rounded-control px-2 py-1.5 hover:bg-bg', c.id === chatId && 'bg-accent-soft font-semibold text-accent-soft-text')}
                  >
                    <span className="block">{c.title}</span>
                    <span className="flex items-center gap-1.5 text-label font-normal text-text-muted">
                      {formatStarted(c.updatedAt)}
                      {c.running && <Chip tone="info">Running</Chip>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <button
          type="button"
          onClick={() => setTrayOpen(true)}
          className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left font-semibold hover:bg-bg"
        >
          <span className="flex items-center gap-2">
            <Inbox aria-hidden="true" className="h-4 w-4" />
            Ready for Suites
          </span>
          <span aria-label={`${data.status === 'ready' ? data.data.trayCount : 0} cases`} className="rounded-pill bg-accent-soft px-2 text-accent-soft-text">
            {data.status === 'ready' ? data.data.trayCount : '…'}
          </span>
        </button>
      </aside>

      <section aria-label="Chat" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatView key={chatId ?? 'new'} chatId={chatId} onChanged={refresh} onOpenTray={() => setTrayOpen(true)} onCreated={(id) => openChat(id)} version={version} />
      </section>

      {trayOpen && (
        <ReadyForSuites
          projectId={project.id}
          onClose={() => setTrayOpen(false)}
          onOpenChat={(id, index) => {
            setTrayOpen(false);
            openChat(id, index);
          }}
          onChanged={refresh}
        />
      )}
    </div>
  );
}
