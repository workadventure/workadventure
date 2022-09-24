import { adminWokaService } from "./AdminWokaService";
import { localWokaService } from "./LocalWokaService";
import { adminApi } from "./AdminApi";

export const wokaService = adminApi.isEnabled() ? adminWokaService : localWokaService;
