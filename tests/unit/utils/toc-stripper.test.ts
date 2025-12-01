/**
 * Tests for TOC Stripper utility
 */

import { describe, it, expect } from 'vitest';
import { stripTableOfContents } from '../../../src/utils/toc-stripper';

describe('stripTableOfContents', () => {
  describe('Basic TOC Detection', () => {
    it('should strip a standard GitHub-style TOC with links', () => {
      const markdown = `# My Document

## Table of Contents

- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Features](#features)

## Introduction

This is the introduction.`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
      expect(result.markdown).not.toContain('[Introduction](#introduction)');
      expect(result.markdown).toContain('## Introduction');
      expect(result.markdown).toContain('This is the introduction.');
    });

    it('should strip TOC with "Contents" heading', () => {
      const markdown = `# Document

## Contents

- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('## Contents');
      expect(result.markdown).toContain('## Section 1');
    });

    it('should strip TOC with "TOC" heading (case-insensitive)', () => {
      const markdown = `# Document

### toc

- [Part A](#part-a)
- [Part B](#part-b)

## Part A`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('### toc');
      expect(result.markdown).toContain('## Part A');
    });
  });

  describe('Different List Styles', () => {
    it('should strip TOC with asterisk list markers', () => {
      const markdown = `## Table of Contents

* [First](#first)
* [Second](#second)

## First`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
    });

    it('should strip TOC with plus sign list markers', () => {
      const markdown = `## Table of Contents

+ [First](#first)
+ [Second](#second)

## First`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
    });

    it('should strip TOC with ordered list', () => {
      const markdown = `## Table of Contents

1. [First](#first)
2. [Second](#second)
3. [Third](#third)

## First`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
    });
  });

  describe('Nested Lists', () => {
    it('should strip TOC with nested list items', () => {
      const markdown = `## Table of Contents

- [Chapter 1](#chapter-1)
  - [Section 1.1](#section-11)
  - [Section 1.2](#section-12)
- [Chapter 2](#chapter-2)
  - [Section 2.1](#section-21)

## Chapter 1`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
      expect(result.markdown).not.toContain('[Chapter 1](#chapter-1)');
      expect(result.markdown).toContain('## Chapter 1');
    });
  });

  describe('Multiple TOCs', () => {
    it('should strip multiple TOC sections', () => {
      const markdown = `# Document

## Table of Contents

- [Part 1](#part-1)
- [Part 2](#part-2)

## Part 1

Some content.

## Contents

- [Subsection A](#subsection-a)
- [Subsection B](#subsection-b)

### Subsection A`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
      expect(result.markdown).not.toContain('## Contents');
      expect(result.markdown).toContain('## Part 1');
      expect(result.markdown).toContain('### Subsection A');
    });
  });

  describe('Edge Cases', () => {
    it('should return original markdown when no TOC is present', () => {
      const markdown = `# Document

## Introduction

This is a document without a TOC.

## Chapter 1

More content here.`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(false);
      expect(result.markdown).toBe(markdown);
    });

    it('should not strip heading that contains "contents" but is not a TOC', () => {
      const markdown = `# Document

## File Contents and Structure

This section discusses the file contents.

- This is just a regular list
- Not a table of contents

## Next Section`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(false);
      expect(result.markdown).toBe(markdown);
    });

    it('should not strip a TOC-like heading without sufficient anchor links', () => {
      const markdown = `# Document

## Table of Contents

- Regular item without link
- Another regular item

## Chapter 1`;

      const result = stripTableOfContents(markdown);

      // This should NOT be stripped because there are no anchor links
      expect(result.tocFound).toBe(false);
      expect(result.markdown).toBe(markdown);
    });

    it('should handle TOC with blank lines in the list', () => {
      const markdown = `## Table of Contents

- [Section 1](#section-1)

- [Section 2](#section-2)

- [Section 3](#section-3)

## Section 1`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
      expect(result.markdown).toContain('## Section 1');
    });

    it('should stop at the next heading after TOC', () => {
      const markdown = `# Document

## Table of Contents

- [Introduction](#introduction)
- [Chapter 1](#chapter-1)

## Introduction

Content here.`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).toContain('## Introduction');
      expect(result.markdown).toContain('Content here.');
    });

    it('should handle TOC at the end of document', () => {
      const markdown = `# Document

## Introduction

Some intro.

## Table of Contents

- [Introduction](#introduction)
- [Conclusion](#conclusion)`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('Table of Contents');
      expect(result.markdown).toContain('## Introduction');
      expect(result.markdown).toContain('Some intro.');
    });
  });

  describe('Clean Up After Stripping', () => {
    it('should clean up excess blank lines after TOC removal', () => {
      const markdown = `# Document

## Table of Contents

- [Section 1](#section-1)
- [Section 2](#section-2)


## Section 1

Content.`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      // Should not have more than 2 consecutive newlines
      expect(result.markdown).not.toMatch(/\n{4,}/);
    });
  });

  describe('Real-World Examples', () => {
    it('should handle typical README TOC', () => {
      const markdown = `# Awesome Project

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

## Installation

\`\`\`bash
npm install awesome-project
\`\`\`

## Usage

Start using the project...`;

      const result = stripTableOfContents(markdown);

      expect(result.tocFound).toBe(true);
      expect(result.markdown).not.toContain('## Table of Contents');
      expect(result.markdown).toContain('## Installation');
      expect(result.markdown).toContain('npm install awesome-project');
      expect(result.markdown).toContain('## Usage');
    });

    it('should handle GitLab-style TOC with [[_TOC_]]', () => {
      // Note: Our current implementation looks for heading-based TOCs
      // GitLab's [[_TOC_]] is a special marker that we might want to support
      // For now, this test documents the current behavior
      const markdown = `# Project

[[_TOC_]]

## Introduction

Content here.`;

      const result = stripTableOfContents(markdown);

      // Currently won't strip GitLab-style TOC marker
      // This is acceptable as the main use case is heading-based TOCs
      expect(result.tocFound).toBe(false);
    });
  });
});
