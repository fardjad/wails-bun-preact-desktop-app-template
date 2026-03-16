package main

import (
	"errors"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var errDesktopServiceNotConfigured = errors.New("desktop service is not configured")

type DesktopService struct {
	app        *application.App
	mainWindow application.Window
}

func NewDesktopService() *DesktopService {
	return &DesktopService{}
}

func (s *DesktopService) configure(app *application.App, mainWindow application.Window) {
	s.app = app
	s.mainWindow = mainWindow
}

func (s *DesktopService) OpenDirectoryDialog(title string) (string, error) {
	if s.app == nil {
		return "", errDesktopServiceNotConfigured
	}

	return s.app.Dialog.
		OpenFile().
		CanChooseDirectories(true).
		CanChooseFiles(false).
		SetTitle(title).
		PromptForSingleSelection()
}

func (s *DesktopService) OpenFileDialog(title string) (string, error) {
	if s.app == nil {
		return "", errDesktopServiceNotConfigured
	}

	return s.app.Dialog.
		OpenFile().
		SetTitle(title).
		PromptForSingleSelection()
}

func (s *DesktopService) SetTitle(title string) {
	if s.mainWindow != nil {
		s.mainWindow.SetTitle(title)
	}
}
