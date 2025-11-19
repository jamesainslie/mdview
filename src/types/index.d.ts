// Type definitions for MDView

/**
 * Global window extensions
 */
declare global {
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
  | 'monokai-pro';

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
    syncTabs: boolean;
    logLevel: LogLevel;
    debug?: boolean; // Deprecated
    // Editor / Appearance Overrides
    fontFamily?: string;
    codeFontFamily?: string;
    lineHeight?: number;
    maxWidth?: number;
    useMaxWidth?: boolean; // Toggle for full width
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

