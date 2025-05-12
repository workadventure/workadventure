import CancelablePromise from "cancelable-promise";

import { InitOptions, JitsiMeetJSType } from "lib-jitsi-meet/types/hand-crafted/JitsiMeetJS";

import JitsiConnection from "lib-jitsi-meet/types/hand-crafted/JitsiConnection";

class LibJitsiFactory {
    private jitsiLoadPromise: CancelablePromise<JitsiMeetJSType> | undefined;

    // TODO: check if we can resume connection automatically. Also, check life time of JWT token.... maybe we should ask for a new token on each connection request?

    // TODO: connection is dropped when Wifi is down and is not resumed automatically.
    /**
     *
     * @param domain The main domain name of Jitsi. We will load "lib-jitsi-meet" from "https://[domain]/libs/lib-jitsi-meet.min.js"
     * @param xmppDomain The domain name of the XMPP server (Prosody).
     * @param mucDomain The domain name of the MUC. Unlike "domain" and "xmppDomain", we do not expect a real domain here, but a "virtual" domain used by the XMPP server. This is usually "muc."+xmppDomain or "conference."+xmppDomain.
     * @param jwt the JWT token to connect to Jitsi (if Jitsi requires one)
     */
    public async createConnection(
        domain: string,
        xmppDomain: string,
        mucDomain: string,
        jwt?: string
    ): Promise<JitsiConnection> {
        const JitsiMeetJS = await this.loadJitsiScript(domain);

        //JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
        /*
        XMPP_DOMAIN=prosody.test.workadventu.re
        XMPP_AUTH_DOMAIN=auth.prosody.test.workadventu.re
        XMPP_GUEST_DOMAIN=guest.prosody.test.workadventu.re
        XMPP_INTERNAL_MUC_DOMAIN=internal-muc.prosody.test.workadventu.re
        XMPP_MUC_DOMAIN=muc.prosody.test.workadventu.re
        XMPP_RECORDER_DOMAIN=recorder.prosody.test.workadventu.re
*/
        return new Promise((resolve, reject) => {
            const connection = new JitsiMeetJS.JitsiConnection(undefined, jwt, {
                // JitsiConferenceOptions
                hosts: {
                    domain: xmppDomain,
                    muc: mucDomain,
                    //focus: "focus.prosody.test.workadventu.re",
                    //anonymousdomain: "guest."+xmppDomain,
                },
                serviceUrl: `wss://${domain}/xmpp-websocket`,
                //clientNode
            });

            connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, () => {
                resolve(connection);
            });
            connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_FAILED, (e: unknown, e2: unknown) => {
                console.error(e);
                console.error(e2);
                reject(new Error("Unable to connect to Jitsi"));
            });
            //connection.addEventListener(JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, disconnect);

            connection.connect({});

            //const conference = connection.initJitsiConference("foo", {});

            return;
        });
    }

    public loadJitsiScript(domain: string, options?: InitOptions): CancelablePromise<JitsiMeetJSType> {
        if (this.jitsiLoadPromise) {
            return this.jitsiLoadPromise;
        }
        return (this.jitsiLoadPromise = new CancelablePromise<JitsiMeetJSType>((resolve, reject, cancel) => {
            const jitsiScript = document.createElement("script");
            if (!domain.startsWith("https://")) {
                domain = "https://" + domain;
            }
            jitsiScript.src = domain + "/libs/lib-jitsi-meet.min.js";
            jitsiScript.onload = () => {
                // As soon as the library is loaded, let's "init" it.
                window.JitsiMeetJS.init(options ?? {});

                // TODO: make the log level configurable based on the value of the localStorage debug key
                let jitsiDebugLevel = localStorage.getItem("jitsiDebugLevel");
                if (!jitsiDebugLevel) {
                    jitsiDebugLevel = window.JitsiMeetJS.logLevels.WARN;
                }
                window.JitsiMeetJS.setLogLevel(jitsiDebugLevel);

                resolve(window.JitsiMeetJS);
            };
            jitsiScript.onerror = () => {
                reject();
            };

            document.head.appendChild(jitsiScript);

            cancel(() => {
                jitsiScript.remove();
            });
        }));
    }
}

export const libJitsiFactory = new LibJitsiFactory();
