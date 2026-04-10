import type { Command } from "@workadventure/map-editor";
import type { FrontCommandInterface } from "./FrontCommandInterface";

export type FrontCommand = Command & FrontCommandInterface;
