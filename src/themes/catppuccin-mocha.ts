/**
 * Catppuccin Mocha Theme
 * Dark variant of Catppuccin
 */

import type { Theme } from '../types';

const catppuccinMocha: Theme = {
  name: 'catppuccin-mocha',
  displayName: 'Catppuccin Mocha',
  variant: 'dark',
  author: 'Catppuccin',
  version: '1.0.0',

  colors: {
    background: '#1e1e2e',
    backgroundSecondary: '#181825',
    backgroundTertiary: '#11111b',
    foreground: '#cdd6f4',
    foregroundSecondary: '#bac2de',
    foregroundMuted: '#a6adc8',
    primary: '#89b4fa',
    secondary: '#74c7ec',
    accent: '#cba6f7',
    heading: '#cdd6f4',
    link: '#89b4fa',
    linkHover: '#89dceb',
    linkVisited: '#cba6f7',
    codeBackground: '#181825',
    codeText: '#cdd6f4',
    codeKeyword: '#f38ba8',
    codeString: '#a6e3a1',
    codeComment: '#6c7086',
    codeFunction: '#cba6f7',
    border: '#313244',
    borderLight: '#45475a',
    borderHeavy: '#585b70',
    selection: 'rgba(137, 180, 250, 0.2)',
    highlight: '#f9e2af',
    shadow: 'rgba(0, 0, 0, 0.5)',
    success: '#a6e3a1',
    warning: '#f9e2af',
    error: '#f38ba8',
    info: '#89b4fa',
  },

  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
    codeFontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    baseFontSize: '16px',
    baseLineHeight: 1.5,
    h1Size: '2em',
    h2Size: '1.5em',
    h3Size: '1.25em',
    h4Size: '1em',
    h5Size: '0.875em',
    h6Size: '0.85em',
    fontWeightNormal: 400,
    fontWeightBold: 600,
    headingFontWeight: 600,
  },

  spacing: {
    blockMargin: '16px 0',
    paragraphMargin: '16px 0',
    listItemMargin: '4px 0',
    headingMargin: '24px 0 16px 0',
    codeBlockPadding: '16px',
    tableCellPadding: '6px 13px',
  },

  syntaxTheme: 'github-dark',

  mermaidTheme: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#89b4fa',
      primaryTextColor: '#1e1e2e',
      primaryBorderColor: '#89b4fa',
      lineColor: '#cdd6f4',
      secondaryColor: '#181825',
      tertiaryColor: '#11111b',
      background: '#1e1e2e',
      mainBkg: '#181825',
      secondaryBkg: '#11111b',
      tertiaryBkg: '#1e1e2e',
      textColor: '#cdd6f4',
      nodeBkg: '#181825',
      nodeBorder: '#313244',
      clusterBkg: '#11111b',
      clusterBorder: '#313244',
      defaultLinkColor: '#89b4fa',
      titleColor: '#cdd6f4',
      edgeLabelBackground: '#1e1e2e',
    },
  },
};

export default catppuccinMocha;

