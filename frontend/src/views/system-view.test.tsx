import { describe, it, expect, mock } from "bun:test";
import {
  fireEvent,
  render,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/preact";
import { SystemView } from "./system-view";
import { mockConsole } from "../test-support/console-mock";

describe("SystemView", () => {
  it("renders the heading", () => {
    const getSystemInfo = mock(() => Promise.resolve({}));
    const view = render(<SystemView getSystemInfo={getSystemInfo} />);
    expect(
      view.getByRole("heading", { name: "System Information" }).textContent,
    ).toBe("System Information");
  });

  it("shows loading state initially", () => {
    const getSystemInfo = mock(
      () => new Promise<Record<string, string>>(() => {}),
    );
    const view = render(<SystemView getSystemInfo={getSystemInfo} />);
    const loading = view.getByText("Loading system info...");
    expect(loading).not.toBeNull();
    expect(loading.textContent).toBe("Loading system info...");
  });

  it("displays system info after loading", async () => {
    const getSystemInfo = mock(() =>
      Promise.resolve({ os: "darwin", arch: "arm64", cpus: "10" }),
    );
    const view = render(<SystemView getSystemInfo={getSystemInfo} />);
    await waitForElementToBeRemoved(() =>
      view.queryByText("Loading system info..."),
    );

    const cards = document.querySelectorAll(".info-card");
    expect(cards.length).toBe(3);
    const labels = Array.from(document.querySelectorAll(".info-label")).map(
      (el) => el.textContent,
    );
    expect(labels).toContain("os");
    expect(labels).toContain("arch");
    expect(labels).toContain("cpus");
    const values = Array.from(document.querySelectorAll(".info-value")).map(
      (el) => el.textContent,
    );
    expect(values).toContain("darwin");
    expect(values).toContain("arm64");
    expect(values).toContain("10");
  });

  it("handles getSystemInfo failure gracefully", async () => {
    const getSystemInfo = mock(() => Promise.reject(new Error("fail")));
    const consoleMock = mockConsole();

    try {
      const view = render(<SystemView getSystemInfo={getSystemInfo} />);
      await waitForElementToBeRemoved(() =>
        view.queryByText("Loading system info..."),
      );
      expect(document.querySelectorAll(".info-card").length).toBe(0);
      await waitFor(() => {
        expect(consoleMock.calls.error).toHaveLength(1);
        expect(consoleMock.calls.error?.[0]?.[0]).toBe(
          "Failed to get system info:",
        );
        expect((consoleMock.calls.error?.[0]?.[1] as Error).message).toBe(
          "fail",
        );
      });
    } finally {
      consoleMock.restore();
    }
  });

  it("calls openDirectoryDialog on button click", async () => {
    const getSystemInfo = mock(() => Promise.resolve({}));
    const openDirectoryDialog = mock(() =>
      Promise.resolve("/Users/test/Documents"),
    );
    const view = render(
      <SystemView
        getSystemInfo={getSystemInfo}
        openDirectoryDialog={openDirectoryDialog}
      />,
    );
    await waitForElementToBeRemoved(() =>
      view.queryByText("Loading system info..."),
    );

    fireEvent.click(
      view.getByRole("button", { name: "Open Directory Picker" }),
    );
    expect(openDirectoryDialog).toHaveBeenCalledWith("Choose a directory");
    const selectedPath = await view.findByText(/Selected:/i);
    expect(
      within(selectedPath.closest(".selected-path") as HTMLElement).getByText(
        "/Users/test/Documents",
      ).textContent,
    ).toBe("/Users/test/Documents");
  });

  it("does not show selected path when dialog is cancelled", async () => {
    const getSystemInfo = mock(() => Promise.resolve({}));
    const openDirectoryDialog = mock(() => Promise.resolve(""));
    const view = render(
      <SystemView
        getSystemInfo={getSystemInfo}
        openDirectoryDialog={openDirectoryDialog}
      />,
    );
    await waitForElementToBeRemoved(() =>
      view.queryByText("Loading system info..."),
    );

    fireEvent.click(
      view.getByRole("button", { name: "Open Directory Picker" }),
    );
    expect(openDirectoryDialog).toHaveBeenCalledWith("Choose a directory");
    expect(document.querySelector(".selected-path")).toBeNull();
  });

  it("handles openDirectoryDialog failure gracefully", async () => {
    const getSystemInfo = mock(() => Promise.resolve({}));
    const openDirectoryDialog = mock(() =>
      Promise.reject(new Error("cancelled")),
    );
    const consoleMock = mockConsole();

    try {
      const view = render(
        <SystemView
          getSystemInfo={getSystemInfo}
          openDirectoryDialog={openDirectoryDialog}
        />,
      );
      await waitForElementToBeRemoved(() =>
        view.queryByText("Loading system info..."),
      );

      fireEvent.click(
        view.getByRole("button", { name: "Open Directory Picker" }),
      );
      await waitFor(() => {
        expect(consoleMock.calls.error).toHaveLength(1);
        expect(consoleMock.calls.error?.[0]?.[0]).toBe(
          "Failed to open directory dialog:",
        );
        expect((consoleMock.calls.error?.[0]?.[1] as Error).message).toBe(
          "cancelled",
        );
      });
      expect(document.querySelector(".selected-path")).toBeNull();
    } finally {
      consoleMock.restore();
    }
  });
});
