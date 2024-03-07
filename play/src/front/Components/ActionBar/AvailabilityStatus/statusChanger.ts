import { StatusChanger } from "../../../Rules/StatusRules/StatusChanger";
import { StatusRules } from "../../../Rules/StatusRules/statusRules";
import { StatusStrategyFactory } from "../../../Rules/StatusRules/StatusFactory/StatusStrategyFactory";

export const statusChanger = new StatusChanger(StatusRules, StatusStrategyFactory);
