import Axios, { AxiosError, AxiosInstance } from "axios";
import { EJABBERD_DOMAIN, EJABBERD_PASSWORD, EJABBERD_API_URI, EJABBERD_USER } from "../Enum/EnvironmentVariable";
import { ChatZone } from "./MucManager";
import { ChatClient } from "./ChatClient";

export class EjabberdClient implements ChatClient {
    private axios: AxiosInstance | undefined;

    constructor() {
        const auth = Buffer.from(EJABBERD_USER + "@" + EJABBERD_DOMAIN + ":" + EJABBERD_PASSWORD).toString("base64");
        this.axios = Axios.create({
            baseURL: EJABBERD_API_URI + "/",
            headers: {
                Authorization: "Basic " + auth,
                timeout: 10000,
            },
        });
    }

    async getAllMucRooms(): Promise<Array<string> | Error> {
        return (await this.axios
            ?.post("muc_online_rooms", { service: `conference.${EJABBERD_DOMAIN}` })
            .then((response) => response.data as Array<string>)
            .catch((error) => error as AxiosError)) as unknown as Promise<Array<string> | Error>;
    }

    async destroyMucRoom(name: string) {
        await this.axios
            ?.post("destroy_room", { name: EjabberdClient.encode(name), service: `conference.${EJABBERD_DOMAIN}` })
            .catch((error) => console.error(error));
    }

    async createMucRoom(chatZone: ChatZone) {
        await this.axios
            ?.post("create_room", {
                name: `${EjabberdClient.encode(chatZone.mucUrl ?? "")}`,
                host: EJABBERD_DOMAIN,
                service: `conference.${EJABBERD_DOMAIN}`,
            })
            .catch((error) => console.error(error));
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
