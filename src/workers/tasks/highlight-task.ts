/**
 * Highlight Task
 * Handles syntax highlighting in worker context
 */

import hljs from 'highlight.js/lib/core';
import type { HighlightTaskPayload, HighlightTaskResult } from '../../types';

// Import common languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import c from 'highlight.js/lib/languages/c';
import csharp from 'highlight.js/lib/languages/csharp';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import scss from 'highlight.js/lib/languages/scss';
import markdown from 'highlight.js/lib/languages/markdown';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import nginx from 'highlight.js/lib/languages/nginx';
import apache from 'highlight.js/lib/languages/apache';
import perl from 'highlight.js/lib/languages/perl';
import r from 'highlight.js/lib/languages/r';
import swift from 'highlight.js/lib/languages/swift';
import kotlin from 'highlight.js/lib/languages/kotlin';
import scala from 'highlight.js/lib/languages/scala';
import haskell from 'highlight.js/lib/languages/haskell';
import lua from 'highlight.js/lib/languages/lua';
import vim from 'highlight.js/lib/languages/vim';
import diff from 'highlight.js/lib/languages/diff';
import makefile from 'highlight.js/lib/languages/makefile';
import ini from 'highlight.js/lib/languages/ini';
import properties from 'highlight.js/lib/languages/properties';

// Register all languages
const languages: Record<string, any> = {
  javascript,
  typescript,
  python,
  bash,
  json,
  go,
  rust,
  java,
  cpp,
  c,
  csharp,
  ruby,
  php,
  sql,
  yaml,
  xml,
  html: xml,
  css,
  scss,
  markdown,
  dockerfile,
  nginx,
  apache,
  perl,
  r,
  swift,
  kotlin,
  scala,
  haskell,
  lua,
  vim,
  diff,
  makefile,
  ini,
  properties,
};

// Register languages
for (const [name, lang] of Object.entries(languages)) {
  hljs.registerLanguage(name, lang);
}

// Configure highlight.js
hljs.configure({
  classPrefix: 'hljs-',
  ignoreUnescapedHTML: true,
});

// Language aliases
const languageAliases: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  yml: 'yaml',
  md: 'markdown',
};

/**
 * Handle syntax highlighting task
 */
export async function handleHighlightTask(payload: unknown): Promise<HighlightTaskResult> {
  const { code, language } = payload as HighlightTaskPayload;

  // Normalize language name
  const normalizedLang = normalizeLanguage(language);

  try {
    // Check if language is available
    if (hljs.getLanguage(normalizedLang)) {
      const result = hljs.highlight(code, {
        language: normalizedLang,
        ignoreIllegals: true,
      });

      return {
        html: result.value,
        language: normalizedLang,
      };
    } else {
      // Fallback: auto-detect
      const result = hljs.highlightAuto(code);
      return {
        html: result.value,
        language: result.language || 'plaintext',
      };
    }
  } catch (error) {
    console.error(`[HighlightTask] Error highlighting ${normalizedLang}:`, error);
    // Return unformatted code
    return {
      html: escapeHtml(code),
      language: 'plaintext',
    };
  }
}

/**
 * Normalize language name
 */
function normalizeLanguage(language: string): string {
  const lower = language.toLowerCase();
  return languageAliases[lower] || lower;
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


