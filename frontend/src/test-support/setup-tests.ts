import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup } from "@testing-library/preact";
import { afterEach } from "bun:test";

GlobalRegistrator.register();

const originalConsoleWarn = console.warn;

console.warn = (...args: unknown[]) => {
  const firstArg = args[0];
  if (
    typeof firstArg === "string" &&
    firstArg.includes("Browser Environment Detected") &&
    firstArg.includes("Only UI previews are available in the browser")
  ) {
    return;
  }

  originalConsoleWarn(...args);
};

afterEach(() => {
  cleanup();
});
