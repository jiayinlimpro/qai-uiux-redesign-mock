import { Navigate, type RouteObject } from 'react-router-dom';
import { paths, to } from './routes';
import type { RouteHandle } from './routeHandle';
import { ProjectsShell } from './shell/ProjectsShell';
import { ProjectShell } from './shell/ProjectShell';
import { ExploreWorkspace } from './shell/ExploreWorkspace';
import { RunRoute } from './RunRoute';
import { NotFound } from './NotFound';
import { RouteError } from './RouteError';
import { FirstLaunchGate, SettingsRoot } from './settings';
import { WelcomeScreen } from '@/screens/1-1-welcome/WelcomeScreen';
import { ProjectsScreen } from '@/screens/1-2-projects/ProjectsScreen';
import { NewProjectDialog } from '@/screens/1-3-new-project/NewProjectDialog';
import { GlobalSettingsScreen } from '@/screens/2-3-global-settings/GlobalSettingsScreen';
import { OverviewScreen } from '@/screens/1-4-overview/OverviewScreen';
import { KnowledgeScreen } from '@/screens/2-1-knowledge/KnowledgeScreen';
import { EnvironmentsScreen } from '@/screens/2-4-environments/EnvironmentsScreen';
import { ProjectSettingsScreen } from '@/screens/2-2-project-settings/ProjectSettingsScreen';
import { NoTestSelected, SuitesScreen } from '@/screens/3-1-suites/SuitesScreen';
import { TestDetail } from '@/screens/3-1-suites/TestDetail';
import { EditTestScreen } from '@/screens/3-2-edit-test/EditTestScreen';
import { ImportDialog } from '@/screens/3-3-import/ImportDialog';
import { AiExploreScreen } from '@/screens/3-4-ai-explore/AiExploreScreen';
import { RunsScreen } from '@/screens/5-4-runs/RunsScreen';

const handle = (h: RouteHandle) => h;

/**
 * Screens and routes from docs/03-navigation.md. Paths come only from routes.ts (D26).
 * Dialog routes (1.3 New project, 3.3 Import) are children of the screen they open over.
 * Pathless roots: SettingsRoot loads global settings (+ error view so a crashing screen never leaves a blank window);
 * FirstLaunchGate sends every screen to Welcome while no AI provider exists (03 · First launch).
 */
const screens: RouteObject[] = [
  { path: '/', element: <Navigate to={to.projects()} replace /> },
  { path: paths.welcome, element: <WelcomeScreen /> },
  { path: paths.globalSettings, element: <GlobalSettingsScreen /> },
  {
    element: <ProjectsShell />,
    children: [
      {
        path: paths.projects,
        element: <ProjectsScreen />,
        children: [{ path: paths.newProject, element: <NewProjectDialog /> }],
      },
    ],
  },
  {
    path: paths.overview,
    element: <ProjectShell />,
    children: [
      { index: true, element: <OverviewScreen />, handle: handle({ section: 'overview' }) },
      { path: paths.environments, element: <EnvironmentsScreen />, handle: handle({ section: 'environments' }) },
      { path: paths.knowledge, element: <KnowledgeScreen />, handle: handle({ section: 'knowledge' }) },
      { path: paths.projectSettings, element: <ProjectSettingsScreen />, handle: handle({ section: 'project-settings' }) },
      {
        path: paths.suites,
        element: <SuitesScreen />,
        handle: handle({ section: 'suites' }),
        children: [
          { index: true, element: <NoTestSelected /> },
          { path: paths.importTests, element: <ImportDialog /> },
          { path: paths.suiteTest, element: <TestDetail /> },
        ],
      },
      { path: paths.newTest, element: <EditTestScreen mode="new" />, handle: handle({ section: 'suites', crumb: 'New test' }) },
      { path: paths.editTest, element: <EditTestScreen mode="edit" />, handle: handle({ section: 'suites', crumb: 'Edit test' }) },
      { path: paths.runs, element: <RunsScreen />, handle: handle({ section: 'runs' }) },
      { path: paths.run, element: <RunRoute />, handle: handle({ section: 'runs' }) },
    ],
  },
  {
    path: paths.explore,
    element: <ExploreWorkspace />,
    children: [
      { index: true, element: <AiExploreScreen /> },
      { path: paths.exploreChat, element: <AiExploreScreen /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];

export const routeTree: RouteObject[] = [
  { element: <SettingsRoot />, errorElement: <RouteError />, children: [{ element: <FirstLaunchGate />, children: screens }] },
];
