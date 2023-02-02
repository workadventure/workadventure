import { adminApi } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";
import { localAdmin } from "./LocalAdmin";

export const adminService: AdminInterface = adminApi.isEnabled() ? adminApi : localAdmin;
