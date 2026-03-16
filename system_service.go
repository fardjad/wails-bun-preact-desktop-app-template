package main

import (
	"fmt"
	"runtime"
)

type SystemService struct{}

func NewSystemService() *SystemService {
	return &SystemService{}
}

func (s *SystemService) GetSystemInfo() map[string]string {
	return map[string]string{
		"os":       runtime.GOOS,
		"arch":     runtime.GOARCH,
		"compiler": runtime.Compiler,
		"cpus":     fmt.Sprintf("%d", runtime.NumCPU()),
		"version":  runtime.Version(),
	}
}
