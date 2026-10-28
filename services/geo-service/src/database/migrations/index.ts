import { GeoInit1793219072190 } from './1793219072190-GeoInit';
import { OutboxRetryColumns1793219100000 } from './1793219100000-OutboxRetryColumns';

/** Explicit list: the services run from TypeScript source, so a glob would not match built files. */
export const migrations = [GeoInit1793219072190, OutboxRetryColumns1793219100000];
