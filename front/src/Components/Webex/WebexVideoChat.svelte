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
                                                                    alt="Start Call" type="button"
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
    .ciscospark-widget, .ciscospark-widget > div, [data-toggle^='ciscospark-'], [data-toggle^='ciscospark-'] > div {
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

    .widget-demo--wrapper--3uSnT {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: inherit;
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
        border-image-outset: initial;
    }

    ::-webkit-scrollbar-thumb {
        background-color: #8a8a8a;
    }

    ::-webkit-scrollbar-track {
        background-color: transparent;
    }

    .widget-demo--chip--1QC08 {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        color: #6a6b6c;
        background-color: #fff;
        border: 1px solid #fff;
        border-radius: 4px;
    }

    .widget-demo--content--3WECU {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--action--NA09_ {
        width: 30px;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--action--NA09_ button {
        font-size: 16px;
        cursor: pointer;
    }

    .widget-demo--action--NA09_:hover button {
        color: #ff513d;
    }

    .widget-demo--info--2EETO,
    .widget-demo--name--2D7zF,
    .widget-demo--meta--165o3 {
        width: 100%;
        overflow: hidden;
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--info--2EETO {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        padding: 0 5px;
        margin: auto 0;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
    }

    .widget-demo--name--2D7zF {
        color: #666;
    }

    .widget-demo--meta--165o3 {
        color: #c2c2c2;
    }

    .widget-demo--type--3harl,
    .widget-demo--size--2-J-Q {
        display: inline-block;
        margin-right: 10px;
    }

    .widget-demo--icon--2MZV2 {
        height: 36px;
    }

    .widget-demo--thumbnail--qZ3iW {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        max-width: 50px;
        height: 50px;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--thumbnail--qZ3iW img {
        max-width: 100%;
        max-height: 100%;
    }

    .widget-demo--fileStagingArea--3Fudn {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        overflow-y: auto;
        background-color: hsla(240, 5%, 96%, 0.2);
        border-bottom: 1px solid #ebebec;
    }

    .widget-demo--files--2Vjst {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        max-height: 75px;
        margin: 5px;
        overflow-y: auto;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
    }

    .widget-demo--chipContainer--i2E6U {
        width: 150px;
        height: 50px;
        margin: 5px;
    }

    .widget-demo--buttonsArea--1Blro {
        padding: 10px 10px 0;
    }

    .widget-demo--fileInput--XZ2iz {
        display: none;
        width: 32px;
        height: 32px;
        overflow: hidden;
        opacity: 0;
    }

    .widget-demo--messageComposer--2KASy {
        position: relative;
        height: auto;
        border-top: 1px solid #ebebeb;
        -webkit-transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
        transition: all 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    .widget-demo--hasFocus--1Csfm {
        border-top-color: #7ddef0;
    }

    .widget-demo--addFileContainer--3Ex6l {
        position: absolute;
        top: 12px;
        left: 20px;
    }

    .widget-demo--textAreaContainer--1oEHX {
        background-color: #f5f5f5;
        padding: 10px;
    }

    .widget-demo--textarea--3suT0 {
        background-color: #f5f5f5;
    }

    .widget-demo--textarea--3suT0::-webkit-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--textarea--3suT0:-ms-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--textarea--3suT0::-ms-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--textarea--3suT0::placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--textareaContainerBig--1NohC {
        height: 150px;
    }

    /* Using !important here to override inline styles from react-mentions */

    .widget-demo--mentions--3cZ47 {
        position: static;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        margin: 0;
        font-size: 14px;
    }

    .widget-demo--mentions__control--1t0Cg {
        position: relative;
        max-height: 100px;
    }

    .widget-demo--mentions__input--3MQYp {
        display: block;
        margin: 0;
        font-family: inherit;
        font-size: 14px;
        font-weight: 200;
        background: transparent;
        border: none;
        outline: none;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
    }

    .widget-demo--mentions__input--3MQYp:focus {
        outline: none;
        -webkit-box-shadow: none;
        box-shadow: none;
    }

    .widget-demo--mentions--singleLine--npXPG .widget-demo--mentions__control--1t0Cg {
        display: inline-block;
        width: 130px;
    }

    .widget-demo--mentions--singleLine--npXPG .widget-demo--mentions__higlighter--2jbbc {
        padding: 1px;
        border: 2px inset transparent;
    }

    .widget-demo--mentions--singleLine--npXPG .widget-demo--mentions__input--3MQYp {
        padding: 1px;
        border: 0;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__highlighter--2xahI {
        padding: 2px;
        margin: 0;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__input--3MQYp {
        /* stylelint-disable-next-line declaration-no-important */
        overflow-y: auto !important;
        resize: none;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__input--3MQYp::-webkit-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__input--3MQYp:-ms-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__input--3MQYp::-ms-input-placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--mentions--multiLine--2-AIg .widget-demo--mentions__input--3MQYp::placeholder {
        overflow: hidden;
        color: #858688;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--mentions--3cZ47 .widget-demo--mentions__suggestions--_0xZC {
        /* stylelint-disable declaration-no-important */
        position: static !important;
        -webkit-box-ordinal-group: 0;
        -ms-flex-order: -1;
        order: -1;
        left: 0 !important;
        margin-top: 0 !important;
    }

    .widget-demo--mentions__suggestions__list--2yVs1 {
        max-height: 85px;
        overflow-y: auto;
        font-size: 14px;
        background-color: #fff;
    }

    .widget-demo--mentions__suggestions__item--2N99U {
        padding: 5px 15px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.15);
    }

    .widget-demo--content--2yGaI {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .widget-demo--avatar--1uDe2 {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        width: 24px;
        height: 24px;
        margin-right: 10px;
    }

    .widget-demo--highlightedDisplay--1tNd3 {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--mentions__suggestions__item--focused--1hdlI {
        background-color: #ececed;
    }

    .widget-demo--mentions__mention--1nUsS {
        background-color: #ececed;
    }

    .widget-demo--dialogueModal--2m8fJ {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 9;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        max-width: 350px;
        min-height: 150px;
        margin: -75px 0 0 -175px;
        font-family: sans-serif, 'Helvetica Neue', Arial;
        font-size: 16px;
        font-weight: 200;
        background-color: #fefefe;
        -webkit-box-shadow: 0 17px 50px 0 #000;
        box-shadow: 0 17px 50px 0 #000;
    }

    .widget-demo--dialogueModalHeader--pafIw {
        padding: 10px 13px 5px;
        color: #fefefe;
        background-color: #049fd9;
    }

    .widget-demo--dialogueModalHeader--pafIw.widget-demo--dialogueModalHeaderWhite--3Xa0m {
        font-size: 12px;
        color: #858688;
        background-color: #fefefe;
    }

    .widget-demo--dialogueModalHeader--pafIw.widget-demo--dialogueModalHeaderWhite--3Xa0m .widget-demo--dialogueModalHeaderTitle--1sQGt {
        display: inline;
    }

    .widget-demo--dialogueModalHeader--pafIw.widget-demo--dialogueModalHeaderWhite--3Xa0m .widget-demo--dialogueModalCloseIcon--3VviU {
        color: #858688;
    }

    .widget-demo--dialogueModalHeaderIcon--3cTum {
        font-size: 19px;
    }

    .widget-demo--dialogueModalHeader--pafIw .widget-demo--bgIcon--2_ffE {
        display: inline-block;
        width: 18px;
        height: 18px;
        background-size: contain;
    }

    .widget-demo--dialogueModalHeaderTitle--1sQGt {
        display: inline-block;
        width: 80%;
        margin-left: 0.5rem;
        vertical-align: top;
    }

    .widget-demo--dialogueModalCloseIcon--3VviU {
        float: right;
        font-size: 15px;
        color: #fefefe;
        cursor: pointer;
        background-color: transparent;
        border: none;
    }

    .widget-demo--dialogueModalBodyText--2ZE2z {
        padding: 30px 23px;
        font-family: CiscoSans, 'Helvetica Neue', Arial;
    }

    .widget-demo--dialogueModalBtn--2-r5o {
        width: 50%;
        padding: 10px;
        font-family: CiscoSans, 'Helvetica Neue', Arial;
        font-size: 15px;
        cursor: pointer;
        background-color: #fefefe;
        border: 1px;
        border-top: 1px solid #d7d7d8;
        border-right: 1px solid #d7d7d8;
        border-radius: 0;
        outline: none;
    }

    .widget-demo--dialogueModalBtn--2-r5o:hover {
        background-color: #aeaeaf;
    }

    .widget-demo--dialogueModalBtnInactive--3Otob {
        color: #aeaeaf;
    }

    .widget-demo--dialogueModalBtnRedText--2rIdc {
        color: #e25a4b;
    }

    .widget-demo--dialogueModalBtnBlueText--10mGa {
        color: #049fd9;
    }

    .widget-demo--dialogueModalBtnRedBg--18mjT {
        color: #fefefe;
        background-color: #ff513d;
    }

    .widget-demo--dialogueModalBtnRedBg--18mjT:hover {
        background-color: #f04734;
    }

    .widget-demo--dialogueModalBtnGreenBg--1FC_e {
        color: #fefefe;
        background-color: #30d557;
    }

    .widget-demo--dialogueModalBtnGreenBg--1FC_e:hover {
        background-color: #2ac44f;
    }

    .widget-demo--dialogueModalBtnLightGrayBg--3uQ26,
    .widget-demo--dialogueModalBtnLightGrayBg--3uQ26:hover {
        background-color: #858688;
    }

    .widget-demo--dialogueModalWide--MlC7Y {
        width: 380px;
        padding: 0;
    }

    .widget-demo--dialogueModalActionBtn--13tdq {
        font-family: CiscoSans, 'Helvetica Neue', Arial;
        color: #049fd9;
    }

    .widget-demo--dialogueModalActionBtn--13tdq:hover,
    .widget-demo--dialogueModalActionBtn--13tdq:active {
        color: #fefefe;
        background-color: #049fd9;
    }

    .widget-demo--dialogueModalActionBtnRed--2qiST {
        color: #ff513d;
    }

    .widget-demo--dialogueModalActionBtnRed--2qiST:hover {
        color: #fefefe;
        background-color: #ff513d;
    }

    .widget-demo--dialogueModalActionBtnRed--2qiST:active {
        color: #fefefe;
        background-color: #f04734;
    }

    .widget-demo--dialogueModalExitBtn--n_ccW {
        font-family: CiscoSans, 'Helvetica Neue', Arial;
        font-weight: 200;
        color: #858688;
    }

    .widget-demo--dialogueModalTitleText--3EApi {
        height: 32px;
        margin-top: 16px;
        font-family: CiscoSans, 'Helvetica Neue', Arial;
        font-size: 20px;
        font-weight: 200;
        line-height: 1.6;
        color: #858688;
        text-align: center;
    }

    .widget-demo--dialogueModalBodySubtext--QC-k2 {
        margin: 16px 24px 32px;
        font-family: CiscoSans, 'Helvetica Neue', Arial;
        font-size: 14px;
        font-weight: 200;
        line-height: 1.71;
        color: #858688;
        text-align: center;
    }

    .widget-demo--dialogueModalNoBtn--1o0P2 {
        visibility: hidden;
    }

    .widget-demo--dialogueModalLongBtn--3yJ66 {
        width: 100%;
    }

    .widget-demo--dialogueModalBackdrop--fZhe6 {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 8;
        background-color: #000;
        opacity: 0.6;
    }

    .widget-demo--message--3cuHa {
        position: absolute;
        z-index: 1000;
        display: none;
        width: 100%;
        height: 100%;
        margin: auto;
        text-align: center;
        background: rgba(0, 0, 0, 0.6);
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--title--3zU6v {
        width: 100%;
        font-size: 32px;
        color: #fff;
    }

    .widget-demo--loading--2kR9l {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        height: 100%;
    }

    .widget-demo--loadingMessage--2ZJ8e {
        font-family: CiscoSans, Helvetica, Arial, sans-serif;
        font-size: 24px;
        font-weight: 200;
        margin-bottom: 10px;
        color: #4f5051;
    }

    .widget-demo--logo--BY-5z {
        width: 60px;
        height: 60px;
        margin-bottom: 10px;
    }

    .widget-demo--spinner--2zE8b {
        font-size: 16px;
    }

    .widget-demo--activityItem--3_abu {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: horizontal;
        -webkit-box-direction: normal;
        -ms-flex-flow: row nowrap;
        flex-flow: row nowrap;
        width: 100%;
    }

    .widget-demo--published--_e7T6 {
        margin-left: 16px;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
    }

    .widget-demo--contentContainer--34XdY {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        width: calc(100% - 100px);
        border-radius: 1px;
        padding: 4px 6px;
    }

    .widget-demo--pending--202XG .widget-demo--content--245Sd {
        opacity: 0.25;
    }

    .widget-demo--meta--1H4Dp {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        padding: 0;
        margin: 0;
        margin-bottom: 7px;
        font-family: CiscoSansTT Regular, 'Helvetica Neue', Arial;
        font-size: 12px;
        font-weight: 300;
        color: #666;
        text-align: left;
        word-wrap: break-word;
        cursor: auto;
        -webkit-transition: opacity 300ms;
        transition: opacity 300ms;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-box-orient: horizontal;
        -webkit-box-direction: normal;
        -ms-flex-direction: row;
        flex-direction: row;
    }

    .widget-demo--pending--202XG .widget-demo--meta--1H4Dp {
        opacity: 0.25;
    }

    .widget-demo--displayName--T3yoh {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        font-weight: 400;
    }

    .widget-demo--avatarWrapper--P5rH9 {
        width: 40px;
        height: 40px;
        -webkit-box-flex: 0;
        -ms-flex-positive: 0;
        flex-grow: 0;
        -ms-flex-negative: 0;
        flex-shrink: 0;
        margin-right: 16px;
        padding-top: 6px;
    }

    .widget-demo--selfAvatar--R9lwt {
        color: #07c1e4;
        font-size: 32px;
    }

    .widget-demo--pending--202XG .widget-demo--avatarWrapper--P5rH9 {
        opacity: 0.25;
    }

    .widget-demo--error--3Z67R {
        color: rgb(218, 0, 0);
    }

    .widget-demo--error--3Z67R button {
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        background: none;
        border: none;
    }

    .widget-demo--failed--2ST14 .widget-demo--status--jdK16 {
        font-size: 10px;
        font-weight: bold;
        line-height: 14px;
        color: rgb(218, 0, 0);
        text-transform: uppercase;
        cursor: pointer;
    }

    /*
     * Hide extra information when same user posts continuously
     */
    .widget-demo--contentContainer--34XdY.widget-demo--additional--27DJ1 {
        margin-top: 0;
    }

    .widget-demo--activityItem--3_abu.widget-demo--additional--27DJ1 {
        margin-top: 0;
        margin-left: 56px;
    }

    .widget-demo--additional--27DJ1 .widget-demo--meta--1H4Dp,
    .widget-demo--additional--27DJ1 .widget-demo--avatarWrapper--P5rH9 {
        display: none;
    }

    /*
     * Align post actions at the bottom right of post
     */
    .widget-demo--activityPostActions--3PLtV {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin-top: auto;
        text-align: right;
        visibility: hidden;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        -webkit-box-orient: horizontal;
        -webkit-box-direction: normal;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-pack: end;
        -ms-flex-pack: end;
        justify-content: flex-end;
    }

    .widget-demo--activityPostAction--2fhLc {
        margin-left: 4px;
    }

    .widget-demo--activityPostAction--2fhLc.widget-demo--isHighlighted--3uUwL {
        visibility: visible;
    }

    .widget-demo--activityItem--3_abu:hover .widget-demo--activityPostActions--3PLtV {
        visibility: visible;
    }

    .widget-demo--activityText--24N4T {
        width: 100%;
        font-size: 14px;
        font-weight: 300;
        letter-spacing: 0.3px;
        color: #000;
        word-wrap: break-word;
        white-space: pre-wrap;
        -webkit-transition: color 0.3s, margin-left 0.3s ease 0.5s;
        transition: color 0.3s, margin-left 0.3s ease 0.5s;
    }

    /* MARKDOWN SUPPORT */
    .widget-demo--activityText--24N4T strong {
        font-family: CiscoSansTT Regular, Helvetica Neue, Arial;
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

    .widget-demo--shareItem--2ieuN {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 60px;
        font-family: CiscoSans, 'Helvetica Neue', Arial, sans-serif;
        color: #6a6b6c;
        background-color: #ebebec;
        border: 1px solid #ebebec;
        border-radius: 4px;
    }

    .widget-demo--fileIcon--1ruwM {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        width: 60px;
        height: 60px;
    }

    .widget-demo--meta--1JF1Z {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        max-width: 200px;
    }

    .widget-demo--fileInfo--s3nOh {
        font-size: 12px;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--fileName--2kZhX {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--fileProps--UmqoD {
        color: #aeaeaf;
    }

    .widget-demo--shareActions--3_a6U {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        width: 60px;
    }

    .widget-demo--shareActionItem--3FVCB {
        margin: auto;
        height: 32px;
        width: 32px;
    }

    .widget-demo--fileType--SbFxR {
        margin-left: 5px;
    }

    .widget-demo--shareItem--2J5IB {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 200px;
        max-width: 320px;
        margin-bottom: 10px;
        overflow: hidden;
        cursor: pointer;
        border-radius: 4px;
    }

    .widget-demo--meta--2cVdK {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        font-size: 14px;
        color: #fff;
        background: rgba(52, 53, 55, 0.8);
        border-bottom-right-radius: 4px;
        border-bottom-left-radius: 4px;
        visibility: hidden;
    }

    .widget-demo--thumbnail--32KAv {
        margin: auto;
    }

    .widget-demo--thumbnail--32KAv > img {
        max-width: 100%;
    }

    .widget-demo--fileInfo--Qyven {
        padding: 8px 10px;
        overflow: hidden;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--name--32St- {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--fileProps--2AK75 > span {
        display: inline-block;
        margin-right: 5px;
    }

    .widget-demo--shareItem--2J5IB:hover .widget-demo--meta--2cVdK {
        visibility: visible;
    }

    .widget-demo--shareActionItem--3GCQg {
        height: 60px;
        width: 60px;
    }

    .widget-demo--shareActionItem--3GCQg:hover {
        background-color: #343537;
    }

    .widget-demo--activityShare--rL2f5 {
        width: 100%;
        -webkit-transition: color 0.3s, margin-left 0.3s ease 0.5s;
        transition: color 0.3s, margin-left 0.3s ease 0.5s;
    }

    .widget-demo--shareList--3temI {
        width: 320px;
    }

    .widget-demo--systemMessage--1GYiU {
        width: 100%;
        padding-top: 10px;
        font-size: 11px;
        color: #aeaeaf;
        text-align: center;
    }

    .widget-demo--activityItemContainer--33wk2 {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        min-width: 300px;
        padding: 5px 20px 0 0;
        margin: 0 14px 0 16px;
        overflow: visible;
        overflow: initial;
        outline: none;
        -webkit-transition: -webkit-transform 0.3s;
        transition: -webkit-transform 0.3s;
        transition: transform 0.3s;
        transition: transform 0.3s, -webkit-transform 0.3s;
    }

    .widget-demo--activityItemContainer--33wk2.widget-demo--additional--qacxT {
        padding-top: 0;
    }

    .widget-demo--separator--thZ68 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        padding-top: 17px;
        overflow: hidden;
        font-size: 13px;
        color: #d2d3d4;
        white-space: nowrap;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--separator--thZ68.widget-demo--informative--16lgT {
        color: #049fd9;
        text-transform: uppercase;
    }

    .widget-demo--separatorText--2OnDL {
        position: relative;
        display: inline-block;
        font-family: sans-serif, 'Helvetica Neue', Arial;
        font-weight: 200;
        line-height: 1.5em;
        letter-spacing: 0.015em;
        color: #858993;
    }

    .widget-demo--separatorText--2OnDL::before,
    .widget-demo--separatorText--2OnDL::after {
        position: absolute;
        top: 50%;
        width: 999px;
        height: 1px;
        background-color: #d2d3d4;
        content: '';
    }

    .widget-demo--separatorText--2OnDL::before {
        right: 100%;
        margin-right: 20px;
    }

    .widget-demo--separatorText--2OnDL::after {
        left: 100%;
        margin-left: 20px;
    }

    .widget-demo--separatorText--2OnDL.widget-demo--informative--16lgT::before,
    .widget-demo--separatorText--2OnDL.widget-demo--informative--16lgT::after {
        background-color: #049fd9;
    }

    .widget-demo--separator--3bNQE {
        margin-right: 32px;
        margin-left: 64px;
    }

    .widget-demo--activityList--33PBV {
        padding-bottom: 20px;
    }

    /* stylelint-disable selector-type-no-unknown  */
    .widget-demo--atMention--3Yrms spark-mention {
        color: #999;
    }

    .widget-demo--typingAvatar--29Ojd {
        position: relative;
        width: 25px;
        height: 25px;
        margin: 0 2px;
    }

    .widget-demo--avatar--3g98r {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        position: absolute;
        top: 0;
        left: 0;
        z-index: 2;
        width: 25px;
        height: 25px;
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

    .widget-demo--badge--1g_f_ {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 35px;
        padding: 0 4px;
        color: #fff;
        background-color: #858688;
        border-radius: 16px;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--count--2hnIP {
        font-size: 10px;
    }

    .widget-demo--badge--1g_f_:hover .widget-demo--tooltip--1mzjs {
        opacity: 0.8;
    }

    .widget-demo--tooltip--1mzjs {
        position: absolute;
        bottom: 32px;
        left: -48px;
        width: 130px;
        padding: 4px;
        background-color: #000;
        border-radius: 5px;
        opacity: 0;
    }

    .widget-demo--tooltip--1mzjs::after {
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 0;
        margin: 0 0 -5px -5px;
        border: 5px solid transparent;
        border-bottom: 0;
        border-top-color: #000;
        content: '';
    }

    .widget-demo--tooltipText--233C6 {
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-size: 12px;
        line-height: 16px;
        color: #fff;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--tooltipText--233C6 p {
        margin: 0;
    }

    .widget-demo--readReceipts--1eyI0 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: horizontal;
        -webkit-box-direction: normal;
        -ms-flex-direction: row;
        flex-direction: row;
    }

    .widget-demo--scrollable--1Yi1b {
        overflow: hidden;
        overflow-y: scroll;
        -webkit-box-flex: 1;
        -ms-flex: 1;
        flex: 1;
    }

    .widget-demo--spinnerContainer--2xo9H {
        margin: 25px auto 0;
    }

    .widget-demo--errorDisplay--HUNex {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        background: #f5f5f6;
    }

    .widget-demo--content--2lxul {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        text-align: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--transparent--1RZ1G {
        background: rgba(255, 255, 255, 0.9);
    }

    .widget-demo--transparent--1RZ1G {
        background: rgba(255, 255, 255, 0.9);
    }

    .widget-demo--contentItem--1Kk3s {
        padding: 2px 0;
        font-family: CiscoSans, 'Helvetica Neue', Arial, sans-serif;
        font-weight: 100;
    }

    .widget-demo--errorTitle--32A1x {
        font-size: 16px;
        line-height: 20px;
        color: #4f5051;
    }

    .widget-demo--secondaryTitle--_2Vct {
        font-size: 14px;
        line-height: 16px;
        color: #4f5051;
    }

    .widget-demo--linkButton--29SSi {
        min-width: 50%;
        font: inherit;
        font-size: 14px;
        color: #0ab7d7;
        cursor: pointer;
        background: none;
        border: none;
    }

    .widget-demo--banner--NuKJP {
        width: 100%;
        height: 12px;
        background-color: #049fd9;
    }

    .widget-demo--activityListWrapper--1Q_-b {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 0; /* Shrinks the list area so that flex can grow it to fill the space */
        overflow: hidden;
        -webkit-box-flex: 1;
        -ms-flex: 1;
        flex: 1;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--messageComposerWrapper--2yRx1 {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        min-height: 40px;
        background-color: #f5f5f5;
    }

    .widget-demo--dropzone--239so {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        overflow: hidden;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--mainArea--1sMEK {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        overflow: hidden;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--activeDropzone--2nC_V {
        border: 0 none;
    }

    .widget-demo--activeDropzone--2nC_V .widget-demo--dropzoneMessage--1CJcX {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .widget-demo--indicators--2dp_k {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        min-height: 40px;
        padding-bottom: 20px;
        font-size: 17px;
        white-space: nowrap;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
    }

    .widget-demo--scrollToBottom--GG_GF {
        position: absolute;
        bottom: 10px;
        left: 50%;
        text-align: center;
        white-space: nowrap;
        cursor: pointer;
        opacity: 0.5;
        -webkit-transition: all 0.5s ease-in;
        transition: all 0.5s ease-in;
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

    .widget-demo--controlItem--3vKLB {
        padding: 0 0;
        -webkit-box-flex: 0;
        -ms-flex: 0 1 auto;
        flex: 0 1 auto;
    }

    .widget-demo--button--ZURsb {
        width: 56px;
        height: 56px;
        font-size: 24px;
        line-height: 0.5;
        color: #fff;
        border-radius: 50%;
    }

    .widget-demo--callInactiveContainer--2-Cfr {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: auto;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--personName--3cJ4B {
        font-size: 32px;
        font-weight: 200;
        color: #4f5051;
    }

    .widget-demo--callControls--3fgUH {
        z-index: 100;
        margin: 34px 16px 0;
        text-align: center;
    }

    .widget-demo--incomingCallLabel--hGrCo {
        font-size: 14px;
        font-weight: 300;
        color: #858688;
    }

    .widget-demo--callControls--3fgUH .widget-demo--answerButton--2P6BF {
        background-color: #30d557;
    }

    .widget-demo--callControls--3fgUH .widget-demo--declineButton--3NCbq {
        background-color: #ff513d;
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

    .widget-demo--callControls--35xR2 .widget-demo--callButton--2-fgA {
        background-color: #30d557;
    }

    .widget-demo--callControls--35xR2 .widget-demo--callButton--2-fgA:hover {
        background-color: #2ac44f;
    }

    .widget-demo--video--_Vq-u {
        width: 100%;
        height: 100%;
    }

    .widget-demo--audio--1am1M {
        width: 100%;
        height: 100%;
    }

    .widget-demo--avatar--2hGGY {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: 100%;
        text-align: center;
        background-size: cover;
        border-radius: 50%;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--avatarLetter--2ZM1S {
        font-weight: 300;
        line-height: 185%; /* Not 200 because CiscoSans font */
        color: #fff;
        text-align: center;
        background-color: #7d7e7f;
    }

    .widget-demo--avatarColorLetter--3WVt5 {
        color: #fff;
        background-color: #fff;
    }

    .widget-demo--avatarLetter--2ZM1S > span {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--avatarSelf--1aUGm {
        color: #04c9ef;
    }

    .widget-demo--callContainer--3K3TZ {
        position: relative;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        height: inherit;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--callContainer--3K3TZ:hover .widget-demo--callControls--2-7gU {
        visibility: visible;
    }

    .widget-demo--callControls--2-7gU {
        position: absolute;
        bottom: 24px;
        left: 0;
        width: 100%;
        margin: 0 auto;
        text-align: center;
        visibility: hidden;
        -webkit-transition: all 160ms linear;
        transition: all 160ms linear;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
    }

    .widget-demo--avatarView--2pKs8 {
        width: 132px;
        height: 132px;
        margin: 80px auto 16px;
    }

    .widget-demo--avatarView--2pKs8 > div {
        width: 100%;
        height: 100%;
        font-size: 62px;
    }

    .widget-demo--remoteVideo--3I9rI {
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        position: absolute;
    }

    .widget-demo--callConnected--LUCtJ .widget-demo--remoteVideo--3I9rI {
        background: #000;
    }

    .widget-demo--localVideo--36X0Y {
        position: absolute;
        top: 0;
        right: 0;
        width: 150px;
        height: 84px;
        padding: 10px;
        cursor: pointer;
        -webkit-transition: -webkit-transform 160ms linear;
        transition: -webkit-transform 160ms linear;
        transition: transform 160ms linear;
        transition: transform 160ms linear, -webkit-transform 160ms linear;
    }

    .widget-demo--callConnected--LUCtJ .widget-demo--localVideo--36X0Y video {
        border-radius: 4px;
    }

    .widget-demo--callControls--2-7gU .widget-demo--hangupButton--VHDR2 {
        background-color: #ff513d;
    }

    .widget-demo--callControls--2-7gU .widget-demo--audioButton--m0vdA,
    .widget-demo--callControls--2-7gU .widget-demo--videoButton--2fbfD {
        background-color: #444;
    }

    .widget-demo--callControls--2-7gU .widget-demo--audioButton--m0vdA:hover,
    .widget-demo--callControls--2-7gU .widget-demo--videoButton--2fbfD:hover {
        background-color: #343537;
    }

    .widget-demo--callControls--2-7gU .widget-demo--audioStartSending--3_Kxu,
    .widget-demo--callControls--2-7gU .widget-demo--audioStartSending--3_Kxu:hover {
        background-color: #ff513d;
    }

    .widget-demo--callControls--2-7gU .widget-demo--videoStartSending--15_Pk,
    .widget-demo--callControls--2-7gU .widget-demo--videoStartSending--15_Pk:hover {
        background-color: #0393c9;
    }

    .widget-demo--reactDraggableDragging--j_irI {
        -webkit-transition: none;
        transition: none;
    }

    .widget-demo--waiting--tZklC {
        font-size: 22px;
        font-weight: 300;
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

    .widget-demo--noWebRtc--2c9So {
        top: 0;
        bottom: 0;
        padding: 0 40px;
        text-align: center;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--noWebRtcMessage--3NsQE {
        padding-top: 10px;
        font-size: 22px;
    }

    .widget-demo--item--20NL6 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 44px;
        font-size: 14px;
        font-weight: 300;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        color: #4f5051;
        cursor: pointer;
    }

    .widget-demo--name--RuTGg {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .widget-demo--avatar--hzhsa {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        width: 32px;
        height: 32px;
        margin-right: 12px;
    }

    .widget-demo--external--1GeYQ {
        color: #FFB400;
    }

    .widget-demo--pending--2HyXF {
        opacity: 0.3;
    }

    .widget-demo--popover--3ya1k {
        padding: 5px;
        color: #000;
    }

    .widget-demo--popover--3ya1k button {
        font-size: 10px !important;
    }

    .widget-demo--moreButton--3ZU0C {
        display: none;
    }

    .widget-demo--item--20NL6:hover .widget-demo--moreButton--3ZU0C{
        display: block;
    }

    .widget-demo--group--NW7DN {
        padding-bottom: 6px;
    }

    .widget-demo--title--X7n9M {
        padding: 8px 16px;
        margin: 0 0 2px 0;
        font-size: 12px;
        font-weight: 300;
        color: #4f5051;
        border-bottom: 1px #d2d3d4 solid;
    }

    .widget-demo--list--2fWWL {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
    }

    .widget-demo--widgetHeader--3nSpT {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        width: 100%;
        height: 46px;
    }

    .widget-demo--widgetMenu--3FqWZ {
        width: 60px;
        padding: 10px;
    }

    .widget-demo--widgetTitle--2XJ33 {
        -webkit-box-flex: 2;
        -ms-flex: 2;
        flex: 2;
        font-size: 14px;
        font-weight: 600;
        line-height: 46px;
        color: #4f5051;
        text-align: center;
    }

    .widget-demo--menuButton--uoqHN {
        width: 60px;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
    }

    .widget-demo--roster--394Wy {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 100%;
        width: 100%;
        font-family: CiscoSansTT Regular, Helvetica Neue, Helvetica, Arial, sans-serif;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--fullHeight--3tMd_ {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--scrolling--1j5pu {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--participantsSeparator--257TR {
        height: 30px;
        padding-left: 16px;
        font-size: 12px;
        line-height: 30px;
        color: #4f5051;
        background-color: #f5f5f6;
    }

    .widget-demo--addPeople--31DqZ {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 100%;
        min-height: 52px;
        font-size: 14px;
        font-weight: 300;
        line-height: 52px;
        color: #000;
        cursor: pointer;
    }

    .widget-demo--addPeopleIcon--3PWKk {
        height: 52px;
        width: 52px;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
    }

    .widget-demo--addPartipicant--3KGsH {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--searchBar--3mKYn {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: 5px;
    }

    .widget-demo--searchInput--3aRQ7 {
        height: 28px;
        width: 100%;
        margin-bottom: 0 !important; /* overrides momentum-ui input margin */
    }

    .widget-demo--searchInput--3aRQ7 input {
        font-size: 12px;
        height: 28px;
        margin-bottom: 0;
    }

    .widget-demo--closeButton--2BYAS {
        padding-right: 5px;
    }

    .widget-demo--closeButton--2BYAS button {
        border-radius: 5px !important; /* converts a circle button to small rounded */
    }

    .widget-demo--inviteButton--3w5sI {
        font-size: 16px;
    }

    .widget-demo--results--2Uh7E {
        border-top: 1px solid #f5f5f6;
        height: 100%;
        width: 100%;
    }

    .widget-demo--resultsLoading--3oo_Y {
        margin: auto;
    }

    .widget-demo--resultsNone--2UwqS {
        margin: 0 15px 15px;
        font-size: 14px;
        font-weight: 300;
    }

    .widget-demo--resultsInvite--2YoIm {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: 15px;
        font-size: 14px;
        font-weight: 300;
        line-height: 34px;
        cursor: pointer;
    }

    .widget-demo--resultsInviteIcon--34d-4 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: 5px;
    }

    .widget-demo--item--3dQTB {
        cursor: pointer;
    }

    .widget-demo--fullHeight--3U6Kh {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--external--GphXt {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        height: 33px;
        margin: 8px;
        font-size: 10px;
        font-weight: 200;
        color: #FFB400;
        line-height: 1.2;
    }

    .widget-demo--externalIcon--XgMMb {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        margin: 0 8px;
        width: 33px;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
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

    .widget-demo--menuContainer--TEpsg {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        width: 40px;
        padding-right: 18px;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
    }

    .widget-demo--buttonContainer--A6mT2 {
        width: 40px;
        height: 40px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 50%;
    }

    .widget-demo--buttonContainer--A6mT2:hover {
        color: #fff;
        background-color: #049fd9;
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

    .widget-demo--activityMenu--35dUs {
        position: relative;
        width: 100%;
        height: 100%;
        background-color: #fff;
    }

    .widget-demo--mainMenu--6VZ6_ {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        padding-top: 90px;
        -ms-flex-wrap: wrap;
        flex-wrap: wrap;
        -ms-flex-pack: distribute;
        justify-content: space-around;
    }

    .widget-demo--menuExit--1OCrn {
        position: absolute;
        top: 16px;
        right: 16px;
    }

    .widget-demo--menuExit--1OCrn .widget-demo--exitButton--1IP6S {
        width: 40px;
        height: 40px;
        font-size: 16px;
        line-height: 60%;
        color: #fff;
        background-color: #07c1e4;
        border-radius: 50%;
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

    .widget-demo--hidden--pIJDi {
        visibility: hidden;
    }

    .widget-demo--spaceWidget--3h8bX .widget-demo--messageButton--20AFI {
        background-color: #07c1e4;
    }

    .widget-demo--spaceWidget--3h8bX .widget-demo--meetButton--2YBTj {
        background-color: #30d557;
    }

    .widget-demo--spaceWidget--3h8bX .widget-demo--peopleButton--hcq66 {
        background-color: #00d6a2;
    }

    .widget-demo--spaceWidget--3h8bX .widget-demo--filesButton--1Y2Vj {
        background-color: #ffb400;
    }

    .widget-demo--activityMenuButtonWrapper--3eABx {
        padding: 0 16px;
    }

    .widget-demo--activityMenuButton--1FfBJ {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
    }

    .widget-demo--activityMenuWrapper--1o-2z {
        position: absolute;
        top: 1px;
        right: 1px;
        z-index: 90;
        width: 280px;
        height: 100%;
        overflow: hidden;
        -webkit-box-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.1);
        box-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.1);
        -webkit-animation: widget-demo--slideIn--1znpD 350ms;
        animation: widget-demo--slideIn--1znpD 350ms;
    }

    .widget-demo--callTimer--3aWi7 {
        margin-left: 10px;
        font-size: 12px;
        color: #858688;
    }

    .widget-demo--errorWrapper--18-IZ {
        position: absolute;
        z-index: 100;
        width: 100%;
        height: 100%;
    }

    .widget-demo--secondaryWidget--1yiO7 {
        position: absolute;
        top: 1px;
        right: 1px;
        z-index:  80;
        height: 100%;
        overflow: hidden;
        background-color: #fff;
        -webkit-box-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.1);
        box-shadow: 0 2px 6px 2px rgba(0, 0, 0, 0.1);
    }

    .widget-demo--secondaryWidgetCover--26i55 {
        width: 280px;
    }

    .widget-demo--secondaryWidgetFull--1-pmZ {
        width: 100%;
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

    .widget-demo--widgetFiles--2GVS9 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 100%;
        font-family: CiscoSans, 'Helvetica Neue', Arial, sans-serif;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--widgetFilesMain--1cEgZ {
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 10px;
    }

    .widget-demo--spacesListDark--TX2D4 {
        background-color: #000000
    }

    .widget-demo--noSpacesWrapper--2OSum {
        height: 100%;
        text-align: center;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        background-color: black;
    }

    .widget-demo--noSpacesImg--3SxOG {
        height: 72px;
        width: 100%;
        margin-bottom: 24px;
    }

    .widget-demo--noSpacesTitle--1_emP {
        color: #fff;
        font-weight: 700;
        line-height: 24px;
        text-align: center;
        margin-bottom: 12px;
    }

    .widget-demo--noSpacesMessage--2H2ac {
        color: hsla(0,0%,100%,.6);
        line-height: 22px;
        text-align: center;
    }

    .widget-demo--menu--11r8r {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        width: 235px;
        height: 160px;
        border-bottom: 1px solid #E0E0E0;
    }

    .widget-demo--menu--11r8r h5 {
        color: #666666;
    }

    .widget-demo--info--3mW7L {
        margin-top: 8px;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;
    }

    .widget-demo--signout--2xcwv div {
        color: black !important;
    }

    .widget-demo--recentsHeader--1KLIB {
        height: 60px;
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-orient: horizontal;
        -webkit-box-direction: normal;
        -ms-flex-direction: row;
        flex-direction: row;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        background: black;
    }

    .widget-demo--bottomBorder--2nMKj {
        border-bottom: 1px solid #666666;
    }

    .widget-demo--searchInputWrapper--11WF5 {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        -ms-flex-item-align: center;
        align-self: center;
        -webkit-box-flex: 1;
        -ms-flex: 1 1 auto;
        flex: 1 1 auto;
        margin: auto;
        fill: #efefef;
        background-color: black
    }

    .widget-demo--searchInput--EQgN7 {
        background-color: #666666;
        border-radius: 100px;
        width: 100%;
        height: 32px;
    }

    .widget-demo--searchInput--EQgN7 input {
        border: none;
    }

    .widget-demo--headerSideItem--7PLYR {
        -webkit-box-flex: 0;
        -ms-flex: 0 0 auto;
        flex: 0 0 auto;
        margin-left: 14px;
        margin-right: 14px;
        min-width: 40px;
        height: 40px;
    }

    .widget-demo--recentsWidget--13Qse {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        height: 100%;
        -webkit-box-orient: vertical;
        -webkit-box-direction: normal;
        -ms-flex-direction: column;
        flex-direction: column;

        /* IE 11 scrollbar styling workarounds */
        scrollbar-face-color: #8a8a8a;
        scrollbar-shadow-color:black;
        scrollbar-track-color: black;
        scrollbar-shadow-color: black;
    }

    .widget-demo--spacesListWrapper--2k6tS {
        height: 100%;
        width: 100%;
        overflow: auto;
        font-size: 16px;
        background: #fff;
    }

    .widget-demo--errorWrapper--1JTEQ {
        position: absolute;
        z-index: 1000;
        width: 100%;
        height: 100%;
    }

    .widget-demo--loadMoreContainer--28UCj {
        display: -webkit-box;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: center;
        -ms-flex-pack: center;
        justify-content: center;
        padding: 10px 0;
    }

    .widget-demo--loadMoreButton--2SKuq {
        height: 36px;
        min-width: 64.8px;
        padding: 0 36px;
        font-size: 14px;
        line-height: 24px;
        line-height: normal;
        letter-spacing: 0.3px;
        color: #fff;
        cursor: pointer;
        background: #07c1e4;
        border: 1px #07c1e4;
        border-radius: 4px;
    }

    .widget-demo--midDot--1SCpE::after {
        padding: 0 3px;
        content: '\b7';
    }

    .widget-demo--section--39p6E {
        background-color: white;
        width: 95%;
        margin: 25px auto 0;
        padding: 10px 25px;
        -webkit-box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px;
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px;
        border-radius: 2px;
    }

    .widget-demo--exampleCode--1yYQy {
        padding: 15px;
        overflow: scroll;
    }

    .widget-demo--exampleCode--1yYQy pre {
        word-wrap: break-word;
        white-space: pre-wrap;
    }

    body {
        font-size: 14px;
    }

    .widget-demo--section--3xiy0 {
        background-color: white;
        width: 95%;
        margin: 25px auto 0;
        padding: 10px 25px;
        -webkit-box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px;
        box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px;
        border-radius: 2px;
    }

    .widget-demo--runningDemosSticky--uNqmj {
        position: -webkit-sticky;
        position: sticky;
        bottom: 0;
    }

    .widget-demo--runningDemosBottom--2_M-m {
        height: 625px;
        position: relative;
        border: 1px solid;
        background-color: #39393b;
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

    .widget-demo--widgetRecentsComponentContainer--2LcUG {
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: 99;
        width: 500px;
        height: 600px;
        background-color: #fff;
        border: 1px solid;
    }

    .widget-demo--widgetRecentsComponentContainer--2LcUG > div {
        height: 100%;
    }


    .widget-demo--exampleCode--1KXcv {
        padding: 15px;
        overflow: scroll;
    }

    .widget-demo--exampleCode--1KXcv pre {
        word-wrap: break-word;
        white-space: pre-wrap;
    }

    .widget-demo--hidden--3jAfp {
        visibility: hidden;
    }

    /* Button at the center bottom that sticks widgets */
    .widget-demo--stickyButton--3GTFK {
        position: absolute;
        bottom: 0;
        left: 50%;
        -webkit-transform: translateX(-50%);
        transform: translateX(-50%);
    }


    /*# sourceMappingURL=main.css.map*/
</style>
