import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUp, BookOpen, Compass, FileText, ListChecks, LoaderCircle, Paperclip, X } from 'lucide-react';
import { createChat, getChat, getTest, listKnowledge, sendChatMessage } from '@/data/api';
import type { ChatMessage, ID, KnowledgeItem, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
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

/** New-chat suggestion cards (D70): our three starters; a click fills the message. */
const STARTERS = [
  { label: 'Explore', icon: Compass, title: 'Explore an app', description: 'The AI explores the app on an environment and writes test cases for what it finds.', text: 'Explore the app on UAT and write test cases for ' },
  { label: 'Plan from documents', icon: FileText, title: 'Plan from documents', description: 'The AI reads the linked FRS or user stories and writes test cases for the flows they describe.', text: 'Plan test cases from the linked documents for ' },
  { label: 'Create tests', icon: ListChecks, title: 'Create tests', description: 'Describe what to check and the AI writes the test cases.', text: 'Create test cases for ' },
];

/** Knowledge the AI explore can use: documents, and skills whose "Used by" includes AI explore. */
const exploreKnowledge = (k: KnowledgeItem[]) => k.filter((x) => x.kind === 'document' || (x.usedBy ?? []).includes('ai_explore'));

/**
 * Conversation + composer (3.4). No chat selected → a new chat (greeting and suggestion cards, D70). The AI turn runs on
 * when the user leaves (BR-EXPLORE-02); the view refreshes while it is running. Cases cards show each case's status and
 * where it is now, with no approval in the chat (D65).
 */
export function ChatView({ chatId, onChanged, onOpenTray, onCreated, version }: { chatId: ID | undefined; onChanged: () => void; onOpenTray: () => void; onCreated: (chatId: ID) => void; version: number }) {
  const project = useProject();
  const [tick, setTick] = useState(0);
  const [draft, setDraft] = useState('');
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
      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {!chat && (
            // New chat (D70): greeting and suggestion cards, in the old QAI chat layout.
            <div className="flex flex-col gap-3 pt-[8vh]">
              <h1 className="text-display text-accent">Hello there</h1>
              <p className="text-display-sub text-text">What should I put to the test today?</p>
              <p className="max-w-3xl text-text-muted">
                AI explore explores your app or plans from your documents and writes test cases. They go to{' '}
                <span className="font-semibold text-text">Ready for Suites</span>, where you choose what moves into Suites. Start from a suggestion or write your own message.
              </p>
              <ul aria-label="Suggestions" className="mt-4 grid gap-4 sm:grid-cols-3">
                {STARTERS.map((st) => (
                  <li key={st.label}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(st.text);
                        document.getElementById(MESSAGE_ID)?.focus();
                      }}
                      className="flex h-full w-full flex-col gap-2 rounded-card border border-transparent bg-bg p-4 text-left hover:border-accent"
                    >
                      <Chip tone="info" className="self-start">
                        <st.icon aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                        {st.label}
                      </Chip>
                      <span className="text-h3 font-normal">{st.title}</span>
                      <span className="text-text-muted">{st.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
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
        text={draft}
        setText={setDraft}
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

const MESSAGE_ID = 'ai-explore-message';

/**
 * Composer card (D70, in the old QAI chat layout): message · Attach · Knowledge: n items · Send (round arrow).
 * Enter sends, Shift+Enter adds a line; Enter while an input method is composing (e.g. Pinyin) does not send.
 */
function Composer({ text, setText, disabled, knowledgeCount, onSend }: { text: string; setText: (t: string) => void; disabled: boolean; knowledgeCount: number; onSend: (text: string) => Promise<void> }) {
  const [files, setFiles] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canSend = !disabled && !sending && Boolean(text.trim());

  async function send() {
    if (!canSend) return;
    const message = [text.trim(), ...(files.length ? [`Attached: ${files.join(', ')}`] : [])].join('\n');
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
      className="px-6 pb-3 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-1">
        <div className="rounded-card border border-transparent bg-bg px-4 pb-3 pt-3 focus-within:border-accent">
          <label htmlFor={MESSAGE_ID} className="sr-only">
            Message
          </label>
          <textarea
            id={MESSAGE_ID}
            rows={2}
            value={text}
            placeholder="Ask to explore, plan, or change test cases"
            aria-describedby={`${MESSAGE_ID}-hint`}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            className="w-full resize-none bg-transparent text-base text-text placeholder:text-text-muted focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" iconOnly aria-label="Attach a file" onClick={() => fileInput.current?.click()}>
              <Paperclip aria-hidden="true" className="h-4 w-4" />
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
            <span className="inline-flex items-center gap-1.5 text-label">
              <BookOpen aria-hidden="true" className="h-4 w-4" />
              Knowledge: {plural(knowledgeCount, 'item')}
            </span>
            {files.map((f) => (
              <Chip key={f}>
                {f}
                <button type="button" aria-label={`Remove ${f}`} className="ml-1" onClick={() => setFiles(files.filter((x) => x !== f))}>
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              </Chip>
            ))}
            <Button type="submit" variant="primary" iconOnly aria-label="Send" className="ml-auto rounded-pill" disabled={!canSend}>
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p id={`${MESSAGE_ID}-hint`} className="text-center text-label font-normal text-text-muted">
          {disabled ? 'The AI is working on this chat. You can send the next message when it replies.' : 'Enter to send, Shift+Enter for a new line.'}
        </p>
        {error && (
          <p role="alert" className="text-center text-failed-text">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => void send()}>
              Retry
            </button>
          </p>
        )}
      </div>
    </form>
  );
}
