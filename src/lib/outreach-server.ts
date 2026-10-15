import { createClient } from '@libsql/client';
import { getTursoConfig } from './env';
import { outreachStore } from './outreach-dispatch';

let store: ReturnType<typeof outreachStore> | undefined;
export function getOutreachStore() {
  if (!store) {
    const { url, authToken } = getTursoConfig();
    store = outreachStore(createClient({ url, authToken }));
  }
  return store;
}
