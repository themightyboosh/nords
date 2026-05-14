/**
 * iconRegistry.test.ts — Unit tests for the icon resolution system.
 *
 * Validates icon lookup, fallback behavior, and the picker data source.
 */

import { describe, it, expect } from 'vitest';
import { resolveIcon, getAvailableIconNames, ICON_MAP, DEFAULT_ICON } from './iconRegistry';

describe('resolveIcon', () => {
  it('resolves a known icon name', () => {
    const icon = resolveIcon('Bug');
    expect(icon).toBe(ICON_MAP['Bug']);
  });

  it('returns DEFAULT_ICON for unknown name', () => {
    expect(resolveIcon('NonExistentIcon')).toBe(DEFAULT_ICON);
  });

  it('returns DEFAULT_ICON for null', () => {
    expect(resolveIcon(null)).toBe(DEFAULT_ICON);
  });

  it('returns DEFAULT_ICON for undefined', () => {
    expect(resolveIcon(undefined)).toBe(DEFAULT_ICON);
  });

  it('returns DEFAULT_ICON for empty string', () => {
    expect(resolveIcon('')).toBe(DEFAULT_ICON);
  });
});

describe('getAvailableIconNames', () => {
  it('returns an array of strings', () => {
    const names = getAvailableIconNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(50);
    expect(typeof names[0]).toBe('string');
  });

  it('includes expected common icons', () => {
    const names = getAvailableIconNames();
    expect(names).toContain('Bug');
    expect(names).toContain('Folder');
    expect(names).toContain('Star');
    expect(names).toContain('Settings');
  });

  it('matches ICON_MAP keys', () => {
    const names = getAvailableIconNames();
    const mapKeys = Object.keys(ICON_MAP);
    expect(names).toEqual(mapKeys);
  });
});

describe('ICON_MAP', () => {
  it('maps every key to a function (React component)', () => {
    for (const [name, component] of Object.entries(ICON_MAP)) {
      expect(typeof component).toBe('object', `${name} should be a Lucide component`);
    }
  });
});
