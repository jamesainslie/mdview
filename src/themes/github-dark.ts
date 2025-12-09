/**
 * GitHub Dark Theme
 * Based on GitHub's dark mode styles
 */

import type { Theme } from '../types';

const githubDark: Theme = {
  name: 'github-dark',
  displayName: 'GitHub Dark',
  variant: 'dark',
  author: 'GitHub',
  version: '1.0.0',

  colors: {
    background: '#0d1117',
    backgroundSecondary: '#161b22',
    backgroundTertiary: '#21262d',
    foreground: '#c9d1d9',
    foregroundSecondary: '#8b949e',
    foregroundMuted: '#6e7681',
    primary: '#58a6ff',
    secondary: '#8b949e',
    accent: '#58a6ff',
    heading: '#c9d1d9',
    link: '#58a6ff',
    linkHover: '#79c0ff',
    linkVisited: '#a371f7',
    codeBackground: '#161b22',
    codeText: '#c9d1d9',
    codeKeyword: '#ff7b72',
    codeString: '#a5d6ff',
    codeComment: '#8b949e',
    codeFunction: '#d2a8ff',
    border: '#30363d',
    borderLight: '#21262d',
    borderHeavy: '#6e7681',
    selection: 'rgba(88, 166, 255, 0.2)',
    highlight: 'rgba(187, 128, 9, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    info: '#58a6ff',
  },

  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
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
      primaryColor: '#58a6ff',
      primaryTextColor: '#0d1117',
      primaryBorderColor: '#58a6ff',
      lineColor: '#c9d1d9',
      secondaryColor: '#161b22',
      tertiaryColor: '#21262d',
      background: '#0d1117',
      mainBkg: '#161b22',
      secondaryBkg: '#21262d',
      tertiaryBkg: '#0d1117',
      textColor: '#c9d1d9',
      tertiaryTextColor: '#c9d1d9',
      nodeBkg: '#161b22',
      nodeBorder: '#30363d',
      clusterBkg: '#21262d',
      clusterBorder: '#30363d',
      defaultLinkColor: '#58a6ff',
      titleColor: '#c9d1d9',
      edgeLabelBackground: '#0d1117',
      // ER diagram specific
      relationLabelColor: '#c9d1d9',
      relationLabelBackground: '#0d1117',
      attributeBackgroundColorOdd: '#161b22',
      attributeBackgroundColorEven: '#21262d',
      actorBorder: '#30363d',
      actorBkg: '#161b22',
      actorTextColor: '#c9d1d9',
      actorLineColor: '#30363d',
      signalColor: '#c9d1d9',
      signalTextColor: '#0d1117',
      labelBoxBkgColor: '#161b22',
      labelBoxBorderColor: '#30363d',
      labelTextColor: '#c9d1d9',
      loopTextColor: '#c9d1d9',
      noteBorderColor: '#30363d',
      noteBkgColor: 'rgba(187, 128, 9, 0.3)',
      noteTextColor: '#c9d1d9',
      activationBorderColor: '#30363d',
      activationBkgColor: '#21262d',
      sequenceNumberColor: '#0d1117',
    },
  },
};

export default githubDark;
