/**
 * Section Splitter
 * Splits markdown into logical sections for lazy rendering
 */

export interface MarkdownSection {
  markdown: string;
  startLine: number;
  endLine: number;
  heading?: string;
  level?: number;
  id: string;
}

/**
 * Split markdown into sections by headings
 * Each section includes the heading and all content until the next heading
 */
export function splitIntoSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: MarkdownSection[] = [];

  let currentSection: string[] = [];
  let currentHeading: string | undefined;
  let currentLevel: number | undefined;
  let sectionStartLine = 0;
  let sectionId = 0;

  // Track fenced code block state
  let inCodeFence = false;
  let codeFenceChar = ''; // '`' or '~'
  let codeFenceLength = 0; // minimum 3

  lines.forEach((line, index) => {
    // Check for code fence start/end (``` or ~~~)
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const fenceStr = fenceMatch[1];
      const fenceChar = fenceStr[0];
      const fenceLen = fenceStr.length;

      if (!inCodeFence) {
        // Starting a code fence
        inCodeFence = true;
        codeFenceChar = fenceChar;
        codeFenceLength = fenceLen;
      } else if (fenceChar === codeFenceChar && fenceLen >= codeFenceLength) {
        // Closing the code fence (must use same char and >= length)
        inCodeFence = false;
        codeFenceChar = '';
        codeFenceLength = 0;
      }
      // If different fence char or shorter length, it's content inside the fence
    }

    // Only check for headings when NOT inside a code fence
    const headingMatch = !inCodeFence && line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section if it exists
      if (currentSection.length > 0) {
        sections.push({
          markdown: currentSection.join('\n'),
          startLine: sectionStartLine,
          endLine: index - 1,
          heading: currentHeading,
          level: currentLevel,
          id: `section-${sectionId++}`,
        });
      }

      // Start new section
      currentSection = [line];
      currentHeading = headingMatch[2];
      currentLevel = headingMatch[1].length;
      sectionStartLine = index;
    } else {
      currentSection.push(line);
    }
  });

  // Add final section
  if (currentSection.length > 0) {
    sections.push({
      markdown: currentSection.join('\n'),
      startLine: sectionStartLine,
      endLine: lines.length - 1,
      heading: currentHeading,
      level: currentLevel,
      id: `section-${sectionId++}`,
    });
  }

  return sections;
}

/**
 * Split markdown into chunks by size (for very large files without headings)
 */
export function splitIntoChunks(markdown: string, chunkSize = 50000): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.split('\n');

  let currentChunk: string[] = [];
  let currentSize = 0;
  let chunkStartLine = 0;
  let chunkId = 0;

  lines.forEach((line, index) => {
    currentChunk.push(line);
    currentSize += line.length + 1; // +1 for newline

    // If chunk is large enough, save it
    if (currentSize >= chunkSize) {
      sections.push({
        markdown: currentChunk.join('\n'),
        startLine: chunkStartLine,
        endLine: index,
        id: `chunk-${chunkId++}`,
      });

      currentChunk = [];
      currentSize = 0;
      chunkStartLine = index + 1;
    }
  });

  // Add remaining lines
  if (currentChunk.length > 0) {
    sections.push({
      markdown: currentChunk.join('\n'),
      startLine: chunkStartLine,
      endLine: lines.length - 1,
      id: `chunk-${chunkId++}`,
    });
  }

  return sections;
}

/**
 * Get initial sections to render (above the fold)
 */
export function getInitialSections(
  sections: MarkdownSection[],
  options: { maxSections?: number; maxSize?: number; upToSectionId?: string } = {}
): MarkdownSection[] {
  const { maxSections = 3, maxSize = 30000, upToSectionId } = options;

  // If we need to render up to a specific section (for scroll restoration),
  // render all sections up to and including that one
  if (upToSectionId) {
    const targetIndex = sections.findIndex((s) => s.id === upToSectionId);
    if (targetIndex !== -1) {
      // Render all sections up to the target, plus one more for context
      return sections.slice(0, Math.min(targetIndex + 2, sections.length));
    }
  }

  const initial: MarkdownSection[] = [];
  let totalSize = 0;

  for (const section of sections) {
    if (initial.length >= maxSections) break;
    if (totalSize + section.markdown.length > maxSize) break;

    initial.push(section);
    totalSize += section.markdown.length;
  }

  // Always include at least one section
  if (initial.length === 0 && sections.length > 0) {
    initial.push(sections[0]);
  }

  return initial;
}
