
// this makes use of the local example sdk, see ../
import {
    Picker,
    MSALAuthenticate,
    IFilePickerOptions,
    IPicker,
    Popup,
} from "@pnp/picker-api";
import { v4 } from "uuid";

let options: IFilePickerOptions;
let channelId: string;

let clientId;
let clientAuthority;
let baseUrl = "https://onedrive.live.com/picker";

const msalParams = {
    auth: {
        authority: clientAuthority,
        clientId,
        redirectUri: "http://localhost:3000"
    },
}

export const initOneDrivePicker = async (clientId: string, clientAuthority: string, baseUrl = "https://onedrive.live.com/picker") => {
    clientId = clientId;
    clientAuthority = clientAuthority;
    baseUrl = baseUrl;
    channelId = v4(); // Always use a unique id for the channel when hosting the picker.
    options = {
        sdk: "8.0",
        entry: {
            oneDrive: {},
        },
        authentication: {},
        messaging: {
            origin: "http://localhost:3000",
            channelId: channelId
        },
        selection: {
            mode: "multiple",
            maxCount: 5,
        },
        typesAndSources: {
            mode: "all",
            pivots: {
                recent: true,
                oneDrive: true,
            },
        },
    };

    // test to receive message
    // this adds a listener to the current (host) window, which the popup or embed will message when ready
    window.addEventListener("message", (event: MessageEvent) => {
        console.log("Message received");
    });
}

export const showOneDrivePicker = async (language: string = 'en-us') => {
    e.preventDefault();

    // setup the picker with the desired behaviors
    const picker = Picker(window.open("", "Picker", "width=800,height=600")).using(
        Popup(),
        MSALAuthenticate(msalParams),
    );

    // optionally log notifications to the console
    picker.on.notification(function (this: IPicker, message: unknown) {
        console.log("notification: " + JSON.stringify(message));
    });

    // optionially log any logging from the library itself to the console
    picker.on.log(function (this: IPicker, message: unknown, level: unknown) {
        console.log(`log: [${level}] ${message}`);
    });

    // activate the picker with our baseUrl and options object
    const results = await picker.activate({
        baseUrl,
        options,
    });

    const element = document.getElementById("pickedFiles");
    if(!element) throw new Error("Element with id 'pickedFiles' not found");
    element.innerHTML = `<pre>${JSON.stringify(results, null, 2)}</pre>`;
}