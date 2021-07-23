<script lang="typescript">
  import { webexIntegration } from '../../WebRtc/WebexIntegration'

  function signIn() {
    webexIntegration.openAuthorizationPopup()
  }
</script>
<div>
  {#if !webexIntegration.isAuthorized}
    Please sign in to Webex<br>
    <button on:click={signIn}>Continue</button>
  {/if}
</div>