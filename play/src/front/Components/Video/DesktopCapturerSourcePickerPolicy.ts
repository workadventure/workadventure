import type { DesktopCapturerSource } from "../../Interfaces/DesktopAppInterfaces";

export type DesktopCapturerSourceKind = "screen" | "window";

export function getDesktopCapturerSourceKind(source: Pick<DesktopCapturerSource, "id">): DesktopCapturerSourceKind {
    return source.id.startsWith("screen:") ? "screen" : "window";
}
