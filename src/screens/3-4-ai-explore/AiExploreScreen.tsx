import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Inbox, Plus } from 'lucide-react';
import { listChats, listTrayCases } from '@/data/api';
import type { ID } from '@/data/types';
import { Chip } from '@/components/ui/chip';
import { Tooltip } from '@/components/ui/tooltip';
import { useSidebarCollapsed } from '@/app/hooks/useSidebarCollapsed';
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
  // The chat list collapses like the project sidebar; its own remembered state (D71).
  const [collapsed, toggleCollapsed] = useSidebarCollapsed('qai.exploreSidebarCollapsed');
  const trayCount = data.status === 'ready' ? data.data.trayCount : null;

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
      <aside
        aria-label="Chats"
        className={cn('relative flex shrink-0 flex-col gap-3 bg-bg py-3 transition-[width] duration-150', collapsed ? 'w-sidebar-collapsed items-center px-2' : 'w-72 px-3')}
      >
        {/* Old QAI chat layout (D70) with the system's collapse pattern (D71): same round edge toggle and 64 px rail as the project sidebar. */}
        {collapsed ? (
          <Tooltip label="New chat" describe={false}>
            <Link
              to={to.explore(project.id)}
              state={state}
              aria-label="New chat"
              aria-current={!chatId ? 'page' : undefined}
              className={cn('flex h-10 w-10 items-center justify-center rounded-pill hover:bg-accent-soft', !chatId && 'bg-accent-soft')}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-text text-surface">
                <Plus aria-hidden="true" className="h-4 w-4" />
              </span>
            </Link>
          </Tooltip>
        ) : (
          <Link
            to={to.explore(project.id)}
            state={state}
            aria-current={!chatId ? 'page' : undefined}
            className={cn('flex items-center gap-3 rounded-pill px-3 py-2.5 font-semibold hover:bg-accent-soft', !chatId ? 'bg-accent-soft text-accent-soft-text' : 'bg-surface')}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-pill bg-text text-surface">
              <Plus aria-hidden="true" className="h-4 w-4" />
            </span>
            New chat
          </Link>
        )}
        {collapsed ? (
          <div className="flex-1" />
        ) : (
          <>
            <h2 className="px-2 text-label text-text-muted">This project</h2>
            <nav aria-label="Chats of this project" className="min-h-0 flex-1 overflow-auto">
              {data.status === 'loading' && <LoadingState label="Loading chats…" />}
              {data.status === 'error' && <ErrorState title="Couldn't load the chats" message={data.error.message} onRetry={data.retry} />}
              {data.status === 'ready' && data.data.chats.length === 0 && (
                <p className="px-2 text-label font-normal text-text-muted">No chats yet. Start a new chat and tell the AI what to explore or plan.</p>
              )}
              {data.status === 'ready' && (
                <ul className="flex flex-col gap-1">
                  {data.data.chats.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={to.exploreChat(project.id, c.id)}
                        state={state}
                        aria-current={c.id === chatId ? 'page' : undefined}
                        className={cn('block rounded-control px-2 py-1.5 hover:bg-surface', c.id === chatId && 'bg-accent-soft font-semibold text-accent-soft-text')}
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
          </>
        )}
        {collapsed ? (
          <Tooltip label={`Ready for Suites (${trayCount ?? '…'})`} describe={false}>
            <button
              type="button"
              aria-label={`Ready for Suites, ${trayCount ?? 0} cases`}
              onClick={() => setTrayOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface hover:bg-bg"
            >
              <Inbox aria-hidden="true" className="h-4 w-4" />
              <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 min-w-5 rounded-pill bg-accent px-1 text-center text-label text-accent-contrast">
                {trayCount ?? '…'}
              </span>
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => setTrayOpen(true)}
            className="flex items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 py-2 text-left font-semibold hover:bg-bg"
          >
            <span className="flex items-center gap-2">
              <Inbox aria-hidden="true" className="h-4 w-4" />
              Ready for Suites
            </span>
            <span aria-label={`${trayCount ?? 0} cases`} className="rounded-pill bg-accent-soft px-2 text-accent-soft-text">
              {trayCount ?? '…'}
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand chat list' : 'Collapse chat list'}
          aria-expanded={!collapsed}
          className="absolute -right-3.5 top-5 z-20 flex h-7 w-7 items-center justify-center rounded-pill border border-border bg-surface text-text-muted hover:text-text"
        >
          {collapsed ? <ChevronRight aria-hidden="true" className="h-4 w-4" /> : <ChevronLeft aria-hidden="true" className="h-4 w-4" />}
        </button>
      </aside>

      <section aria-label="Chat" className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
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
