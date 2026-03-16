import { describe, it, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/preact";
import { NavigationShell } from "./navigation-shell";
import type { Route } from "../app";
import { appProductName } from "../lib/app-metadata";
import { withWailsOS } from "../test-support/wails-env";

function renderShell(route: Route = "/", onNavigate = mock(() => {})) {
  const view = render(
    <NavigationShell route={route} onNavigate={onNavigate}>
      <div class="test-content">Page content</div>
    </NavigationShell>,
  );
  return { onNavigate, ...view };
}

describe("NavigationShell", () => {
  it("renders the titlebar application name on macOS", () => {
    withWailsOS("darwin", () => {
      const view = renderShell();
      expect(view.getByText(appProductName).textContent).toBe(appProductName);
    });
  });

  it("does not render a duplicate titlebar application name on Windows", () => {
    withWailsOS("windows", () => {
      const view = renderShell();
      expect(view.queryByText(appProductName)).toBeNull();
    });
  });

  it("renders all navigation items", () => {
    const view = renderShell();
    const items = view.getAllByRole("link");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("Home");
    expect(items[1].textContent).toBe("System");
  });

  it("marks the active route", () => {
    const view = renderShell("/");
    const items = view.getAllByRole("link");
    expect(items[0].classList.contains("active")).toBe(true);
    expect(items[1].classList.contains("active")).toBe(false);
  });

  it("marks system route as active", () => {
    const view = renderShell("/system");
    const items = view.getAllByRole("link");
    expect(items[0].classList.contains("active")).toBe(false);
    expect(items[1].classList.contains("active")).toBe(true);
  });

  it("calls onNavigate when a nav item is clicked", () => {
    const { onNavigate, getByRole } = renderShell("/");
    fireEvent.click(getByRole("link", { name: "System" }));
    expect(onNavigate).toHaveBeenCalledWith("/system");
  });

  it("toggles sidebar collapsed state", () => {
    const { container, getByRole } = renderShell();
    const sidebar = container.querySelector(".sidebar") as HTMLElement;
    expect(sidebar.style.width).toBe("200px");

    fireEvent.click(getByRole("button", { name: "Collapse sidebar" }));

    expect(sidebar.style.width).toBe("52px");

    const labels = container.querySelectorAll(".nav-label-short");
    expect(labels.length).toBe(2);
    expect(labels[0].textContent).toBe("H");
    expect(labels[1].textContent).toBe("S");
  });

  it("restores sidebar on second toggle", () => {
    const { container, getByRole } = renderShell();
    fireEvent.click(getByRole("button", { name: "Collapse sidebar" }));
    fireEvent.click(getByRole("button", { name: "Expand sidebar" }));

    const sidebar = container.querySelector(".sidebar") as HTMLElement;
    expect(sidebar.style.width).toBe("200px");

    const labels = container.querySelectorAll(".nav-label");
    expect(labels.length).toBe(2);
  });

  it("toggle button title reflects sidebar state", () => {
    const view = renderShell();
    const btn = view.getByRole("button", {
      name: "Collapse sidebar",
    }) as HTMLElement;
    expect(btn.title).toBe("Collapse sidebar");

    fireEvent.click(btn);
    expect(view.getByRole("button", { name: "Expand sidebar" }).title).toBe(
      "Expand sidebar",
    );
  });

  it("renders children in the content area", () => {
    const view = renderShell();
    expect(view.getByText("Page content").textContent).toBe("Page content");
  });

  it("has a draggable titlebar region", () => {
    const { container } = renderShell();
    const titlebar = container.querySelector(".titlebar") as HTMLElement;
    expect(titlebar.style.cssText).toContain("--wails-draggable: drag");
  });

  it("has a non-draggable toggle button", () => {
    const view = renderShell();
    const btn = view.getByRole("button", {
      name: "Collapse sidebar",
    }) as HTMLElement;
    expect(btn.style.cssText).toContain("--wails-draggable: no-drag");
  });

  it("only applies the traffic-light inset on macOS", () => {
    withWailsOS("darwin", () => {
      const { container } = renderShell();
      const titlebar = container.querySelector(".titlebar") as HTMLElement;
      expect(titlebar.classList.contains("titlebar--macos")).toBe(true);
    });

    withWailsOS("windows", () => {
      const { container } = renderShell();
      const titlebar = container.querySelector(".titlebar") as HTMLElement;
      expect(titlebar.classList.contains("titlebar--macos")).toBe(false);
    });
  });
});
