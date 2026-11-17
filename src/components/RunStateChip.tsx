import { CheckCheck, CircleStop, LoaderCircle, Pause, Unplug } from 'lucide-react';
import type { Run } from '@/data/types';
import { Chip } from '@/components/ui/chip';

/** Run state (screens/06-runs.md 5.4): Running x/y · Paused · Interrupted at x/y · Completed · Stopped at x/y (D55), each with its icon (D80). */
export function RunStateChip({ run }: { run: Pick<Run, 'state' | 'progress' | 'stoppedAt'> }) {
  const at = `${run.progress.done}/${run.progress.total}`;
  if (run.state === 'running')
    return (
      <Chip tone="info" icon={LoaderCircle} className="[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none">
        Running {at}
      </Chip>
    );
  if (run.state === 'paused') return <Chip tone="cc" icon={Pause}>Paused</Chip>;
  if (run.state === 'interrupted') return <Chip tone="cc" icon={Unplug}>Interrupted at {at}</Chip>;
  if (run.stoppedAt) return <Chip icon={CircleStop}>Stopped at {`${run.stoppedAt.done}/${run.stoppedAt.total}`}</Chip>;
  return <Chip icon={CheckCheck}>Completed</Chip>;
}
