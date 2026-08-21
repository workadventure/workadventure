import type { BrowserWindowConstructorOptions } from "electron";

export function createDesktopAuthWindowOptions(): BrowserWindowConstructorOptions;
export function isExpectedDesktopAuthWindowLoadError(error: unknown): boolean;
