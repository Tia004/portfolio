'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import type { HugeiconsIconProps } from '@hugeicons/react';

/**
 * TiaIcon — wrapper around HugeiconsIcon with sensible defaults:
 * - color="currentColor" (inherits from parent text color)
 * - strokeWidth={1.5} (clean, balanced stroke for the Tia brand)
 *
 * Override any prop as needed. All HugeiconsIconProps are supported.
 *
 * @example
 *   <TiaIcon icon={Mail01Icon} size={18} />
 *   <TiaIcon icon={Cancel01Icon} size={24} strokeWidth={2} />
 */
export default function TiaIcon({
  color = 'currentColor',
  strokeWidth = 1.5,
  ...rest
}: HugeiconsIconProps) {
  return (
    <HugeiconsIcon color={color} strokeWidth={strokeWidth} {...rest} />
  );
}
