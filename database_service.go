package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	libsql "github.com/tursodatabase/go-libsql"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type DatabaseConfig struct {
	AppIdentifier       string
	BaseDir             string
	PrimaryURL          string
	AuthToken           string
	EncryptionKey       string
	RemoteEncryptionKey string
	SyncInterval        time.Duration
}

type DatabaseStatus struct {
	Path          string `json:"path"`
	Directory     string `json:"directory"`
	Mode          string `json:"mode"`
	RemoteURL     string `json:"remoteUrl,omitempty"`
	SyncEnabled   bool   `json:"syncEnabled"`
	Connected     bool   `json:"connected"`
	SchemaVersion int    `json:"schemaVersion"`
}

type GreetingRecord struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Message   string `json:"message"`
	CreatedAt string `json:"createdAt"`
}

type migration struct {
	version int
	name    string
	query   string
}

var errDatabaseNotOpen = errors.New("database is not open")

var databaseMigrations = []migration{
	{
		version: 1,
		name:    "create_greetings_table",
		query: `
CREATE TABLE IF NOT EXISTS greetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`,
	},
}

type DatabaseService struct {
	config    DatabaseConfig
	db        *sql.DB
	connector *libsql.Connector
	status    DatabaseStatus
}

func NewDatabaseService() *DatabaseService {
	return NewDatabaseServiceWithConfig(loadDatabaseConfigFromEnv())
}

func NewDatabaseServiceWithConfig(config DatabaseConfig) *DatabaseService {
	return &DatabaseService{config: config}
}

func (s *DatabaseService) ServiceStartup(ctx context.Context, options application.ServiceOptions) error {
	return s.open()
}

func (s *DatabaseService) ServiceShutdown() error {
	return s.close()
}

func (s *DatabaseService) GetDatabaseStatus() DatabaseStatus {
	return s.status
}

func (s *DatabaseService) ListGreetings(limit int) ([]GreetingRecord, error) {
	if s.db == nil {
		return nil, errDatabaseNotOpen
	}

	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}

	rows, err := s.db.Query(`
SELECT id, name, message, created_at
FROM greetings
ORDER BY id DESC
LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("query greetings: %w", err)
	}
	defer rows.Close()

	var records []GreetingRecord
	for rows.Next() {
		var record GreetingRecord
		if err := rows.Scan(&record.ID, &record.Name, &record.Message, &record.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan greeting: %w", err)
		}
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate greetings: %w", err)
	}

	return records, nil
}

func (s *DatabaseService) recordGreeting(name, message string) error {
	if s.db == nil {
		return errDatabaseNotOpen
	}

	if _, err := s.db.Exec(`
INSERT INTO greetings (name, message)
VALUES (?, ?)`, name, message); err != nil {
		return fmt.Errorf("insert greeting: %w", err)
	}

	return nil
}

func (s *DatabaseService) open() error {
	dbPath, dataDir, err := resolveDatabasePath(s.config)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return fmt.Errorf("create data directory: %w", err)
	}

	db, connector, mode, err := openDatabaseConnection(s.config, dbPath)
	if err != nil {
		return err
	}

	if connector != nil {
		if _, err := connector.Sync(); err != nil {
			_ = db.Close()
			connector.Close()
			return fmt.Errorf("initial database sync failed: %w", err)
		}
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		if connector != nil {
			connector.Close()
		}
		return fmt.Errorf("ping database: %w", err)
	}

	version, err := applyMigrations(db)
	if err != nil {
		_ = db.Close()
		if connector != nil {
			connector.Close()
		}
		return err
	}

	s.db = db
	s.connector = connector
	s.status = DatabaseStatus{
		Path:          dbPath,
		Directory:     dataDir,
		Mode:          mode,
		RemoteURL:     s.config.PrimaryURL,
		SyncEnabled:   connector != nil,
		Connected:     true,
		SchemaVersion: version,
	}

	return nil
}

func (s *DatabaseService) close() error {
	var closeErr error

	if s.db != nil {
		if err := s.db.Close(); err != nil {
			closeErr = fmt.Errorf("close database: %w", err)
		}
	}
	if s.connector != nil {
		if err := s.connector.Close(); err != nil && closeErr == nil {
			closeErr = fmt.Errorf("close database connector: %w", err)
		}
	}

	s.db = nil
	s.connector = nil
	s.status.Connected = false

	return closeErr
}

func resolveDatabasePath(config DatabaseConfig) (string, string, error) {
	dataDir, err := resolveAppDataDir(config)
	if err != nil {
		return "", "", err
	}

	return filepath.Join(dataDir, "app.db"), dataDir, nil
}

func resolveAppDataDir(config DatabaseConfig) (string, error) {
	if config.AppIdentifier == "" {
		return "", errors.New("database app identifier is required")
	}

	if config.BaseDir != "" {
		return filepath.Join(config.BaseDir, config.AppIdentifier), nil
	}

	switch runtime.GOOS {
	case "windows":
		base := os.Getenv("LOCALAPPDATA")
		if base == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", fmt.Errorf("resolve home directory: %w", err)
			}
			base = filepath.Join(home, "AppData", "Local")
		}
		return filepath.Join(base, config.AppIdentifier), nil
	case "darwin":
		home, err := os.UserHomeDir()
		if err != nil {
			return "", fmt.Errorf("resolve home directory: %w", err)
		}
		return filepath.Join(home, "Library", "Application Support", config.AppIdentifier), nil
	default:
		base := os.Getenv("XDG_DATA_HOME")
		if base == "" {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", fmt.Errorf("resolve home directory: %w", err)
			}
			base = filepath.Join(home, ".local", "share")
		}
		return filepath.Join(base, config.AppIdentifier), nil
	}
}

func openDatabaseConnection(config DatabaseConfig, dbPath string) (*sql.DB, *libsql.Connector, string, error) {
	if strings.TrimSpace(config.PrimaryURL) == "" {
		db, err := sql.Open("libsql", "file:"+filepath.ToSlash(dbPath))
		if err != nil {
			return nil, nil, "", fmt.Errorf("open local database: %w", err)
		}
		return db, nil, "local", nil
	}

	options := make([]libsql.Option, 0, 4)
	if token := strings.TrimSpace(config.AuthToken); token != "" {
		options = append(options, libsql.WithAuthToken(token))
	}
	if key := strings.TrimSpace(config.EncryptionKey); key != "" {
		options = append(options, libsql.WithEncryption(key))
	}
	if key := strings.TrimSpace(config.RemoteEncryptionKey); key != "" {
		options = append(options, libsql.WithRemoteEncryption(key))
	}
	if config.SyncInterval > 0 {
		options = append(options, libsql.WithSyncInterval(config.SyncInterval))
	}

	connector, err := libsql.NewEmbeddedReplicaConnector(
		dbPath,
		strings.TrimSpace(config.PrimaryURL),
		options...,
	)
	if err != nil {
		return nil, nil, "", fmt.Errorf("open Turso embedded replica: %w", err)
	}

	return sql.OpenDB(connector), connector, "embedded-replica", nil
}

func applyMigrations(db *sql.DB) (int, error) {
	if _, err := db.Exec(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`); err != nil {
		return 0, fmt.Errorf("create schema_migrations table: %w", err)
	}

	currentVersion, err := currentSchemaVersion(db)
	if err != nil {
		return 0, err
	}

	for _, migration := range databaseMigrations {
		if migration.version <= currentVersion {
			continue
		}

		tx, err := db.Begin()
		if err != nil {
			return 0, fmt.Errorf("begin migration %d: %w", migration.version, err)
		}

		if _, err := tx.Exec(migration.query); err != nil {
			_ = tx.Rollback()
			return 0, fmt.Errorf("apply migration %d (%s): %w", migration.version, migration.name, err)
		}

		if _, err := tx.Exec(`
INSERT INTO schema_migrations (version, name)
VALUES (?, ?)`, migration.version, migration.name); err != nil {
			_ = tx.Rollback()
			return 0, fmt.Errorf("record migration %d (%s): %w", migration.version, migration.name, err)
		}

		if err := tx.Commit(); err != nil {
			return 0, fmt.Errorf("commit migration %d (%s): %w", migration.version, migration.name, err)
		}

		currentVersion = migration.version
	}

	return currentVersion, nil
}

func currentSchemaVersion(db *sql.DB) (int, error) {
	var version int
	if err := db.QueryRow(`
SELECT COALESCE(MAX(version), 0)
FROM schema_migrations`).Scan(&version); err != nil {
		return 0, fmt.Errorf("query schema version: %w", err)
	}

	return version, nil
}

func loadDatabaseConfigFromEnv() DatabaseConfig {
	return DatabaseConfig{
		AppIdentifier:       appProductIdentifier,
		PrimaryURL:          strings.TrimSpace(os.Getenv("TURSO_PRIMARY_URL")),
		AuthToken:           strings.TrimSpace(os.Getenv("TURSO_AUTH_TOKEN")),
		EncryptionKey:       strings.TrimSpace(os.Getenv("TURSO_ENCRYPTION_KEY")),
		RemoteEncryptionKey: strings.TrimSpace(os.Getenv("TURSO_REMOTE_ENCRYPTION_KEY")),
		SyncInterval:        parseSyncInterval(os.Getenv("TURSO_SYNC_INTERVAL")),
	}
}

func parseSyncInterval(raw string) time.Duration {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return 0
	}

	if seconds, err := strconv.Atoi(raw); err == nil {
		return time.Duration(seconds) * time.Second
	}

	duration, err := time.ParseDuration(raw)
	if err != nil {
		return 0
	}

	return duration
}
