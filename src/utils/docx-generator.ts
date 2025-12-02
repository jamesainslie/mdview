/**
 * DOCX Generator
 * Converts structured content to Word documents using the docx library
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  ExternalHyperlink,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  convertInchesToTwip,
  type IStylesOptions,
  type ISectionOptions,
} from '@jamesainslie/docx';
import type { CollectedContent, ConvertedImage, ContentNode, DOCXGeneratorOptions } from '../types';
import { debug } from './debug-logger';

/**
 * Generates DOCX documents from collected content
 */
export class DOCXGenerator {
  /**
   * Generate a DOCX document from collected content
   */
  async generate(
    content: CollectedContent,
    images: Map<string, ConvertedImage>,
    options: DOCXGeneratorOptions = {}
  ): Promise<Blob> {
    debug.info('DOCXGenerator', `Generating DOCX for "${content.title}"`);

    const doc = new Document({
      creator: options.author || 'MDView',
      title: options.title || content.title,
      description: 'Exported from MDView',
      styles: this.createStyles(),
      numbering: {
        config: [
          {
            reference: 'default-numbering',
            levels: [
              {
                level: 0,
                format: 'decimal',
                text: '%1.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 1,
                format: 'decimal',
                text: '%2.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 2,
                format: 'decimal',
                text: '%3.',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
            ],
          },
          {
            reference: 'bullet-numbering',
            levels: [
              {
                level: 0,
                format: 'bullet',
                text: '•',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 1,
                format: 'bullet',
                text: '◦',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
              {
                level: 2,
                format: 'bullet',
                text: '▪',
                alignment: AlignmentType.START,
                style: {
                  paragraph: {
                    indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) },
                  },
                },
              },
            ],
          },
        ],
      },
      sections: [
        {
          properties: this.createPageProperties(options),
          children: this.convertNodes(content.nodes, images),
        },
      ],
    });

    debug.info('DOCXGenerator', 'Converting document to blob');
    const blob = await Packer.toBlob(doc);
    debug.info('DOCXGenerator', `Generated DOCX blob (${blob.size} bytes)`);

    return blob;
  }

  /**
   * Create document styles - minimal approach like Pandoc
   * Uses Aptos (modern Word default) or Calibri as fallback
   */
  private createStyles(): IStylesOptions {
    return {
      default: {
        document: {
          run: {
            font: 'Aptos', // Modern Word default (falls back to Calibri if unavailable)
            size: 24, // 12pt
          },
          paragraph: {
            spacing: {
              after: 200,
            },
          },
        },
        heading1: {
          run: {
            font: 'Aptos Display',
            size: 40, // 20pt
            color: '0F4761',
          },
        },
        heading2: {
          run: {
            font: 'Aptos Display',
            size: 32, // 16pt
            color: '0F4761',
          },
        },
        heading3: {
          run: {
            font: 'Aptos Display',
            size: 28, // 14pt
            color: '0F4761',
          },
        },
        heading4: {
          run: {
            font: 'Aptos Display',
            italics: true,
            color: '0F4761',
          },
        },
        heading5: {
          run: {
            font: 'Aptos Display',
            color: '0F4761',
          },
        },
        heading6: {
          run: {
            font: 'Aptos Display',
            italics: true,
            color: '595959',
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          quickFormat: true,
        },
      ],
    };
  }

  /**
   * Standard paper sizes in inches (width x height in portrait)
   */
  private static readonly PAPER_SIZES: Record<string, { width: number; height: number }> = {
    // ISO A-series (mm converted to inches)
    A0: { width: 33.11, height: 46.81 }, // 841 x 1189 mm
    A1: { width: 23.39, height: 33.11 }, // 594 x 841 mm
    A3: { width: 11.69, height: 16.54 }, // 297 x 420 mm
    A4: { width: 8.27, height: 11.69 }, // 210 x 297 mm
    A5: { width: 5.83, height: 8.27 }, // 148 x 210 mm
    A6: { width: 4.13, height: 5.83 }, // 105 x 148 mm
    // North American sizes
    Letter: { width: 8.5, height: 11.0 }, // 8.5 x 11 in
    Legal: { width: 8.5, height: 14.0 }, // 8.5 x 14 in
    Tabloid: { width: 11.0, height: 17.0 }, // 11 x 17 in
    Executive: { width: 7.25, height: 10.5 }, // 7.25 x 10.5 in
  };

  /**
   * Create page properties
   */
  private createPageProperties(options: DOCXGeneratorOptions): ISectionOptions['properties'] {
    const pageSize = options.pageSize || 'A4';
    const margins = options.margins || {
      top: convertInchesToTwip(1),
      bottom: convertInchesToTwip(1),
      left: convertInchesToTwip(1),
      right: convertInchesToTwip(1),
    };

    // Get paper dimensions, default to A4 if unknown
    const paper = DOCXGenerator.PAPER_SIZES[pageSize] || DOCXGenerator.PAPER_SIZES.A4;
    const pageDimensions = {
      width: convertInchesToTwip(paper.width),
      height: convertInchesToTwip(paper.height),
    };

    return {
      page: {
        size: pageDimensions,
        margin: margins,
      },
    };
  }

  /**
   * Convert content nodes to DOCX elements
   */
  private convertNodes(nodes: ContentNode[], images: Map<string, ConvertedImage>): (Paragraph | Table)[] {
    const elements: (Paragraph | Table)[] = [];

    for (const node of nodes) {
      try {
        switch (node.type) {
          case 'heading':
            elements.push(this.convertHeading(node));
            break;
          case 'paragraph':
            elements.push(this.convertParagraph(node));
            break;
          case 'list':
            elements.push(...this.convertList(node, 0));
            break;
          case 'code':
            elements.push(...this.convertCodeBlock(node));
            break;
          case 'table':
            elements.push(this.convertTable(node));
            break;
          case 'blockquote':
            elements.push(...this.convertBlockquote(node, images));
            break;
          case 'mermaid': {
            const mermaidPara = this.convertMermaid(node, images);
            if (mermaidPara) {
              elements.push(mermaidPara);
            }
            break;
          }
          case 'hr':
            elements.push(this.convertHorizontalRule());
            break;
          default:
            debug.warn('DOCXGenerator', `Unsupported node type: ${node.type}`);
        }
      } catch (error) {
        debug.error('DOCXGenerator', `Error converting node type ${node.type}:`, error);
      }
    }

    return elements;
  }

  /**
   * Convert heading node
   */
  private convertHeading(node: ContentNode): Paragraph {
    const level = (node.attributes.level as number) || 1;
    const text = typeof node.content === 'string' ? node.content : '';

    // Map heading level to HeadingLevel enum
    const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
      1: HeadingLevel.HEADING_1,
      2: HeadingLevel.HEADING_2,
      3: HeadingLevel.HEADING_3,
      4: HeadingLevel.HEADING_4,
      5: HeadingLevel.HEADING_5,
      6: HeadingLevel.HEADING_6,
    };

    return new Paragraph({
      text,
      heading: headingLevelMap[level] || HeadingLevel.HEADING_1,
    });
  }

  /**
   * Convert paragraph node - plain text, no custom styling
   */
  private convertParagraph(node: ContentNode): Paragraph {
    const text = typeof node.content === 'string' ? node.content : '';
    const runs = this.parseInlineFormatting(text);

    return new Paragraph({
      children: runs,
    });
  }

  /**
   * Parse inline formatting from markdown-style text
   */
  private parseInlineFormatting(text: string): (TextRun | ExternalHyperlink)[] {
    const children: (TextRun | ExternalHyperlink)[] = [];

    // Pattern to match: **bold**, *italic*, `code`, [text](url), or plain text
    const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+]\([^)]+\))|([^*`[]+)/g;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        // Bold: **text**
        const boldText = match[1].slice(2, -2);
        children.push(new TextRun({ text: boldText, bold: true }));
      } else if (match[2]) {
        // Italic: *text*
        const italicText = match[2].slice(1, -1);
        children.push(new TextRun({ text: italicText, italics: true }));
      } else if (match[3]) {
        // Inline code: `text` - monospace font
        const codeText = match[3].slice(1, -1);
        children.push(new TextRun({ text: codeText, font: 'Consolas' }));
      } else if (match[4]) {
        // Link: [text](url) - Word will style with default Hyperlink
        const linkMatch = match[4].match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          children.push(
            new ExternalHyperlink({
              children: [new TextRun({ text: linkMatch[1] })],
              link: linkMatch[2],
            })
          );
        }
      } else if (match[5]) {
        // Plain text
        children.push(new TextRun({ text: match[5] }));
      }
    }

    // If no matches, return plain text
    if (children.length === 0) {
      children.push(new TextRun({ text }));
    }

    return children;
  }

  /**
   * Convert list node (recursive for nested lists)
   */
  private convertList(node: ContentNode, level: number): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const ordered = node.attributes.ordered === true;

    if (Array.isArray(node.content)) {
      for (const item of node.content) {
        if (item.type === 'paragraph') {
          const text = typeof item.content === 'string' ? item.content : '';
          const runs = this.parseInlineFormatting(text);

          paragraphs.push(
            new Paragraph({
              children: runs,
              numbering: ordered
                ? { reference: 'default-numbering', level }
                : { reference: 'bullet-numbering', level },
            })
          );

          // Handle nested lists
          if (item.children && item.children.length > 0) {
            for (const child of item.children) {
              if (child.type === 'list') {
                paragraphs.push(...this.convertList(child, level + 1));
              }
            }
          }
        }
      }
    }

    return paragraphs;
  }

  /**
   * Convert code block node - monospace font
   */
  private convertCodeBlock(node: ContentNode): Paragraph[] {
    const code = typeof node.content === 'string' ? node.content : '';
    const lines = code.split('\n');

    return lines.map(
      (line) =>
        new Paragraph({
          children: [
            new TextRun({
              text: line || ' ',
              font: 'Consolas',
            }),
          ],
        })
    );
  }

  /**
   * Convert table node - Pandoc style: header with bottom border only
   */
  private convertTable(node: ContentNode): Table {
    const rowsData = JSON.parse(
      typeof node.content === 'string' ? node.content : '[]'
    ) as string[][];

    const rows = rowsData.map(
      (rowData, rowIndex) =>
        new TableRow({
          children: rowData.map(
            (cellData) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: rowIndex === 0
                      ? [new TextRun({ text: cellData, bold: true })]
                      : this.parseInlineFormatting(cellData),
                  }),
                ],
                // Header row: bottom border only (Pandoc style)
                borders: rowIndex === 0
                  ? {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    }
                  : {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
              })
          ),
        })
    );

    return new Table({
      rows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      // Remove table-level borders
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
        insideHorizontal: { style: BorderStyle.NONE, size: 0 },
        insideVertical: { style: BorderStyle.NONE, size: 0 },
      },
    });
  }

  /**
   * Convert blockquote node - indented text
   */
  private convertBlockquote(node: ContentNode, _images: Map<string, ConvertedImage>): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (child.type === 'paragraph') {
          const text = typeof child.content === 'string' ? child.content : '';
          const runs = this.parseInlineFormatting(text);
          paragraphs.push(
            new Paragraph({
              children: runs,
              indent: { left: 720 }, // 0.5 inch indent
            })
          );
        } else if (child.type === 'table') {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: '[Table in blockquote]' })],
              indent: { left: 720 },
            })
          );
        }
      }
    }

    return paragraphs;
  }

  /**
   * Convert mermaid diagram to embedded image.
   * Supports both SVG (vector, preferred) and raster (PNG/JPEG) formats.
   */
  private convertMermaid(node: ContentNode, images: Map<string, ConvertedImage>): Paragraph | null {
    const id = node.attributes.id as string;
    const image = images.get(id);

    if (!image) {
      debug.warn('DOCXGenerator', `No image found for mermaid diagram: ${id}`);
      return null;
    }

    // Convert base64 to Uint8Array (browser-safe, no Node Buffer dependency)
    const binary = atob(image.data);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Calculate dimensions
    // - Preserve aspect ratio
    // - Scale uniformly to fit maxWidth
    const maxWidth = 600; // Max width in document units (about 8.3 inches)
    const scale = image.width > 0 ? Math.min(1, maxWidth / image.width) : 1;
    const width = image.width * scale;
    const height = image.height * scale;

    // Determine if this is an SVG image
    const isSvg = image.format === 'svg';

    // For SVG images, use the forked docx library's SVG support
    // which requires type: "svg" and a PNG fallback for older Word versions
    if (isSvg) {
      // Create a minimal 1x1 transparent PNG as fallback for older Word versions
      // This is a base64-encoded 1x1 transparent PNG
      const fallbackPngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const fallbackBinary = atob(fallbackPngBase64);
      const fallbackBytes = new Uint8Array(fallbackBinary.length);
      for (let i = 0; i < fallbackBinary.length; i++) {
        fallbackBytes[i] = fallbackBinary.charCodeAt(i);
      }

      return new Paragraph({
        children: [
          new ImageRun({
            type: 'svg',
            data: bytes,
            transformation: {
              width,
              height,
            },
            fallback: {
              type: 'png',
              data: fallbackBytes,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
      });
    }

    // For raster images (PNG, JPEG), use the standard approach with explicit type
    return new Paragraph({
      children: [
        new ImageRun({
          type: 'png', // Default to PNG for raster images
          data: bytes,
          transformation: {
            width,
            height,
          },
        }),
      ],
      alignment: AlignmentType.CENTER,
    });
  }

  /**
   * Convert horizontal rule
   */
  private convertHorizontalRule(): Paragraph {
    return new Paragraph({
      children: [new TextRun({ text: '' })],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    });
  }
}

