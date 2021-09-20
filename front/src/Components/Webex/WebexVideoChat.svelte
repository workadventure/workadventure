<script>
    import {onMount} from 'svelte'
    import {prevent_default} from "svelte/internal";

    export let meetingRoom = null;
    export let accessToken = null

    let webexCDNLink = "https://unpkg.com/webex/umd/webex.min.js";

    let initials = "👨‍💻";
    let fullName = "iits";
    let personToCall = "Whiteboard";
    let ready = false
    let currentMeeting = null;
    let webex = null;
    let mediaSettings = {
        receiveAudio: true,
        receiveVideo: true,
        receiveShare: false,
        sendVideo: true,
        sendAudio: true,
        sendShare: false
    }
    let criticalError = null;

    function importWebex() {
        return new Promise((resolve, reject) => {
            let scriptElement = document.createElement('script');
            scriptElement.src = webexCDNLink;
            scriptElement.onload = () => {
                resolve();
            }
            scriptElement.onerror = () => {
                reject()
            }
            document.head.append(scriptElement);
        })
    }

    function bindMeetingEvents(meeting) {
        meeting.on('error', (err) => {
            console.error(err);
        });

        // Handle media streams changes to ready state
        meeting.on('media:ready', (media) => {
            if (!media) {
                return;
            }
            if (media.type === 'local') {
                document.getElementById('self-view').srcObject = media.stream;
            }
            if (media.type === 'remoteVideo') {
                document.getElementById('remote-view-video').srcObject = media.stream;
            }
            if (media.type === 'remoteAudio') {
                document.getElementById('remote-view-audio').srcObject = media.stream;
            }
        });

        // Handle media streams stopping
        meeting.on('media:stopped', (media) => {
            // Remove media streams
            if (media.type === 'local') {
                document.getElementById('self-view').srcObject = null;
            }
            if (media.type === 'remoteVideo') {
                document.getElementById('remote-view-video').srcObject = null;
            }
            if (media.type === 'remoteAudio') {
                document.getElementById('remote-view-audio').srcObject = null;
            }
        });
    }

    function joinMeeting(meeting) {
        return meeting.join().then(() => {
            return meeting.getMediaStreams(mediaSettings).then((mediaStreams) => {
                const [localStream, localShare] = mediaStreams;
                currentMeeting = meeting;
                meeting.addMedia({
                    localShare,
                    localStream,
                    mediaSettings
                }).catch(err => {
                    if (err.toString() === "WebexMeetingsError 30101: Meeting has already Ended or not Active") {
                        criticalError = new Error("The meeting hasn't started yet ⏰");
                    } else {
                        console.error(err.toString())
                    }
                });
            }).catch(err => {
                console.error(err);
                if (err.toString() === "ReconnectionError: Unable to retrieve media streams") {
                    criticalError = new Error("Is your webcam blocked? 😅");
                } else {
                    console.error(err.toString())
                }
            })
        })
    }

    function startCall() {
        criticalError = null;

        return webex.meetings.create(meetingRoom).then((meeting) => {
            bindMeetingEvents(meeting);

            return joinMeeting(meeting);
        }).catch(error => {
            console.error(error);
        })
    }

    function hangup() {
        currentMeeting.leave()
        currentMeeting = null;
    }

    onMount(async () => {
        await importWebex();
        webex = window.Webex.init({
            credentials: {
                access_token: accessToken //
            }
        });
        webex.config.logger.level = 'debug';
        webex.meetings.register().then(() => {
            startCall()
        })
            .catch(err => {
                console.error("Error: " + err + "\nmeetingRoom: " + meetingRoom + "\n" + "accessToken: " + accessToken);
            });

        ready = true;
    })
</script>

<svelte:head>
    <link rel="stylesheet" href="./widget-demo-main.css" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/main.css'"/>
    <link rel="stylesheet" href="./widget-space-main.css" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-space/production/main.css'"/>
    <link href="./fonts/CiscoSansTTLight.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTRegular.woff2'"/>
    <link href="./fonts/CiscoSansTTRegular.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTLight.woff2'"/>
    <link href="./fonts/momentum-ui-icons.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/momentum-ui-icons.woff2'"/>
</svelte:head>

<main>
    <div class="widget-demo--widgetSpaceComponentContainer--3L80J"
         style="width: calc( 100% - 30px); height: 100%; right: 0;background-color: black;">
        <div id="my-ciscospark-space-widget">
            {#if criticalError == null}
                {#if (!ready)}
                    <div class="widget-demo--wrapper--2FMs0">
                        <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                            <div class="ciscospark-title-bar-wrapper">
                                <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                    <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                        <div class="md-avatar md-avatar--24" title="Loading..."><span
                                                class="md-avatar__letter">L</span></div>
                                    </div>
                                    <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                            class="ciscospark-title widget-demo--title--6SJXl">Loading...</strong></p>
                                    </div>
                                    <div class="ciscospark-title-meta widget-demo--titleMeta--2Sz7g">
                                        <div class="ciscospark-activity-menu-button-wrapper widget-demo--activityMenuButtonWrapper--3eABx">
                                            <div class="ciscospark-activity-menu-button widget-demo--activityMenuButton--1FfBJ"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="ciscospark-widget-body widget-demo--widgetBody--XshYm">
                                <div class="ciscospark-meet-wrapper widget-demo--activityComponentWrapper--2OQlx">
                                    <div class="widget-demo--wrapper--2FMs0">
                                        <div class="webex-teams-loading widget-demo--loading--2kR9l"><img
                                                src="https://code.s4d.io/widget-demo/archives/0.2.50/logo.png"
                                                alt="Webex Teams Logo"
                                                class="webex-teams-spark-logo widget-demo--logo--BY-5z">
                                            <div class="webex-teams-loading-message widget-demo--loadingMessage--2ZJ8e"></div>
                                            <div class="webex-teams-spinner-container widget-demo--spinner--2zE8b"><i
                                                    class="md-spinner md-spinner--36 md-spinner--black"></i></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                {:else}
                    {#if (currentMeeting === null)}
                        <div class="widget-demo--wrapper--2FMs0">
                            <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                                <div class="ciscospark-title-bar-wrapper">
                                    <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                        <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                            <div class="md-avatar md-avatar--24" title="{fullName}"><span
                                                    class="md-avatar__letter">{initials}</span></div>
                                        </div>
                                        <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                                class="ciscospark-title widget-demo--title--6SJXl">{fullName}</strong>
                                        </p>
                                        </div>
                                        <div class="ciscospark-title-meta widget-demo--titleMeta--2Sz7g">
                                            <div class="ciscospark-activity-menu-button-wrapper widget-demo--activityMenuButtonWrapper--3eABx">
                                                <div class="ciscospark-activity-menu-button widget-demo--activityMenuButton--1FfBJ"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="ciscospark-widget-body widget-demo--widgetBody--XshYm">
                                    <div class="ciscospark-meet-wrapper widget-demo--activityComponentWrapper--2OQlx">
                                        <div class="widget-demo--wrapper--2FMs0">
                                            <div class="widget-demo--meetWidgetContainer--1fog_ meet-widget-container">
                                                <div class="widget-demo--callInactiveContainer--pCOsm call-inactive-container">
                                                    <div class="md-avatar md-avatar--84" title="{fullName}"><span
                                                            class="md-avatar__letter">{initials}</span></div>
                                                    <div class="widget-demo--personName--3fVsV call-person-name">{personToCall}
                                                    </div>
                                                    <div class="widget-demo--callControls--35xR2 call-controls-container">
                                                        <div class="ciscospark-controls-container widget-demo--controlContainer--1F4XU">
                                                            <div class="md-button__container--small">
                                                                <button on:click={prevent_default(startCall)}
                                                                        class="md-button md-button--circle md-button--68 md-activity md-activity__camera"
                                                                        type="button"
                                                                        aria-label="Start Call" tabindex="0"><span
                                                                        class="md-button__children" style="opacity: 1;"><i
                                                                        class="md-icon icon icon-camera_28"
                                                                        style="font-size: 28px;"></i></span></button>
                                                                <div class="md-button__label">Call</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    {:else}
                        {#if true}<!-- TODO Waiting in line?-->
                            <div class="webex-widget-body widget-space--widgetBody--M20il" style="height: 100%;">
                                <div class="webex-meet-wrapper widget-space--activityComponentWrapper--1-a6y">
                                    <div class="widget-space--wrapper--2FMs0">
                                        <div class="widget-space--meetWidgetContainer--1fog_ meet-widget-container">
                                            <div class="widget-space--callContainer--3K3TZ call-container">
                                                <div class="wxc-meeting-control-bar widget-space--callControls--2-7gU">
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-25" data-md-event-key="md-button-25"
                                                            type="button" aria-label="Mute" tabindex="0">
                                                        <span class="md-button__children" style="opacity: 1;"><i
                                                                class="md-icon icon icon-microphone-muted_28"
                                                                style="font-size: 28px;"></i></span></button>
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-26" data-md-event-key="md-button-26"
                                                            type="button" aria-label="Stop video"
                                                            tabindex="0"><span class="md-button__children"
                                                                               style="opacity: 1;"><i
                                                            class="md-icon icon icon-camera-muted_28"
                                                            style="font-size: 28px;"></i></span></button>
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-27" data-md-event-key="md-button-27"
                                                            type="button" aria-label="Start Share"
                                                            tabindex="0"><span class="md-button__children"
                                                                               style="opacity: 1;"><i
                                                            class="md-icon icon icon-share-screen-presence-stroke_26"
                                                            style="font-size: 28px;"></i></span></button>
                                                    <button on:click={prevent_default(hangup)} class="md-button md-button--circle md-button--56 md-button--red wxc-meeting-control"
                                                            id="md-button-28" data-md-event-key="md-button-28"
                                                            type="button" aria-label="Leave"  tabindex="0">
                                                        <span class="md-button__children" style="opacity: 1;"><i
                                                                class="md-icon icon icon-cancel_28"
                                                                style="font-size: 28px;"></i></span></button>
                                                </div>
                                                <div class="wxc-in-meeting">
                                                    <div class="wxc-local-media local-media-in-meeting">
                                                        <video playsinline="" id="self-view" autoplay="" style="height: 20vh;border-radius:20px" muted></video>
                                                    </div>
                                                    <div class="wxc-remote-media remote-media-in-meeting">
                                                        <video id="remote-view-video" class="wxc-remote-video" playsinline=""
                                                               autoplay=""></video>
                                                        <audio id="remote-view-audio" autoplay=""></audio>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {:else}
                            <div class="widget-demo--wrapper--2FMs0">
                                <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                                    <div class="ciscospark-title-bar-wrapper">
                                        <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                            <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                                <div class="md-avatar md-avatar--24" title="{fullName}"><span
                                                        class="md-avatar__letter">{initials}</span></div>
                                            </div>
                                            <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                                    class="ciscospark-title widget-demo--title--6SJXl">{fullName}</strong>
                                            </p></div>
                                            <div class="ciscospark-title-meta widget-demo--titleMeta--2Sz7g">
                                                <div class="ciscospark-activity-menu-button-wrapper widget-demo--activityMenuButtonWrapper--3eABx">
                                                    <div class="ciscospark-activity-menu-button widget-demo--activityMenuButton--1FfBJ"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="ciscospark-widget-body widget-demo--widgetBody--XshYm">
                                        <div class="ciscospark-meet-wrapper widget-demo--activityComponentWrapper--2OQlx">
                                            <div class="widget-demo--wrapper--2FMs0">
                                                <div class="widget-demo--meetWidgetContainer--1fog_ meet-widget-container">
                                                    <div class="widget-demo--callContainer--3K3TZ call-container">
                                                        <div class="widget-demo--waiting--tZklC participants-waiting">
                                                            Waiting for others to join...
                                                        </div>
                                                        <div class="widget-demo--callControls--2-7gU call-controls">
                                                            <div class="ciscospark-controls-container widget-demo--controlContainer--1F4XU">
                                                                <button class="md-button md-button--circle md-button--56 md-button--red md-call-control"
                                                                        type="button"
                                                                        aria-label="Toggle Mute Audio"
                                                                        tabindex="0"><span
                                                                        class="md-button__children" style="opacity: 1;"><i
                                                                        class="md-icon icon icon-microphone-muted_24"
                                                                        style="font-size: 24px; color: rgb(255, 255, 255);"></i></span>
                                                                </button>
                                                                <button class="md-button md-button--circle md-button--56 md-button--red md-call-control"
                                                                        type="button"
                                                                        aria-label="Mute Video" tabindex="0"><span
                                                                        class="md-button__children" style="opacity: 1;"><i
                                                                        class="md-icon icon icon-camera-muted_24"
                                                                        style="font-size: 24px; color: rgb(255, 255, 255);"></i></span>
                                                                </button>
                                                                <button class="md-button md-button--circle md-button--56 md-button--red md-call-control"
                                                                        type="button" aria-label="Hangup"
                                                                        tabindex="0"><span class="md-button__children"
                                                                                           style="opacity: 1;"><i
                                                                        class="md-icon icon icon-cancel_24"
                                                                        style="font-size: 24px; color: rgb(255, 255, 255);"></i></span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                {/if}
            {:else}
                <div class="widget-demo--wrapper--2FMs0">
                    <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                        <div class="ciscospark-title-bar-wrapper">
                            <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                    <div class="md-avatar md-avatar--24" title="Oops..."><span
                                            class="md-avatar__letter">😞</span></div>
                                </div>
                                <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                        class="ciscospark-title widget-demo--title--6SJXl">Oops...</strong></p>
                                </div>
                                <div class="ciscospark-title-meta widget-demo--titleMeta--2Sz7g">
                                    <div class="ciscospark-activity-menu-button-wrapper widget-demo--activityMenuButtonWrapper--3eABx">
                                        <div class="ciscospark-activity-menu-button widget-demo--activityMenuButton--1FfBJ"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ciscospark-widget-body widget-demo--widgetBody--XshYm">
                            <div class="ciscospark-meet-wrapper widget-demo--activityComponentWrapper--2OQlx">
                                <div class="widget-demo--wrapper--2FMs0">
                                    <div class="widget-demo--meetWidgetContainer--1fog_ meet-widget-container">
                                        <div class="widget-demo--callInactiveContainer--pCOsm call-inactive-container">
                                            <div class="widget-demo--personName--3fVsV call-person-name">{criticalError.toString()}
                                            </div>
                                            <div class="widget-demo--callControls--35xR2 call-controls-container">
                                                <div class="ciscospark-controls-container widget-demo--controlContainer--1F4XU">
                                                    <div class="md-button__container--small">
                                                        <button on:click={prevent_default(startCall)}
                                                                class="md-button md-button--circle md-button--68 md-activity md-activity__camera"
                                                                type="button"
                                                                aria-label="Start Call" tabindex="0"><span
                                                                class="md-button__children" style="opacity: 1;"><i
                                                                class="md-icon icon icon-camera_28"
                                                                style="font-size: 28px;"></i></span></button>
                                                        <div class="md-button__label">Call</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</main>

<style>

    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }

</style>
