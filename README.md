# MDView - Markdown Viewer

A modern Chrome extension for viewing Markdown files with beautiful themes, syntax highlighting, and interactive Mermaid diagrams.

## Features

### Core Functionality
- **Markdown Rendering**: Full CommonMark + GitHub Flavored Markdown support
- **8 Beautiful Themes**: GitHub (Light/Dark), Catppuccin (Latte/Frappé/Macchiato/Mocha), Monokai, Monokai Pro
- **Syntax Highlighting**: Support for 195+ programming languages with Highlight.js
- **Interactive Mermaid Diagrams**: All diagram types with zoom, pan, maximize, and export
- **Auto Dark Mode**: Automatically switch themes based on system preference
- **File Change Detection**: Auto-reload when markdown files are modified

### Advanced Features
- **Progressive Hydration**: Instant rendering for large files (instant skeleton + background hydration)
- **Worker-Based Processing**: Heavy tasks (parsing, highlighting) run in web workers to keep UI responsive
- **Lazy Loading**: Images, code highlighting, and Mermaid diagrams load on-demand
- **Copy Code Blocks**: One-click copy button for all code blocks
- **Export Diagrams**: Export Mermaid diagrams as SVG files
- **Keyboard Shortcuts**: Navigate and interact without mouse
- **Multi-Tab Sync**: Sync theme and settings across all markdown tabs
- **Responsive Design**: Works on all screen sizes

## Installation

### From Chrome Web Store
1. Visit the [MDView page on Chrome Web Store](#) (coming soon)
2. Click "Add to Chrome"
3. Grant file access permissions when prompted

### From Source
1. Clone this repository:
   ```bash
   git clone https://github.com/jamesainslie/mdview.git
   cd mdview
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### ⚠️ **REQUIRED:** Enable File Access

**MDView will not work without this step!**

To view local markdown files:
1. Go to `chrome://extensions/`
2. Find **MDView - Markdown Viewer**
3. Click **"Details"**
4. Scroll down and **enable "Allow access to file URLs"**

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for additional help.

## Usage

### Opening Markdown Files
1. Open any `.md` or `.markdown` file in Chrome using `file://` protocol
2. The file will automatically be rendered with your selected theme

### Changing Themes
- **Popup**: Click the extension icon and select a theme
- **Options Page**: Right-click icon → Options → Appearance
- **Auto Mode**: Enable "Auto Dark Mode" to switch based on system preference

### Interacting with Mermaid Diagrams
- **Zoom**: Mouse wheel (+ Ctrl/Cmd) or `+`/`-` keys
- **Pan**: Click and drag, or Shift + arrow keys
- **Reset**: Click reset button or press `0`
- **Fit to View**: Click fit button or press `f`
- **Maximize**: Click maximize button or press `m`
- **Export SVG**: Click export button or press `e`
- **Close Maximize**: Click X or press `Esc`

### Keyboard Shortcuts
- `+`/`=`: Zoom in
- `-`: Zoom out
- `0`: Reset zoom
- `f`: Fit diagram to view
- `m`: Maximize diagram
- `e`: Export diagram as SVG
- `Esc`: Close maximized diagram
- `Shift + Arrows`: Pan diagram

## Development

### Project Structure
```
mdview/
├── src/
│   ├── background/         # Service worker
│   ├── content/           # Content script
│   ├── core/              # Core rendering logic (pipeline, converter)
│   ├── renderers/         # Syntax & Mermaid renderers
│   ├── workers/           # Web workers for heavy processing
│   ├── ui/                # UI components
│   ├── utils/             # Utilities
│   ├── themes/            # Theme definitions
│   ├── popup/             # Extension popup
│   └── options/           # Options page
├── public/                # Static assets
├── tests/                 # Test files
└── docs/                  # Documentation
```

### Development Commands
```bash
# Development mode (auto-reload)
npm run dev

# Build for production
npm run build

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Lint code
npm run lint

# Format code
npm run format
```

### Tech Stack
- **Build**: Vite 5.x + TypeScript 5.3+
- **Markdown**: markdown-it v14.x + plugins
- **Syntax Highlighting**: Highlight.js v11.x
- **Diagrams**: Mermaid.js v10.x + Panzoom v9.x
- **Security**: DOMPurify v3.x
- **Testing**: Vitest + Playwright

## Configuration

### Settings
Access full settings via Options page (right-click icon → Options):

**Appearance**
- Theme selection
- Auto dark mode
- Light/dark theme pairs

**Editor**
- Font family and size
- Line height
- Maximum width

**Code Blocks**
- Syntax highlighting theme
- Line numbers toggle
- Code font family

**Diagrams**
- Default zoom level
- Animations toggle
- Render timeout

**Performance**
- Auto-reload on file change
- Reload debounce time
- Lazy loading threshold

**Advanced**
- Tab synchronization
- Cache management
- Settings import/export

### Theme Customization
Themes are defined in `src/themes/` directory. Each theme includes:
- 25+ color variables
- Typography settings
- Spacing configuration
- Syntax highlighting theme
- Mermaid theme variables

## Performance

### Benchmarks
- **Initial Render**: < 200ms for files < 100KB
- **Theme Switching**: < 100ms
- **Scrolling**: 60fps maintained
- **Memory Usage**: < 200MB typical
- **Bundle Size**: < 2MB gzipped

### Optimization Techniques
- **Progressive Hydration**: Instant skeleton rendering for perceived performance
- **Web Workers**: Off-main-thread parsing and syntax highlighting
- **Intersection Observer**: Lazy loading for images and heavy components
- **Three-tier caching**: Memory → IndexedDB → Service Worker
- **Code splitting**: Dynamic imports for large dependencies (Mermaid, Highlight.js)
- **Debounced file change detection**: Efficient file watching

## Browser Support
- Chrome 110+
- Edge 110+
- Other Chromium-based browsers

## Security
- Strict Content Security Policy
- DOMPurify sanitization for all content
- No external network calls
- Minimal permissions (storage, scripting, file://)
- Safe Mermaid rendering (securityLevel: 'strict')

## Accessibility
- WCAG 2.1 Level AA compliant
- Full keyboard navigation
- Screen reader support
- Semantic HTML elements
- ARIA labels where appropriate
- Focus indicators
- High contrast mode support

## Contributing
Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- 80% test coverage minimum

## License
MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments
- [markdown-it](https://github.com/markdown-it/markdown-it)
- [Highlight.js](https://highlightjs.org/)
- [Mermaid.js](https://mermaid.js.org/)
- [DOMPurify](https://github.com/cure53/DOMPurify)
- [Catppuccin](https://github.com/catppuccin/catppuccin)

## Support
- **Issues**: [GitHub Issues](https://github.com/jamesainslie/mdview/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jamesainslie/mdview/discussions)
- **Email**: [support@mdview.dev](mailto:support@mdview.dev)

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for version history.

---

Made with ❤️ by [James Ainslie](https://github.com/jamesainslie)
