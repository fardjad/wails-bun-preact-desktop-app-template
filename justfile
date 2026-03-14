# Desktop Application
# Requires: Go, Bun, Wails CLI (go install github.com/wailsapp/wails/v2/cmd/wails@latest)

wails := `which wails 2>/dev/null || echo "$HOME/go/bin/wails"`

# List available recipes
default:
    @just --list

# ---------- Development ----------

# Run in development mode with hot-reload
dev:
    {{wails}} dev

# Install frontend dependencies
install:
    cd frontend && bun install

# Generate Wails Go-to-JS bindings
generate:
    {{wails}} generate module

# ---------- Testing ----------

# Run all tests (Go + frontend)
test: test-go test-frontend

# Run Go backend tests
test-go:
    go test -v ./...

# Run Go tests with race detector
test-go-race:
    go test -race -v ./...

# Run frontend tests
test-frontend:
    cd frontend && bun test

# Run frontend tests in watch mode
test-frontend-watch:
    cd frontend && bun test --watch

# Run frontend type-check
typecheck:
    cd frontend && bun x tsc --noEmit

# ---------- Production Builds ----------

# Build for the current platform
build:
    {{wails}} build

# Build for macOS (universal binary: amd64 + arm64)
build-darwin:
    {{wails}} build -platform darwin/universal

# Build for macOS amd64 only
build-darwin-amd64:
    {{wails}} build -platform darwin/amd64

# Build for macOS arm64 only
build-darwin-arm64:
    {{wails}} build -platform darwin/arm64

# Build for Windows amd64
build-windows:
    {{wails}} build -platform windows/amd64

# Build for Windows arm64
build-windows-arm64:
    {{wails}} build -platform windows/arm64

# Build for Linux amd64
build-linux:
    {{wails}} build -platform linux/amd64

# Build for Linux arm64
build-linux-arm64:
    {{wails}} build -platform linux/arm64

# Build for all platforms (amd64)
build-all: build-darwin build-windows build-linux

# ---------- Utilities ----------

# Clean build artifacts
clean:
    rm -rf build/bin
    rm -rf frontend/dist
    rm -rf frontend/node_modules

# Check system dependencies
doctor:
    {{wails}} doctor
