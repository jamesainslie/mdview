/**
 * Catppuccin Frappé Theme
 * Light-medium variant of Catppuccin
 */

import type { Theme } from '../types';

const catppuccinFrappe: Theme = {
  name: 'catppuccin-frappe',
  displayName: 'Catppuccin Frappé',
  variant: 'light',
  author: 'Catppuccin',
  version: '1.0.0',

  colors: {
    background: '#303446',
    backgroundSecondary: '#292c3c',
    backgroundTertiary: '#232634',
    foreground: '#c6d0f5',
    foregroundSecondary: '#b5bfe2',
    foregroundMuted: '#a5adce',
    primary: '#8caaee',
    secondary: '#85c1dc',
    accent: '#ca9ee6',
    heading: '#c6d0f5',
    link: '#8caaee',
    linkHover: '#99d1db',
    linkVisited: '#ca9ee6',
    codeBackground: '#292c3c',
    codeText: '#c6d0f5',
    codeKeyword: '#e78284',
    codeString: '#a6d189',
    codeComment: '#737994',
    codeFunction: '#ca9ee6',
    border: '#414559',
    borderLight: '#51576d',
    borderHeavy: '#626880',
    selection: 'rgba(140, 170, 238, 0.2)',
    highlight: '#ef9f76',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#a6d189',
    warning: '#ef9f76',
    error: '#e78284',
    info: '#8caaee',
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
      primaryColor: '#8caaee',
      primaryTextColor: '#303446',
      primaryBorderColor: '#8caaee',
      lineColor: '#c6d0f5',
      secondaryColor: '#292c3c',
      tertiaryColor: '#232634',
      background: '#303446',
      mainBkg: '#292c3c',
      secondaryBkg: '#232634',
      tertiaryBkg: '#303446',
      textColor: '#c6d0f5',
      nodeBkg: '#292c3c',
      nodeBorder: '#414559',
      clusterBkg: '#232634',
      clusterBorder: '#414559',
      defaultLinkColor: '#8caaee',
      titleColor: '#c6d0f5',
      edgeLabelBackground: '#303446',
    },
  },
};

export default catppuccinFrappe;

