package main

import (
	"fmt"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type App struct {
	app        *application.App
	mainWindow application.Window
}

func NewApp() *App {
	return &App{}
}

func (a *App) configure(app *application.App, mainWindow application.Window) {
	a.app = app
	a.mainWindow = mainWindow
}

func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, welcome to your desktop application!", name)
}

func (a *App) GetSystemInfo() map[string]string {
	return map[string]string{
		"os":       runtime.GOOS,
		"arch":     runtime.GOARCH,
		"compiler": runtime.Compiler,
		"cpus":     fmt.Sprintf("%d", runtime.NumCPU()),
		"version":  runtime.Version(),
	}
}

func (a *App) OpenDirectoryDialog(title string) (string, error) {
	return a.app.Dialog.
		OpenFile().
		CanChooseDirectories(true).
		CanChooseFiles(false).
		SetTitle(title).
		PromptForSingleSelection()
}

func (a *App) OpenFileDialog(title string) (string, error) {
	return a.app.Dialog.
		OpenFile().
		SetTitle(title).
		PromptForSingleSelection()
}

func (a *App) SetTitle(title string) {
	if a.mainWindow != nil {
		a.mainWindow.SetTitle(title)
	}
}
