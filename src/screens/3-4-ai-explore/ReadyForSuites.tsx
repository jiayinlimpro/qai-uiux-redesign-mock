import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, TriangleAlert } from 'lucide-react';
import { discardCases, listChats, listDiscardedCases, listLibraryTests, listTrayCases, moveToSuites, resolveDuplicate, restoreToTray, updateTrayCase, type MoveToSuitesResult } from '@/data/api';
import type { Browser, Chat, ID, TestCase } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Chip, type ChipTone } from '@/components/ui/chip';
import { Dialog } from '@/components/ui/dialog';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/field';
import { Toast, type ToastMessage } from '@/components/ui/toast';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { errorText } from '@/components/StatusLine';
import { useAsync } from '@/app/hooks/useAsync';
import { browserLabels, validationLabels } from '@/lib/labels';
import { plural } from '@/lib/format';
import { moveBlockerLabels, moveBlockers, trayCounts, VALIDATION_STATUSES, type ValidationStatus } from '@/lib/exploreRules';
import { cn } from '@/lib/utils';

export const validationTone: Record<ValidationStatus, ChipTone> = { not_checked: 'neutral', checked: 'passed', needs_fixing: 'cc' };

/** Selections persist after closing and reopening, for this project and this session (3.5). */
const selections = new Map<string, Set<ID>>();
const selectionOf = (key: string) => selections.get(key) ?? new Set<ID>();

/**
 * 3.5 Ready for Suites (screens/05-ai-explore.md, D65, BR-EXPLORE-03…09): AI cases from all chats wait here until the
 * tester moves them into Suites › Not in a suite. Large centre modal; no nested modals (inline edits and confirmations).
 */
export function ReadyForSuites({
  projectId,
  onClose,
  onOpenChat,
  onChanged,
}: {
  projectId: ID;
  onClose: () => void;
  onOpenChat: (chatId: ID, messageIndex: number) => void;
  /** The tray or the library changed (sidebar count, chat cases cards). */
  onChanged: () => void;
}) {
  const [showDiscarded, setShowDiscarded] = useState(false);
  const data = useAsync(
    async () => {
      const [tray, discarded, chats, library] = await Promise.all([listTrayCases(projectId), listDiscardedCases(projectId), listChats(projectId), listLibraryTests(projectId)]);
      return { tray, discarded, chats, library };
    },
    [projectId],
    { keepPrevious: true },
  );
  const selKey = `${projectId}:${showDiscarded ? 'discarded' : 'tray'}`;
  const [selection, setSelectionState] = useState<Set<ID>>(() => selectionOf(selKey));
  const setSelection = useCallback(
    (next: Set<ID>) => {
      selections.set(selKey, next);
      setSelectionState(next);
    },
    [selKey],
  );
  const [filter, setFilter] = useState<ValidationStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<ID>>(new Set());
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [blocked, setBlocked] = useState<MoveToSuitesResult['blocked']>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeToast = useCallback(() => setToast(null), []);

  const cases = data.status === 'ready' ? (showDiscarded ? data.data.discarded : data.data.tray) : [];
  const counts = trayCounts(cases);
  const shown = cases.filter((c) => filter === 'all' || (c.aiValidationStatus ?? 'not_checked') === filter);
  const chatsById = useMemo(() => new Map((data.status === 'ready' ? data.data.chats : []).map((c) => [c.id, c])), [data]);
  const libraryById = useMemo(() => new Map((data.status === 'ready' ? data.data.library : []).map((t) => [t.id, t])), [data]);
  const selected = cases.filter((c) => selection.has(c.id));
  const allShown = shown.length > 0 && shown.every((c) => selection.has(c.id));

  const switchView = (discarded: boolean) => {
    setShowDiscarded(discarded);
    setSelectionState(selectionOf(`${projectId}:${discarded ? 'discarded' : 'tray'}`));
    setFilter('all');
    setBlocked([]);
  };
  const requestClose = () => {
    if (selection.size > 0 && !confirmingClose) setConfirmingClose(true);
    else onClose();
  };

  async function act(fn: () => Promise<void>) {
    try {
      setError(null);
      await fn();
      data.retry();
      onChanged();
    } catch (e) {
      setError(errorText(e));
    }
  }

  /** Toast Undo: the cases go back to Ready for Suites (a replaced library test gets its previous version back). */
  const undo = (ids: ID[], text: string) => ({
    label: 'Undo',
    onClick: () => {
      void act(async () => {
        await restoreToTray(ids);
        setToast({ id: Date.now(), text });
      });
    },
  });

  async function discard(ids: ID[]) {
    await act(async () => {
      await discardCases(ids);
      setSelection(new Set([...selection].filter((id) => !ids.includes(id))));
      setToast({ id: Date.now(), text: `Discarded ${plural(ids.length, 'case')}`, action: undo(ids, 'Back in Ready for Suites') });
    });
  }
  async function move() {
    const ids = selected.map((c) => c.id);
    await act(async () => {
      const r = await moveToSuites(ids);
      const blockedIds = new Set(r.blocked.map((b) => b.testId));
      const done = ids.filter((id) => !blockedIds.has(id));
      setBlocked(r.blocked);
      setSelection(new Set(r.blocked.map((b) => b.testId)));
      if (done.length) {
        const parts = [r.moved.length ? `Moved ${plural(r.moved.length, 'test')} to Suites · Not in a suite` : '', r.replaced.length ? `Replaced ${r.replaced.map((t) => t.testId).join(', ')}` : ''].filter(Boolean);
        setToast({ id: Date.now(), text: parts.join(' · '), action: undo(done, 'Back in Ready for Suites') });
      }
    });
  }
  async function restore(ids: ID[]) {
    await act(async () => {
      await restoreToTray(ids);
      setSelection(new Set([...selection].filter((id) => !ids.includes(id))));
      setToast({ id: Date.now(), text: `Restored ${plural(ids.length, 'case')} to Ready for Suites` });
    });
  }

  return (
    <Dialog title="Ready for Suites" size="xl" onClose={requestClose} closeOnBackdrop>
      <div className="flex min-h-full flex-col gap-3">
        {confirmingClose && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-cc-border bg-cc-fill px-4 py-2 text-cc-text">
            <span>Close with {plural(selection.size, 'case')} selected? Your selection is kept.</span>
            <span className="flex gap-2">
              <Button size="sm" variant="primary" onClick={onClose} data-autofocus>
                Close
              </Button>
              <Button size="sm" onClick={() => setConfirmingClose(false)}>
                Keep open
              </Button>
            </span>
          </div>
        )}
        <p className="text-text-muted">Test cases the AI wrote in this project’s chats. Move them into Suites (they arrive in Not in a suite, marked New), or discard them.</p>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filter by validation status" className="flex flex-wrap gap-1.5">
            {(['all', ...VALIDATION_STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={filter === s}
                onClick={() => setFilter(s)}
                className={cn('h-8 rounded-pill border border-border px-3', filter === s ? 'border-accent bg-accent-soft font-semibold text-accent-soft-text' : 'bg-surface')}
              >
                {s === 'all' ? 'All' : validationLabels[s]} {counts[s]}
              </button>
            ))}
          </div>
          <Checkbox label="Show discarded" checked={showDiscarded} onChange={(e) => switchView(e.target.checked)} className="ml-2" />
          <Checkbox
            label={`Select all shown (${shown.length})`}
            checked={allShown}
            disabled={shown.length === 0}
            onChange={() => {
              const next = new Set(selection);
              for (const c of shown) if (allShown) next.delete(c.id);
              else next.add(c.id);
              setSelection(next);
            }}
            className="ml-auto"
          />
        </div>

        {selection.size > 0 && (
          <div role="region" aria-label="Selected cases" className="flex flex-wrap items-center gap-2 rounded-card bg-accent-soft px-3 py-2">
            <span className="font-semibold text-accent-soft-text">{selection.size} selected</span>
            {showDiscarded ? (
              <Button size="sm" variant="primary" onClick={() => void restore(selected.map((c) => c.id))}>
                Restore to tray
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={() => void discard(selected.map((c) => c.id))}>
                  Discard
                </Button>
                <Button size="sm" variant="primary" onClick={() => void move()}>
                  Move to Suites
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelection(new Set())}>
              Clear
            </Button>
          </div>
        )}
        {blocked.length > 0 && (
          <div role="alert" className="rounded-card border border-cc-border bg-cc-fill px-4 py-2 text-cc-text">
            <p className="font-semibold">Not moved ({blocked.length}):</p>
            <ul className="ml-4 list-disc">
              {blocked.map((b) => (
                <li key={b.testId}>
                  {b.title}: {b.reasons.join('; ')}
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p role="alert" className="text-failed-text">
            {error}
          </p>
        )}

        {data.status === 'loading' && <LoadingState label="Loading cases…" />}
        {data.status === 'error' && <ErrorState title="Couldn't load Ready for Suites" message={data.error.message} onRetry={data.retry} />}
        {data.status === 'ready' && cases.length === 0 && (
          <div className="rounded-card border border-dashed border-border p-8 text-center text-text-muted">
            {showDiscarded ? 'No discarded cases.' : 'Nothing waiting. When the AI writes test cases in a chat, they appear here, ready to move into Suites.'}
          </div>
        )}
        {data.status === 'ready' && cases.length > 0 && shown.length === 0 && (
          <div className="rounded-card border border-dashed border-border p-6 text-center text-text-muted">
            <p>No cases with this status.</p>
            <Button size="sm" className="mt-2" onClick={() => setFilter('all')}>
              Show all
            </Button>
          </div>
        )}
        {shown.length > 0 && (
          <ul aria-label={showDiscarded ? 'Discarded cases' : 'Cases'} className="overflow-hidden rounded-card border border-border">
            {shown.map((c) => (
              <CaseRow
                key={c.id}
                c={c}
                chat={c.aiOrigin ? chatsById.get(c.aiOrigin.chatId) : undefined}
                duplicateLabel={c.duplicateOf ? (libraryById.get(c.duplicateOf)?.testId ?? 'a deleted test') : undefined}
                discardedView={showDiscarded}
                checked={selection.has(c.id)}
                onToggle={() => {
                  const next = new Set(selection);
                  if (next.has(c.id)) next.delete(c.id);
                  else next.add(c.id);
                  setSelection(next);
                }}
                open={expanded.has(c.id)}
                onToggleOpen={() => setExpanded((prev) => (prev.has(c.id) ? new Set([...prev].filter((x) => x !== c.id)) : new Set([...prev, c.id])))}
                onOpenChat={() => c.aiOrigin && onOpenChat(c.aiOrigin.chatId, c.aiOrigin.messageIndex)}
                onDiscard={() => void discard([c.id])}
                onRestore={() => void restore([c.id])}
                onResolve={(choice) =>
                  void act(async () => {
                    await resolveDuplicate(c.id, choice);
                    if (choice === 'discard') setToast({ id: Date.now(), text: 'Discarded 1 case', action: undo([c.id], 'Back in Ready for Suites') });
                  })
                }
                onSave={(next) => act(async () => void (await updateTrayCase(next)))}
              />
            ))}
          </ul>
        )}
      </div>
      {/* Inside the modal: the page behind is inert while it is open. */}
      <Toast toast={toast} onClose={closeToast} />
    </Dialog>
  );
}

const BROWSERS: Browser[] = ['chrome', 'firefox', 'webkit'];

function CaseRow({
  c,
  chat,
  duplicateLabel,
  discardedView,
  checked,
  onToggle,
  open,
  onToggleOpen,
  onOpenChat,
  onDiscard,
  onRestore,
  onResolve,
  onSave,
}: {
  c: TestCase;
  chat: Chat | undefined;
  duplicateLabel: string | undefined;
  discardedView: boolean;
  checked: boolean;
  onToggle: () => void;
  open: boolean;
  onToggleOpen: () => void;
  onOpenChat: () => void;
  onDiscard: () => void;
  onRestore: () => void;
  onResolve: (choice: NonNullable<TestCase['duplicateChoice']>) => void;
  onSave: (next: TestCase) => Promise<void>;
}) {
  const status = c.aiValidationStatus ?? 'not_checked';
  const missingSteps = moveBlockers(c).includes('missing_steps');
  const panelId = `case-${c.id}`;
  return (
    <li className="border-b border-border last:border-b-0" data-case-id={c.id}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <input type="checkbox" className="h-4 w-4 accent-accent" checked={checked} onChange={onToggle} aria-label={`Select ${c.title}`} />
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggleOpen} className="flex min-w-0 flex-1 items-center gap-1 rounded-control text-left">
          {open ? <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
          <span className="truncate font-semibold">{c.title}</span>
        </button>
        <Chip tone={validationTone[status]}>{validationLabels[status]}</Chip>
        {missingSteps && (
          <span className="inline-flex items-center gap-1 text-label text-cc-text">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            {moveBlockerLabels.missing_steps}
          </span>
        )}
        <span className="text-label font-normal text-text-muted">{chat ? chat.title : 'Chat removed'}</span>
        {chat && (
          <Button size="sm" variant="ghost" className="text-accent" onClick={onOpenChat}>
            Open in chat<span className="sr-only"> for {c.title}</span>
          </Button>
        )}
        {discardedView ? (
          <Button size="sm" onClick={onRestore}>
            Restore to tray<span className="sr-only"> {c.title}</span>
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={onDiscard}>
            Discard<span className="sr-only"> {c.title}</span>
          </Button>
        )}
      </div>
      {!discardedView && c.duplicateOf && (
        <fieldset className="mx-3 mb-2 flex flex-wrap items-center gap-3 rounded-control border border-cc-border bg-cc-fill px-3 py-1.5">
          <legend className="sr-only">Possible duplicate of {duplicateLabel}</legend>
          <Chip tone="cc">Similar to {duplicateLabel}</Chip>
          {(
            [
              ['keep_both', 'Keep both'],
              ['replace', `Replace ${duplicateLabel}`],
              ['discard', 'Discard'],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="inline-flex cursor-pointer items-center gap-1.5">
              <input type="radio" name={`dup-${c.id}`} value={value} checked={c.duplicateChoice === value} onChange={() => onResolve(value)} className="h-4 w-4 accent-accent" />
              {label}
            </label>
          ))}
          {!c.duplicateChoice && <span className="text-label text-cc-text">Choose one before moving</span>}
        </fieldset>
      )}
      {open && <CaseFields id={panelId} c={c} readOnly={discardedView} onSave={onSave} onOpenChat={onOpenChat} />}
    </li>
  );
}

/** Expanded case: small fields edited inline (BR-EXPLORE-08); steps and preconditions change through the chat. */
function CaseFields({ id, c, readOnly, onSave, onOpenChat }: { id: string; c: TestCase; readOnly: boolean; onSave: (next: TestCase) => Promise<void>; onOpenChat: () => void }) {
  const [draft, setDraft] = useState(c);
  const dirty = JSON.stringify(draft) !== JSON.stringify(c);
  const set = (patch: Partial<TestCase>) => setDraft({ ...draft, ...patch });
  return (
    <div id={id} className="grid gap-4 border-t border-border bg-surface-muted px-10 py-3 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <Field label="Title">{(p) => <Input {...p} value={draft.title} disabled={readOnly} onChange={(e) => set({ title: e.target.value })} />}</Field>
        <Field label="Expected result">{(p) => <Textarea {...p} value={draft.expectedResult ?? ''} disabled={readOnly} onChange={(e) => set({ expectedResult: e.target.value })} />}</Field>
        <Field label="Expected keywords">{(p) => <Input {...p} value={draft.expectedKeywords ?? ''} disabled={readOnly} onChange={(e) => set({ expectedKeywords: e.target.value })} />}</Field>
        <Field label="Start page">{(p) => <Input {...p} value={draft.startPage ?? ''} disabled={readOnly} onChange={(e) => set({ startPage: e.target.value })} />}</Field>
        <fieldset>
          <legend className="text-label text-text-muted">Browser preference (none = all)</legend>
          <div className="mt-1 flex flex-wrap gap-4">
            {BROWSERS.map((b) => (
              <Checkbox
                key={b}
                label={browserLabels[b]}
                disabled={readOnly}
                checked={draft.browserPreference?.includes(b) ?? false}
                onChange={(e) => set({ browserPreference: e.target.checked ? [...(draft.browserPreference ?? []), b] : (draft.browserPreference ?? []).filter((x) => x !== b) })}
              />
            ))}
          </div>
        </fieldset>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant="primary" disabled={!dirty} onClick={() => void onSave(draft)}>
              Save changes
            </Button>
            <Button size="sm" disabled={!dirty} onClick={() => setDraft(c)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-label text-text-muted">Preconditions</h4>
          <p className={cn(!c.preconditions && 'text-text-muted')}>{c.preconditions ?? 'None'}</p>
        </div>
        <div>
          <h4 className="text-label text-text-muted">Steps</h4>
          {c.steps.length === 0 ? (
            <p className="inline-flex items-center gap-1 text-cc-text">
              <TriangleAlert aria-hidden="true" className="h-4 w-4" /> Missing: steps. Ask the AI in the chat to write them.
            </p>
          ) : (
            <ol className="ml-5 list-decimal">
              {c.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </div>
        <p className="text-label font-normal text-text-muted">
          Steps and preconditions are changed in the chat.{' '}
          <button type="button" className="font-semibold text-accent underline underline-offset-2" onClick={onOpenChat}>
            Open in chat
          </button>
        </p>
      </div>
    </div>
  );
}
