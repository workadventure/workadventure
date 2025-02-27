import debug from "debug";

// Players Contexts
export const debugRepo = debug("Players");
export const debugAddPlayer = debugRepo.extend("AddPlayer");
export const debugUpdatePlayer = debugRepo.extend("UpdatePlayer");
export const debugRemovePlayer = debugRepo.extend("RemovePlayer");

export const debugZoom = debug("Zoom");
