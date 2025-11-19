/**
 * DOM Purifier Utility
 * Sanitizes HTML content using DOMPurify for security
 */

import DOMPurify from 'dompurify';

export class DOMPurifierUtil {
  private static config = {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'code',
      'pre',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',
      'a',
      'img',
      'blockquote',
      'hr',
      'div',
      'span',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'svg',
      'path',
      'circle',
      'rect',
      'line',
      'polyline',
      'polygon',
      'g',
      'text',
      'defs',
      'marker',
      'input',
      'label',
      'details',
      'summary',
    ],
    ALLOWED_ATTR: [
      'href',
      'src',
      'alt',
      'title',
      'class',
      'id',
      'width',
      'height',
      'target',
      'rel',
      // SVG attributes
      'd',
      'cx',
      'cy',
      'r',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'viewBox',
      'fill',
      'stroke',
      'stroke-width',
      'transform',
      'points',
      // Data attributes for internal use
      'data-has-code',
      'data-language',
      'data-line',
      // Task list attributes
      'type',
      'checked',
      'disabled',
    ],
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onmousemove'],
    ALLOW_DATA_ATTR: true, // Allow data-* attributes with whitelist
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
    RETURN_TRUSTED_TYPE: false,
  };

  /**
   * Sanitize HTML string
   */
  static sanitize(dirty: string): string {
    return DOMPurify.sanitize(dirty, this.config);
  }

  /**
   * Sanitize HTML element
   */
  static sanitizeElement(element: HTMLElement): HTMLElement {
    const sanitized = this.sanitize(element.outerHTML);
    const temp = document.createElement('div');
    temp.innerHTML = sanitized;
    const firstChild = temp.firstChild;
    if (!firstChild || !(firstChild instanceof HTMLElement)) {
      throw new Error('Failed to sanitize element or result is not HTMLElement');
    }
    return firstChild;
  }

  /**
   * Check if content is safe
   */
  static isSafe(content: string): boolean {
    const sanitized = this.sanitize(content);
    return content === sanitized;
  }

  /**
   * Get list of removed elements after sanitization
   */
  static getRemovedElements(content: string): string[] {
    const removed: string[] = [];
    
    DOMPurify.addHook('uponSanitizeElement', (_node, data) => {
      const tagName = data.tagName;
      if (tagName && data.allowedTags[tagName] === false) {
        removed.push(tagName);
      }
    });

    this.sanitize(content);
    DOMPurify.removeAllHooks();

    return removed;
  }

  /**
   * Configure custom sanitization rules
   */
  static configure(customConfig: Partial<typeof DOMPurifierUtil.config>): void {
    Object.assign(this.config, customConfig);
  }

  /**
   * Reset to default configuration
   */
  static resetConfig(): void {
    // Config is already set in the class definition
    // This method allows runtime reset if needed
  }
}

// Export singleton for convenience
export const domPurifier = DOMPurifierUtil;

