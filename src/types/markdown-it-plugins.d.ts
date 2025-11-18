/**
 * Type declarations for markdown-it plugins without official types
 */

declare module 'markdown-it-attrs' {
  import type MarkdownIt from 'markdown-it';
  const markdownItAttrs: MarkdownIt.PluginWithOptions;
  export default markdownItAttrs;
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it';
  const markdownItTaskLists: MarkdownIt.PluginWithOptions;
  export default markdownItTaskLists;
}

declare module 'markdown-it-emoji' {
  import type MarkdownIt from 'markdown-it';
  const markdownItEmoji: MarkdownIt.PluginSimple;
  export default markdownItEmoji;
}

declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it';
  const markdownItFootnote: MarkdownIt.PluginSimple;
  export default markdownItFootnote;
}

