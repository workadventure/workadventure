import { adminApi } from "./AdminApi.ts";
import type { AdminInterface } from "./AdminInterface.ts";
import { localAdmin } from "./LocalAdmin.ts";

export const adminService: AdminInterface = adminApi.isEnabled() ? adminApi : localAdmin;
