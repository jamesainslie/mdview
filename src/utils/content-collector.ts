/**
 * Content Collector
 * Extracts structured content from rendered markdown DOM for export
 */

import type { ContentNode, CollectedContent } from '../types';
import { debug } from './debug-logger';

/**
 * Collects and structures content from rendered markdown for export
 */
export class ContentCollector {
  /**
   * Main entry point - collects all content from container
   */
  collect(container: HTMLElement): CollectedContent {
    debug.info('ContentCollector', 'Starting content collection');

    const nodes: ContentNode[] = [];
    const children = Array.from(container.children);

    for (const child of children) {
      const node = this.processElement(child as HTMLElement);
      if (node) {
        nodes.push(node);
      }
    }

    const title = this.extractTitle(nodes);
    const metadata = this.calculateMetadata(nodes);

    debug.info('ContentCollector', `Collected ${nodes.length} nodes, title: "${title}"`);

    return {
      title,
      nodes,
      metadata,
    };
  }

  /**
   * Process a single HTML element into a ContentNode
   */
  private processElement(element: HTMLElement): ContentNode | null {
    const tagName = element.tagName.toLowerCase();

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return this.processHeading(element);
      case 'p':
        return this.processParagraph(element);
      case 'ul':
      case 'ol':
        return this.processList(element);
      case 'pre':
        return this.processCodeBlock(element);
      case 'table':
        return this.processTable(element);
      case 'blockquote':
        return this.processBlockquote(element);
      case 'hr':
        return { type: 'hr', content: '', attributes: {} };
      case 'div':
        // Check for mermaid container
        if (element.classList.contains('mermaid-container')) {
          return this.processMermaid(element);
        }
        // Recurse into generic divs
        return this.processContainer(element);
      default:
        debug.debug('ContentCollector', `Skipping unsupported element: ${tagName}`);
        return null;
    }
  }

  /**
   * Extract heading (H1-H6)
   * Uses plain text content - no markdown link conversion
   */
  private processHeading(element: HTMLElement): ContentNode {
    const level = parseInt(element.tagName.substring(1));
    // Use textContent for headings - don't convert anchor links to markdown
    const text = (element.textContent || '').trim();
    const id = element.id || '';

    return {
      type: 'heading',
      content: text,
      attributes: {
        level,
        id,
      },
    };
  }

  /**
   * Extract paragraph with inline formatting
   */
  private processParagraph(element: HTMLElement): ContentNode {
    const content = this.extractInlineContent(element);

    return {
      type: 'paragraph',
      content,
      attributes: {},
    };
  }

  /**
   * Extract list (UL/OL) with nested support
   */
  private processList(element: HTMLElement): ContentNode {
    const ordered = element.tagName.toLowerCase() === 'ol';
    const children: ContentNode[] = [];

    const items = Array.from(element.children);
    for (const item of items) {
      if (item.tagName.toLowerCase() === 'li') {
        const liContent = this.processListItem(item as HTMLElement);
        children.push(liContent);
      }
    }

    return {
      type: 'list',
      content: children,
      attributes: {
        ordered,
      },
      children,
    };
  }

  /**
   * Process a single list item (may contain nested lists)
   */
  private processListItem(li: HTMLElement): ContentNode {
    const children: ContentNode[] = [];
    let textContent = '';

    // Process child nodes
    for (const child of Array.from(li.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        textContent += child.textContent || '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'ul' || tagName === 'ol') {
          // Nested list
          const nestedList = this.processList(element);
          children.push(nestedList);
        } else {
          // Inline content
          textContent += this.extractInlineContent(element);
        }
      }
    }

    return {
      type: 'paragraph', // List items are treated as paragraphs
      content: textContent.trim(),
      attributes: {},
      children: children.length > 0 ? children : undefined,
    };
  }

  /**
   * Extract code block
   */
  private processCodeBlock(element: HTMLElement): ContentNode {
    const codeElement = element.querySelector('code');
    const code = codeElement ? codeElement.textContent || '' : element.textContent || '';

    // Try to extract language from class
    let language = '';
    if (codeElement) {
      const classes = Array.from(codeElement.classList);
      const langClass = classes.find((c) => c.startsWith('language-'));
      if (langClass) {
        language = langClass.replace('language-', '');
      }
    }

    return {
      type: 'code',
      content: code,
      attributes: {
        language,
      },
    };
  }

  /**
   * Extract table
   */
  private processTable(element: HTMLElement): ContentNode {
    const rows: string[][] = [];

    // Process thead and tbody
    const thead = element.querySelector('thead');
    const tbody = element.querySelector('tbody');

    if (thead) {
      const headerRows = thead.querySelectorAll('tr');
      headerRows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) =>
          this.extractInlineContent(cell as HTMLElement)
        );
        rows.push(cells);
      });
    }

    if (tbody) {
      const bodyRows = tbody.querySelectorAll('tr');
      bodyRows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) =>
          this.extractInlineContent(cell as HTMLElement)
        );
        rows.push(cells);
      });
    } else {
      // No tbody, process all rows
      const allRows = element.querySelectorAll('tr');
      allRows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) =>
          this.extractInlineContent(cell as HTMLElement)
        );
        rows.push(cells);
      });
    }

    return {
      type: 'table',
      content: JSON.stringify(rows),
      attributes: {
        rows: rows.length,
        cols: rows[0]?.length || 0,
      },
    };
  }

  /**
   * Extract blockquote
   */
  private processBlockquote(element: HTMLElement): ContentNode {
    const children: ContentNode[] = [];

    for (const child of Array.from(element.children)) {
      const node = this.processElement(child as HTMLElement);
      if (node) {
        children.push(node);
      }
    }

    return {
      type: 'blockquote',
      content: children,
      attributes: {},
      children,
    };
  }

  /**
   * Extract mermaid diagram container
   */
  private processMermaid(element: HTMLElement): ContentNode {
    const id = element.id || '';
    const svg = element.querySelector('svg');

    return {
      type: 'mermaid',
      content: '',
      attributes: {
        id,
        width: svg?.getAttribute('width') || '',
        height: svg?.getAttribute('height') || '',
      },
    };
  }

  /**
   * Process a container element (recurse into children)
   */
  private processContainer(element: HTMLElement): ContentNode | null {
    const children: ContentNode[] = [];

    for (const child of Array.from(element.children)) {
      const node = this.processElement(child as HTMLElement);
      if (node) {
        children.push(node);
      }
    }

    // If only one child, return it directly
    if (children.length === 1) {
      return children[0];
    }

    // If multiple children or none, return null (skip the container)
    return null;
  }

  /**
   * Extract inline content with formatting
   * Preserves bold, italic, code, and links
   */
  private extractInlineContent(element: HTMLElement): string {
    let result = '';

    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();

        switch (tagName) {
          case 'strong':
          case 'b':
            result += `**${this.extractInlineContent(el)}**`;
            break;
          case 'em':
          case 'i':
            result += `*${this.extractInlineContent(el)}*`;
            break;
          case 'code':
            result += `\`${el.textContent || ''}\``;
            break;
          case 'a': {
            const href = el.getAttribute('href') || '';
            const linkText = this.extractInlineContent(el);
            // Internal anchor links (TOC) - just use text, no markdown syntax
            if (href.startsWith('#')) {
              result += linkText;
            } else {
              // External links - convert to markdown format
              result += `[${linkText}](${href})`;
            }
            break;
          }
          case 'br':
            result += '\n';
            break;
          default:
            // For other elements, just get text content
            result += this.extractInlineContent(el);
        }
      }
    }

    return result;
  }

  /**
   * Extract title from nodes (first H1 or use "Untitled")
   */
  private extractTitle(nodes: ContentNode[]): string {
    const firstHeading = nodes.find((node) => node.type === 'heading' && node.attributes.level === 1);
    if (firstHeading && typeof firstHeading.content === 'string') {
      return firstHeading.content;
    }
    return 'Untitled Document';
  }

  /**
   * Calculate metadata from nodes
   */
  private calculateMetadata(nodes: ContentNode[]): CollectedContent['metadata'] {
    let wordCount = 0;
    let imageCount = 0;
    let mermaidCount = 0;

    const countWords = (text: string): number => {
      return text.split(/\s+/).filter((word) => word.length > 0).length;
    };

    const processNode = (node: ContentNode): void => {
      if (node.type === 'mermaid') {
        mermaidCount++;
      } else if (node.type === 'image') {
        imageCount++;
      }

      if (typeof node.content === 'string') {
        // Count words from string content
        if (node.type === 'heading' || node.type === 'paragraph') {
          wordCount += countWords(node.content);
        }
      } else if (Array.isArray(node.content)) {
        // Recurse into children
        node.content.forEach(processNode);
      }

      // Process children if present
      if (node.children) {
        node.children.forEach(processNode);
      }
    };

    nodes.forEach(processNode);

    return {
      wordCount,
      imageCount,
      mermaidCount,
      exportedAt: new Date(),
    };
  }
}

