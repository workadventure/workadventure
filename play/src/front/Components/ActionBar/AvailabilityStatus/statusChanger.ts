import { StatusChanger } from "../../../Rules/StatusRules/StatusChanger";
import { StatusStrategyFactory } from "../../../Rules/StatusRules/StatusFactory/StatusStrategyFactory";

export const statusChanger = new StatusChanger(StatusStrategyFactory);
