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

    function horribleImportWebex() {
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
        await horribleImportWebex();
        webex = window.Webex.init({
            credentials: {
                access_token: accessToken
            }
        });
        webex.config.logger.level = 'debug';
        webex.meetings.register().then(() => {
            startCall()
        })
            .catch(err => {
                console.error(err);
                alert(err);
                throw(err);
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
            <div style="display: flex">
                <video style="width:50%" id="self-view" muted autoplay></video>
                <div style="width:50%">
                    <audio id="remote-view-audio" autoplay></audio>
                    <video id="remote-view-video" autoplay></video>
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