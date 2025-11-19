# Contributing to MDView

Thank you for your interest in contributing to MDView! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Chrome 110+
- Git

### Development Setup
1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mdview.git
   cd mdview
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a feature branch:
   ```bash
   git checkout -b feature-yourname-your-feature-name
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Load extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

## Development Workflow

### Making Changes
1. Make your changes in a feature branch
2. Follow the code style guidelines
3. Add tests for new functionality
4. Update documentation as needed
5. Ensure all tests pass

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Write meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Examples:
```
feat(renderer): add support for GFM tables
fix(theme): correct dark mode syntax highlighting
docs(readme): update installation instructions
```

### Testing

#### Unit Tests
```bash
npm test
```

Write unit tests for:
- Core functionality
- Utilities
- Converters and parsers
- Theme engine

#### E2E Tests
```bash
npm run test:e2e
```

Test complete user workflows using Playwright.

#### Coverage
Maintain > 80% code coverage for unit tests.

### Linting and Formatting
```bash
# Lint code
npm run lint

# Format code
npm run format

# Check TypeScript types (via build command)
npm run build
# OR
npx tsc --noEmit
```

## Pull Request Process

### Before Submitting
1. Rebase your branch on latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Run all checks:
   ```bash
   npm run lint
   npx tsc --noEmit
   npm test
   npm run test:e2e
   ```

3. Update CHANGELOG.md with your changes

4. Ensure documentation is up to date

### Submitting
1. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub

3. Fill in the PR template:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. Wait for review

### Review Process
- All PRs require at least one approval
- Address review comments
- Keep PR scope focused
- Be responsive to feedback

### After Approval
- Maintainers will merge your PR
- Your contribution will be credited in CHANGELOG.md

## Areas for Contribution

### High Priority
- Additional theme support
- Performance improvements
- Accessibility enhancements
- Browser compatibility
- Bug fixes

### Medium Priority
- New Markdown features
- UI/UX improvements
- Documentation improvements
- Test coverage expansion

### Ideas Welcome
- New feature proposals
- Better error messages
- Developer experience improvements

## Reporting Bugs

### Before Reporting
1. Check existing issues
2. Verify bug in latest version
3. Test in clean browser profile
4. Gather reproduction steps

### Bug Report Template
```markdown
**Description**
Clear description of the bug

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- MDView version:
- Chrome version:
- OS:

**Additional Context**
Any other relevant information
```

## Requesting Features

### Feature Request Template
```markdown
**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you implement it?

**Alternatives Considered**
Other approaches you've thought about

**Additional Context**
Examples, mockups, etc.
```

## Documentation

### Types of Documentation
- **README.md**: Overview and quick start
- **Code Comments**: Inline documentation
- **JSDoc**: API documentation
- **Design Docs**: Architecture and specifications

### Documentation Standards
- Clear and concise
- Include examples
- Keep up to date
- Use proper grammar and spelling

## Release Process

Maintainers follow this process:

1. Version bump (semver)
2. Update CHANGELOG.md
3. Tag release
4. Build production bundle
5. Submit to Chrome Web Store
6. Create GitHub release

## Getting Help

- **Questions**: [GitHub Discussions](https://github.com/jamesainslie/mdview/discussions)
- **Bugs**: [GitHub Issues](https://github.com/jamesainslie/mdview/issues)

## Recognition

Contributors are recognized in:
- CHANGELOG.md

Thank you for contributing to MDView!
