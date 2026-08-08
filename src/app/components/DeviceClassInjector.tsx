'use client';

import { useEffect } from 'react';
import { applyLowEndClass } from '@/lib/useDeviceCapabilities';

/**
 * Client component that applies the `.is-low-end` CSS class to `<html>`
 * on mount if the device has limited hardware capabilities.
 *
 * Must be rendered inside `<body>` since layout.tsx is a server component.
 */
export default function DeviceClassInjector() {
  useEffect(() => {
    applyLowEndClass();
  }, []);

  return null;
}
