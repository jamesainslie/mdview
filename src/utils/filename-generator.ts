/**
 * Filename Generator
 * Generates filenames from templates with variable substitution
 */

export interface FilenameGeneratorOptions {
  title: string;
  extension: string;
  template?: string;
}

export class FilenameGenerator {
  private static readonly DEFAULT_TEMPLATE = '{title}';
  private static readonly MAX_FILENAME_LENGTH = 200;

  /**
   * Generate a filename from a template
   */
  static generate(options: FilenameGeneratorOptions): string {
    const { title, extension, template = this.DEFAULT_TEMPLATE } = options;

    const vars: Record<string, string> = {
      '{title}': this.sanitizeFilename(title || 'document'),
      ...this.getDateVars(),
    };

    let filename = this.parseTemplate(template, vars);

    // Sanitize the final filename (remove any remaining illegal chars, lowercase)
    filename = filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();

    // Ensure filename doesn't exceed max length
    if (filename.length > this.MAX_FILENAME_LENGTH) {
      filename = filename.substring(0, this.MAX_FILENAME_LENGTH);
    }

    return `${filename}.${extension}`;
  }

  /**
   * Sanitize filename by removing illegal characters
   */
  private static sanitizeFilename(name: string): string {
    return (
      name
        .replace(/[<>:"/\\|?*]/g, '') // Remove illegal chars
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .replace(/-+/g, '-') // Collapse multiple dashes
        .replace(/^-|-$/g, '') // Trim leading/trailing dashes
        .toLowerCase()
    );
  }

  /**
   * Parse template by replacing variables
   */
  private static parseTemplate(template: string, vars: Record<string, string>): string {
    let result = template;

    // Replace all variables in the template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    return result;
  }

  /**
   * Get date-related template variables
   */
  private static getDateVars(): Record<string, string> {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    return {
      '{date}': `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      '{datetime}': `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`,
      '{timestamp}': now.getTime().toString(),
      '{year}': now.getFullYear().toString(),
      '{month}': pad(now.getMonth() + 1),
      '{day}': pad(now.getDate()),
    };
  }
}

