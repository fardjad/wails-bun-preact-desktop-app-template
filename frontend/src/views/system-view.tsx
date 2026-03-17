import { useState, useEffect } from "preact/hooks";
import { GetDatabaseStatus as DefaultGetDatabaseStatus } from "../../bindings/cross-platform-desktop-app-template/databaseservice";
import { GetSystemInfo as DefaultGetSystemInfo } from "../../bindings/cross-platform-desktop-app-template/systemservice";
import { OpenDirectoryDialog as DefaultOpenDirectoryDialog } from "../../bindings/cross-platform-desktop-app-template/desktopservice";
import "./system-view.css";

export interface SystemInfo {
  os: string;
  arch: string;
  compiler: string;
  cpus: number;
  version: string;
}

export interface DatabaseStatus {
  path: string;
  directory: string;
  mode: string;
  remoteUrl?: string;
  syncEnabled: boolean;
  connected: boolean;
  schemaVersion: number;
}

interface Props {
  getSystemInfo?: () => PromiseLike<SystemInfo>;
  getDatabaseStatus?: () => PromiseLike<DatabaseStatus>;
  openDirectoryDialog?: (title: string) => PromiseLike<string>;
}

export function SystemView({
  getSystemInfo = DefaultGetSystemInfo,
  getDatabaseStatus = DefaultGetDatabaseStatus,
  openDirectoryDialog = DefaultOpenDirectoryDialog,
}: Props) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseStatus | null>(
    null,
  );
  const [selectedDir, setSelectedDir] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [nextSystemInfo, nextDatabaseStatus] = await Promise.all([
          getSystemInfo(),
          getDatabaseStatus(),
        ]);
        setSystemInfo(nextSystemInfo);
        setDatabaseStatus(nextDatabaseStatus);
      } catch (e) {
        console.error("Failed to load system view data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function pickDirectory() {
    try {
      const dir = await openDirectoryDialog("Choose a directory");
      if (dir) setSelectedDir(dir);
    } catch (e) {
      console.error("Failed to open directory dialog:", e);
    }
  }

  return (
    <div class="system">
      <h1>System Information</h1>
      <p class="subtitle">Native OS integration via Go backend bindings.</p>

      {loading ? (
        <div class="loading">Loading system info...</div>
      ) : (
        <div class="info-grid">
          {Object.entries(systemInfo ?? {}).map(([key, value]) => (
            <div key={key} class="info-card">
              <span class="info-label">{key}</span>
              <span class="info-value">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      <section class="native-section">
        <h2>Native Dialogs</h2>
        <button onClick={pickDirectory}>Open Directory Picker</button>
        {selectedDir && (
          <p class="selected-path">
            Selected: <code>{selectedDir}</code>
          </p>
        )}
      </section>

      {databaseStatus && (
        <section class="native-section">
          <h2>Database</h2>
          <p class="subtitle">
            Stored in an OS-appropriate user data directory.
          </p>
          <div class="info-grid">
            {Object.entries(databaseStatus).map(([key, value]) => (
              <div key={key} class="info-card">
                <span class="info-label">{key}</span>
                <span class="info-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
