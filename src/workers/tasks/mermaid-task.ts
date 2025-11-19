/**
 * Mermaid Task
 * Handles Mermaid diagram rendering in worker context
 */

import mermaid from 'mermaid';
import type { MermaidTaskPayload, MermaidTaskResult } from '../../types';

// Initialize Mermaid
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  maxTextSize: 50000,
  maxEdges: 500,
  theme: 'base',
  flowchart: {
    htmlLabels: false,
    useMaxWidth: true,
  },
  sequence: {
    useMaxWidth: true,
  },
  gantt: {
    useMaxWidth: true,
  },
});

/**
 * Handle Mermaid rendering task
 */
export async function handleMermaidTask(payload: unknown): Promise<MermaidTaskResult> {
  const { code, theme, id } = payload as MermaidTaskPayload;

  try {
    // Apply theme if provided
    if (theme) {
      mermaid.initialize({
        theme: theme.theme,
        themeVariables: theme.themeVariables,
      });
    }

    // Validate syntax
    const validation = await validateSyntax(code);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid Mermaid syntax');
    }

    // Generate unique ID for SVG
    const svgId = `mermaid-svg-${id}`;

    // Render with timeout
    const renderPromise = mermaid.render(svgId, code);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Render timeout')), 5000);
    });

    const result = await Promise.race([renderPromise, timeoutPromise]);

    return {
      svg: result.svg,
      id,
    };
  } catch (error) {
    console.error('[MermaidTask] Render error:', error);
    throw error;
  }
}

/**
 * Validate Mermaid syntax
 */
async function validateSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Basic validation
    if (!code.trim()) {
      return { valid: false, error: 'Empty diagram code' };
    }

    // Check size limits
    if (code.length > 50000) {
      return { valid: false, error: 'Diagram code exceeds size limit (50,000 characters)' };
    }

    // Try to parse
    await mermaid.parse(code);

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Parse error',
    };
  }
}


