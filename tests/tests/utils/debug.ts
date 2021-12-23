import axios from "axios";
const fs = require('fs');

const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN;

export async function getPusherDump(): Promise<any> {
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

export async function getBackDump(): Promise<any> {
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

