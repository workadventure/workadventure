import axios, { AxiosError, AxiosInstance } from "axios";
import * as Sentry from "@sentry/node";
import { EJABBERD_DOMAIN, EJABBERD_PASSWORD, EJABBERD_API_URI, EJABBERD_USER } from "../Enum/EnvironmentVariable";
import { ChatZone } from "./MucManager";
import { ChatClient } from "./ChatClient";

export class EjabberdClient implements ChatClient {
    private axios: AxiosInstance | undefined;
    private conferenceDomain: string;

    constructor() {
        this.conferenceDomain = `conference.${EJABBERD_DOMAIN ?? ""}`;
    }

    private getAxios(): AxiosInstance {
        if (!this.axios) {
            if (!EJABBERD_USER || !EJABBERD_DOMAIN || !EJABBERD_PASSWORD || !EJABBERD_API_URI) {
                throw new Error(
                    "Incomplete config. Missing one of EJABBERD_USER, EJABBERD_DOMAIN, EJABBERD_PASSWORD, EJABBERD_API_URI."
                );
            }
            const auth = Buffer.from(EJABBERD_USER + "@" + EJABBERD_DOMAIN + ":" + EJABBERD_PASSWORD).toString(
                "base64"
            );
            this.axios = axios.create({
                baseURL: EJABBERD_API_URI + "/",
                headers: {
                    Authorization: "Basic " + auth,
                    timeout: 10000,
                },
            });
        }
        return this.axios;
    }

    async getAllMucRooms(): Promise<Array<string> | Error> {
        return (await this.getAxios()
            .post("muc_online_rooms", { service: this.conferenceDomain })
            .then((response) => response.data as Array<string>)
            .catch((error) => error as AxiosError)) as unknown as Promise<Array<string> | Error>;
    }

    async destroyMucRoom(name: string) {
        await this.getAxios()
            .post("destroy_room", { name: EjabberdClient.encode(name), service: this.conferenceDomain })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
    }

    async createMucRoom(chatZone: ChatZone) {
        await this.getAxios()
            .post("create_room", {
                name: `${EjabberdClient.encode(chatZone.mucUrl ?? "")}`,
                host: EJABBERD_DOMAIN,
                service: this.conferenceDomain,
            })
            .catch((error) => {
                console.error(error);
                Sentry.captureException(error);
            });
    }

    public static decode(name: string | null | undefined) {
        if (!name) return "";
        return name
            .replace(/\\20/g, " ")
            .replace(/\\22/g, "*")
            .replace(/\\26/g, "&")
            .replace(/\\27/g, "'")
            .replace(/\\2f/g, "/")
            .replace(/\\3a/g, ":")
            .replace(/\\3c/g, "<")
            .replace(/\\3e/g, ">")
            .replace(/\\40/g, "@")
            .replace(/\\5c/g, "\\");
    }

    public static encode(name: string | null | undefined) {
        if (!name) return "";
        return name
            .replace(/\\/g, "\\5c")
            .replace(/ /g, "\\20")
            .replace(/\*/g, "\\22")
            .replace(/&/g, "\\26")
            .replace(/'/g, "\\27")
            .replace(/\//g, "\\2f")
            .replace(/:/g, "\\3a")
            .replace(/</g, "\\3c")
            .replace(/>/g, "\\3e")
            .replace(/@/g, "\\40");
    }
}

export const ejabberdClient = new EjabberdClient();
