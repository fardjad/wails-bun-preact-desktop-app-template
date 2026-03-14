import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Route } from "../app";
import { appProductName } from "../lib/app-metadata";
import "./navigation-shell.css";

const navItems: { path: Route; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/system", label: "System" },
];

interface Props {
  route: Route;
  onNavigate: (route: Route) => void;
  children: ComponentChildren;
}

export function NavigationShell({ route, onNavigate, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div class="shell">
      {/* Titlebar drag region (macOS traffic lights sit here) */}
      <header class="titlebar" style="--wails-draggable: drag">
        <button
          class="sidebar-toggle"
          style="--wails-draggable: no-drag"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 4h12M2 8h12M2 12h12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <span class="titlebar-text">{appProductName}</span>
      </header>

      <div class="layout">
        {/* Sidebar navigation */}
        <nav
          class="sidebar"
          style={{ width: collapsed ? "52px" : "200px" }}
        >
          {navItems.map((item) => (
            <a
              key={item.path}
              class={`nav-item${route === item.path ? " active" : ""}`}
              title={item.label}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.path);
              }}
            >
              {collapsed ? (
                <span class="nav-label-short">{item.label.charAt(0)}</span>
              ) : (
                <span class="nav-label">{item.label}</span>
              )}
            </a>
          ))}
        </nav>

        {/* Main content */}
        <main class="content">{children}</main>
      </div>
    </div>
  );
}
