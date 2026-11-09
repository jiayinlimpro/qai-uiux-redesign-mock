import { useParams } from 'react-router-dom';
import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';

/** 3.2 New / edit test (screens/04-suites.md). Built in Slice 5. */
export function EditTestScreen({ mode }: { mode: 'new' | 'edit' }) {
  const project = useProject();
  const { testId } = useParams();
  return (
    <PlaceholderScreen
      screenId="3.2"
      title={mode === 'new' ? 'New test' : 'Edit test'}
      slice={5}
      links={[
        mode === 'edit' && testId
          ? { label: 'Cancel (back to the test)', to: to.suiteTest(project.id, testId) }
          : { label: 'Cancel (back to Suites)', to: to.suites(project.id) },
      ]}
    />
  );
}
