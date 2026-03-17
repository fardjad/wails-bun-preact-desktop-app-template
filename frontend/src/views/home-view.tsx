import { useEffect, useState } from "preact/hooks";
import { ListGreetings as DefaultListGreetings } from "../../bindings/cross-platform-desktop-app-template/databaseservice";
import { Greet as DefaultGreet } from "../../bindings/cross-platform-desktop-app-template/greetservice";
import "./home-view.css";

export interface GreetingRecord {
  id: number;
  name: string;
  message: string;
  createdAt: string;
}

interface Props {
  greet?: (name: string) => PromiseLike<string>;
  listGreetings?: (limit: number) => PromiseLike<GreetingRecord[]>;
}

export function HomeView({
  greet = DefaultGreet,
  listGreetings = DefaultListGreetings,
}: Props) {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");
  const [recentGreetings, setRecentGreetings] = useState<GreetingRecord[]>([]);

  async function loadGreetings() {
    try {
      setRecentGreetings(await listGreetings(5));
    } catch (e) {
      console.error("Failed to load recent greetings:", e);
    }
  }

  useEffect(() => {
    void loadGreetings();
  }, []);

  async function handleGreet() {
    if (!name.trim()) return;
    setError("");

    try {
      setGreeting(await greet(name));
      await loadGreetings();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Unable to greet right now.";
      setError(message);
    }
  }

  return (
    <div class="home">
      <h1>Welcome</h1>
      <p class="subtitle">
        Your cross-platform desktop application is running.
      </p>

      <div class="greet-section">
        <div class="input-group">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            onKeyUp={(e) => e.key === "Enter" && handleGreet()}
          />
          <button onClick={handleGreet}>Greet</button>
        </div>
        {greeting && <p class="greeting-result">{greeting}</p>}
        {error && <p class="greeting-result">{error}</p>}
      </div>

      <section class="greet-section">
        <h2>Recent Greetings</h2>
        {recentGreetings.length === 0 ? (
          <p class="subtitle">No greetings saved yet.</p>
        ) : (
          <ul>
            {recentGreetings.map((item) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
