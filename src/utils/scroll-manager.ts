/**
 * Scroll Manager
 * Saves and restores scroll position across page reloads
 */

import { debug } from './debug-logger';

interface ScrollState {
  position: number;
  timestamp: number;
  filePath: string;
  visibleSectionId?: string;
}

export class ScrollManager {
  private static readonly STORAGE_KEY = 'mdview-scroll-state';
  private static readonly MAX_AGE = 5000; // 5 seconds - only restore recent scrolls
  private saveTimeout: number | null = null;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Save current scroll position (debounced)
   */
  savePosition(visibleSectionId?: string): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = window.setTimeout(() => {
      const state: ScrollState = {
        position: window.scrollY,
        timestamp: Date.now(),
        filePath: this.filePath,
        visibleSectionId,
      };

      try {
        sessionStorage.setItem(ScrollManager.STORAGE_KEY, JSON.stringify(state));
        debug.debug('ScrollManager', `Saved scroll position: ${state.position}px, section: ${visibleSectionId || 'none'}`);
      } catch (error) {
        debug.error('ScrollManager', 'Failed to save scroll position:', error);
      }
    }, 200); // Debounce 200ms
  }

  /**
   * Get saved scroll position for current file
   */
  getSavedPosition(): ScrollState | null {
    try {
      const stored = sessionStorage.getItem(ScrollManager.STORAGE_KEY);
      if (!stored) return null;

      const state: ScrollState = JSON.parse(stored);

      // Only restore if it's for the same file and recent
      const age = Date.now() - state.timestamp;
      if (state.filePath !== this.filePath || age > ScrollManager.MAX_AGE) {
        debug.debug('ScrollManager', 'Ignoring stale or mismatched scroll state');
        sessionStorage.removeItem(ScrollManager.STORAGE_KEY);
        return null;
      }

      debug.info('ScrollManager', `Found saved scroll position: ${state.position}px, section: ${state.visibleSectionId || 'none'}`);
      return state;
    } catch (error) {
      debug.error('ScrollManager', 'Failed to get scroll position:', error);
      return null;
    }
  }

  /**
   * Restore scroll position
   */
  restorePosition(state: ScrollState): void {
    debug.info('ScrollManager', `Restoring scroll position to ${state.position}px`);

    // Try to scroll to the section first (more reliable)
    if (state.visibleSectionId) {
      const section = document.querySelector(`[data-section-id="${state.visibleSectionId}"]`);
      if (section) {
        section.scrollIntoView({ behavior: 'auto' });
        debug.debug('ScrollManager', `Scrolled to section: ${state.visibleSectionId}`);
        
        // Clear the saved position immediately after restoring
        // This prevents re-restoration on subsequent operations
        this.clearSavedPosition();
        return;
      }
    }

    // Fallback to pixel position
    window.scrollTo(0, state.position);
    
    // Clear the saved position immediately after restoring
    this.clearSavedPosition();
  }

  /**
   * Clear saved position
   */
  clearSavedPosition(): void {
    sessionStorage.removeItem(ScrollManager.STORAGE_KEY);
  }

  /**
   * Get the currently visible section
   */
  getVisibleSection(): string | null {
    const sections = document.querySelectorAll('[data-section-id]');
    if (sections.length === 0) return null;

    // Find the first section that's at least 30% visible in viewport
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const threshold = window.innerHeight * 0.3;

    for (const section of Array.from(sections)) {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const sectionBottom = sectionTop + rect.height;

      // Check if section is in viewport
      if (sectionBottom > viewportTop && sectionTop < viewportBottom) {
        // Check if at least threshold is visible
        const visibleTop = Math.max(sectionTop, viewportTop);
        const visibleBottom = Math.min(sectionBottom, viewportBottom);
        const visibleHeight = visibleBottom - visibleTop;

        if (visibleHeight >= threshold) {
          return section.getAttribute('data-section-id');
        }
      }
    }

    // Fallback to first section in viewport
    for (const section of Array.from(sections)) {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        return section.getAttribute('data-section-id');
      }
    }

    return null;
  }

  /**
   * Set up automatic scroll position tracking
   */
  startTracking(): () => void {
    const handleScroll = () => {
      const visibleSection = this.getVisibleSection();
      this.savePosition(visibleSection || undefined);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    debug.debug('ScrollManager', 'Started tracking scroll position');

    // Return cleanup function
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      debug.debug('ScrollManager', 'Stopped tracking scroll position');
    };
  }
}

