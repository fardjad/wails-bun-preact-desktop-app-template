package main

import "testing"

func TestNewGreetService(t *testing.T) {
	service := NewGreetService()
	if service == nil {
		t.Fatal("NewGreetService() returned nil")
	}
}

func TestGreet(t *testing.T) {
	service := NewGreetService()

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
			result := service.Greet(tt.input)
			if result != tt.expected {
				t.Errorf("Greet(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
