// Stubs for Wails Go bindings.
// Replaced by auto-generated bindings at frontend/wailsjs/ during wails build/dev.
// These exist so TypeScript and bun build can resolve imports before first generation.

export function Greet(name: string): Promise<string> {
  return (window as any)['go']['main']['App']['Greet'](name);
}

export function GetSystemInfo(): Promise<Record<string, string>> {
  return (window as any)['go']['main']['App']['GetSystemInfo']();
}

export function OpenDirectoryDialog(title: string): Promise<string> {
  return (window as any)['go']['main']['App']['OpenDirectoryDialog'](title);
}

export function OpenFileDialog(title: string): Promise<string> {
  return (window as any)['go']['main']['App']['OpenFileDialog'](title);
}

export function SetTitle(title: string): Promise<void> {
  return (window as any)['go']['main']['App']['SetTitle'](title);
}
