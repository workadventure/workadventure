import axios from "axios";
const fs = require('fs');

export async function getPusherDump(): Promise<any> {
    let url = 'http://pusher.workadventure.localhost/dump?token=123';
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://pusher/dump?token=123';
    }

    return (await axios({
        url,
        method: 'get',
    })).data;
}


export async function getBackDump(): Promise<any> {
    let url = 'http://api.workadventure.localhost/dump?token=123';
    if (fs.existsSync('/project')) {
        // We are inside a container. Let's use a direct route
        url = 'http://back/dump?token=123';
    }

    return (await axios({
        url,
        method: 'get',
    })).data;
}

