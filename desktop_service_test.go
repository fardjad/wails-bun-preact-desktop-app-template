package main

import "testing"

func TestNewDesktopService(t *testing.T) {
	service := NewDesktopService()
	if service == nil {
		t.Fatal("NewDesktopService() returned nil")
	}
	if service.app != nil {
		t.Error("expected application reference to be nil before Configure")
	}
	if service.mainWindow != nil {
		t.Error("expected mainWindow to be nil before Configure")
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
	service.SetTitle("Updated Title")
}
