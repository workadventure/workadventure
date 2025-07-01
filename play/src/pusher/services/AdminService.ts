import { adminApi } from "@workadventure/shared-utils/src/AdminApi";
import { AdminInterface } from "./AdminInterface";
import { localAdmin } from "./LocalAdmin";

export const adminService: AdminInterface = adminApi.isEnabled() ? adminApi : localAdmin;
