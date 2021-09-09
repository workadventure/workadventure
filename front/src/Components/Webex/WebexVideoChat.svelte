<script>
    import {onMount} from 'svelte'
    import {prevent_default} from "svelte/internal";

    export let meetingRoom = null;
    export let accessToken = null

    let webexCDNLink = "https://unpkg.com/webex/umd/webex.min.js";

    let initials = "TP";
    let fullName = "Testing Person";
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
                        console.error("No one's home")
                    } else {
                        console.error(err.toString())
                    }
                });
            }).catch(err => {
                console.error(err)
            })
        })
    }

    function startCall() {

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
                alert("Error: " + err + "\nmeetingRoom: " + meetingRoom + "\n" + "accessToken: " + accessToken);
                throw("Error: " + err + "\nmeetingRoom: " + meetingRoom + "\n" + "accessToken: " + accessToken);
            });

        ready = true;
    })
</script>

<svelte:head>
    <link rel="stylesheet" href="https://code.s4d.io/widget-demo/archives/0.2.50/main.css"/>
</svelte:head>

<main>
    <h1>WebEx Meeting PoC</h1>

    <br/><br/>
    {#if (!ready)}
        <h2>Webex loading...</h2>
    {:else}
        {#if (currentMeeting === null)}
            <div class="widget-demo--widgetSpaceComponentContainer--3L80J" style="width: calc( 100% - 30px); height: 100%; right: 0;">
                <div id="my-ciscospark-space-widget">
                    <div class="widget-demo--wrapper--2FMs0">
                        <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                            <div class="ciscospark-title-bar-wrapper">
                                <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                    <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                        <div class="md-avatar md-avatar--24" title="{fullName}"><span
                                                class="md-avatar__letter">{initials}</span></div>
                                    </div>
                                    <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                            class="ciscospark-title widget-demo--title--6SJXl">{fullName}</strong></p>
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
                                                <div class="widget-demo--personName--3fVsV call-person-name">{fullName}
                                                </div>
                                                <div class="widget-demo--callControls--35xR2 call-controls-container">
                                                    <div class="ciscospark-controls-container widget-demo--controlContainer--1F4XU">
                                                        <div class="md-button__container--small">
                                                            <button on:click={prevent_default(startCall)} class="md-button md-button--circle md-button--68 md-activity md-activity__camera"
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
                </div>
            </div>
        {:else}



            <div style="display: flex">
                <video style="width:50%" id="self-view" muted autoplay></video>
                <div style="width:50%">
                    <audio id="remote-view-audio" autoplay></audio>
                    <video id="remote-view-video" muted autoplay></video>
                </div>
            </div>

            <button id="hangup" title="hangup" type="button" on:click={hangup}>cancel/hangup</button>
        {/if}
        <br/><br/>
    {/if}


    <p>Visit the <a href="https://svelte.dev/tutorial">Svelte tutorial</a> to learn how to build Svelte apps.</p>
</main>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }

    h2 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 2em;
        font-weight: 100;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }

</style>
