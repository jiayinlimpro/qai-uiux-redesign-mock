import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { deleteAccount, DuplicateAccountError, revealAccountPassword, saveAccount } from '@/data/api';
import type { Account, Project } from '@/data/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select } from '@/components/ui/field';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { SectionCard, SectionEmpty } from '@/components/SectionCard';
import { StatusLine, errorText, type SaveStatus } from '@/components/StatusLine';
import { useConfirm } from '@/components/useConfirm';
import { useProject } from '@/app/projectContext';
import { duplicateAccount } from '@/lib/knowledge';

const platformName = (p: Project, id: string) => p.platforms.find((a) => a.id === id)?.name ?? 'Removed platform';
const envName = (p: Project, id: string) => p.environments.find((e) => e.id === id)?.name ?? 'Removed environment';

/** Environments › Accounts: Role · Platform · Environment · Username · Password (masked, reveal on click) · Edit. */
export function AccountsSection({ accounts, onChanged }: { accounts: Account[]; onChanged: () => void }) {
  const project = useProject();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [status, setStatus] = useState<SaveStatus>(null);
  const noPlatforms = project.platforms.length === 0;

  return (
    <SectionCard
      id="accounts"
      title="Accounts"
      action={
        <Button size="sm" disabled={noPlatforms} onClick={() => setEditing('new')}>
          Add account
        </Button>
      }
    >
      {accounts.length === 0 ? (
        <SectionEmpty>{noPlatforms ? 'Add a platform in Platforms and environments first, then add the logins tests use.' : 'No accounts yet. Add the logins your tests use, per role, platform and environment.'}</SectionEmpty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Role</Th>
              <Th>Platform</Th>
              <Th>Environment</Th>
              <Th>Username</Th>
              <Th>Password</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <Tr key={a.id}>
                <Td>{a.role}</Td>
                <Td>{platformName(project, a.platformId)}</Td>
                <Td>{envName(project, a.environmentId)}</Td>
                <Td>{a.username}</Td>
                <Td>{a.hasPassword ? <PasswordCell account={a} label={`${a.role}, ${platformName(project, a.platformId)}, ${envName(project, a.environmentId)}`} /> : <span className="text-text-muted">Not set</span>}</Td>
                <Td className="text-right">
                  <Button size="sm" onClick={() => setEditing(a)}>
                    Edit<span className="sr-only"> account {a.role}</span>
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-2 text-label font-normal text-text-muted">
        Tests can say “log in to Admin portal as Admin”; the AI finds the matching URL and account for the run’s environment.
      </p>
      <StatusLine status={status} />
      {editing && (
        <AccountDialog
          account={editing === 'new' ? undefined : editing}
          accounts={accounts}
          onClose={() => setEditing(null)}
          onDone={(text) => {
            setEditing(null);
            setStatus({ tone: 'ok', text });
            onChanged();
          }}
        />
      )}
    </SectionCard>
  );
}

/** Masked; "Show password" fetches it on demand (never part of the account list). */
function PasswordCell({ account, label }: { account: Account; label: string }) {
  const [shown, setShown] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
  return (
    <span className="inline-flex items-center gap-2">
      <span className={shown === null ? 'tracking-widest' : 'font-mono'}>{shown ?? '••••••••'}</span>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={shown === null ? `Show password for ${label}` : `Hide password for ${label}`}
        aria-pressed={shown !== null}
        disabled={state === 'loading'}
        onClick={async () => {
          if (shown !== null) return setShown(null);
          setState('loading');
          try {
            setShown(await revealAccountPassword(account.id));
            setState('idle');
          } catch {
            setState('error');
          }
        }}
      >
        {shown === null ? <Eye aria-hidden="true" className="h-4 w-4" /> : <EyeOff aria-hidden="true" className="h-4 w-4" />}
      </Button>
      {state === 'error' && <span className="text-label text-failed-text">Couldn't load</span>}
    </span>
  );
}

/** Add / edit account. Password is write-only: empty keeps the saved one. Delete from here, with confirmation. */
function AccountDialog({ account, accounts, onClose, onDone }: { account?: Account; accounts: Account[]; onClose: () => void; onDone: (status: string) => void }) {
  const project = useProject();
  const [form, setForm] = useState({
    role: account?.role ?? '',
    platformId: account?.platformId ?? project.platforms[0]?.id ?? '',
    environmentId: account?.environmentId ?? project.environments[0]?.id ?? '',
    username: account?.username ?? '',
    password: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' } | { kind: 'saving' } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const [confirm, confirmDialog] = useConfirm();
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const clash = form.role.trim() !== '' && duplicateAccount(accounts, { ...form, id: account?.id }); // BR-ENV-03
  const errors = {
    role: form.role.trim() === '' ? 'Enter a role, e.g. Admin.' : clash ? 'An account for this role, platform and environment already exists.' : undefined,
    username: form.username.trim() === '' ? 'Enter the username.' : undefined,
    password: !account?.hasPassword && form.password === '' ? 'Enter the password.' : undefined,
  };
  const show = (k: keyof typeof errors) => (submitted || (k === 'role' && clash) ? errors[k] : undefined);

  async function save() {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setState({ kind: 'saving' });
    try {
      await saveAccount({ ...(account ? { id: account.id } : {}), projectId: project.id, role: form.role, platformId: form.platformId, environmentId: form.environmentId, username: form.username }, form.password);
      onDone(account ? 'Account saved.' : 'Account added.');
    } catch (e) {
      setState({ kind: 'error', message: e instanceof DuplicateAccountError ? e.message : errorText(e) });
    }
  }

  async function remove() {
    if (!account) return;
    const ok = await confirm({ title: `Delete the ${account.role} account?`, danger: true, confirmLabel: 'Delete account', body: <p>Tests that log in as {account.role} in this platform and environment will no longer find a login.</p> });
    if (!ok) return;
    try {
      await deleteAccount(account.id);
      onDone('Account deleted.');
    } catch (e) {
      setState({ kind: 'error', message: errorText(e) });
    }
  }

  return (
    <Dialog
      title={account ? 'Edit account' : 'Add account'}
      onClose={onClose}
      onSubmit={() => void save()}
      footer={
        <>
          {account && (
            <Button variant="danger" className="mr-auto" onClick={() => void remove()}>
              Delete account
            </Button>
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={state.kind === 'saving'}>
            {state.kind === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Role" required error={show('role')} hint="How tests refer to this login, e.g. Admin, Registered customer.">
          {(p) => <Input {...p} value={form.role} onChange={(e) => set({ role: e.target.value })} />}
        </Field>
        <Field label="Platform" required>
          {(p) => (
            <Select {...p} value={form.platformId} onChange={(e) => set({ platformId: e.target.value })}>
              {project.platforms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Environment" required>
          {(p) => (
            <Select {...p} value={form.environmentId} onChange={(e) => set({ environmentId: e.target.value })}>
              {project.environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Username" required error={show('username')}>
          {(p) => <Input {...p} autoComplete="off" value={form.username} onChange={(e) => set({ username: e.target.value })} />}
        </Field>
        <Field label="Password" required={!account?.hasPassword} error={show('password')}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              placeholder={account?.hasPassword ? 'Saved · leave empty to keep it' : undefined}
              value={form.password}
              onChange={(e) => set({ password: e.target.value })}
            />
          )}
        </Field>
      </div>
      {state.kind === 'error' && (
        <p role="alert" className="mt-4 text-failed-text">
          {state.message}
        </p>
      )}
      {confirmDialog}
    </Dialog>
  );
}
