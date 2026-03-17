package main

import (
	"context"
	"errors"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var errDesktopServiceNotConfigured = errors.New("desktop service is not configured")
var errDesktopServiceWindowTitleEmpty = errors.New("window title cannot be empty")

type DesktopService struct {
	app        *application.App
	mainWindow application.Window
}

func NewDesktopService() *DesktopService {
	return &DesktopService{}
}

func (s *DesktopService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	s.app = application.Get()
	if s.app != nil {
		s.mainWindow = s.app.Window.Current()
	}

	return nil
}

func (s *DesktopService) ServiceShutdown() error {
	s.app = nil
	s.mainWindow = nil
	return nil
}

func (s *DesktopService) OpenDirectoryDialog(title string) (string, error) {
	if s.app == nil {
		return "", errDesktopServiceNotConfigured
	}

	return s.app.Dialog.
		OpenFile().
		CanChooseDirectories(true).
		CanChooseFiles(false).
		SetTitle(normalizeTitle(title, "Choose a directory")).
		PromptForSingleSelection()
}

func (s *DesktopService) OpenFileDialog(title string) (string, error) {
	if s.app == nil {
		return "", errDesktopServiceNotConfigured
	}

	return s.app.Dialog.
		OpenFile().
		SetTitle(normalizeTitle(title, "Choose a file")).
		PromptForSingleSelection()
}

func (s *DesktopService) SetTitle(title string) error {
	if s.mainWindow == nil {
		return errDesktopServiceNotConfigured
	}

	title = strings.TrimSpace(title)
	if title == "" {
		return errDesktopServiceWindowTitleEmpty
	}

	s.mainWindow.SetTitle(title)
	return nil
}

func normalizeTitle(title string, fallback string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return fallback
	}

	return title
}
