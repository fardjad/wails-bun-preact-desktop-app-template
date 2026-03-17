package main

import "testing"

func TestResolveAppDataDirFromBaseDir(t *testing.T) {
	dir, err := resolveAppDataDir(DatabaseConfig{
		AppIdentifier: "com.example.app",
		BaseDir:       "/tmp/example",
	})
	if err != nil {
		t.Fatalf("resolveAppDataDir() error = %v", err)
	}
	if want := "/tmp/example/com.example.app"; dir != want {
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
	if dataDir != "/tmp/example/com.example.app" {
		t.Fatalf("dataDir = %q, want %q", dataDir, "/tmp/example/com.example.app")
	}
	if dbPath != "/tmp/example/com.example.app/app.db" {
		t.Fatalf("dbPath = %q, want %q", dbPath, "/tmp/example/com.example.app/app.db")
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
