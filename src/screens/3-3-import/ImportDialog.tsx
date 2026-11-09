import { PlaceholderDialog } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';

/** 3.3 Import: dialog over Suites (screens/04-suites.md). Built in Slice 5. */
export function ImportDialog() {
  const project = useProject();
  return <PlaceholderDialog screenId="3.3" title="Import tests" slice={5} closeTo={to.suites(project.id)} />;
}
