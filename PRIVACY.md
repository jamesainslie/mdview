# Privacy Policy for MDView

**Last Updated**: November 28, 2024

## Overview

MDView is a Chrome browser extension designed to render Markdown files with proper formatting. This privacy policy explains what data MDView collects, how it is used, and your rights regarding your data.

## Our Commitment

MDView is built with privacy as a core principle. The extension operates entirely on your local device and does not collect, transmit, or share any personal information with external servers.

## Data Collection and Usage

### Data We Collect

MDView collects and stores only the following data **locally on your device**:

1. **User Preferences**:
   - Selected theme (e.g., GitHub Dark, Catppuccin Mocha)
   - Auto dark mode preference
   - Light and dark theme pairings
   - Typography settings (font family, size, line height)
   - Code block preferences (syntax highlighting theme, line numbers)
   - Diagram settings (zoom level, animations)
   - Performance settings (auto-reload, lazy loading thresholds)
   - Advanced settings (tab synchronization, log level)

2. **Cached Content** (optional, temporary):
   - Previously rendered Markdown content for faster re-rendering
   - User can clear this cache at any time via settings

### How We Use This Data

All collected data is used exclusively to:
- Remember your visual preferences across browsing sessions
- Improve rendering performance through caching
- Provide a consistent viewing experience
- Synchronize settings across browser tabs (if enabled)

### Data Storage

All data is stored locally using:
- Chrome's `chrome.storage.sync` API for user preferences (syncs across devices if Chrome sync is enabled)
- Chrome's `chrome.storage.local` API for cached content
- IndexedDB for larger cache items

**No data is ever transmitted to external servers, analytics platforms, or third parties.**

## Data We Do NOT Collect

MDView does not collect, access, or transmit:

- Personal information (name, email, address, phone number)
- Browsing history or activity
- Content of your Markdown files
- File names or paths
- IP addresses
- Device identifiers
- Location data
- Authentication credentials
- Payment information
- Analytics or usage statistics
- Crash reports or error logs (unless you manually share them with support)

## File Access

MDView requires permission to access file:// URLs to render local Markdown files. This permission:
- Only activates on files with `.md` or `.markdown` extensions
- Reads file content solely for rendering in the browser
- Does not modify, create, or delete files
- Does not transmit file content anywhere
- Operates entirely within your browser

## External Network Access

MDView does not:
- Make network requests to external servers
- Contact APIs or web services
- Download remote content or code
- Send telemetry or analytics
- Check for updates automatically (updates come through Chrome Web Store)

The only network activity occurs if you open Markdown files from web URLs (http:// or https://), in which case your browser fetches the file directly - MDView only renders it locally.

## Third-Party Services

MDView does not integrate with or share data with any third-party services, including:
- Analytics platforms (Google Analytics, etc.)
- Advertising networks
- Social media platforms
- Cloud storage services
- Error tracking services

## Open Source Libraries

MDView uses the following open-source libraries, all bundled within the extension:

- **markdown-it**: Markdown parsing
- **Highlight.js**: Syntax highlighting
- **Mermaid.js**: Diagram rendering
- **DOMPurify**: Content sanitization
- **Panzoom**: Interactive diagram controls

These libraries process data entirely locally within your browser. None of them transmit data externally.

## Chrome Sync

If you have Chrome sync enabled in your browser settings, your MDView preferences (theme, settings) will sync across your devices using Google's Chrome Sync service. This is controlled by Chrome itself, not by MDView. You can disable Chrome sync in Chrome's settings at any time.

MDView does not control or have access to Chrome's sync mechanism beyond storing preferences in the sync storage area.

## Children's Privacy

MDView does not knowingly collect information from users of any age, including children under 13. The extension operates entirely locally and does not collect personal information from anyone.

## Your Rights and Controls

You have complete control over your data:

### Access Your Data
All settings are accessible via:
- Extension popup (click extension icon)
- Options page (right-click icon → Options)

### Delete Your Data
You can delete all MDView data by:
1. Opening Options page
2. Going to Advanced settings
3. Clicking "Clear Cache"
4. Clicking "Reset to Defaults"
5. Or uninstalling the extension removes all data

### Export Your Settings
You can export your settings to a JSON file via the Options page for backup purposes.

## Data Security

MDView implements security best practices:

- **Content Security Policy**: Strict CSP prevents injection attacks
- **DOMPurify Sanitization**: All Markdown content is sanitized
- **No eval()**: No dynamic code execution
- **No remote code**: All code is bundled within the extension
- **Minimal permissions**: Only requests necessary browser permissions
- **Local-only processing**: All operations occur on your device

## Changes to This Policy

We may update this privacy policy to reflect changes in the extension or legal requirements. Changes will be:
- Posted to this file in the GitHub repository
- Noted in the CHANGELOG
- Effective immediately upon update

Continued use of MDView after changes constitutes acceptance of the updated policy.

## Data Retention

- **User preferences**: Retained until you reset them or uninstall the extension
- **Cached content**: Retained until you clear cache or uninstall
- **No external data**: We retain no data on external servers because we collect none

## Compliance

MDView complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) principles

Since MDView does not collect personal information, most data protection regulations do not apply. However, we follow privacy-by-design principles.

## Contact Information

For privacy-related questions or concerns:

- **GitHub Issues**: [github.com/jamesainslie/mdview/issues](https://github.com/jamesainslie/mdview/issues)
- **GitHub Discussions**: [github.com/jamesainslie/mdview/discussions](https://github.com/jamesainslie/mdview/discussions)
- **Repository**: [github.com/jamesainslie/mdview](https://github.com/jamesainslie/mdview)

## Transparency

MDView is open source. You can:
- Review all source code on GitHub
- Verify our privacy claims by inspecting the code
- Audit data storage and network activity
- Contribute improvements or report issues

## Summary

**In plain language**: MDView saves your theme and settings preferences locally in your browser. It does not collect, transmit, or share any information with us or anyone else. Everything happens on your device. We cannot see your data because we never receive it.

---

**License**: This privacy policy is part of MDView, which is licensed under the MIT License.

**Version**: 1.0.0
**Date**: November 28, 2024

