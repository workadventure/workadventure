<script>
    import {onMount} from 'svelte'
    import {prevent_default} from "svelte/internal";

    export let meetingRoom = null;
    export let accessToken = null

    let webexCDNLink = "https://unpkg.com/webex/umd/webex.min.js";

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

<main>
    <h1>WebEx Meeting PoC</h1>

    <br/><br/>
    {#if (!ready)}
        <h2>Webex loading...</h2>
    {:else}
        {#if (currentMeeting === null)}
            <form id="connection">
                <input title="Join call" type="submit" value="join" on:click={prevent_default(startCall)}/>
            </form>
        {:else}
            <div class="widget-demo--widgetSpaceComponentContainer--3L80J">
                <div id="my-ciscospark-space-widget">
                    <div class="widget-demo--wrapper--2FMs0">
                        <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                            <div class="ciscospark-title-bar-wrapper">
                                <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                                    <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                        <div class="md-avatar md-avatar--24" title="Mweya Ruider"><span
                                                class="md-avatar__letter">MR</span></div>
                                    </div>
                                    <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                            class="ciscospark-title widget-demo--title--6SJXl">Mweya Ruider</strong></p>
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
                                                <div class="md-avatar md-avatar--84" title="Mweya Ruider"><span
                                                        class="md-avatar__letter">MR</span></div>
                                                <div class="widget-demo--personName--3fVsV call-person-name">Mweya
                                                    Ruider
                                                </div>
                                                <div class="widget-demo--callControls--35xR2 call-controls-container">
                                                    <div class="ciscospark-controls-container widget-demo--controlContainer--1F4XU">
                                                        <div class="md-button__container--small">
                                                            <button class="md-button md-button--circle md-button--68 md-activity md-activity__camera"
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



    /*! react-widgets v0.2.50 */
    .widget-demo--wrapper--2FMs0 {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    /* stylelint-disable selector-max-attribute,selector-max-universal */
    .ciscospark-widget > div, [data-toggle^='ciscospark-'], [data-toggle^='ciscospark-'] > div {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .ciscospark-widget *, .ciscospark-widget *::after, .ciscospark-widget *::before {
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
    }

    /* stylelint enable */
    /* only change the width of the scrollbars of the widgets and their div children */
    div::-webkit-scrollbar {
        width: 4px;
    }

    ::-webkit-scrollbar-thumb {
        height: 50px;
        background-color: transparent;
        border-radius: 15px;
        -webkit-box-shadow: none;
        box-shadow: none;
        background-clip: padding-box;
        border-image-source: initial;
        border-image-slice: initial;
    }

    ::-webkit-scrollbar-thumb {
        background-color: #8a8a8a;
    }

    ::-webkit-scrollbar-track {
        background-color: transparent;
    }

    .widget-demo--action--NA09_ button {
        font-size: 16px;
        cursor: pointer;
    }

    .widget-demo--action--NA09_:hover button {
        color: #ff513d;
    }

    .widget-demo--thumbnail--qZ3iW img {
        max-width: 100%;
        max-height: 100%;
    }

    /* Using !important here to override inline styles from react-mentions */


    .widget-demo--error--3Z67R button {
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        background: none;
        border: none;
    }

    /*
     * Hide extra information when same user posts continuously
     */

    /*
     * Align post actions at the bottom right of post
     */

    /* MARKDOWN SUPPORT */
    .widget-demo--activityText--24N4T strong {
        font-family: CiscoSansTT Regular, Helvetica Neue, Arial,sans-serif;
        font-weight: 700;
    }

    .widget-demo--activityText--24N4T pre {
        padding: 10px;
        overflow: auto;
        background-color: #f5f5f6;
    }

    .widget-demo--activityText--24N4T code {
        font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
        color: #000;
        background-color: #f5f5f6;
    }

    .widget-demo--activityText--24N4T h1 {
        padding-top: 1rem;
        font-size: 2rem;
        line-height: 2.5rem;
    }

    .widget-demo--activityText--24N4T h2 {
        padding-top: 1rem;
        font-size: 1.5rem;
        line-height: 1.75rem;
    }

    .widget-demo--activityText--24N4T h3 {
        padding-top: 1rem;
        font-size: 1.25rem;
        line-height: 1.1rem;
    }

    .widget-demo--activityText--24N4T a {
        color: #07c1e4;
        text-decoration: none;
    }

    .widget-demo--activityText--24N4T p {
        margin: 0;
    }

    .widget-demo--thumbnail--32KAv > img {
        max-width: 100%;
    }

    .widget-demo--fileProps--2AK75 > span {
        display: inline-block;
        margin-right: 5px;
    }

    /* stylelint-disable selector-type-no-unknown  */
    .widget-demo--atMention--3Yrms spark-mention {
        color: #999;
    }

    /* Base styles for the element that has a tooltip */
    [data-tooltip] {
        display: inline-block;
        position: relative;
        cursor: pointer;
    }
    /* Tooltip styling */
    [data-tooltip]:before {
        position: absolute;
        bottom: 100%;
        left: 50%;
        -webkit-transform: translateX(-50%);
        transform: translateX(-50%);
        width: 150px;
        background-color: #000;
        font-size: 12px;
        content: attr(data-tooltip);
        opacity: 0;
        color: #fff;
        padding: 8px 12px;
        margin-bottom: 12px;
        text-align: center;
        border-radius: 4px;
        white-space: pre-wrap;
    }

    /* Tooltip Bottom Arrow */
    [data-tooltip]:after {
        content: '';
        opacity: 0;
        position: absolute;
        width: 0;
        height: 0;
        border-color: transparent;
        border-style: solid;
        left: 50%;
        margin-left: -6px;
        bottom: 31px;
        border-width: 6px 6px 0;
        border-top-color: #000;
    }

    /* Show the tooltip when hovering */
    [data-tooltip]:hover:before,
    [data-tooltip]:hover:after {
        opacity: 1;
    }

    .widget-demo--tooltipText--233C6 p {
        margin: 0;
    }

    .widget-demo--controlContainer--1F4XU {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        padding: 0 20px;
        -webkit-box-pack: justify;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
    }

    .widget-demo--callInactiveContainer--pCOsm {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        margin: auto;
        text-align: center;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--personName--3fVsV {
        width: 100%;
        margin: 10px;
        overflow: hidden;
        font-size: 32px;
        color: #707071;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--callControls--35xR2 {
        z-index: 100;
        text-align: center;
    }

    .widget-demo--avatarLetter--2ZM1S > span {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--avatarView--2pKs8 > div {
        width: 100%;
        height: 100%;
        font-size: 62px;
    }

    .widget-demo--callConnected--LUCtJ .widget-demo--localVideo--36X0Y video {
        border-radius: 4px;
    }

    .widget-demo--meetWidgetContainer--1fog_ {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        background: transparent url(https://code.s4d.io/widget-demo/archives/0.2.50/media-bg.jpg) no-repeat;
        background-size: cover;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
    }

    .widget-demo--popover--3ya1k button {
        font-size: 10px !important;
    }

    .widget-demo--searchInput--3aRQ7 input {
        font-size: 12px;
        height: 28px;
        margin-bottom: 0;
    }

    .widget-demo--closeButton--2BYAS button {
        border-radius: 5px !important; /* converts a circle button to small rounded */
    }

    .widget-demo--titleBar--32_8a {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 46px;
        border-bottom: 1px solid #ececed;
    }

    .widget-demo--title--6SJXl {
        margin: 0;
        overflow: hidden;
        font-size: 12px;
        line-height: 16px;
        text-overflow: ellipsis;
        white-space: nowrap;
        background-color: transparent;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--avatarContainer--shGVy {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 24px;
        height: 24px;
        margin: 11px 12px 11px 14px;
        -webkit-box-flex: 0;
        -ms-flex-positive: 0;
        flex-grow: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
    }

    .widget-demo--titleText--3jwIv {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        overflow: hidden;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-flex: 2;
        -ms-flex-positive: 2;
        flex-grow: 2;
    }

    .widget-demo--buttonContainer--A6mT2 button {
        width: 100%;
        height: 100%;
        padding: 7px;
        font-size: 24px;
    }

    .widget-demo--buttonContainer--A6mT2 button:focus {
        outline: none;
    }

    .widget-demo--titleMeta--2Sz7g {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--spaceWidget--3h8bX {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 100%;
        overflow: hidden;
        font-size: 16px;
        font-weight: 200;
        background: #fff;
        border: 1px solid #ccc;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;


        /* IE 11 scrollbar styling workarounds */
        scrollbar-face-color: #E0E0E0;
        scrollbar-arrow-color: #E0E0E0;
        scrollbar-shadow-color: white;
        scrollbar-track-color: white;
    }

    .widget-demo--activityComponentWrapper--2OQlx {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .widget-demo--activityComponentWrapper--2OQlx > div {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: inherit;
    }

    .widget-demo--widgetBody--XshYm {
        position: relative;
        z-index: 10;
        width: 100%;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--activityMenuButtonWrapper--3eABx {
        padding: 0 16px;
    }

    .widget-demo--activityMenuButton--1FfBJ {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .widget-demo--secondaryWidget--1yiO7 > div {
        height: 100%;
    }

    @-webkit-keyframes widget-demo--slideIn--1znpD {
        from {
            right: -50%;
        }

        to {
            right: 0;
        }
    }

    @keyframes widget-demo--slideIn--1znpD {
        from {
            right: -50%;
        }

        to {
            right: 0;
        }
    }

    .widget-demo--menu--11r8r h5 {
        color: #666666;
    }

    .widget-demo--widgetSpaceComponentContainer--3L80J {
        position: absolute;
        right: 10px;
        bottom: 0;
        z-index: 99;
        width: 500px;
        height: 600px;
        background-color: #fff;
        border: 1px solid;
    }

    .widget-demo--widgetSpaceComponentContainer--3L80J > div {
        height: 100%;
    }

    /* Button at the center bottom that sticks widgets */


    /*# sourceMappingURL=main.css.map*/
</style>
