import {LocalCompanionSevice} from "./LocalCompanionSevice";
import {AdminCompanionService} from "./AdminCompanionService";

export const companionService = AdminCompanionService.isEnabled() ? new AdminCompanionService(): new LocalCompanionSevice();

