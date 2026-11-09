import { createHashRouter } from 'react-router-dom';
import { routeTree } from './routeTree';

/** Hash addresses (D26): works in the browser and when Electron loads a local file. */
export const router = createHashRouter(routeTree);
