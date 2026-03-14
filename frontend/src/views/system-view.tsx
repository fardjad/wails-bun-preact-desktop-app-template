import { useState, useEffect } from "preact/hooks";
import {
  GetSystemInfo as DefaultGetSystemInfo,
  OpenDirectoryDialog as DefaultOpenDirectoryDialog,
} from "../wailsjs/go/main/App";
import "./system-view.css";

interface Props {
  getSystemInfo?: () => Promise<Record<string, string>>;
  openDirectoryDialog?: (title: string) => Promise<string>;
}

export function SystemView({
  getSystemInfo = DefaultGetSystemInfo,
  openDirectoryDialog = DefaultOpenDirectoryDialog,
}: Props) {
  const [systemInfo, setSystemInfo] = useState<Record<string, string>>({});
  const [selectedDir, setSelectedDir] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSystemInfo()
      .then((info) => setSystemInfo(info))
      .catch((e) => console.error("Failed to get system info:", e))
      .finally(() => setLoading(false));
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
          {Object.entries(systemInfo).map(([key, value]) => (
            <div key={key} class="info-card">
              <span class="info-label">{key}</span>
              <span class="info-value">{value}</span>
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
