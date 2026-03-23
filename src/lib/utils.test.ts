import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils formatting', () => {
  it('merges tailwind classes using cn() correctly', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('p-4', null, undefined, 'm-4')).toBe('p-4 m-4');
  });
});
