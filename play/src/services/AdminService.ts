import { ADMIN_API_URL } from "../enums/EnvironmentVariable";
import { adminApi } from "./AdminApi";
import { localAdmin } from "./LocalAdmin";

export const adminService = ADMIN_API_URL ? adminApi : localAdmin;
