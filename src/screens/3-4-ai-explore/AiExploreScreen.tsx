import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { listChats } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useProject } from '@/app/projectContext';
import { to } from '@/app/routes';

/** 3.4 AI explore: chat list + chat, inside the AI explore workspace (screens/05-ai-explore.md). Built in Slice 8. */
export function AiExploreScreen() {
  const project = useProject();
  const { chatId } = useParams();
  const [search] = useSearchParams();
  const message = search.get('message');
  // Keep "Back to project" pointing at where AI explore was opened from while moving between chats.
  const state = useLocation().state as unknown;

  return (
    <PlaceholderScreen
      screenId="3.4"
      title={chatId ? `Chat ${chatId}` : 'AI explore'}
      slice={8}
      details={chatId && message !== null ? `Scrolled to message ${message}` : undefined}
    >
      <AsyncPlaceholderLinks
        what="chats"
        load={() => listChats(project.id)}
        deps={[project.id]}
        toLinks={(chats) => chats.map((c) => ({ label: c.title, to: to.exploreChat(project.id, c.id), state }))}
      />
    </PlaceholderScreen>
  );
}
