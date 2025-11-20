/**
 * Test fixtures - Sample markdown and expected outputs
 */

export const markdownSamples = {
  // Basic elements
  heading: '# Hello World\n## Subtitle\n### Level 3',
  paragraph: 'This is a simple paragraph.\n\nThis is another paragraph.',
  bold: '**bold text** and __more bold__',
  italic: '*italic text* and _more italic_',
  strikethrough: '~~strikethrough text~~',
  code: 'Inline `code` here',
  link: '[Link text](https://example.com)',
  image: '![Alt text](image.png "Title")',

  // Lists
  unorderedList: '- Item 1\n- Item 2\n  - Nested 1\n  - Nested 2\n- Item 3',
  orderedList: '1. First\n2. Second\n   1. Nested A\n   2. Nested B\n3. Third',
  taskList: '- [x] Completed task\n- [ ] Incomplete task\n- [x] Another done',

  // Code blocks
  codeBlock: '```javascript\nconst x = 1;\nconsole.log(x);\n```',
  pythonCode: '```python\ndef hello():\n    print("Hello")\n```',
  indentedCode: '    const indented = true;\n    return indented;',

  // Blockquote
  blockquote: '> This is a quote\n> Multi-line quote',
  nestedBlockquote: '> Level 1\n>> Level 2\n>>> Level 3',

  // Table (GFM)
  table: `| Header 1 | Header 2 | Header 3 |
|----------|:--------:|---------:|
| Left     | Center   | Right    |
| Data     | Data     | Data     |`,

  // Horizontal rule
  hr: '---\n\nContent after hr\n\n***\n\nMore content',

  // Mermaid diagram
  mermaid: '```mermaid\ngraph TD\n  A-->B\n  B-->C\n```',

  // Emoji
  emoji: ':wave: :rocket: :heart:',

  // Mixed content
  complex: `# Main Title

This is a paragraph with **bold** and *italic* text.

## Code Example

\`\`\`javascript
function test() {
  return 'hello';
}
\`\`\`

## Task List

- [x] Done
- [ ] Todo

## Table

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |

> A quote here

[Link](https://example.com) and ![image](test.png)
`,

  // Edge cases
  empty: '',
  whitespace: '   \n\n   \n',
  veryLong: 'a'.repeat(10000),
  deeplyNested: Array(20)
    .fill('>')
    .join(' ') + ' Deep quote',
  specialChars: '& < > " \' \n`code` with <html>',
  unicode: '🎉 Unicode: ñ, ü, 中文, 日本語',
};

export const expectedHtml = {
  heading: /<h1[^>]*>Hello World<\/h1>[\s\S]*<h2[^>]*>Subtitle<\/h2>[\s\S]*<h3[^>]*>Level 3<\/h3>/,
  paragraph: /<p>This is a simple paragraph.<\/p>[\s\S]*<p>This is another paragraph.<\/p>/,
  bold: /<strong>bold text<\/strong>[\s\S]*<strong>more bold<\/strong>/,
  italic: /<em>italic text<\/em>[\s\S]*<em>more italic<\/em>/,
  strikethrough: /<s>strikethrough text<\/s>/,
  code: /<code>code<\/code>/,
  link: /<a[^>]*href="https:\/\/example\.com"[^>]*>Link text<\/a>/,
  unorderedList: /<ul>[\s\S]*<li>Item 1<\/li>[\s\S]*<li>Item 2[\s\S]*<ul>[\s\S]*<li>Nested 1<\/li>/,
  orderedList: /<ol>[\s\S]*<li>First<\/li>[\s\S]*<ol>[\s\S]*<li>Nested A<\/li>/,
  taskList: /<input[^>]*type="checkbox"[^>]*checked/,
  codeBlock: /<pre><code class="language-javascript">/,
  blockquote: /<blockquote>[\s\S]*<p>This is a quote/,
  table: /<table>[\s\S]*<thead>[\s\S]*<th>Header 1<\/th>/,
  mermaid: /<div[^>]*class="mermaid-container"/,
};

// XSS test payloads
export const xssPayloads = {
  scriptTag: '<script>alert("xss")</script>',
  scriptInMarkdown: 'Text <script>alert("xss")</script> text',
  onError: '<img src=x onerror="alert(1)">',
  onLoad: '<img src=x onload="alert(1)">',
  onClick: '<div onclick="alert(1)">Click</div>',
  javascriptUrl: '[Click](javascript:alert(1))',
  dataUrl: '<img src="data:text/html,<script>alert(1)</script>">',
  iframe: '<iframe src="evil.com"></iframe>',
  object: '<object data="evil.swf"></object>',
  embed: '<embed src="evil.swf">',
  nestedScript: '<div><span><script>alert(1)</script></span></div>',
  encodedScript: '&lt;script&gt;alert(1)&lt;/script&gt;',
  mixedCase: '<ScRiPt>alert(1)</ScRiPt>',
  svgScript: '<svg><script>alert(1)</script></svg>',
  proto污染: '__proto__[polluted]=true',
};

// Theme fixtures
export const mockTheme = {
  name: 'test-theme' as const,
  displayName: 'Test Theme',
  variant: 'light' as const,
  author: 'Test Author',
  version: '1.0.0',
  colors: {
    background: '#ffffff',
    backgroundSecondary: '#f6f8fa',
    backgroundTertiary: '#f0f0f0',
    foreground: '#24292e',
    foregroundSecondary: '#586069',
    foregroundMuted: '#6a737d',
    primary: '#0366d6',
    secondary: '#28a745',
    accent: '#f66a0a',
    heading: '#24292e',
    link: '#0366d6',
    linkHover: '#0256c7',
    linkVisited: '#6f42c1',
    codeBackground: '#f6f8fa',
    codeText: '#24292e',
    codeKeyword: '#d73a49',
    codeString: '#032f62',
    codeComment: '#6a737d',
    codeFunction: '#6f42c1',
    border: '#e1e4e8',
    borderLight: '#eaecef',
    borderHeavy: '#d1d5da',
    selection: '#c8e1ff',
    highlight: '#fffbdd',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#28a745',
    warning: '#ffd33d',
    error: '#d73a49',
    info: '#0366d6',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    codeFontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    baseFontSize: '16px',
    baseLineHeight: 1.6,
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
    blockMargin: '1em 0',
    paragraphMargin: '0 0 1em 0',
    listItemMargin: '0.25em 0',
    headingMargin: '1.5em 0 0.5em 0',
    codeBlockPadding: '1em',
    tableCellPadding: '0.5em 1em',
  },
  syntaxTheme: 'github',
  mermaidTheme: {
    theme: 'default' as const,
    themeVariables: {
      primaryColor: '#0366d6',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#0256c7',
      lineColor: '#586069',
      secondaryColor: '#28a745',
      tertiaryColor: '#f66a0a',
      background: '#ffffff',
      mainBkg: '#f6f8fa',
    },
  },
};

// Performance test data
export const largeMarkdown = {
  small: 'a'.repeat(10 * 1024), // 10KB
  medium: 'a'.repeat(100 * 1024), // 100KB
  large: 'a'.repeat(1024 * 1024), // 1MB
  manyCodeBlocks: Array(100)
    .fill(0)
    .map((_, i) => `\`\`\`javascript\nconst x${i} = ${i};\n\`\`\``)
    .join('\n\n'),
  manyHeadings: Array(1000)
    .fill(0)
    .map((_, i) => `## Heading ${i}\n\nContent ${i}`)
    .join('\n\n'),
};

