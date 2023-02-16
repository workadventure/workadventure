import debug from "debug";

// Players Contexts
export const debugRepo = debug("Players");
export const debugAddPlayer = debugRepo.extend("AddPlayer");
export const debugRemovePlayer = debugRepo.extend("RemovePlayer");

export const debugCheckTurn = debug("CheckTurn");
