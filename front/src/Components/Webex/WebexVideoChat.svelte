<script>
    import {onMount} from 'svelte'
    import {prevent_default} from "svelte/internal";

    export let meetingRoom = null;
    export let accessToken = null;
    export let initials = "👨‍💻";
    export let fullName = "iits";
    export let personToCall = "Meeting Room";

    let webexCDNLink = "https://unpkg.com/webex/umd/webex.min.js";

    let ready = false;
    let waitingInQueue = false;
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
    let muted = false;
    let blinded = false;
    let screenSharing = false;

    let localVideoStream = null;
    let localShareStream = null;
    let remoteAudioStream = null;
    let remoteShareStream = null;
    let remoteVideoStream = null;

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

        meeting.on('meeting:self:guestAdmitted', (obj) => {
            refreshAllStreams()
            console.log("guest admitted", obj)
            waitingInQueue = false;
        })

        meeting.on('meeting:self:lobbyWaiting', (obj) => {
            console.log("waiting in queue", obj)
            waitingInQueue = true;
        })

        meeting.on('meeting:self:mutedByOthers', (obj) => {
            console.log("Muted by others", obj)
            muted = false;
            mute();
        })

        // Handle screenshare streams
        meeting.on('meeting:startedSharingRemote', () => {
            assignElementMediaSource(document.getElementById('remote-view-video'),remoteShareStream);
        });

        meeting.on('meeting:stoppedSharingRemote', () => {
            assignElementMediaSource(document.getElementById('remote-view-video'),remoteVideoStream);
        });

        meeting.on('meeting:startedSharingLocal', () => {
            assignElementMediaSource(document.getElementById('self-view'),localShareStream);
        })

        meeting.on('meeting:stoppedSharingLocal', () => {
            assignElementMediaSource(document.getElementById('self-view'),localVideoStream);
        })
        // Handle media streams changes to ready state
        meeting.on('media:ready', (media) => {
            if (!media) {
                return;
            }
            if (media.type === 'local') {
                localVideoStream = media.stream;
            }
            if (media.type === 'remoteVideo') {
                remoteVideoStream = media.stream;
            }
            if (media.type === 'remoteAudio') {
                remoteAudioStream = media.stream;
            }
            if (media.type === 'localShare') {
                localShareStream = media.stream;
            }
            if (media.type === 'remoteShare') {
                remoteShareStream = media.stream;
            }
            refreshAllStreams();
        });

        // Handle media streams stopping
        meeting.on('media:stopped', (media) => {
            // Remove media streams
            if (media.type === 'local') {
                assignElementMediaSource(document.getElementById('self-view'), null);
            }
            if (media.type === 'remoteVideo') {
                assignElementMediaSource(document.getElementById('remote-view-video'), null);
            }
            if (media.type === 'remoteAudio') {
                assignElementMediaSource(document.getElementById('remote-view-audio'), null);
            }
            if (media.type === 'localShare') {
                assignElementMediaSource(document.getElementById('self-view'), localVideoStream);
            }
            if (media.type === 'remoteShare') {
                assignElementMediaSource(document.getElementById('remote-view-video'), remoteVideoStream);
            }
        });
    }

    function refreshAllStreams() {
        return new Promise((resolve, reject) => {
            try {
                if (!localShareStream) {
                    assignElementMediaSource(document.getElementById('self-view'), localVideoStream);
                } else {
                    assignElementMediaSource(document.getElementById('self-view'), localShareStream);
                }
                if (!remoteShareStream) {
                    assignElementMediaSource(document.getElementById('remote-view-video'), remoteVideoStream);
                } else {
                    assignElementMediaSource(document.getElementById('remote-view-video'), remoteShareStream);
                }
                assignElementMediaSource(document.getElementById('remote-view-audio'), remoteAudioStream);
                resolve();
            } catch (e) {
                reject(e.toString);
            }
        })
    }


    // https://github.com/webex/webex-js-sdk/blob/2dc6ec9d6d4a933ad76d2aacc1a19ceb87eb3d52/packages/node_modules/samples/browser-call-with-screenshare/app.js#L398
    function waitForMediaReady(meeting) {
        return new Promise((resolve, reject) => {
            try {
                if (meeting.canUpdateMedia()) {
                    resolve();
                } else {
                    console.info('SHARE-SCREEN: Unable to update media, pausing to retry...');
                    let retryAttempts = 0;

                    const retryInterval = setInterval(() => {
                        retryAttempts += 1;
                        console.info('SHARE-SCREEN: Retry update media check');

                        if (meeting.canUpdateMedia()) {
                            console.info('SHARE-SCREEN: Able to update media, continuing');
                            clearInterval(retryInterval);
                            resolve();
                        }
                        // If we can't update our media after 15 seconds, something went wrong
                        else if (retryAttempts > 15) {
                            console.error('SHARE-SCREEN: Unable to share screen, media was not able to update.');
                            clearInterval(retryInterval);
                            reject();
                        }
                    }, 10000);
                }
            } catch (err) {
                reject(err.toString())
            }
        });
    }

    function toggleShare() {
        if (currentMeeting) {
            if (!screenSharing) {
                waitForMediaReady(currentMeeting).then(() => {
                    console.info('SHARE-SCREEN: Sharing screen via `shareScreen()`');
                    currentMeeting.shareScreen().then(() => {
                        console.info('SHARE-SCREEN: Screen successfully added to meeting.');
                        screenSharing = true;
                    }).catch((e) => {
                        console.error('SHARE-SCREEN: Unable to share screen, error:');
                        console.error(e);
                    });
                })
            } else {
                waitForMediaReady(currentMeeting).then(() => {
                    currentMeeting.stopShare().then(() => {
                        console.info('SHARE-SCREEN: Screen sharing stopped');
                        screenSharing = false;
                    }).catch((e) => {
                        console.error('SHARE-SCREEN: Unable to stop sharing screen, error:');
                        console.error(e);
                    });
                });
            }
        }

    }



    // https://github.com/webex/webex-js-sdk/blob/2dc6ec9d6d4a933ad76d2aacc1a19ceb87eb3d52/packages/node_modules/samples/browser-single-party-call-with-mute/app.js#L241
    function mute() {
        if (!muted) {
            currentMeeting.muteAudio().then(() => {
                console.log("Audio muted")
                muted = true;
            })
        } else {
            currentMeeting.unmuteAudio().then(() => {
                console.log("Audio unmuted")
                muted = false;
            })
        }
    }

    function blind() {
        if (!blinded) {
            currentMeeting.muteVideo().then(() => {
                console.log("Video muted")
                blinded = true
            })
        } else {
            currentMeeting.unmuteVideo().then(() => {
                console.log("Video unmuted")
                blinded = false
            })
        }
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
                        errorScreen(new Error("The meeting hasn't started yet ⏰"));
                    } else {
                        console.error(err.toString())
                    }
                });
            }).catch(err => {
                console.error(err);
                if (err.toString() === "ReconnectionError: Unable to retrieve media streams") {
                    if (!blinded) {
                        blind()
                    }
                    if (!muted) {
                        mute()
                    }
                    try {
                        console.log("Attempting reconnection with disabled streams")
                        joinMeeting(meeting);
                    } catch (err) {
                        errorScreen(new Error("Is your webcam blocked? 😅"));
                    }
                } else {
                    console.error(err.toString())
                }
            })
        })
    }

    function assignElementMediaSource(node, mediaSource) {
        if ('srcObject' in node) {
            try {
                node.srcObject = mediaSource;
            } catch (err) {
                if (err.name !== 'TypeError') {
                    console.error(err);
                    throw err;
                }
                node.src = URL.createObjectURL(mediaSource);
            }
        } else {
            node.src = URL.createObjectURL(mediaSource);
        }
    }

    function errorScreen(error) {
        criticalError = error
        if (error !== null && currentMeeting !== null) {
            if (!muted) {
                mute()
            }
            if (!blinded) {
                blind()
            }
            try {
                hangup();
            } catch (e) {
                console.error("While handling " + error.toString() + ", " + e.toString() + " was thrown")
            }
        }
    }

    function startCall() {
        errorScreen(null)

        return webex.meetings.create(meetingRoom).then((meeting) => {
            bindMeetingEvents(meeting);

            return joinMeeting(meeting);
        }).catch(error => {
            console.error(error);
        })
    }

    function hangup() {
        currentMeeting.leave().then(() => {
            currentMeeting = null;
        }).finally(() => {
            currentMeeting = null;
        });
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
    <link rel="stylesheet" href="./static/css/widget-demo-main.css"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/main.css'"/>
    <link rel="stylesheet" href="./static/css/widget-space-main.css"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-space/production/main.css'"/>
    <link href="./fonts/CiscoSansTTLight.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTRegular.woff2'"/>
    <link href="./fonts/CiscoSansTTRegular.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTLight.woff2'"/>
    <link href="./fonts/momentum-ui-icons.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/momentum-ui-icons.woff2'"/>
    <link rel="stylesheet" href="./static/css/momentum-ui.min.css">
</svelte:head>

<main>
    <div class="widget-demo--widgetSpaceComponentContainer--3L80J"
         style="width: calc( 100% - 30px); height: 100%; right: 0;background-color: black;">
        <div id="my-ciscospark-space-widget">
            {#if criticalError === null}
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
                        {#if (!waitingInQueue)}
                            <div class="webex-widget-body widget-space--widgetBody--M20il" style="height: 100%;">
                                <div class="webex-meet-wrapper widget-space--activityComponentWrapper--1-a6y">
                                    <div class="widget-space--wrapper--2FMs0">
                                        <div class="widget-space--meetWidgetContainer--1fog_ meet-widget-container">
                                            <div class="widget-space--callContainer--3K3TZ call-container">
                                                <div class="wxc-meeting-control-bar widget-space--callControls--2-7gU">
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-25" data-md-event-key="md-button-25"
                                                            type="button" aria-label="Toggle Microphone" tabindex="0"
                                                            on:click={prevent_default(mute)}>
                                                        {#if (muted)}
                                                            <span class="md-button__children" style="opacity: 1;"><i
                                                                    class="md-icon icon icon-microphone-muted_28"
                                                                    style="font-size: 28px;"></i></span>
                                                        {:else}
                                                            <span class="md-button__children" style="opacity: 1;"><i
                                                                    class="md-icon icon icon-microphone_28"
                                                                    style="font-size: 28px;"></i></span>
                                                        {/if}
                                                    </button>
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-26" data-md-event-key="md-button-26"
                                                            type="button" aria-label="Toggle video"
                                                            tabindex="0">
                                                        {#if (blinded)}
                                                            <span class="md-button__children"
                                                                  style="opacity: 1;"
                                                                  on:click={prevent_default(blind)}><i
                                                                    class="md-icon icon icon-camera-muted_28"
                                                                    style="font-size: 28px;"></i></span>
                                                        {:else}
                                                            <span class="md-button__children"
                                                                  style="opacity: 1;"
                                                                  on:click={prevent_default(blind)}><i
                                                                    class="md-icon icon icon-camera_28"
                                                                    style="font-size: 28px;"></i></span>
                                                        {/if}
                                                    </button>
                                                    <button class="md-button md-button--circle md-button--56 wxc-meeting-control"
                                                            id="md-button-27" data-md-event-key="md-button-27"
                                                            type="button" aria-label="Toggle Share"
                                                            tabindex="0" on:click={prevent_default(toggleShare)}>
                                                        {#if (!screenSharing)}
                                                            <span class="md-button__children"
                                                                  style="opacity: 1;"><i
                                                                    class="md-icon icon icon-share-screen-presence-stroke_26"
                                                                    style="font-size: 28px;"></i></span>
                                                        {:else}
                                                                <span class="md-button__children"
                                                                      style="opacity: 1;"><i
                                                                        class="md-icon icon icon-shape-diagonal-line_20"
                                                                        style="font-size: 28px;"></i></span>
                                                        {/if}
                                                    </button>
                                                    <button on:click={prevent_default(hangup)}
                                                            class="md-button md-button--circle md-button--56 md-button--red wxc-meeting-control"
                                                            id="md-button-28" data-md-event-key="md-button-28"
                                                            type="button" aria-label="Hang up" tabindex="0">
                                                        <span class="md-button__children" style="opacity: 1;"><i
                                                                class="md-icon icon icon-cancel_28"
                                                                style="font-size: 28px;"></i></span></button>
                                                </div>
                                                <div class="wxc-in-meeting">
                                                    <div class="wxc-local-media local-media-in-meeting">
                                                        <video playsinline="" id="self-view" autoplay=""
                                                               style="height: 20vh;border-radius:20px" muted></video>
                                                    </div>
                                                    <div class="wxc-remote-media remote-media-in-meeting">
                                                        <video id="remote-view-video" class="wxc-remote-video"
                                                               playsinline=""
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
                                                            Waiting to be let in...
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
