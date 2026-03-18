package main

import (
	"path/filepath"
	"testing"
)

func TestResolveAppDataDirFromBaseDir(t *testing.T) {
	dir, err := resolveAppDataDir(DatabaseConfig{
		AppIdentifier: "com.example.app",
		BaseDir:       "/tmp/example",
	})
	if err != nil {
		t.Fatalf("resolveAppDataDir() error = %v", err)
	}
	if want := filepath.Join("/tmp/example", "com.example.app"); dir != want {
		t.Fatalf("resolveAppDataDir() = %q, want %q", dir, want)
	}
}

func TestResolveDatabasePath(t *testing.T) {
	dbPath, dataDir, err := resolveDatabasePath(DatabaseConfig{
		AppIdentifier: "com.example.app",
		BaseDir:       "/tmp/example",
	})
	if err != nil {
		t.Fatalf("resolveDatabasePath() error = %v", err)
	}
	if want := filepath.Join("/tmp/example", "com.example.app"); dataDir != want {
		t.Fatalf("dataDir = %q, want %q", dataDir, want)
	}
	if want := filepath.Join("/tmp/example", "com.example.app", "app.db"); dbPath != want {
		t.Fatalf("dbPath = %q, want %q", dbPath, want)
	}
}

func TestParseSyncInterval(t *testing.T) {
	if got := parseSyncInterval("60"); got.Seconds() != 60 {
		t.Fatalf("parseSyncInterval(\"60\") = %v, want 60s", got)
	}
	if got := parseSyncInterval("2m"); got.Minutes() != 2 {
		t.Fatalf("parseSyncInterval(\"2m\") = %v, want 2m", got)
	}
	if got := parseSyncInterval("invalid"); got != 0 {
		t.Fatalf("parseSyncInterval(\"invalid\") = %v, want 0", got)
	}
}

func TestBuildLocalDatabaseDSN(t *testing.T) {
	got := buildLocalDatabaseDSN(DatabaseConfig{}, "/tmp/example/app.db")
	if got != "/tmp/example/app.db" {
		t.Fatalf("buildLocalDatabaseDSN() = %q, want %q", got, "/tmp/example/app.db")
	}
}

func TestBuildLocalDatabaseDSNWithEncryption(t *testing.T) {
	got := buildLocalDatabaseDSN(DatabaseConfig{
		EncryptionKey: "abc123",
	}, "/tmp/example/app.db")

	want := "/tmp/example/app.db?encryption_hexkey=abc123&experimental=encryption"
	if got != want {
		t.Fatalf("buildLocalDatabaseDSN() = %q, want %q", got, want)
	}
}
