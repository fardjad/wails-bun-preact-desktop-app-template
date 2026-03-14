import { useState } from "preact/hooks";
import { Greet as DefaultGreet } from "../wailsjs/go/main/App";
import "./home-view.css";

interface Props {
  greet?: (name: string) => Promise<string>;
}

export function HomeView({ greet = DefaultGreet }: Props) {
  const [name, setName] = useState("");
  const [greeting, setGreeting] = useState("");

  async function handleGreet() {
    if (!name.trim()) return;
    setGreeting(await greet(name));
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
      </div>
    </div>
  );
}
