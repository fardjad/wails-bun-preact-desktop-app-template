// @ts-expect-error Wails 3 alpha currently generates JS bindings without .d.ts files.
import * as backend from "../../bindings/cross-platform-desktop-app-template/app";

export const Greet = backend.Greet as (name: string) => Promise<string>;
export const GetSystemInfo = backend.GetSystemInfo as () => Promise<Record<string, string>>;
export const OpenDirectoryDialog = backend.OpenDirectoryDialog as (title: string) => Promise<string>;
export const OpenFileDialog = backend.OpenFileDialog as (title: string) => Promise<string>;
export const SetTitle = backend.SetTitle as (title: string) => Promise<void>;
