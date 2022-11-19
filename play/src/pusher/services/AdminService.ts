import { adminApi } from "./AdminApi";
import { localAdmin } from "./LocalAdmin";

export const adminService = adminApi.isEnabled() ? adminApi : localAdmin;
