import axios from "axios";

export async function getPusherDump(): Promise<any> {
    return (await axios({
        url: 'http://pusher.workadventure.localhost/dump?token=123',
        method: 'get',
    })).data;
}


export async function getBackDump(): Promise<any> {
    return (await axios({
        url: 'http://api.workadventure.localhost/dump?token=123',
        method: 'get',
    })).data;
}

