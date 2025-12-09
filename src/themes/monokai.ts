/**
 * Monokai Theme
 * Classic Monokai color scheme
 */

import type { Theme } from '../types';

const monokai: Theme = {
  name: 'monokai',
  displayName: 'Monokai',
  variant: 'dark',
  author: 'Wimer Hazenberg',
  version: '1.0.0',

  colors: {
    background: '#272822',
    backgroundSecondary: '#3e3d32',
    backgroundTertiary: '#49483e',
    foreground: '#f8f8f2',
    foregroundSecondary: '#cfcfc2',
    foregroundMuted: '#75715e',
    primary: '#66d9ef',
    secondary: '#a1efe4',
    accent: '#ae81ff',
    heading: '#f8f8f2',
    link: '#66d9ef',
    linkHover: '#a1efe4',
    linkVisited: '#ae81ff',
    codeBackground: '#3e3d32',
    codeText: '#f8f8f2',
    codeKeyword: '#f92672',
    codeString: '#e6db74',
    codeComment: '#75715e',
    codeFunction: '#a6e22e',
    border: '#49483e',
    borderLight: '#5e5d52',
    borderHeavy: '#75715e',
    selection: 'rgba(102, 217, 239, 0.2)',
    highlight: '#e6db74',
    shadow: 'rgba(0, 0, 0, 0.5)',
    success: '#a6e22e',
    warning: '#e6db74',
    error: '#f92672',
    info: '#66d9ef',
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
      primaryColor: '#66d9ef',
      primaryTextColor: '#272822',
      primaryBorderColor: '#66d9ef',
      lineColor: '#f8f8f2',
      secondaryColor: '#3e3d32',
      tertiaryColor: '#49483e',
      background: '#272822',
      mainBkg: '#3e3d32',
      secondaryBkg: '#49483e',
      tertiaryBkg: '#272822',
      textColor: '#f8f8f2',
      tertiaryTextColor: '#f8f8f2',
      nodeBkg: '#3e3d32',
      nodeBorder: '#49483e',
      clusterBkg: '#49483e',
      clusterBorder: '#49483e',
      defaultLinkColor: '#66d9ef',
      titleColor: '#f8f8f2',
      edgeLabelBackground: '#272822',
      // ER diagram specific
      relationLabelColor: '#f8f8f2',
      relationLabelBackground: '#272822',
      attributeBackgroundColorOdd: '#3e3d32',
      attributeBackgroundColorEven: '#49483e',
    },
  },
};

export default monokai;
