package main

import (
	"errors"
	"fmt"
	"strings"
)

var errGreetingNameRequired = errors.New("name is required")

type GreetService struct {
	database *DatabaseService
}

func NewGreetService(database *DatabaseService) *GreetService {
	return &GreetService{database: database}
}

func (s *GreetService) Greet(name string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return "", errGreetingNameRequired
	}

	message := fmt.Sprintf("Hello %s, welcome to your desktop application!", name)
	if s.database != nil {
		if err := s.database.recordGreeting(name, message); err != nil {
			return "", fmt.Errorf("save greeting: %w", err)
		}
	}

	return message, nil
}
