import { createHashRouter } from 'react-router-dom';
import { BlankShell } from './BlankShell';

/**
 * Hash addresses (#/p/...) so the app works in the browser and when Electron loads a local file (D26).
 * Route paths come from ./routes.ts. Slice 0: every path renders the blank shell; Slice 1 adds the screens.
 */
export const router = createHashRouter([{ path: '*', element: <BlankShell /> }]);
