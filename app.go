package main

import (
	"context"
	"fmt"
	"runtime"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct represents the application backend.
// Methods on this struct are exposed to the frontend via Wails bindings.
type App struct {
	ctx context.Context
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called when the application starts. The context is stored
// so that runtime methods can be called from bound methods.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown is called when the application is closing.
func (a *App) shutdown(ctx context.Context) {
	// Cleanup logic here
}

// --- Bound methods (callable from frontend) ---

// Greet returns a greeting for the given name.
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, welcome to your desktop application!", name)
}

// GetSystemInfo returns basic system information.
func (a *App) GetSystemInfo() map[string]string {
	return map[string]string{
		"os":       runtime.GOOS,
		"arch":     runtime.GOARCH,
		"compiler": runtime.Compiler,
		"cpus":     fmt.Sprintf("%d", runtime.NumCPU()),
		"version":  runtime.Version(),
	}
}

// OpenDirectoryDialog opens a native directory picker and returns the selected path.
func (a *App) OpenDirectoryDialog(title string) (string, error) {
	return wailsRuntime.OpenDirectoryDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: title,
	})
}

// OpenFileDialog opens a native file picker and returns the selected path.
func (a *App) OpenFileDialog(title string) (string, error) {
	return wailsRuntime.OpenFileDialog(a.ctx, wailsRuntime.OpenDialogOptions{
		Title: title,
	})
}

// SetTitle dynamically sets the window title.
func (a *App) SetTitle(title string) {
	wailsRuntime.WindowSetTitle(a.ctx, title)
}
