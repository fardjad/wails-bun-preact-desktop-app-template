package main

import "fmt"

type GreetService struct{}

func NewGreetService() *GreetService {
	return &GreetService{}
}

func (s *GreetService) Greet(name string) string {
	return fmt.Sprintf("Hello %s, welcome to your desktop application!", name)
}
