package main

import (
	"fmt"
	"runtime"
	"testing"
)

func TestNewSystemService(t *testing.T) {
	service := NewSystemService()
	if service == nil {
		t.Fatal("NewSystemService() returned nil")
	}
}

func TestGetSystemInfo(t *testing.T) {
	service := NewSystemService()
	info := service.GetSystemInfo()

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
