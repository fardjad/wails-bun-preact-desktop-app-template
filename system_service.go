package main

import (
	"runtime"
)

type SystemService struct{}

type SystemInfo struct {
	OS       string `json:"os"`
	Arch     string `json:"arch"`
	Compiler string `json:"compiler"`
	CPUs     int    `json:"cpus"`
	Version  string `json:"version"`
}

func NewSystemService() *SystemService {
	return &SystemService{}
}

func (s *SystemService) GetSystemInfo() SystemInfo {
	return SystemInfo{
		OS:       runtime.GOOS,
		Arch:     runtime.GOARCH,
		Compiler: runtime.Compiler,
		CPUs:     runtime.NumCPU(),
		Version:  runtime.Version(),
	}
}
