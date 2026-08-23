'use client';

// This module is imported by the splash (layout-level client code) and by
// HomeShell. Keeping one promise avoids a second request while moving the
// WebGL chunk download ahead of HomeShell's first render.
export const moltenModulePromise =
  typeof window !== 'undefined' ? import('./MoltenMetal') : null;
