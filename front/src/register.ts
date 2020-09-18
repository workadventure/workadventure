import Axios from "axios";
import {API_URL} from "./Enum/EnvironmentVariable";
declare let history:History;

//todo: better naming
export interface ConnexionData {
    organizationSlug: string,
    worldSlug: string,
    roomSlug: string,
}

export async function redirectIfToken(): Promise<ConnexionData | null> {
    const match = /\/register\/(.+)/.exec(window.location.toString());
    if (!match) {
        return null
    }
    let res = null;
    try {
        res = await Axios.get(`${API_URL}/register/`+match[1])
    } catch (e) {
        return null;
    }
    const organizationSlug = res.data.organizationSlug;
    const worldSlug = res.data.worldSlug;
    const roomSlug = res.data.roomSlug;
    const connexionUrl = '/@/'+organizationSlug+'/'+worldSlug+'/'+roomSlug;
    history.pushState({}, '', connexionUrl);
    return {organizationSlug, worldSlug, roomSlug};
}