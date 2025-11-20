/**
 * Markdown Converter
 * Parses markdown to HTML using markdown-it with CommonMark + GFM support
 */

import MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItTaskLists from 'markdown-it-task-lists';
import * as emojiPlugin from 'markdown-it-emoji';
import type { ConversionResult, ParseError, ValidationResult } from '../types';

export interface ConvertOptions {
  baseUrl?: string;
  breaks?: boolean;
  linkify?: boolean;
  typographer?: boolean;
  highlight?: (code: string, lang: string) => string;
}

export class MarkdownConverter {
  private md: MarkdownIt;
  private metadata: ConversionResult['metadata'] = {
    wordCount: 0,
    headings: [],
    codeBlocks: [],
    mermaidBlocks: [],
    images: [],
    links: [],
  };

  constructor(options?: ConvertOptions) {
    // Initialize markdown-it
    this.md = new MarkdownIt({
      html: false, // Security: no raw HTML tags in source
      breaks: options?.breaks ?? true, // GFM line breaks
      linkify: options?.linkify ?? true, // Auto-convert URLs to links
      typographer: options?.typographer ?? true, // Smart quotes and replacements
      highlight: options?.highlight,
    });

    // Configure plugins
    this.configurePlugins();
  }

  private configurePlugins(): void {
    // markdown-it-attrs: Add custom attributes to elements
    this.md.use(markdownItAttrs, {
      leftDelimiter: '{',
      rightDelimiter: '}',
      allowedAttributes: ['id', 'class', 'style'],
    });

    // markdown-it-anchor: Add anchors to headings
    this.md.use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink({
        safariReaderFix: true,
      }),
      slugify: (s: string) =>
        s
          .toLowerCase()
          .trim()
          .replace(/[\s\W-]+/g, '-')
          .replace(/^-+|-+$/g, ''),
    });

    // markdown-it-task-lists: GitHub-style task lists
    this.md.use(markdownItTaskLists, {
      enabled: true,
      label: true,
      labelAfter: true,
    });

    // markdown-it-emoji: Emoji support
    const emojiPluginToUse = (emojiPlugin as { full?: typeof emojiPlugin }).full || emojiPlugin;
    this.md.use(emojiPluginToUse);

    // markdown-it-footnote: Footnotes support
    // TODO: markdown-it-footnote has ESM export issues, will be fixed in future version
    // this.md.use(markdownItFootnote);

    // Add custom rule for Mermaid blocks
    this.addMermaidRule();
  }

  private addMermaidRule(): void {
    const defaultFenceRenderer =
      this.md.renderer.rules.fence ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    this.md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const info = token.info ? token.info.trim() : '';
      const langName = info.split(/\s+/g)[0];

      // Check if it's a Mermaid diagram
      if (langName === 'mermaid' || langName === 'mmd') {
        const code = token.content.trim();
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Store in metadata with ID mapping
        this.metadata.mermaidBlocks.push({
          code,
          line: token.map ? token.map[0] : 0,
        });

        // Store code in global registry (bypasses DOM insertion issues)
        if (!window.__MDVIEW_MERMAID_CODE__) {
          window.__MDVIEW_MERMAID_CODE__ = new Map();
        }
        window.__MDVIEW_MERMAID_CODE__.set(id, code);

        // Return container without script tag (code retrieved from registry)
        return `<div class="mermaid-container" id="${id}" data-has-code="true">
          <div class="mermaid-loading">Rendering diagram...</div>
        </div>\n`;
      }

      // Check if it's a code block for syntax highlighting
      if (langName) {
        this.metadata.codeBlocks.push({
          language: langName,
          code: token.content,
          line: token.map ? token.map[0] : 0,
          lines: token.content.split('\n').length,
        });
      }

      // Use default renderer for code blocks
      return defaultFenceRenderer(tokens, idx, options, env, self);
    };

    // Add heading metadata extraction
    const defaultHeadingOpenRenderer =
      this.md.renderer.rules.heading_open ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    this.md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const level = parseInt(token.tag.substr(1));
      const nextToken = tokens[idx + 1];
      const text = nextToken && nextToken.type === 'inline' ? nextToken.content : '';

      // Generate ID
      const id = text
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')
        .replace(/^-+|-+$/g, '');

      this.metadata.headings.push({
        level,
        text,
        id,
        line: token.map ? token.map[0] : 0,
      });

      return defaultHeadingOpenRenderer(tokens, idx, options, env, self);
    };

    // Add image metadata extraction
    const defaultImageRenderer =
      this.md.renderer.rules.image ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    this.md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const srcIndex = token.attrIndex('src');
      const attrs = token.attrs || [];
      const src = srcIndex >= 0 ? attrs[srcIndex][1] : '';
      const alt = token.content;
      const titleIndex = token.attrIndex('title');
      const title = titleIndex >= 0 ? attrs[titleIndex][1] : undefined;

      this.metadata.images.push({
        src,
        alt,
        title,
        line: token.map ? token.map[0] : 0,
      });

      return defaultImageRenderer(tokens, idx, options, env, self);
    };

    // Add link metadata extraction
    const defaultLinkOpenRenderer =
      this.md.renderer.rules.link_open ||
      function (tokens, idx, options, _env, self) {
        return self.renderToken(tokens, idx, options);
      };

    this.md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const hrefIndex = token.attrIndex('href');
      const attrs = token.attrs || [];
      const href = hrefIndex >= 0 ? attrs[hrefIndex][1] : '';
      const nextToken = tokens[idx + 1];
      const text = nextToken && nextToken.type === 'inline' ? nextToken.content : '';

      this.metadata.links.push({
        href,
        text,
        line: token.map ? token.map[0] : 0,
      });

      return defaultLinkOpenRenderer(tokens, idx, options, env, self);
    };
  }

  /**
   * Convert markdown string to HTML
   */
  convert(markdown: string, _options?: ConvertOptions): ConversionResult {
    // Reset metadata
    this.metadata = {
      wordCount: 0,
      headings: [],
      codeBlocks: [],
      mermaidBlocks: [],
      images: [],
      links: [],
    };

    const errors: ParseError[] = [];

    try {
      // Calculate word count
      this.metadata.wordCount = markdown.trim().split(/\s+/).length;

      // Parse and render
      const html = this.md.render(markdown);

      return {
        html,
        metadata: this.metadata,
        errors,
      };
    } catch (error) {
      const parseError: ParseError = {
        message: error instanceof Error ? error.message : String(error),
        line: 0,
        column: 0,
        severity: 'error',
      };
      errors.push(parseError);

      return {
        html: `<div class="markdown-error">
          <h2>Markdown Parse Error</h2>
          <p>${this.escapeHtml(parseError.message)}</p>
        </div>`,
        metadata: this.metadata,
        errors,
      };
    }
  }

  /**
   * Validate markdown syntax
   */
  validateSyntax(markdown: string): ValidationResult {
    const errors: ParseError[] = [];
    const warnings: ParseError[] = [];

    try {
      // Try to parse
      this.md.parse(markdown, {});
      return { valid: true, errors, warnings };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : String(error),
        line: 0,
        column: 0,
        severity: 'error',
      });
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Register a custom plugin
   */
  registerPlugin(
    plugin: (md: MarkdownIt, options?: Record<string, unknown>) => void,
    options?: Record<string, unknown>
  ): void {
    this.md.use(plugin, options);
  }

  /**
   * Escape HTML for safe rendering
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Get markdown-it instance for advanced usage
   */
  getInstance(): MarkdownIt {
    return this.md;
  }
}

// Export singleton instance
export const markdownConverter = new MarkdownConverter();
