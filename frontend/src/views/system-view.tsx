import { useState, useEffect } from "preact/hooks";
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

interface Props {
  getSystemInfo?: () => PromiseLike<SystemInfo>;
  openDirectoryDialog?: (title: string) => PromiseLike<string>;
}

export function SystemView({
  getSystemInfo = DefaultGetSystemInfo,
  openDirectoryDialog = DefaultOpenDirectoryDialog,
}: Props) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [selectedDir, setSelectedDir] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setSystemInfo(await getSystemInfo());
      } catch (e) {
        console.error("Failed to get system info:", e);
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
    </div>
  );
}
