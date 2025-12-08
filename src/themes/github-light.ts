/**
 * GitHub Light Theme
 * Based on GitHub's markdown styles
 */

import type { Theme } from '../types';

const githubLight: Theme = {
  name: 'github-light',
  displayName: 'GitHub Light',
  variant: 'light',
  author: 'GitHub',
  version: '1.0.0',

  colors: {
    background: '#ffffff',
    backgroundSecondary: '#f6f8fa',
    backgroundTertiary: '#eaeef2',
    foreground: '#24292f',
    foregroundSecondary: '#57606a',
    foregroundMuted: '#6e7781',
    primary: '#0969da',
    secondary: '#6e7781',
    accent: '#0969da',
    heading: '#1f2328',
    link: '#0969da',
    linkHover: '#0550ae',
    linkVisited: '#8250df',
    codeBackground: '#f6f8fa',
    codeText: '#24292f',
    codeKeyword: '#cf222e',
    codeString: '#0a3069',
    codeComment: '#6e7781',
    codeFunction: '#8250df',
    border: '#d0d7de',
    borderLight: '#d8dee4',
    borderHeavy: '#8c959f',
    selection: 'rgba(9, 105, 218, 0.2)',
    highlight: '#fff8c5',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#1a7f37',
    warning: '#9a6700',
    error: '#cf222e',
    info: '#0969da',
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

  syntaxTheme: 'github',

  mermaidTheme: {
    theme: 'base',
    themeVariables: {
      primaryColor: '#0969da',
      primaryTextColor: '#000000',
      primaryBorderColor: '#0969da',
      lineColor: '#24292f',
      secondaryColor: '#f6f8fa',
      tertiaryColor: '#eaeef2',
      background: '#ffffff',
      mainBkg: '#f6f8fa',
      secondaryBkg: '#eaeef2',
      tertiaryBkg: '#ffffff',
      textColor: '#24292f',
      nodeBkg: '#f6f8fa',
      nodeBorder: '#d0d7de',
      clusterBkg: '#eaeef2',
      clusterBorder: '#d0d7de',
      defaultLinkColor: '#0969da',
      titleColor: '#1f2328',
      edgeLabelBackground: '#ffffff',
      actorBorder: '#d0d7de',
      actorBkg: '#f6f8fa',
      actorTextColor: '#24292f',
      actorLineColor: '#d0d7de',
      signalColor: '#24292f',
      signalTextColor: '#24292f',
      labelBoxBkgColor: '#f6f8fa',
      labelBoxBorderColor: '#d0d7de',
      labelTextColor: '#24292f',
      loopTextColor: '#24292f',
      noteBorderColor: '#d0d7de',
      noteBkgColor: '#fff8c5',
      noteTextColor: '#24292f',
      activationBorderColor: '#d0d7de',
      activationBkgColor: '#eaeef2',
      sequenceNumberColor: '#ffffff',
    },
  },
};

export default githubLight;
