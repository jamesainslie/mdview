/**
 * Monokai Pro Theme
 * Enhanced version of Monokai with refined colors
 */

import type { Theme } from '../types';

const monokaiPro: Theme = {
  name: 'monokai-pro',
  displayName: 'Monokai Pro',
  variant: 'dark',
  author: 'Monokai',
  version: '1.0.0',

  colors: {
    background: '#2d2a2e',
    backgroundSecondary: '#403e41',
    backgroundTertiary: '#5b595c',
    foreground: '#fcfcfa',
    foregroundSecondary: '#d9d9d7',
    foregroundMuted: '#939293',
    primary: '#78dce8',
    secondary: '#a9dc76',
    accent: '#ab9df2',
    heading: '#fcfcfa',
    link: '#78dce8',
    linkHover: '#a9dc76',
    linkVisited: '#ab9df2',
    codeBackground: '#403e41',
    codeText: '#fcfcfa',
    codeKeyword: '#ff6188',
    codeString: '#ffd866',
    codeComment: '#727072',
    codeFunction: '#a9dc76',
    border: '#5b595c',
    borderLight: '#6e6c6f',
    borderHeavy: '#939293',
    selection: 'rgba(120, 220, 232, 0.2)',
    highlight: '#ffd866',
    shadow: 'rgba(0, 0, 0, 0.5)',
    success: '#a9dc76',
    warning: '#ffd866',
    error: '#ff6188',
    info: '#78dce8',
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

  syntaxTheme: 'monokai',

  mermaidTheme: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#78dce8',
      primaryTextColor: '#2d2a2e',
      primaryBorderColor: '#78dce8',
      lineColor: '#fcfcfa',
      secondaryColor: '#403e41',
      tertiaryColor: '#5b595c',
      background: '#2d2a2e',
      mainBkg: '#403e41',
      secondaryBkg: '#5b595c',
      tertiaryBkg: '#2d2a2e',
      textColor: '#fcfcfa',
      nodeBkg: '#403e41',
      nodeBorder: '#5b595c',
      clusterBkg: '#5b595c',
      clusterBorder: '#5b595c',
      defaultLinkColor: '#78dce8',
      titleColor: '#fcfcfa',
      edgeLabelBackground: '#2d2a2e',
    },
  },
};

export default monokaiPro;

