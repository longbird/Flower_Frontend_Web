import { describe, it, expect } from 'vitest';
import { getTheme, themeToStyle, getAllThemes } from '@/lib/branch/themes';
import type { BranchTheme } from '@/lib/branch/themes';

describe('getTheme', () => {
  it('should return green theme for key "green"', () => {
    const theme = getTheme('green');
    expect(theme.key).toBe('green');
    expect(theme.name).toBe('Modern Green');
  });

  it('should return rose theme for key "rose"', () => {
    const theme = getTheme('rose');
    expect(theme.key).toBe('rose');
    expect(theme.name).toBe('Classic Rose');
  });

  it('should return navy theme for key "navy"', () => {
    const theme = getTheme('navy');
    expect(theme.key).toBe('navy');
    expect(theme.name).toBe('Navy Premium');
  });

  it('should default to green theme for invalid key', () => {
    const theme = getTheme('invalid');
    expect(theme.key).toBe('green');
  });

  it('should default to green theme for null', () => {
    const theme = getTheme(null);
    expect(theme.key).toBe('green');
  });

  it('should default to green theme for undefined', () => {
    const theme = getTheme(undefined);
    expect(theme.key).toBe('green');
  });

  it('should default to green theme when called with no argument', () => {
    const theme = getTheme();
    expect(theme.key).toBe('green');
  });

  it('should default to green theme for empty string', () => {
    const theme = getTheme('');
    expect(theme.key).toBe('green');
  });
});

describe('themeToStyle', () => {
  it('should convert theme variables to React CSSProperties object', () => {
    const theme = getTheme('green');
    const style = themeToStyle(theme);

    // Editorial palette uses a warm paper bg for green rather than pure white.
    expect(style['--branch-green' as keyof typeof style]).toBe('#3D6B2E');
    expect(style['--branch-bg' as keyof typeof style]).toBe('#FAFAF6');
    expect(style['--branch-text' as keyof typeof style]).toBe('#1C1C18');
  });

  it('should include all CSS variables from the theme', () => {
    const theme = getTheme('navy');
    const style = themeToStyle(theme);
    const variableKeys = Object.keys(theme.variables);

    for (const key of variableKeys) {
      expect(style[key as keyof typeof style]).toBe(theme.variables[key]);
    }
  });

  it('should produce correct values for rose theme', () => {
    const theme = getTheme('rose');
    const style = themeToStyle(theme);

    // Rose primary deepened to dusty-rose for editorial boutique direction.
    expect(style['--branch-green' as keyof typeof style]).toBe('#A8596E');
    expect(style['--branch-bg' as keyof typeof style]).toBe('#FAF2E9');
    expect(style['--branch-footer-bg' as keyof typeof style]).toBe('#2E1F21');
  });

  it('should return a plain object (not the same reference as theme.variables)', () => {
    const theme = getTheme('green');
    const style = themeToStyle(theme);

    expect(style).not.toBe(theme.variables);
    expect(style).toEqual(theme.variables);
  });
});

describe('getAllThemes', () => {
  it('should return exactly 3 themes', () => {
    const themes = getAllThemes();
    expect(themes).toHaveLength(3);
  });

  it('should return themes in order: green, rose, navy', () => {
    const themes = getAllThemes();
    expect(themes[0].key).toBe('green');
    expect(themes[1].key).toBe('rose');
    expect(themes[2].key).toBe('navy');
  });

  it('should return BranchTheme objects with all required fields', () => {
    const themes = getAllThemes();
    for (const theme of themes) {
      expect(theme).toHaveProperty('key');
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('description');
      expect(theme).toHaveProperty('fontFamily');
      expect(theme).toHaveProperty('headingFontFamily');
      expect(theme).toHaveProperty('serifFontFamily');
      expect(theme).toHaveProperty('variables');
    }
  });

  it('should have unique keys for each theme', () => {
    const themes = getAllThemes();
    const keys = themes.map((t: BranchTheme) => t.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(themes.length);
  });
});
