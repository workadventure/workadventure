import { writable } from "svelte/store";
import { StatusChanger } from "../Rules/StatusRules/StatusChanger";
import { StatusRules } from "../Rules/StatusRules/statusRules";
import { StatusStrategyFactory } from "../Rules/StatusRules/StatusStrategyFactory";

export const StatusChangerStore = writable(new StatusChanger(StatusRules, StatusStrategyFactory));
