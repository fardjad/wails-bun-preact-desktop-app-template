import { describe, it, expect, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/preact";
import { HomeView } from "./home-view";

describe("HomeView", () => {
  it("renders the welcome heading", () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );
    expect(view.getByRole("heading", { name: "Welcome" }).textContent).toBe(
      "Welcome",
    );
  });

  it("renders the subtitle", () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );
    const text =
      view.getByText(/cross-platform desktop application/i).textContent ?? "";
    expect(text).toInclude("cross-platform desktop application");
  });

  it("renders the input and button", () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );
    expect(view.getByPlaceholderText("Enter your name")).toBeTruthy();
    expect(view.getByRole("button", { name: "Greet" }).textContent).toBe(
      "Greet",
    );
  });

  it("does not show greeting result initially", () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );
    expect(view.queryByText(/hello /i)).toBeNull();
  });

  it("calls greet and displays result on button click", async () => {
    const greet = mock(() =>
      Promise.resolve("Hello Alice, welcome to your desktop application!"),
    );
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );

    const input = view.getByPlaceholderText("Enter your name");
    fireEvent.input(input, { target: { value: "Alice" } });
    fireEvent.click(view.getByRole("button", { name: "Greet" }));

    await waitFor(() => {
      expect(greet).toHaveBeenCalledWith("Alice");
      expect(
        view.getByText("Hello Alice, welcome to your desktop application!")
          .textContent,
      ).toBe("Hello Alice, welcome to your desktop application!");
    });
  });

  it("calls greet on enter key", async () => {
    const greet = mock(() =>
      Promise.resolve("Hello Bob, welcome to your desktop application!"),
    );
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );

    const input = view.getByPlaceholderText("Enter your name");
    fireEvent.input(input, { target: { value: "Bob" } });
    fireEvent.keyUp(input, { key: "Enter" });

    await waitFor(() => {
      expect(greet).toHaveBeenCalledWith("Bob");
    });
  });

  it("does not call greet when input is empty", async () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );

    fireEvent.click(view.getByRole("button", { name: "Greet" }));

    expect(greet).not.toHaveBeenCalled();
  });

  it("does not call greet when input is only whitespace", async () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() => Promise.resolve([]));
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );

    const input = view.getByPlaceholderText("Enter your name");
    fireEvent.input(input, { target: { value: "   " } });
    fireEvent.click(view.getByRole("button", { name: "Greet" }));

    expect(greet).not.toHaveBeenCalled();
  });

  it("renders recent greetings when available", async () => {
    const greet = mock(() => Promise.resolve(""));
    const listGreetings = mock(() =>
      Promise.resolve([
        {
          id: 1,
          name: "Alice",
          message: "Hello Alice, welcome to your desktop application!",
          createdAt: "2026-03-17 10:00:00",
        },
      ]),
    );
    const view = render(
      <HomeView greet={greet} listGreetings={listGreetings} />,
    );

    await waitFor(() => {
      expect(
        view.getByText("Hello Alice, welcome to your desktop application!")
          .textContent,
      ).toBe("Hello Alice, welcome to your desktop application!");
    });
  });
});
