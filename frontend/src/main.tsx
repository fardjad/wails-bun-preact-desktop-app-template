import { render } from "preact";
import { App } from "./app";

render(<App />, document.getElementById("app")!);

// Accept HMR updates for the full module graph rooted here.
// When any imported module changes, Bun re-executes this file,
// which calls render() again — Preact diffs against the existing
// DOM so the update is fast without a full page reload.
if (import.meta.hot) {
  import.meta.hot.accept();
}
