import fs from 'fs';
import axios from "axios";
import {APIRequestContext, APIResponse} from "@playwright/test";
import {play_url} from "./urls";

const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

export async function getPusherDump(): Promise<Record<string, unknown>> {
    let url = new URL('/dump?token='+ADMIN_API_TOKEN, play_url).toString();
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://play:3000/dump?token='+ADMIN_API_TOKEN;
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

export async function getPusherRooms(request: APIRequestContext): Promise<APIResponse> {
    let url = '/rooms';
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://play:3000/rooms';
    }

    return request.get(url, {
        headers: {
            "Authorization": ADMIN_API_TOKEN,
        }
    })
/*
    return (await axios({
        url,
        method: 'get',
        headers: {
            "Authorization": ADMIN_API_TOKEN
        }
    })).data;*/
}
