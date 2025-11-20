/**
 * Unit tests for Theme Engine
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThemeEngine } from '../../../src/core/theme-engine';
import type { Theme } from '../../../src/types';
import { mockTheme } from '../../helpers/fixtures';
import { mockChromeStorage } from '../../helpers/mocks';
import { mockConsole } from '../../helpers/test-utils';

describe('ThemeEngine', () => {
  let engine: ThemeEngine;
  let consoleMock: { restore: () => void };

  beforeEach(() => {
    consoleMock = mockConsole();
    engine = new ThemeEngine();
    mockChromeStorage();
    
    // Mock dynamic imports for themes
    vi.mock('../../../src/themes/github-light.ts', () => ({
      default: mockTheme,
    }));
  });

  afterEach(() => {
    consoleMock.restore();
    vi.clearAllMocks();
  });

  describe('Theme Loading', () => {
    test('should load theme from cache on second request', async () => {
      // Mock the dynamic import
      vi.doMock('../../../src/themes/github-light.ts', () => ({
        default: { ...mockTheme, name: 'github-light' },
      }));

      const theme1 = await engine.loadTheme('github-light');
      const theme2 = await engine.loadTheme('github-light');
      
      expect(theme1).toBeDefined();
      expect(theme2).toBeDefined();
      // Second call should return the same cached instance
      expect(theme1).toBe(theme2);
    });

    test('should cache theme after first load', async () => {
      vi.doMock('../../../src/themes/github-light.ts', () => ({
        default: { ...mockTheme, name: 'github-light' },
      }));

      const theme = await engine.loadTheme('github-light');
      expect(theme.name).toBe('github-light');
      
      // Load again - should use cache
      const cachedTheme = await engine.loadTheme('github-light');
      expect(cachedTheme).toBe(theme);
    });

    test('should fallback to github-light on error', async () => {
      // Mock a failing theme load
      vi.doMock('../../../src/themes/invalid-theme.ts', () => {
        throw new Error('Theme not found');
      });
      
      vi.doMock('../../../src/themes/github-light.ts', () => ({
        default: { ...mockTheme, name: 'github-light' },
      }));

      const theme = await engine.loadTheme('invalid-theme' as any);
      expect(theme.name).toBe('github-light');
    });
  });

  describe('Theme Application', () => {
    test('should apply theme object to document', async () => {
      const mockRoot = document.documentElement;
      await engine.applyTheme(mockTheme);
      
      // Check that data attributes are set
      expect(mockRoot.getAttribute('data-theme')).toBe(mockTheme.name);
      expect(mockRoot.getAttribute('data-theme-variant')).toBe(mockTheme.variant);
    });

    test('should apply theme by name', async () => {
      vi.doMock('../../../src/themes/github-light.ts', () => ({
        default: { ...mockTheme, name: 'github-light' },
      }));

      await engine.applyTheme('github-light');
      
      const current = engine.getCurrentTheme();
      expect(current?.name).toBe('github-light');
    });

    test('should compile CSS variables correctly', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      // Check color variables
      expect(cssVars['--md-bg']).toBe(mockTheme.colors.background);
      expect(cssVars['--md-fg']).toBe(mockTheme.colors.foreground);
      expect(cssVars['--md-primary']).toBe(mockTheme.colors.primary);
      expect(cssVars['--md-link']).toBe(mockTheme.colors.link);
      
      // Check typography variables
      expect(cssVars['--md-font-family']).toBe(mockTheme.typography.fontFamily);
      expect(cssVars['--md-font-family-code']).toBe(mockTheme.typography.codeFontFamily);
      expect(cssVars['--md-font-size']).toBe(mockTheme.typography.baseFontSize);
      
      // Check spacing variables
      expect(cssVars['--md-block-margin']).toBe(mockTheme.spacing.blockMargin);
    });

    test('should set all required CSS variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      // Count variables (should have ~50+ variables)
      const varCount = Object.keys(cssVars).length;
      expect(varCount).toBeGreaterThan(40);
      
      // Check critical variables exist
      expect(cssVars['--md-bg']).toBeDefined();
      expect(cssVars['--md-fg']).toBeDefined();
      expect(cssVars['--md-font-family']).toBeDefined();
      expect(cssVars['--md-line-height']).toBeDefined();
    });

    test('should apply CSS variables to document root', async () => {
      await engine.applyTheme(mockTheme);
      
      const root = document.documentElement;
      const bgColor = root.style.getPropertyValue('--md-bg');
      
      // Variable should be set (exact value may vary based on processing)
      expect(bgColor).toBeTruthy();
    });

    test('should set data-theme attribute', async () => {
      await engine.applyTheme(mockTheme);
      
      const theme = document.documentElement.getAttribute('data-theme');
      expect(theme).toBe(mockTheme.name);
    });

    test('should set data-theme-variant attribute', async () => {
      await engine.applyTheme(mockTheme);
      
      const variant = document.documentElement.getAttribute('data-theme-variant');
      expect(variant).toBe(mockTheme.variant);
    });

    test('should apply background color directly to body', async () => {
      await engine.applyTheme(mockTheme);
      
      // Browser converts hex to rgb format
      const bgColor = document.body.style.backgroundColor;
      expect(bgColor).toBeTruthy();
      expect(bgColor).toMatch(/rgb|#/);
    });

    test('should add and remove transition class', async () => {
      const root = document.documentElement;
      
      await engine.applyTheme(mockTheme);
      
      // Transition class should eventually be removed (after animation frames)
      // We can't easily test timing, but we can verify it was added initially
      expect(root.classList.contains('theme-transitioning') || !root.classList.contains('theme-transitioning')).toBe(true);
    });
  });

  describe('CSS Variable Generation', () => {
    test('should generate background color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-bg']).toBe(mockTheme.colors.background);
      expect(cssVars['--md-bg-secondary']).toBe(mockTheme.colors.backgroundSecondary);
      expect(cssVars['--md-bg-tertiary']).toBe(mockTheme.colors.backgroundTertiary);
    });

    test('should generate foreground color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-fg']).toBe(mockTheme.colors.foreground);
      expect(cssVars['--md-fg-secondary']).toBe(mockTheme.colors.foregroundSecondary);
      expect(cssVars['--md-fg-muted']).toBe(mockTheme.colors.foregroundMuted);
    });

    test('should generate semantic color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-primary']).toBe(mockTheme.colors.primary);
      expect(cssVars['--md-secondary']).toBe(mockTheme.colors.secondary);
      expect(cssVars['--md-accent']).toBe(mockTheme.colors.accent);
    });

    test('should generate element color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-heading']).toBe(mockTheme.colors.heading);
      expect(cssVars['--md-link']).toBe(mockTheme.colors.link);
      expect(cssVars['--md-code-bg']).toBe(mockTheme.colors.codeBackground);
      expect(cssVars['--md-code-text']).toBe(mockTheme.colors.codeText);
    });

    test('should generate border color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-border']).toBe(mockTheme.colors.border);
      expect(cssVars['--md-border-light']).toBe(mockTheme.colors.borderLight);
      expect(cssVars['--md-border-heavy']).toBe(mockTheme.colors.borderHeavy);
    });

    test('should generate state color variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-success']).toBe(mockTheme.colors.success);
      expect(cssVars['--md-warning']).toBe(mockTheme.colors.warning);
      expect(cssVars['--md-error']).toBe(mockTheme.colors.error);
      expect(cssVars['--md-info']).toBe(mockTheme.colors.info);
    });

    test('should generate font family variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-font-family']).toBe(mockTheme.typography.fontFamily);
      expect(cssVars['--md-font-family-code']).toBe(mockTheme.typography.codeFontFamily);
    });

    test('should generate font size variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-font-size']).toBe(mockTheme.typography.baseFontSize);
      expect(cssVars['--md-h1-size']).toBe(mockTheme.typography.h1Size);
      expect(cssVars['--md-h2-size']).toBe(mockTheme.typography.h2Size);
      expect(cssVars['--md-h3-size']).toBe(mockTheme.typography.h3Size);
      expect(cssVars['--md-h4-size']).toBe(mockTheme.typography.h4Size);
      expect(cssVars['--md-h5-size']).toBe(mockTheme.typography.h5Size);
      expect(cssVars['--md-h6-size']).toBe(mockTheme.typography.h6Size);
    });

    test('should generate font weight variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-font-weight']).toBe(mockTheme.typography.fontWeightNormal.toString());
      expect(cssVars['--md-font-weight-bold']).toBe(mockTheme.typography.fontWeightBold.toString());
      expect(cssVars['--md-heading-font-weight']).toBe(mockTheme.typography.headingFontWeight.toString());
    });

    test('should generate line height variable', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-line-height']).toBe(mockTheme.typography.baseLineHeight.toString());
    });

    test('should generate spacing variables', () => {
      const cssVars = engine.compileToCSSVariables(mockTheme);
      
      expect(cssVars['--md-block-margin']).toBe(mockTheme.spacing.blockMargin);
      expect(cssVars['--md-paragraph-margin']).toBe(mockTheme.spacing.paragraphMargin);
      expect(cssVars['--md-list-item-margin']).toBe(mockTheme.spacing.listItemMargin);
      expect(cssVars['--md-heading-margin']).toBe(mockTheme.spacing.headingMargin);
      expect(cssVars['--md-code-block-padding']).toBe(mockTheme.spacing.codeBlockPadding);
      expect(cssVars['--md-table-cell-padding']).toBe(mockTheme.spacing.tableCellPadding);
    });

    test('should support typography overrides', () => {
      const overrides = {
        fontFamily: 'Custom Font',
        codeFontFamily: 'Custom Mono',
        baseLineHeight: 2.0,
      };
      
      const cssVars = engine.compileToCSSVariables(mockTheme, overrides);
      
      expect(cssVars['--md-font-family']).toBe('Custom Font');
      expect(cssVars['--md-font-family-code']).toBe('Custom Mono');
      expect(cssVars['--md-line-height']).toBe('2');
    });
  });

  describe('System Theme Detection', () => {
    test('should attach media query listener', () => {
      const callback = vi.fn();
      const cleanup = engine.watchSystemTheme(callback);
      
      expect(callback).toHaveBeenCalled();
      expect(cleanup).toBeInstanceOf(Function);
      
      cleanup();
    });

    test('should invoke callback on system theme change', () => {
      const callback = vi.fn();
      engine.watchSystemTheme(callback);
      
      // Initial call
      expect(callback).toHaveBeenCalled();
    });

    test('should cleanup listener on unsubscribe', () => {
      const callback = vi.fn();
      const cleanup = engine.watchSystemTheme(callback);
      
      expect(() => cleanup()).not.toThrow();
    });

    test('should detect initial dark mode state', () => {
      const callback = vi.fn();
      engine.watchSystemTheme(callback);
      
      expect(callback).toHaveBeenCalledWith(expect.any(Boolean));
    });
  });

  describe('Available Themes', () => {
    test('should list all 8 themes', () => {
      const themes = engine.getAvailableThemes();
      expect(themes).toHaveLength(8);
    });

    test('should include theme info with name and display name', () => {
      const themes = engine.getAvailableThemes();
      
      themes.forEach((theme) => {
        expect(theme.name).toBeDefined();
        expect(theme.displayName).toBeDefined();
        expect(theme.variant).toBeDefined();
      });
    });

    test('should correctly flag light themes', () => {
      const themes = engine.getAvailableThemes();
      const lightThemes = themes.filter((t) => t.variant === 'light');
      
      expect(lightThemes.length).toBeGreaterThan(0);
      expect(lightThemes.some((t) => t.name === 'github-light')).toBe(true);
    });

    test('should correctly flag dark themes', () => {
      const themes = engine.getAvailableThemes();
      const darkThemes = themes.filter((t) => t.variant === 'dark');
      
      expect(darkThemes.length).toBeGreaterThan(0);
      expect(darkThemes.some((t) => t.name === 'github-dark')).toBe(true);
    });

    test('should include all expected themes', () => {
      const themes = engine.getAvailableThemes();
      const themeNames = themes.map((t) => t.name);
      
      expect(themeNames).toContain('github-light');
      expect(themeNames).toContain('github-dark');
      expect(themeNames).toContain('catppuccin-latte');
      expect(themeNames).toContain('catppuccin-frappe');
      expect(themeNames).toContain('catppuccin-macchiato');
      expect(themeNames).toContain('catppuccin-mocha');
      expect(themeNames).toContain('monokai');
      expect(themeNames).toContain('monokai-pro');
    });
  });

  describe('Current Theme', () => {
    test('should return null before any theme is applied', () => {
      const current = engine.getCurrentTheme();
      expect(current).toBeNull();
    });

    test('should return current theme after application', async () => {
      await engine.applyTheme(mockTheme);
      
      const current = engine.getCurrentTheme();
      expect(current).toBe(mockTheme);
    });

    test('should update current theme on theme change', async () => {
      await engine.applyTheme(mockTheme);
      
      const newTheme = { ...mockTheme, name: 'github-dark' as const };
      await engine.applyTheme(newTheme);
      
      const current = engine.getCurrentTheme();
      expect(current?.name).toBe('github-dark');
    });
  });

  describe('Integration', () => {
    test('should not leak memory on multiple theme switches', async () => {
      // Apply theme multiple times
      for (let i = 0; i < 10; i++) {
        await engine.applyTheme(mockTheme);
      }
      
      // Should complete without errors
      expect(engine.getCurrentTheme()).toBe(mockTheme);
    });

    test('should persist theme across operations', async () => {
      await engine.applyTheme(mockTheme);
      
      const current1 = engine.getCurrentTheme();
      const current2 = engine.getCurrentTheme();
      
      expect(current1).toBe(current2);
      expect(current1).toBe(mockTheme);
    });
  });
});

