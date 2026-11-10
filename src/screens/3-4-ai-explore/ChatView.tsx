import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LoaderCircle, Paperclip, X } from 'lucide-react';
import { createChat, getChat, getTest, listKnowledge, sendChatMessage } from '@/data/api';
import type { ChatMessage, ID, KnowledgeItem, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Field, Textarea } from '@/components/ui/field';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';
import { plural } from '@/lib/format';
import { validationLabels } from '@/lib/labels';
import { caseWhereabouts } from '@/lib/exploreRules';
import { cn } from '@/lib/utils';
import { validationTone } from './ReadyForSuites';

const STARTERS = [
  { label: 'Explore', text: 'Explore the app on UAT and write test cases for ' },
  { label: 'Plan from documents', text: 'Plan test cases from the linked documents for ' },
  { label: 'Create tests', text: 'Create test cases for ' },
];

/** Knowledge the AI explore can use: documents, and skills whose "Used by" includes AI explore. */
const exploreKnowledge = (k: KnowledgeItem[]) => k.filter((x) => x.kind === 'document' || (x.usedBy ?? []).includes('ai_explore'));

/**
 * Conversation + composer (3.4). No chat selected → a new chat (empty state with starter chips). The AI turn runs on
 * when the user leaves (BR-EXPLORE-02); the view refreshes while it is running. Cases cards show each case's status and
 * where it is now, with no approval in the chat (D65).
 */
export function ChatView({ chatId, onChanged, onOpenTray, onCreated, version }: { chatId: ID | undefined; onChanged: () => void; onOpenTray: () => void; onCreated: (chatId: ID) => void; version: number }) {
  const project = useProject();
  const [tick, setTick] = useState(0);
  const data = useAsync(
    async () => {
      const [chat, knowledge] = await Promise.all([chatId ? getChat(chatId) : Promise.resolve(null), listKnowledge(project.id)]);
      const caseIds = chat ? chat.messages.flatMap((m) => (m.kind === 'cases' ? m.testIds : [])) : [];
      const cases = await Promise.all(caseIds.map((id) => getTest(id).catch(() => null)));
      const replacedIds = cases.flatMap((c) => (c?.locationChange?.replacedTestId ? [c.locationChange.replacedTestId] : []));
      const replaced = await Promise.all(replacedIds.map((id) => getTest(id).catch(() => null)));
      const testsById = new Map([...cases, ...replaced].filter((t): t is TestCase => Boolean(t)).map((t) => [t.id, t]));
      return { chat, knowledge, testsById };
    },
    [chatId, project.id, tick, version],
    { keepPrevious: true },
  );

  // Refresh while the AI is working; tell the workspace when the turn ends (Running badge, tray count).
  const running = data.status === 'ready' && Boolean(data.data.chat?.running);
  const wasRunning = useRef(running);
  useEffect(() => {
    if (wasRunning.current && !running) onChanged();
    wasRunning.current = running;
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running, onChanged]);

  // Open in chat / View in AI explore: scroll to the message (`?message=<index>`).
  const [search] = useSearchParams();
  const target = search.get('message');
  const scrolled = useRef<string | null>(null);
  useEffect(() => {
    if (data.status !== 'ready' || target === null || scrolled.current === `${chatId}:${target}`) return;
    const el = document.querySelector<HTMLElement>(`[data-message-index="${target}"]`);
    if (!el) return;
    scrolled.current = `${chatId}:${target}`;
    el.scrollIntoView({ block: 'center' });
    el.focus();
  }, [data, target, chatId]);

  if (data.status === 'loading') return <LoadingState label="Loading chat…" />;
  if (data.status === 'error') return <ErrorState title="Couldn't load the chat" message={data.error.message} onRetry={data.retry} />;
  const { chat, knowledge, testsById } = data.data;
  const usable = exploreKnowledge(knowledge);

  return (
    <>
      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {!chat && (
            <div className="rounded-card border border-border bg-surface p-6">
              <h1 className="text-h2">New chat</h1>
              <p className="mt-1 text-text-muted">
                Ask the AI to explore an app or plan from your documents. The test cases it writes go to <span className="font-semibold">Ready for Suites</span>, where you choose what moves into Suites.
              </p>
            </div>
          )}
          {chat?.messages.map((m, i) => (
            <Message key={i} index={i} m={m} highlighted={target === String(i)} knowledge={knowledge} testsById={testsById} onOpenTray={onOpenTray} />
          ))}
          {running && (
            <div role="status" className="flex items-center gap-2 text-text-muted">
              <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              Exploring… You can leave this chat; the AI keeps working.
            </div>
          )}
        </div>
      </div>
      <Composer
        key={chatId ?? 'new'}
        disabled={running}
        knowledgeCount={usable.length}
        onSend={async (text) => {
          if (chat) {
            await sendChatMessage(chat.id, text);
            setTick((n) => n + 1);
            onChanged();
          } else {
            const created = await createChat(project.id, text);
            onChanged();
            onCreated(created.id);
          }
        }}
      />
    </>
  );
}

function Message({
  index,
  m,
  highlighted,
  knowledge,
  testsById,
  onOpenTray,
}: {
  index: number;
  m: ChatMessage;
  highlighted: boolean;
  knowledge: KnowledgeItem[];
  testsById: Map<ID, TestCase>;
  onOpenTray: () => void;
}) {
  const project = useProject();
  const box = cn('rounded-card border p-4 focus:outline-none', highlighted && 'ring-2 ring-accent');
  if (m.kind === 'user') {
    return (
      <div data-message-index={index} tabIndex={-1} className={cn(box, 'ml-auto max-w-[80%] border-border bg-surface')}>
        <span className="sr-only">You: </span>
        {m.text}
      </div>
    );
  }
  if (m.kind === 'ai') {
    return (
      <div data-message-index={index} tabIndex={-1} className={cn(box, 'max-w-[85%] border-border bg-surface-muted')}>
        <span className="sr-only">AI: </span>
        {m.simulated && <Chip className="mb-1">Simulated (prototype)</Chip>}
        <p>{m.text}</p>
      </div>
    );
  }
  if (m.kind === 'plan') {
    const used = m.usedKnowledge.map((id) => knowledge.find((k) => k.id === id)?.name ?? 'a removed knowledge item');
    return (
      <section data-message-index={index} tabIndex={-1} aria-label="Plan" className={cn(box, 'border-border bg-surface')}>
        <h3 className="text-label text-text-muted">Plan</h3>
        <p>
          {plural(m.suites, 'suite')} · {plural(m.scenarios, 'scenario')}
        </p>
        <p className="text-label font-normal text-text-muted">
          Explored {plural(m.pagesExplored, 'page')}
          {used.length ? ` · used: ${used.join(', ')}` : ''}
        </p>
      </section>
    );
  }
  // Cases card (D65): status and where each case is now; no approval here.
  const cases = m.testIds.map((id) => testsById.get(id)).filter((t): t is TestCase => Boolean(t));
  return (
    <section data-message-index={index} tabIndex={-1} aria-label="Test cases written" className={cn(box, 'border-border bg-surface')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{plural(m.testIds.length, 'test case')} · sent to Ready for Suites</h3>
        {m.simulated && <Chip>Simulated (prototype)</Chip>}
      </div>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {cases.map((c) => {
          const status = c.aiValidationStatus ?? 'not_checked';
          const where = caseWhereabouts(c, testsById);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 py-1.5">
              <span className="min-w-0 flex-1">{c.title}</span>
              <Chip tone={validationTone[status]}>{validationLabels[status]}</Chip>
              <span className="text-label font-normal">
                {where.kind === 'tray' && <span className="text-text-muted">In Ready for Suites</span>}
                {where.kind === 'discarded' && <span className="text-text-muted">Discarded</span>}
                {where.kind === 'moved' && (
                  <Link to={to.suiteTest(project.id, c.id)} className="text-accent underline underline-offset-2">
                    {where.testId} in Suites
                  </Link>
                )}
                {where.kind === 'replaced' && (
                  <Link to={to.suiteTest(project.id, where.testRef)} className="text-accent underline underline-offset-2">
                    Replaced {where.testId}
                  </Link>
                )}
              </span>
            </li>
          );
        })}
        {cases.length < m.testIds.length && <li className="py-1.5 text-text-muted">{plural(m.testIds.length - cases.length, 'case')} no longer available</li>}
      </ul>
      <Button size="sm" className="mt-2" onClick={onOpenTray}>
        Open Ready for Suites
      </Button>
    </section>
  );
}

/** Composer: message · starter chips (Explore · Plan from documents · Create tests) · Knowledge: n items · Attach · Send. */
function Composer({ disabled, knowledgeCount, onSend }: { disabled: boolean; knowledgeCount: number; onSend: (text: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function send() {
    const message = [text.trim(), ...(files.length ? [`Attached: ${files.join(', ')}`] : [])].filter(Boolean).join('\n');
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(message);
      setText('');
      setFiles([]);
      setError(null);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="border-t border-border bg-surface px-6 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <Field label="Message" hint={disabled ? 'The AI is working on this chat. You can send the next message when it replies.' : undefined}>
          {(p) => (
            <Textarea
              {...p}
              ref={area}
              rows={2}
              value={text}
              placeholder="Ask to explore, plan, or change test cases"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-failed-text">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => void send()}>
              Retry
            </button>
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {STARTERS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="h-7 rounded-pill border border-border px-3 text-label font-normal hover:bg-bg"
              onClick={() => {
                setText(s.text);
                area.current?.focus();
              }}
            >
              {s.label}
            </button>
          ))}
          <Chip>Knowledge: {plural(knowledgeCount, 'item')}</Chip>
          <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
            <Paperclip aria-hidden="true" className="h-4 w-4" />
            Attach
          </Button>
          <input
            ref={fileInput}
            type="file"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              setFiles([...files, ...Array.from(e.target.files ?? []).map((f) => f.name)]);
              e.target.value = '';
            }}
          />
          {files.map((f) => (
            <Chip key={f}>
              {f}
              <button type="button" aria-label={`Remove ${f}`} className="ml-1" onClick={() => setFiles(files.filter((x) => x !== f))}>
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Chip>
          ))}
          <Button type="submit" variant="primary" className="ml-auto" disabled={disabled || sending || !text.trim()}>
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}
