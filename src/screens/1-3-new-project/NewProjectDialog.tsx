import { PlaceholderDialog } from '@/components/PlaceholderScreen';
import { to } from '@/app/routes';

/** 1.3 New project: dialog over Projects (screens/01-global.md). Built in Slice 2. */
export function NewProjectDialog() {
  return <PlaceholderDialog screenId="1.3" title="New project" slice={2} closeTo={to.projects()} />;
}
