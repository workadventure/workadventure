<!-- This file exists solely to generate a personal meeting link that can be sent off to the backend -->
<script>
    import {onMount} from "svelte";
    export let accessToken = null;
    export let webexMeetingLinkKey;
    export let roomName = "WorkAdventure Meeting Room";
    export let roomID = null;

    onMount(async () => {
        let now = new Date(Date.now() + 45 * 1000);
        let later = new Date(Date.now() + 4 * 60 * 60 * 1000);
        console.log(`[Front] Meeting going from ${now} to ${later}`);
        fetch("https://api.ciscospark.com/v1/meetings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                "title": `WorkAdventure - ${roomName}`,
                "start": now.toISOString(),
                "end": later.toISOString(),
                "allowAnyUserToBeCoHost": true,
                "enabledJoinBeforeHost": true,
                "enableConnectAudioBeforeHost": true,
                //"allowFirstUserToBeCoHost": true,
                "sendEmail": false,
                //"publicMeeting": true,
                "integrationTags": ["workadventure-" + roomID]
            })
        }).then(resp => resp.json()).then(data => {
            console.log("[Front] (Link Generator) ", data);
            if (localStorage.getItem(webexMeetingLinkKey)) {
                localStorage.removeItem(webexMeetingLinkKey)
            }
            localStorage.setItem(webexMeetingLinkKey, data.sipAddress)
            if (data.sipAddress !== localStorage.getItem(webexMeetingLinkKey) && localStorage.getItem(webexMeetingLinkKey) !== undefined) {
                throw Error("[Front] Meeting link in window (" + localStorage.getItem(webexMeetingLinkKey) + ") doesn't match meeting object link (" + data.sipAddress + ")")
            }
        }).catch(err => {
            console.error(err);
        })
    })
</script>

<svelte:head>
    <link rel="stylesheet" href="./static/css/widget-demo-main.css"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/main.css';"/>
    <link rel="stylesheet" href="./static/css/widget-space-main.css"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-space/production/main.css';"/>
    <link href="./fonts/CiscoSansTTLight.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTRegular.woff2';"/>
    <link href="./fonts/CiscoSansTTRegular.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTLight.woff2';"/>
    <link href="./fonts/momentum-ui-icons.woff2" rel="preload" as="font"
          onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/momentum-ui-icons.woff2';"/>
    <link rel="stylesheet" href="./static/css/momentum-ui.min.css">
</svelte:head>

<main>
    <div class="widget-demo--widgetSpaceComponentContainer--3L80J"
         style="width: calc( 100% - 30px); height: 100%; right: 0;background-color: black;">
        <div id="my-ciscospark-space-widget">
            <div class="widget-demo--wrapper--2FMs0">
                <div class="ciscospark-space-widget md widget-demo--spaceWidget--3h8bX">
                    <div class="ciscospark-title-bar-wrapper">
                        <div class="ciscospark-title-bar widget-demo--titleBar--32_8a">
                            <div class="ciscospark-avatar-container widget-demo--avatarContainer--shGVy">
                                <div class="md-avatar md-avatar--24" title="Get ready..."></div>
                            </div>
                            <div class="ciscospark-title-text widget-demo--titleText--3jwIv"><p><strong
                                    class="ciscospark-title widget-demo--title--6SJXl">Get ready...</strong></p>
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
                                        <div class="widget-demo--personName--3fVsV call-person-name">
                                            Starting meeting...
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
</main>
