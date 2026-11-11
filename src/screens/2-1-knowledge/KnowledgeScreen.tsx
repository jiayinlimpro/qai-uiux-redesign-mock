import { listKnowledge, listLibraryTests, listSuites } from '@/data/api';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { useAsync } from '@/app/hooks/useAsync';
import { useProject } from '@/app/projectContext';
import { SectionAnchors } from '@/components/SectionAnchors';
import { DocumentsSection, SkillsSection } from './KnowledgeItemsSections';

const anchors = [
  { id: 'documents', label: 'Documents' },
  { id: 'skills', label: 'Skills' },
];

/**
 * 2.1 Knowledge (screens/03-knowledge.md): what the AI may read for this project: documents and skills, each applying
 * project-wide, to a suite or to a test. Platforms, environments and accounts moved to 2.4 Environments (D72).
 */
export function KnowledgeScreen() {
  const project = useProject();
  const data = useAsync(async () => {
    const [items, suites, tests] = await Promise.all([listKnowledge(project.id), listSuites(project.id), listLibraryTests(project.id)]);
    return { items, suites, tests };
  }, [project.id], { keepPrevious: true });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6">
      <h1 className="text-h1">Knowledge</h1>
      <p className="text-text-muted">What the AI reads for this project. Each item can apply project-wide, to a suite, or to a test.</p>
      <SectionAnchors label="Knowledge sections" anchors={anchors} />

      <div className="mt-5 flex flex-col gap-5">
        {data.status === 'loading' && <LoadingState label="Loading knowledge…" />}
        {data.status === 'error' && <ErrorState title="Couldn't load knowledge" message={data.error.message} onRetry={data.retry} />}
        {data.status === 'ready' && (
          <>
            <DocumentsSection items={data.data.items} suites={data.data.suites} tests={data.data.tests} onChanged={data.retry} />
            <SkillsSection items={data.data.items} suites={data.data.suites} tests={data.data.tests} onChanged={data.retry} />
          </>
        )}
      </div>
    </div>
  );
}
