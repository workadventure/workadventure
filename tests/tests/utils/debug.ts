import axios from "axios";
import * as fs from 'fs';

const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

export async function getPusherDump(): Promise<Record<string, unknown>> {
    let url = 'http://pusher.workadventure.localhost/dump?token='+ADMIN_API_TOKEN;
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://pusher:8080/dump?token='+ADMIN_API_TOKEN;
    }

    return (await axios({
        url,
        method: 'get',
    })).data;
}

export async function getBackDump(): Promise<Array<{roomUrl: string}>> {
    let url = 'http://api.workadventure.localhost/dump?token='+ADMIN_API_TOKEN;
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://back:8080/dump?token='+ADMIN_API_TOKEN;
    }

    return (await axios({
        url,
        method: 'get',
    })).data;
}

export async function getPusherRooms(): Promise<Record<string, number>> {
    let url = 'http://pusher.workadventure.localhost/rooms';
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://pusher:8080/rooms';
    }

    return (await axios({
        url,
        method: 'get',
        headers: {
            "Authorization": ADMIN_API_TOKEN
        }
    })).data;
}
