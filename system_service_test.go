package main

import (
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

	if info.OS != runtime.GOOS {
		t.Errorf("OS = %q, want %q", info.OS, runtime.GOOS)
	}
	if info.Arch != runtime.GOARCH {
		t.Errorf("Arch = %q, want %q", info.Arch, runtime.GOARCH)
	}
	if info.Compiler != runtime.Compiler {
		t.Errorf("Compiler = %q, want %q", info.Compiler, runtime.Compiler)
	}
	if info.CPUs != runtime.NumCPU() {
		t.Errorf("CPUs = %d, want %d", info.CPUs, runtime.NumCPU())
	}
	if info.Version != runtime.Version() {
		t.Errorf("Version = %q, want %q", info.Version, runtime.Version())
	}
}
