import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository";
import { API_URL } from "../enums/EnvironmentVariable";

const apiClientRepository = new ApiClientRepository(API_URL.split(","));

export { apiClientRepository };
