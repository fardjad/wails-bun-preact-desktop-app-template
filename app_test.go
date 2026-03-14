package main

import (
	"context"
	"fmt"
	"runtime"
	"testing"
)

func TestNewApp(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatal("NewApp() returned nil")
	}
	if app.ctx != nil {
		t.Error("expected ctx to be nil before startup")
	}
}

func TestStartupStoresContext(t *testing.T) {
	app := NewApp()
	ctx := context.Background()
	app.startup(ctx)

	if app.ctx != ctx {
		t.Error("startup did not store the provided context")
	}
}

func TestShutdownDoesNotPanic(t *testing.T) {
	app := NewApp()
	ctx := context.Background()
	app.startup(ctx)

	// shutdown should not panic even with a background context
	app.shutdown(ctx)
}

func TestGreet(t *testing.T) {
	app := NewApp()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "simple name",
			input:    "Alice",
			expected: "Hello Alice, welcome to your desktop application!",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "Hello , welcome to your desktop application!",
		},
		{
			name:     "name with spaces",
			input:    "John Doe",
			expected: "Hello John Doe, welcome to your desktop application!",
		},
		{
			name:     "unicode name",
			input:    "Müller",
			expected: "Hello Müller, welcome to your desktop application!",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := app.Greet(tt.input)
			if result != tt.expected {
				t.Errorf("Greet(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestGetSystemInfo(t *testing.T) {
	app := NewApp()
	info := app.GetSystemInfo()

	requiredKeys := []string{"os", "arch", "compiler", "cpus", "version"}
	for _, key := range requiredKeys {
		if _, ok := info[key]; !ok {
			t.Errorf("GetSystemInfo() missing key %q", key)
		}
	}

	if info["os"] != runtime.GOOS {
		t.Errorf("os = %q, want %q", info["os"], runtime.GOOS)
	}
	if info["arch"] != runtime.GOARCH {
		t.Errorf("arch = %q, want %q", info["arch"], runtime.GOARCH)
	}
	if info["compiler"] != runtime.Compiler {
		t.Errorf("compiler = %q, want %q", info["compiler"], runtime.Compiler)
	}
	expectedCPUs := fmt.Sprintf("%d", runtime.NumCPU())
	if info["cpus"] != expectedCPUs {
		t.Errorf("cpus = %q, want %q", info["cpus"], expectedCPUs)
	}
	if info["version"] != runtime.Version() {
		t.Errorf("version = %q, want %q", info["version"], runtime.Version())
	}
}
