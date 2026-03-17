package main

import (
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func TestNewDesktopService(t *testing.T) {
	service := NewDesktopService()
	if service == nil {
		t.Fatal("NewDesktopService() returned nil")
	}
	if service.app != nil {
		t.Error("expected application reference to be nil before startup")
	}
	if service.mainWindow != nil {
		t.Error("expected mainWindow to be nil before startup")
	}
}

func TestDesktopServiceShutdownClearsReferences(t *testing.T) {
	service := NewDesktopService()
	service.app = &application.App{}

	if err := service.ServiceShutdown(); err != nil {
		t.Fatalf("ServiceShutdown() error = %v, want nil", err)
	}
	if service.app != nil {
		t.Error("expected application reference to be nil after shutdown")
	}
	if service.mainWindow != nil {
		t.Error("expected mainWindow to be nil after shutdown")
	}
}

func TestOpenDirectoryDialogWithoutAppReturnsError(t *testing.T) {
	service := NewDesktopService()

	result, err := service.OpenDirectoryDialog("Choose a directory")
	if err != errDesktopServiceNotConfigured {
		t.Fatalf("OpenDirectoryDialog() error = %v, want %v", err, errDesktopServiceNotConfigured)
	}
	if result != "" {
		t.Fatalf("OpenDirectoryDialog() result = %q, want empty string", result)
	}
}

func TestOpenFileDialogWithoutAppReturnsError(t *testing.T) {
	service := NewDesktopService()

	result, err := service.OpenFileDialog("Choose a file")
	if err != errDesktopServiceNotConfigured {
		t.Fatalf("OpenFileDialog() error = %v, want %v", err, errDesktopServiceNotConfigured)
	}
	if result != "" {
		t.Fatalf("OpenFileDialog() result = %q, want empty string", result)
	}
}

func TestSetTitleWithoutWindowDoesNotPanic(t *testing.T) {
	service := NewDesktopService()
	err := service.SetTitle("Updated Title")
	if err != errDesktopServiceNotConfigured {
		t.Fatalf("SetTitle() error = %v, want %v", err, errDesktopServiceNotConfigured)
	}
}

func TestNormalizeTitleFallsBackForWhitespace(t *testing.T) {
	if got := normalizeTitle("   ", "Fallback"); got != "Fallback" {
		t.Fatalf("normalizeTitle() = %q, want %q", got, "Fallback")
	}
	if got := normalizeTitle("  Custom  ", "Fallback"); got != "Custom" {
		t.Fatalf("normalizeTitle() = %q, want %q", got, "Custom")
	}
}
