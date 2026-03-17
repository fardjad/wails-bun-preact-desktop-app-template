package main

import "testing"

func TestNewGreetService(t *testing.T) {
	service := NewGreetService(nil)
	if service == nil {
		t.Fatal("NewGreetService() returned nil")
	}
}

func TestGreet(t *testing.T) {
	service := NewGreetService(nil)

	tests := []struct {
		name     string
		input    string
		expected string
		wantErr  error
	}{
		{
			name:     "simple name",
			input:    "Alice",
			expected: "Hello Alice, welcome to your desktop application!",
		},
		{
			name:    "empty string",
			input:   "",
			wantErr: errGreetingNameRequired,
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
			result, err := service.Greet(tt.input)
			if err != tt.wantErr {
				t.Fatalf("Greet(%q) error = %v, want %v", tt.input, err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}
			if result != tt.expected {
				t.Errorf("Greet(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
