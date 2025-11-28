.PHONY: help build dev clean test test-ci lint format install icons dist-zip

# Default target
help:
	@echo "MDView Browser Extension - Build Targets"
	@echo "=========================================="
	@echo ""
	@echo "Main targets:"
	@echo "  make build       - Build the extension for production"
	@echo "  make dev         - Build in watch mode for development"
	@echo "  make clean       - Clean build artifacts"
	@echo ""
	@echo "Development targets:"
	@echo "  make test        - Run tests in watch mode"
	@echo "  make test-ci     - Run tests once (CI mode)"
	@echo "  make lint        - Lint source code"
	@echo "  make format      - Format source code"
	@echo ""
	@echo "Utility targets:"
	@echo "  make install     - Install dependencies"
	@echo "  make icons       - Generate icons from SVG"
	@echo "  make dist-zip    - Create distribution zip file"
	@echo ""

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Build the extension
build:
	@echo "Building extension..."
	npm run build
	@echo "Build complete! Extension is ready in dist/"

# Development mode with watch
dev:
	@echo "Starting development mode (watch)..."
	npm run dev

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -rf node_modules/.vite/
	@echo "Clean complete!"

# Run tests in watch mode
test:
	@echo "Running tests in watch mode..."
	npm run test

# Run tests once (CI mode)
test-ci:
	@echo "Running tests (CI mode)..."
	npm run test:ci

# Lint code
lint:
	@echo "Linting code..."
	npm run lint

# Format code
format:
	@echo "Formatting code..."
	npm run format

# Generate icons
icons:
	@echo "Generating icons..."
	node scripts/generate-icons.js
	@echo "Icons generated!"

# Create distribution zip
dist-zip: build
	@echo "Creating distribution zip..."
	@mkdir -p releases
	cd dist && zip -r ../releases/mdview-$(shell node -p "require('./package.json').version").zip .
	@echo "Distribution zip created: releases/mdview-$(shell node -p "require('./package.json').version").zip"

# Rebuild from scratch
rebuild: clean build

# Run all checks (lint + test)
check: lint test-ci
	@echo "All checks passed!"

