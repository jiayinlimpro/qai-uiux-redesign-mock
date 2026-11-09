import { Outlet } from 'react-router-dom';
import { listProjects } from '@/data/api';
import { AsyncPlaceholderLinks, PlaceholderScreen } from '@/components/PlaceholderScreen';
import { to } from '@/app/routes';

/** 1.2 Projects (screens/01-global.md). Placeholder; the table is built in Slice 2. Renders 1.3 New project as a child route. */
export function ProjectsScreen() {
  return (
    <PlaceholderScreen screenId="1.2" title="Projects" slice={2}>
      <AsyncPlaceholderLinks
        what="projects"
        load={listProjects}
        deps={[]}
        toLinks={(projects) => [
          ...projects.map((p) => ({ label: `Open ${p.name}`, to: to.overview(p.id) })),
          { label: 'New project', to: to.newProject() },
          { label: 'Welcome setup (first launch)', to: to.welcome() },
        ]}
      />
      <Outlet />
    </PlaceholderScreen>
  );
}
