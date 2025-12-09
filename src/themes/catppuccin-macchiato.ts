/**
 * Catppuccin Macchiato Theme
 * Dark-medium variant of Catppuccin
 */

import type { Theme } from '../types';

const catppuccinMacchiato: Theme = {
  name: 'catppuccin-macchiato',
  displayName: 'Catppuccin Macchiato',
  variant: 'dark',
  author: 'Catppuccin',
  version: '1.0.0',

  colors: {
    background: '#24273a',
    backgroundSecondary: '#1e2030',
    backgroundTertiary: '#181926',
    foreground: '#cad3f5',
    foregroundSecondary: '#b8c0e0',
    foregroundMuted: '#a5adcb',
    primary: '#8aadf4',
    secondary: '#7dc4e4',
    accent: '#c6a0f6',
    heading: '#cad3f5',
    link: '#8aadf4',
    linkHover: '#91d7e3',
    linkVisited: '#c6a0f6',
    codeBackground: '#1e2030',
    codeText: '#cad3f5',
    codeKeyword: '#ed8796',
    codeString: '#a6da95',
    codeComment: '#6e738d',
    codeFunction: '#c6a0f6',
    border: '#363a4f',
    borderLight: '#494d64',
    borderHeavy: '#5b6078',
    selection: 'rgba(138, 173, 244, 0.2)',
    highlight: '#f5a97f',
    shadow: 'rgba(0, 0, 0, 0.4)',
    success: '#a6da95',
    warning: '#eed49f',
    error: '#ed8796',
    info: '#8aadf4',
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
      primaryColor: '#8aadf4',
      primaryTextColor: '#24273a',
      primaryBorderColor: '#8aadf4',
      lineColor: '#cad3f5',
      secondaryColor: '#1e2030',
      tertiaryColor: '#181926',
      background: '#24273a',
      mainBkg: '#1e2030',
      secondaryBkg: '#181926',
      tertiaryBkg: '#24273a',
      textColor: '#cad3f5',
      tertiaryTextColor: '#cad3f5',
      nodeBkg: '#1e2030',
      nodeBorder: '#363a4f',
      clusterBkg: '#181926',
      clusterBorder: '#363a4f',
      defaultLinkColor: '#8aadf4',
      titleColor: '#cad3f5',
      edgeLabelBackground: '#24273a',
      // ER diagram specific
      relationLabelColor: '#cad3f5',
      relationLabelBackground: '#24273a',
      attributeBackgroundColorOdd: '#1e2030',
      attributeBackgroundColorEven: '#181926',
    },
  },
};

export default catppuccinMacchiato;
