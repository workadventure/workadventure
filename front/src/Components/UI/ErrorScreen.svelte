<script lang="ts">
    import { fly } from "svelte/transition";
    import { errorScreenStore } from "../../Stores/ErrorScreenStore";

    import logo from "../images/logo-min-white.png";
    import error from "../images/error.png";
    import cup from "../images/cup.png";
    import reload from "../images/reload.png";
    import external from "../images/external-link.png";
    import {get} from "svelte/store";

    let errorScreen = get(errorScreenStore);

    function click(){
        if(errorScreen.urlToRedirect) window.location.replace(errorScreen.urlToRedirect);
        else if(errorScreen.type === 'redirect' && window.history.length > 2) history.back();
        else window.location.reload(true);
    }
    let details = errorScreen.details;
    let timeVar = errorScreen.timeToRetry ?? 0;
    if(errorScreen.type === 'retry') {
        setInterval(() => {
            if (timeVar <= 1000) click();
            timeVar -= 1000;
        }, 1000);
    }

    $: detailsStylized = details.replace("{time}", `${timeVar/1000}`);

</script>

<main class="errorScreen" transition:fly={{ y: -200, duration: 500 }}>
    <div style="width: 90%;">
        <img src={logo} alt="WorkAdventure" class="logo"/>
        <div><img src={$errorScreenStore.type === 'retry'?cup:error} alt="" class="icon"/></div>
        {#if $errorScreenStore.type !== 'retry'}<h2>{$errorScreenStore.title}</h2>{/if}
        <p>{$errorScreenStore.subtitle}</p>
        {#if $errorScreenStore.type !== 'retry'}<p class="code">Code : {$errorScreenStore.code}</p>{/if}
        <p class="details">{detailsStylized}{#if $errorScreenStore.type === 'retry'}<div class="loading"></div>{/if}</p>
        {#if ($errorScreenStore.type === 'retry' && $errorScreenStore.canRetryManual) || ($errorScreenStore.type === 'redirect' && (window.history.length > 2 || $errorScreenStore.urlToRedirect))}
            <div class="button" on:click={click}>
                <img src={$errorScreenStore.type === 'retry'?reload:external} alt="" class="reload"/>
                {$errorScreenStore.buttonTitle}
            </div>
        {/if}
    </div>

</main>

<style lang="scss">
  main.errorScreen {
    pointer-events: auto;
    width: 100%;
    background-color: #000000;
    color: #FFFFFF;
    text-align: center;
    position: absolute;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    height: 100%;
    top: 0;
    left: 0;
    right: 0;
    margin-left: auto;
    margin-right: auto;
    min-width: 300px;
    z-index: 700;
    overflow-y: scroll;
    padding: 20px 0;
    .logo{
      width: 50%;
      margin-bottom: 50px;
    }
    .icon{
      height: 125px;
      margin-bottom: 25px;
    }
    h2 {
      font-family: "Press Start 2P";
      padding: 5px;
      font-size: 30px;
    }
    p {
      font-family: "Press Start 2P";
    }
    p.code{
      font-size: 12px;
      opacity: .6;
      user-select: text;
    }
    p.details{
      font-size: 12px;
      max-width: 80%;
      margin: 0 auto 35px auto;
    }
    .loading{
      display: inline-block;
      min-width: 20px;
      position: relative;
      margin-left: 5px;
    }
    .loading:after {
      overflow: hidden;
      display: inline-block;
      vertical-align: bottom;
      -webkit-animation: ellipsis steps(4,end) 900ms infinite;
      animation: ellipsis steps(4,end) 900ms infinite;
      content: "\2026";
      width: 0;
      font-family: "Press Start 2P";
      font-size: 16px;
      position: absolute;
      left: 0;
      top: -19px;
    }

    @keyframes ellipsis {
      to {
        width: 1.25em;
      }
    }

    @-webkit-keyframes ellipsis {
      to {
        width: 1.25em;
      }
    }

    .button{
      cursor: pointer;
      background-image: url('../images/button-large.png');
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
      padding: 16px 20px;
      margin-bottom: 2px;
      font-family: "Press Start 2P";
      font-size: 14px;
      .reload{
        margin-top: -4px;
        width: 22px;
      }
    }
    .button:hover{
      margin-bottom: 0;
      margin-top: -5px;
      padding: 18px 22px;
      font-size: 16px;
      .reload{
        margin-top: -5px;
        width: 24px;
      }
    }

  }
</style>
