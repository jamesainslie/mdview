/**
 * Unit tests for Filename Generator
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { FilenameGenerator } from '../../../src/utils/filename-generator';

describe('FilenameGenerator', () => {
  beforeEach(() => {
    // Mock Date for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-12-02T14:30:00Z'));
  });

  describe('generate()', () => {
    test('should generate filename with title only', () => {
      const result = FilenameGenerator.generate({
        title: 'My Document',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('my-document.docx');
    });

    test('should generate filename with date template', () => {
      const result = FilenameGenerator.generate({
        title: 'My Document',
        extension: 'docx',
        template: '{title}-{date}',
      });

      expect(result).toBe('my-document-2025-12-02.docx');
    });

    test('should generate filename with datetime template', () => {
      const result = FilenameGenerator.generate({
        title: 'Report',
        extension: 'pdf',
        template: '{title}-{datetime}',
      });

      // Note: Time will be in local timezone, not UTC
      expect(result).toMatch(/^report-2025-12-02_\d{2}-\d{2}\.pdf$/);
    });

    test('should generate filename with multiple variables', () => {
      const result = FilenameGenerator.generate({
        title: 'Annual Report',
        extension: 'docx',
        template: '{year}-{month}-{title}',
      });

      expect(result).toBe('2025-12-annual-report.docx');
    });

    test('should sanitize illegal characters from title', () => {
      const result = FilenameGenerator.generate({
        title: 'File<>:"/\\|?*Name',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('filename.docx');
    });

    test('should replace spaces with dashes', () => {
      const result = FilenameGenerator.generate({
        title: 'My Great Document',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('my-great-document.docx');
    });

    test('should handle empty title', () => {
      const result = FilenameGenerator.generate({
        title: '',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('document.docx');
    });

    test('should truncate long filenames', () => {
      const longTitle = 'a'.repeat(250);
      const result = FilenameGenerator.generate({
        title: longTitle,
        extension: 'docx',
        template: '{title}',
      });

      expect(result.length).toBeLessThanOrEqual(205); // 200 + ".docx"
    });

    test('should add correct extension', () => {
      const result1 = FilenameGenerator.generate({
        title: 'Test',
        extension: 'docx',
      });

      const result2 = FilenameGenerator.generate({
        title: 'Test',
        extension: 'pdf',
      });

      expect(result1).toBe('test.docx');
      expect(result2).toBe('test.pdf');
    });

    test('should use default template if not provided', () => {
      const result = FilenameGenerator.generate({
        title: 'Test Document',
        extension: 'docx',
      });

      expect(result).toBe('test-document.docx');
    });

    test('should handle timestamp variable', () => {
      const result = FilenameGenerator.generate({
        title: 'Test',
        extension: 'docx',
        template: '{title}-{timestamp}',
      });

      expect(result).toMatch(/^test-\d+\.docx$/);
    });

    test('should handle year, month, day variables', () => {
      const result = FilenameGenerator.generate({
        title: 'Report',
        extension: 'docx',
        template: '{year}-{month}-{day}-{title}',
      });

      expect(result).toBe('2025-12-02-report.docx');
    });

    test('should collapse multiple dashes', () => {
      const result = FilenameGenerator.generate({
        title: 'Test   Multiple   Spaces',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('test-multiple-spaces.docx');
    });

    test('should trim leading and trailing dashes', () => {
      const result = FilenameGenerator.generate({
        title: '  Test  ',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('test.docx');
    });

    test('should convert to lowercase', () => {
      const result = FilenameGenerator.generate({
        title: 'MyUpperCaseDocument',
        extension: 'docx',
        template: '{title}',
      });

      expect(result).toBe('myuppercasedocument.docx');
    });

    test('should handle mixed template with text and variables', () => {
      const result = FilenameGenerator.generate({
        title: 'Quarterly Results',
        extension: 'docx',
        template: 'Q4-{title}-{year}',
      });

      expect(result).toBe('q4-quarterly-results-2025.docx');
    });
  });
});

