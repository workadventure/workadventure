import { ADMIN_API_URL } from "../Enum/EnvironmentVariable";
import { adminApi } from "./AdminApi";
import { AdminInterface } from "./AdminInterface";
import { localAdmin } from "./LocalAdmin";

export const adminService: AdminInterface = ADMIN_API_URL ? adminApi : localAdmin;
