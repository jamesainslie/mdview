/**
 * Catppuccin Latte Theme
 * Light variant of Catppuccin
 */

import type { Theme } from '../types';

const catppuccinLatte: Theme = {
  name: 'catppuccin-latte',
  displayName: 'Catppuccin Latte',
  variant: 'light',
  author: 'Catppuccin',
  version: '1.0.0',

  colors: {
    background: '#eff1f5',
    backgroundSecondary: '#e6e9ef',
    backgroundTertiary: '#dce0e8',
    foreground: '#4c4f69',
    foregroundSecondary: '#5c5f77',
    foregroundMuted: '#6c6f85',
    primary: '#1e66f5',
    secondary: '#7287fd',
    accent: '#8839ef',
    heading: '#4c4f69',
    link: '#1e66f5',
    linkHover: '#04a5e5',
    linkVisited: '#8839ef',
    codeBackground: '#e6e9ef',
    codeText: '#4c4f69',
    codeKeyword: '#d20f39',
    codeString: '#40a02b',
    codeComment: '#7c7f93',
    codeFunction: '#8839ef',
    border: '#dce0e8',
    borderLight: '#e6e9ef',
    borderHeavy: '#bcc0cc',
    selection: 'rgba(30, 102, 245, 0.2)',
    highlight: '#df8e1d',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#40a02b',
    warning: '#df8e1d',
    error: '#d20f39',
    info: '#1e66f5',
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

  syntaxTheme: 'github',

  mermaidTheme: {
    theme: 'base',
    themeVariables: {
      primaryColor: '#1e66f5',
      primaryTextColor: '#eff1f5',
      primaryBorderColor: '#1e66f5',
      lineColor: '#4c4f69',
      secondaryColor: '#e6e9ef',
      tertiaryColor: '#dce0e8',
      background: '#eff1f5',
      mainBkg: '#e6e9ef',
      secondaryBkg: '#dce0e8',
      tertiaryBkg: '#eff1f5',
      textColor: '#4c4f69',
      tertiaryTextColor: '#4c4f69',
      nodeBkg: '#e6e9ef',
      nodeBorder: '#dce0e8',
      clusterBkg: '#dce0e8',
      clusterBorder: '#dce0e8',
      defaultLinkColor: '#1e66f5',
      titleColor: '#4c4f69',
      edgeLabelBackground: '#eff1f5',
      // ER diagram specific
      relationLabelColor: '#4c4f69',
      relationLabelBackground: '#eff1f5',
      attributeBackgroundColorOdd: '#e6e9ef',
      attributeBackgroundColorEven: '#dce0e8',
    },
  },
};

export default catppuccinLatte;
