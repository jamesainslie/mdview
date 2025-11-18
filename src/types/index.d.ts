// Type definitions for MDView

export type ThemeName =
  | 'github-light'
  | 'github-dark'
  | 'catppuccin-latte'
  | 'catppuccin-frappe'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'monokai'
  | 'monokai-pro';

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
    debug: boolean;
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

