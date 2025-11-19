/**
 * Syntax Highlighter
 * Applies syntax highlighting to code blocks using Highlight.js
 */

import hljs from 'highlight.js/lib/core';
import { debug } from '../utils/debug-logger';

// Import common languages immediately
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

export interface HighlightResult {
  html: string;
  language: string;
  relevance: number;
}

export interface DetectionResult {
  language: string;
  relevance: number;
  secondBest?: {
    language: string;
    relevance: number;
  };
}

/**
 * Syntax Highlighter Class
 */
export class SyntaxHighlighter {
  private loadedLanguages: Set<string> = new Set();
  private languageAliases: Map<string, string> = new Map([
    ['js', 'javascript'],
    ['ts', 'typescript'],
    ['py', 'python'],
    ['sh', 'bash'],
    ['yml', 'yaml'],
    ['md', 'markdown'],
  ]);

  // Map of language module loaders
  private languageModules: Record<string, () => Promise<any>> = {
    go: () => import('highlight.js/lib/languages/go'),
    rust: () => import('highlight.js/lib/languages/rust'),
    java: () => import('highlight.js/lib/languages/java'),
    cpp: () => import('highlight.js/lib/languages/cpp'),
    c: () => import('highlight.js/lib/languages/c'),
    csharp: () => import('highlight.js/lib/languages/csharp'),
    ruby: () => import('highlight.js/lib/languages/ruby'),
    php: () => import('highlight.js/lib/languages/php'),
    sql: () => import('highlight.js/lib/languages/sql'),
    yaml: () => import('highlight.js/lib/languages/yaml'),
    xml: () => import('highlight.js/lib/languages/xml'),
    html: () => import('highlight.js/lib/languages/xml'),
    css: () => import('highlight.js/lib/languages/css'),
    scss: () => import('highlight.js/lib/languages/scss'),
    markdown: () => import('highlight.js/lib/languages/markdown'),
    dockerfile: () => import('highlight.js/lib/languages/dockerfile'),
    nginx: () => import('highlight.js/lib/languages/nginx'),
    apache: () => import('highlight.js/lib/languages/apache'),
    perl: () => import('highlight.js/lib/languages/perl'),
    r: () => import('highlight.js/lib/languages/r'),
    swift: () => import('highlight.js/lib/languages/swift'),
    kotlin: () => import('highlight.js/lib/languages/kotlin'),
    scala: () => import('highlight.js/lib/languages/scala'),
    haskell: () => import('highlight.js/lib/languages/haskell'),
    lua: () => import('highlight.js/lib/languages/lua'),
    vim: () => import('highlight.js/lib/languages/vim'),
    diff: () => import('highlight.js/lib/languages/diff'),
    makefile: () => import('highlight.js/lib/languages/makefile'),
    ini: () => import('highlight.js/lib/languages/ini'),
    properties: () => import('highlight.js/lib/languages/properties'),
  };

  constructor() {
    // Register common languages immediately
    hljs.registerLanguage('javascript', javascript);
    hljs.registerLanguage('typescript', typescript);
    hljs.registerLanguage('python', python);
    hljs.registerLanguage('bash', bash);
    hljs.registerLanguage('json', json);

    this.loadedLanguages.add('javascript');
    this.loadedLanguages.add('typescript');
    this.loadedLanguages.add('python');
    this.loadedLanguages.add('bash');
    this.loadedLanguages.add('json');

    // Configure highlight.js
    hljs.configure({
      classPrefix: 'hljs-',
      ignoreUnescapedHTML: true,
    });
  }

  /**
   * Highlight code with specified language
   */
  async highlight(code: string, language: string): Promise<HighlightResult> {
    // Normalize language name
    const normalizedLang = this.normalizeLanguage(language);

    // Load language if not already loaded
    await this.loadLanguage(normalizedLang);

    try {
      // Check if language is available
      if (hljs.getLanguage(normalizedLang)) {
        const result = hljs.highlight(code, {
          language: normalizedLang,
          ignoreIllegals: true,
        });

        return {
          html: result.value,
          language: normalizedLang,
          relevance: result.relevance || 0,
        };
      } else {
        // Fallback: auto-detect
        return await this.highlightAuto(code);
      }
    } catch (error) {
      console.error(`[SyntaxHighlighter] Error highlighting ${normalizedLang}:`, error);
      // Return unformatted code
      return {
        html: this.escapeHtml(code),
        language: 'plaintext',
        relevance: 0,
      };
    }
  }

  /**
   * Auto-detect and highlight code
   */
  async highlightAuto(code: string): Promise<HighlightResult> {
    try {
      const result = hljs.highlightAuto(code);
      return {
        html: result.value,
        language: result.language || 'plaintext',
        relevance: result.relevance || 0,
      };
    } catch (error) {
      debug.error('SyntaxHighlighter',' Auto-detect error:', error);
      return {
        html: this.escapeHtml(code),
        language: 'plaintext',
        relevance: 0,
      };
    }
  }

  /**
   * Detect code language
   */
  async detectLanguage(code: string): Promise<DetectionResult> {
    try {
      const result = hljs.highlightAuto(code);
      return {
        language: result.language || 'plaintext',
        relevance: result.relevance || 0,
        secondBest: result.secondBest
          ? {
              language: result.secondBest.language || 'plaintext',
              relevance: result.secondBest.relevance || 0,
            }
          : undefined,
      };
    } catch (error) {
      debug.error('SyntaxHighlighter',' Language detection error:', error);
      return {
        language: 'plaintext',
        relevance: 0,
      };
    }
  }

  /**
   * Load language grammar on-demand
   */
  async loadLanguage(language: string): Promise<void> {
    // Check if already loaded
    if (this.loadedLanguages.has(language)) {
      return;
    }

    // Check if we have a loader for this language
    const loader = this.languageModules[language];
    if (!loader) {
      console.warn(`[SyntaxHighlighter] No loader for language: ${language}`);
      return;
    }

    try {
      const module = await loader();
      hljs.registerLanguage(language, module.default);
      this.loadedLanguages.add(language);
      debug.log("SyntaxHighlighter", ` Loaded language: ${language}`);
    } catch (error) {
      console.error(`[SyntaxHighlighter] Failed to load language ${language}:`, error);
    }
  }

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      ...this.loadedLanguages,
      ...Object.keys(this.languageModules),
    ].sort();
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    const normalized = this.normalizeLanguage(language);
    return this.loadedLanguages.has(normalized) || normalized in this.languageModules;
  }

  /**
   * Highlight all code blocks in a container
   */
  async highlightAll(container: HTMLElement): Promise<void> {
    const codeBlocks = container.querySelectorAll('pre code[class*="language-"]');

    for (const block of Array.from(codeBlocks)) {
      const code = block.textContent || '';
      const classNames = block.className.split(' ');
      const langClass = classNames.find((cls) => cls.startsWith('language-'));

      if (langClass) {
        const lang = langClass.replace('language-', '');
        
        // Check if code block is large (> 1000 lines)
        if (code.split('\n').length > 1000) {
          debug.log("SyntaxHighlighter", ` Large code block detected, highlighting may take time`);
        }

        try {
          const result = await this.highlight(code, lang);
          block.innerHTML = result.html;
          block.classList.add('hljs', 'highlighted');
          block.setAttribute('data-language', result.language);
        } catch (error) {
          debug.error('SyntaxHighlighter',' Error highlighting block:', error);
        }
      }
    }
  }

  /**
   * Highlight visible code blocks using Intersection Observer
   */
  highlightVisible(container: HTMLElement): void {
    const codeBlocks = container.querySelectorAll('pre code[class*="language-"]:not(.highlighted)');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
              const block = entry.target as HTMLElement;
              const code = block.textContent || '';
              const classNames = block.className.split(' ');
              const langClass = classNames.find((cls) => cls.startsWith('language-'));

              if (langClass) {
                const lang = langClass.replace('language-', '');
                
                try {
                  const result = await this.highlight(code, lang);
                  block.innerHTML = result.html;
                  block.classList.add('hljs', 'highlighted');
                  block.setAttribute('data-language', result.language);
                } catch (error) {
                  debug.error('SyntaxHighlighter',' Error highlighting block:', error);
                }
              }

              observer.unobserve(block);
            }
          });
        },
        {
          rootMargin: '100px', // Pre-load when 100px away
          threshold: 0.01,
        }
      );

      codeBlocks.forEach((block) => observer.observe(block));
    } else {
      // Fallback: highlight all immediately
      this.highlightAll(container).catch((error) => debug.error("SyntaxHighlighter", "Catch error:", error));
    }
  }

  /**
   * Normalize language name
   */
  private normalizeLanguage(language: string): string {
    const lower = language.toLowerCase();
    return this.languageAliases.get(lower) || lower;
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Set syntax theme (load CSS)
   * Note: Dynamic CSS imports don't work in Chrome extensions, so we rely on
   * the theme engine's CSS custom properties for styling instead.
   */
  async setTheme(themeName: string): Promise<void> {
    // In Chrome extensions, dynamic CSS imports with ?inline don't work
    // The theme engine applies CSS custom properties that style the hljs classes
    // So we just log and skip the highlight.js theme loading
    debug.log("SyntaxHighlighter", `Syntax theme ${themeName} will be styled via theme engine CSS custom properties`);
    
    // Note: The .hljs-* classes are styled by our theme system through CSS variables
    // defined in src/content/content.css and theme files
  }
}

// Export singleton
export const syntaxHighlighter = new SyntaxHighlighter();

// Theme mapping for document themes
export const SYNTAX_THEME_MAP: Record<string, string> = {
  'github-light': 'github',
  'github-dark': 'github-dark',
  'catppuccin-latte': 'github', // Fallback to github for now
  'catppuccin-frappe': 'github-dark',
  'catppuccin-macchiato': 'github-dark',
  'catppuccin-mocha': 'github-dark',
  'monokai': 'monokai',
  'monokai-pro': 'monokai',
};

