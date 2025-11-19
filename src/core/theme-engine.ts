/**
 * Theme Engine
 * Manages theme loading, switching, and customization
 */

import type { Theme, ThemeName } from '../types';

export interface ThemeInfo {
  name: ThemeName;
  displayName: string;
  variant: 'light' | 'dark';
  preview?: string;
}

export class ThemeEngine {
  private currentTheme: Theme | null = null;
  private cache: Map<ThemeName, Theme> = new Map();

  /**
   * Load theme by name
   */
  async loadTheme(themeName: ThemeName): Promise<Theme> {
    // Check cache
    if (this.cache.has(themeName)) {
      return this.cache.get(themeName)!;
    }

    try {
      // Dynamically import theme definition
      const themeModule = await import(`../themes/${themeName}.ts`);
      const theme = themeModule.default;

      // Cache theme
      this.cache.set(themeName, theme);

      return theme;
    } catch (error) {
      console.error(`[ThemeEngine] Failed to load theme ${themeName}:`, error);
      // Fallback to github-light
      if (themeName !== 'github-light') {
        return this.loadTheme('github-light');
      }
      throw error;
    }
  }

  /**
   * Apply theme to document
   */
  async applyTheme(theme: Theme | ThemeName): Promise<void> {
    console.log(`[ThemeEngine] applyTheme called with:`, typeof theme === 'string' ? theme : theme.name);
    
    // Load theme if name provided
    const themeObj = typeof theme === 'string' ? await this.loadTheme(theme) : theme;
    console.log(`[ThemeEngine] Theme loaded/resolved:`, themeObj.name);

    // Get user preferences for overrides (from storage, if available)
    // Since ThemeEngine runs in content script, we need to fetch preferences.
    // However, for performance, we might rely on preferences being passed or fetched separately.
    // For this implementation, we'll try to fetch from storage if possible, but ideally applyTheme receives overrides.
    
    // Fetch overrides from storage
    let overrides: Partial<Theme['typography']> & { maxWidth?: number, useMaxWidth?: boolean } = {};
    try {
        const storage = await chrome.storage.sync.get('preferences');
        if (storage.preferences) {
            const p = storage.preferences;
            if (p.fontFamily) overrides.fontFamily = p.fontFamily;
            if (p.codeFontFamily) overrides.codeFontFamily = p.codeFontFamily;
            if (p.lineHeight) overrides.baseLineHeight = p.lineHeight;
            if (p.maxWidth) overrides.maxWidth = p.maxWidth;
            overrides.useMaxWidth = p.useMaxWidth;
        }
    } catch (e) {
        console.warn('[ThemeEngine] Failed to load preference overrides', e);
    }

    // Compile to CSS variables with overrides
    const cssVars = this.compileToCSSVariables(themeObj, overrides);
    
    // Apply transition class
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    
    // Update CSS variables on both :root and documentElement for immediate effect
    console.log(`[ThemeEngine] Applying ${Object.keys(cssVars).length} CSS variables to :root and html`);
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
      // Force immediate style recalculation for critical color variables
      if (key === '--md-bg' || key === '--md-fg') {
        document.documentElement.style.setProperty(key, value);
        document.body.style.setProperty(key, value);
      }
    });

    // Apply max-width logic
    if (overrides.useMaxWidth) {
         // If "Use Full Width" is checked, set max-width to none or 100%
         root.style.setProperty('--md-max-width', '100%');
    } else if (overrides.maxWidth) {
        // Apply custom max-width if set
        root.style.setProperty('--md-max-width', `${overrides.maxWidth}px`);
    } else {
         // Default
         root.style.setProperty('--md-max-width', '980px'); 
    }
    
    // Set data attributes
    root.setAttribute('data-theme', themeObj.name);
    root.setAttribute('data-theme-variant', themeObj.variant);

    // Apply background color directly to body and html to prevent white flash
    document.documentElement.style.backgroundColor = themeObj.colors.background;
    document.body.style.backgroundColor = themeObj.colors.background;
    document.documentElement.style.color = themeObj.colors.foreground;
    document.body.style.color = themeObj.colors.foreground;
    
    // Update syntax theme
    console.log(`[ThemeEngine] Updating syntax theme to: ${themeObj.syntaxTheme}`);
    await this.updateSyntaxTheme(themeObj.syntaxTheme);

    // Update mermaid theme
    try {
      const { mermaidRenderer } = await import('../renderers/mermaid-renderer');
      mermaidRenderer.updateTheme(themeObj.mermaidTheme);
    } catch (error) {
      console.error('[ThemeEngine] Failed to update mermaid theme:', error);
    }
    
    // Remove transition class after a brief moment (non-blocking)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-transitioning');
      });
    });
    
    // Save current theme
    this.currentTheme = themeObj;
    
    console.log(`[ThemeEngine] Successfully applied theme: ${themeObj.name}`);
  }

  /**
   * Get currently applied theme
   */
  getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  /**
   * Get list of available themes
   */
  getAvailableThemes(): ThemeInfo[] {
    return [
      { name: 'github-light', displayName: 'GitHub Light', variant: 'light' },
      { name: 'github-dark', displayName: 'GitHub Dark', variant: 'dark' },
      { name: 'catppuccin-latte', displayName: 'Catppuccin Latte', variant: 'light' },
      { name: 'catppuccin-frappe', displayName: 'Catppuccin Frappé', variant: 'light' },
      { name: 'catppuccin-macchiato', displayName: 'Catppuccin Macchiato', variant: 'dark' },
      { name: 'catppuccin-mocha', displayName: 'Catppuccin Mocha', variant: 'dark' },
      { name: 'monokai', displayName: 'Monokai', variant: 'dark' },
      { name: 'monokai-pro', displayName: 'Monokai Pro', variant: 'dark' },
    ];
  }

  /**
   * Watch system theme preference
   */
  watchSystemTheme(callback: (isDark: boolean) => void): () => void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      callback(e.matches);
    };

    // Initial call
    handler(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);

    // Return cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }

  /**
   * Compile theme to CSS variables
   */
  compileToCSSVariables(theme: Theme, overrides: Partial<Theme['typography']> = {}): Record<string, string> {
    return {
      // Colors
      '--md-bg': theme.colors.background,
      '--md-bg-secondary': theme.colors.backgroundSecondary,
      '--md-bg-tertiary': theme.colors.backgroundTertiary,
      '--md-fg': theme.colors.foreground,
      '--md-fg-secondary': theme.colors.foregroundSecondary,
      '--md-fg-muted': theme.colors.foregroundMuted,
      '--md-primary': theme.colors.primary,
      '--md-secondary': theme.colors.secondary,
      '--md-accent': theme.colors.accent,
      '--md-heading': theme.colors.heading,
      '--md-link': theme.colors.link,
      '--md-link-hover': theme.colors.linkHover,
      '--md-link-visited': theme.colors.linkVisited,
      '--md-code-bg': theme.colors.codeBackground,
      '--md-code-text': theme.colors.codeText,
      '--md-code-keyword': theme.colors.codeKeyword,
      '--md-code-string': theme.colors.codeString,
      '--md-code-comment': theme.colors.codeComment,
      '--md-code-function': theme.colors.codeFunction,
      '--md-border': theme.colors.border,
      '--md-border-light': theme.colors.borderLight,
      '--md-border-heavy': theme.colors.borderHeavy,
      '--md-selection': theme.colors.selection,
      '--md-highlight': theme.colors.highlight,
      '--md-shadow': theme.colors.shadow,
      '--md-success': theme.colors.success,
      '--md-warning': theme.colors.warning,
      '--md-error': theme.colors.error,
      '--md-info': theme.colors.info,

      // Typography (with overrides)
      '--md-font-family': overrides.fontFamily || theme.typography.fontFamily,
      '--md-font-family-heading': theme.typography.headingFontFamily || overrides.fontFamily || theme.typography.fontFamily,
      '--md-font-family-code': overrides.codeFontFamily || theme.typography.codeFontFamily,
      '--md-font-size': theme.typography.baseFontSize,
      '--md-line-height': (overrides.baseLineHeight || theme.typography.baseLineHeight).toString(),
      '--md-h1-size': theme.typography.h1Size,
      '--md-h2-size': theme.typography.h2Size,
      '--md-h3-size': theme.typography.h3Size,
      '--md-h4-size': theme.typography.h4Size,
      '--md-h5-size': theme.typography.h5Size,
      '--md-h6-size': theme.typography.h6Size,
      '--md-font-weight': theme.typography.fontWeightNormal.toString(),
      '--md-font-weight-bold': theme.typography.fontWeightBold.toString(),
      '--md-heading-font-weight': theme.typography.headingFontWeight.toString(),

      // Spacing
      '--md-block-margin': theme.spacing.blockMargin,
      '--md-paragraph-margin': theme.spacing.paragraphMargin,
      '--md-list-item-margin': theme.spacing.listItemMargin,
      '--md-heading-margin': theme.spacing.headingMargin,
      '--md-code-block-padding': theme.spacing.codeBlockPadding,
      '--md-table-cell-padding': theme.spacing.tableCellPadding,
    };
  }

  /**
   * Update syntax highlighting theme
   */
  private async updateSyntaxTheme(syntaxTheme: string): Promise<void> {
    try {
      const { syntaxHighlighter } = await import('../renderers/syntax-highlighter');
      await syntaxHighlighter.setTheme(syntaxTheme);
    } catch (error) {
      console.error('[ThemeEngine] Failed to update syntax theme:', error);
    }
  }
}

// Export singleton
export const themeEngine = new ThemeEngine();

