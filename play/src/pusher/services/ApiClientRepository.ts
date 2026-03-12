import { ApiClientRepository } from "@workadventure/shared-utils/src/ApiClientRepository.js";
import { API_URL } from "../enums/EnvironmentVariable.ts";

const apiClientRepository = new ApiClientRepository(API_URL.split(","));

export { apiClientRepository };
