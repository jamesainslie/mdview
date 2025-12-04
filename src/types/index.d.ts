// Type definitions for MDView

/**
 * Global window extensions
 */
declare global {
  const __APP_VERSION__: string;

  interface Window {
    __MDVIEW_MERMAID_CODE__?: Map<string, string>;
  }
}

export type ThemeName =
  | 'github-light'
  | 'github-dark'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'monokai'
  | 'monokai-pro'
  | 'test-theme'; // For testing

export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

export interface AppState {
  preferences: {
    theme: ThemeName;
    autoTheme: boolean;
    lightTheme: ThemeName;
    darkTheme: ThemeName;
    syntaxTheme: string;
    autoReload: boolean;
    lineNumbers: boolean;
    enableHtml: boolean; // Enable HTML rendering in markdown
    syncTabs: boolean;
    logLevel: LogLevel;
    debug?: boolean; // Deprecated
    // Editor / Appearance Overrides
    fontFamily?: string;
    codeFontFamily?: string;
    lineHeight?: number;
    maxWidth?: number;
    useMaxWidth?: boolean; // Toggle for full width
    // Table of Contents
    showToc?: boolean; // Enable/disable TOC
    tocMaxDepth?: number; // Max heading depth (1-6)
    tocAutoCollapse?: boolean; // Auto-collapse nested sections
    tocPosition?: 'left' | 'right'; // Position of TOC
    tocStyle?: 'floating' | 'fixed'; // Style of TOC (floating card or fixed sidebar)
    // Export settings
    exportDefaultFormat?: 'docx' | 'pdf';
    exportDefaultPageSize?: PaperSize;
    exportIncludeToc?: boolean;
    exportFilenameTemplate?: string; // e.g., "{title}-{date}"
    // Site blocklist - URLs/patterns where MDView should not render
    blockedSites?: string[]; // e.g., ["github.com", "*.gitlab.com/*/blob/*"]
  };
  document: {
    path: string;
    content: string;
    scrollPosition: number;
    renderState: 'pending' | 'rendering' | 'complete' | 'error';
  };
  ui: {
    theme: Theme | null;
    maximizedDiagram: string | null;
    visibleDiagrams: Set<string>;
    tocVisible?: boolean; // Current TOC visibility state
  };
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  variant: 'light' | 'dark';
  author: string;
  version: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  syntaxTheme: string;
  mermaidTheme: MermaidThemeConfig;
}

export interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  heading: string;
  link: string;
  linkHover: string;
  linkVisited: string;
  codeBackground: string;
  codeText: string;
  codeKeyword: string;
  codeString: string;
  codeComment: string;
  codeFunction: string;
  border: string;
  borderLight: string;
  borderHeavy: string;
  selection: string;
  highlight: string;
  shadow: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFontFamily?: string;
  codeFontFamily: string;
  baseFontSize: string;
  baseLineHeight: number;
  h1Size: string;
  h2Size: string;
  h3Size: string;
  h4Size: string;
  h5Size: string;
  h6Size: string;
  fontWeightNormal: number;
  fontWeightBold: number;
  headingFontWeight: number;
}

export interface ThemeSpacing {
  blockMargin: string;
  paragraphMargin: string;
  listItemMargin: string;
  headingMargin: string;
  codeBlockPadding: string;
  tableCellPadding: string;
}

export interface MermaidThemeConfig {
  theme: 'base' | 'dark' | 'default' | 'forest' | 'neutral';
  themeVariables: {
    primaryColor: string;
    primaryTextColor: string;
    primaryBorderColor: string;
    lineColor: string;
    secondaryColor: string;
    tertiaryColor: string;
    background: string;
    mainBkg: string;
    [key: string]: string;
  };
}

export interface ConversionResult {
  html: string;
  metadata: {
    wordCount: number;
    headings: HeadingInfo[];
    codeBlocks: CodeBlockInfo[];
    mermaidBlocks: MermaidBlockInfo[];
    images: ImageInfo[];
    links: LinkInfo[];
  };
  errors: ParseError[];
}

export interface HeadingInfo {
  level: number;
  text: string;
  id: string;
  line: number;
}

export interface CodeBlockInfo {
  language: string;
  code: string;
  line: number;
  lines: number;
}

export interface MermaidBlockInfo {
  code: string;
  line: number;
}

export interface ImageInfo {
  src: string;
  alt: string;
  title?: string;
  line: number;
}

export interface LinkInfo {
  href: string;
  text: string;
  line: number;
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ParseError[];
  warnings: ParseError[];
}

// Cache types
export interface CachedResult {
  html: string;
  metadata: ConversionResult['metadata'];
  highlightedBlocks: Map<string, string>;
  mermaidSVGs: Map<string, string>;
  timestamp: number;
  cacheKey: string;
}

export interface CacheEntry {
  result: CachedResult;
  filePath: string;
  contentHash: string;
  theme: ThemeName;
  lastAccessed: number;
}

// Worker types
export type WorkerTaskType = 'parse' | 'highlight' | 'mermaid';

export interface WorkerTask {
  type: WorkerTaskType;
  id: string;
  payload: unknown;
  priority?: number;
}

// Message types for communication between content script and service worker
export type MessageType =
  | 'GET_STATE'
  | 'UPDATE_PREFERENCES'
  | 'APPLY_THEME'
  | 'CACHE_GENERATE_KEY'
  | 'CACHE_GET'
  | 'CACHE_SET'
  | 'CACHE_INVALIDATE'
  | 'CACHE_INVALIDATE_BY_PATH'
  | 'CACHE_STATS'
  | 'REPORT_ERROR'
  | 'CHECK_FILE_CHANGED' // New message type
  | 'PREFERENCES_UPDATED'
  | 'RELOAD_CONTENT';

export interface WorkerResponse {
  id: string;
  result?: unknown;
  error?: string;
}

export interface ParseTaskPayload {
  markdown: string;
  options?: {
    breaks?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    enableHtml?: boolean;
  };
}

export interface ParseTaskResult {
  html: string;
  metadata: ConversionResult['metadata'];
}

export interface HighlightTaskPayload {
  code: string;
  language: string;
}

export interface HighlightTaskResult {
  html: string;
  language: string;
}

export interface MermaidTaskPayload {
  code: string;
  theme?: MermaidThemeConfig;
  id: string;
}

export interface MermaidTaskResult {
  svg: string;
  id: string;
}

// Export feature types

/**
 * Supported export formats
 */
export type ExportFormat = 'docx' | 'pdf';

/**
 * Standard paper sizes for PDF export
 * ISO A-series: A0, A1, A3, A4, A5, A6
 * North American: Letter, Legal, Tabloid, Executive
 */
export type PaperSize =
  | 'A0'
  | 'A1'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'Letter'
  | 'Legal'
  | 'Tabloid'
  | 'Executive';

/**
 * Content node types for export
 */
export type ContentNodeType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'code'
  | 'table'
  | 'image'
  | 'mermaid'
  | 'blockquote'
  | 'hr';

/**
 * Structured content node for export
 */
export interface ContentNode {
  type: ContentNodeType;
  content: string | ContentNode[];
  attributes: {
    level?: number; // For headings (1-6)
    language?: string; // For code blocks
    ordered?: boolean; // For lists
    id?: string; // For headings, images, mermaid
    src?: string; // For images
    alt?: string; // For images
    [key: string]: unknown;
  };
  children?: ContentNode[];
}

/**
 * Collected content from rendered markdown
 */
export interface CollectedContent {
  title: string;
  nodes: ContentNode[];
  metadata: {
    wordCount: number;
    imageCount: number;
    mermaidCount: number;
    exportedAt: Date;
  };
}

/**
 * SVG conversion options
 */
export interface SVGConversionOptions {
  scale?: number; // Default: 2 (retina) - only used for raster formats
  format?: 'png' | 'jpeg' | 'svg'; // 'svg' preserves vector format
  quality?: number; // JPEG quality 0-1
  backgroundColor?: string;
}

/**
 * Converted image data
 */
export interface ConvertedImage {
  id: string;
  data: string; // base64 encoded
  width: number;
  height: number;
  format: string;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeImages?: boolean;
  includeMermaid?: boolean;
}

/**
 * Export progress information
 */
export interface ExportProgress {
  stage: 'collecting' | 'converting' | 'generating' | 'downloading';
  progress: number; // 0-100
  message: string;
}

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: ExportProgress) => void;

/**
 * DOCX Generator options
 */
export interface DOCXGeneratorOptions {
  title?: string;
  author?: string;
  includeTableOfContents?: boolean;
  pageSize?: PaperSize;
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Export UI Options
 */
export interface ExportUIOptions {
  position?: 'left' | 'right';
  formats?: ExportFormat[];
  defaultPageSize?: PaperSize;
  defaultFormat?: ExportFormat;
  includeTableOfContents?: boolean;
  filenameTemplate?: string;
}

/**
 * Export UI State
 */
export interface ExportUIState {
  isMenuOpen: boolean;
  isExporting: boolean;
  currentProgress: ExportProgress | null;
  lastError: Error | null;
}

/**
 * PDF Generator options
 */
export interface PDFGeneratorOptions {
  paperSize?: PaperSize;
  orientation?: 'portrait' | 'landscape';
  margins?: string; // CSS margin value
  convertSvgsToImages?: boolean;
  pageBreakBeforeHeadings?: boolean;
}

/**
 * Filename template variables
 */
export type FilenameTemplateVar =
  | '{title}' // Document title
  | '{date}' // YYYY-MM-DD
  | '{datetime}' // YYYY-MM-DD_HH-mm
  | '{timestamp}' // Unix timestamp
  | '{year}' // YYYY
  | '{month}' // MM
  | '{day}'; // DD
