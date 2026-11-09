import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';

/** 1.4 Project overview (screens/02-project.md). Built in Slice 8. */
export function OverviewScreen() {
  const project = useProject();
  return <PlaceholderScreen screenId="1.4" title={project.name} slice={8} details="Project overview" />;
}
