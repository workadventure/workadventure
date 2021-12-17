<!-- This file exists solely to generate a personal meeting link that can be sent off to the backend -->
<script>
  import { onMount } from "svelte";

  let webexCDNLink = "https://unpkg.com/webex/umd/webex.min.js";
  let webex = null;
  export let accessToken = null
  export let webexMeetingLinkKey;

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

  onMount(async () => {
    await importWebex();
    console.log("[Webex] Webex onMount Access token", accessToken)
    webex = window.Webex.init({
      credentials: {
        access_token: accessToken
      }
    });
    webex.config.logger.level = 'debug';
    webex.meetings.register().then(() => {
      // TODO -> Why is the PMR link null?
        let meetingObject = webex.meetings.getPersonalMeetingRoom();
        console.log(meetingObject);
        if (localStorage.getItem(webexMeetingLinkKey)) {
          localStorage.removeItem(webexMeetingLinkKey)
        }
        localStorage.setItem(webexMeetingLinkKey, meetingObject.link)
        if (meetingObject.link !== localStorage.getItem(webexMeetingLinkKey)) {
          throw Error("[Front] Meeting link in window ("+ localStorage.getItem(webexMeetingLinkKey) +") doesn't match meeting object link ("+meetingObject.link+")")
        }
    }).catch(err => {
      console.error("Error: " + err + "\naccessToken: " + accessToken);
    });
  })
</script>

<svelte:head>
  <link rel="stylesheet" href="./static/css/widget-demo-main.css" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/main.css';"/>
  <link rel="stylesheet" href="./static/css/widget-space-main.css" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-space/production/main.css';"/>
  <link href="./fonts/CiscoSansTTLight.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTRegular.woff2';"/>
  <link href="./fonts/CiscoSansTTRegular.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/CiscoSansTTLight.woff2';"/>
  <link href="./fonts/momentum-ui-icons.woff2" rel="preload" as="font" onerror="this.onerror=null;this.href='https://code.s4d.io/widget-demo/archives/0.2.50/fonts/momentum-ui-icons.woff2';"/>
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
