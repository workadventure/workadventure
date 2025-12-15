import { writable } from "svelte/store";
import type { TodoListInterface } from "@workadventure/shared-utils";

export const isActivatedStore = writable(false);
export const isTodoListVisibleStore = writable(false);
export const todoListsStore = writable(new Map<string, TodoListInterface>());
