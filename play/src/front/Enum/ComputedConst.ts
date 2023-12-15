import { PUSHER_URL } from "./EnvironmentVariable";

export const ABSOLUTE_PUSHER_URL = new URL(PUSHER_URL, window.location.toString()).toString();
