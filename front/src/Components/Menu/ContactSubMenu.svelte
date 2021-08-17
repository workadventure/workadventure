<script lang="ts">
    import discordImg from '../images/discord_64x64.png'
    import facebookImg from '../images/facebook_64x64.png'
    import instagramImg from '../images/instagram_64x64.png'
    import linkedinImg from '../images/linkedin_64x64.png'
    import twitterImg from '../images/twitter_64x64.png'
    import youtubeImg from '../images/youtube_64x64.png'

</script>

<div class="contact-main">
    <section class="container-overflow">
        <section>
            <p>
                The WorkAdventure team is always available to help you.
                If you have any questions, problems, new features or improvements ideas, or if you just want to give us your feedback,
                do not hesitate to contact us.
            </p>
        </section>
        <section>
            <h3>Our Office</h3>
            <p>
                The WorkAdventure team has its own offices in ... WorkAdventure!
                Do not hesitate to come see and talk to us.
            </p>
            <a class="nes-pointer" href="https://play.staging.workadventu.re/@tcm/workadventure/wa-village" target="_blank">Visit us</a>
        </section>
        <section>
            <h3>Our Mail</h3>
            <p>Although we offer a solution to reduce their use, we have an email address that allows us to receive all your requests.</p>
            <a class="nes-pointer" href="mailto:hello@workadventu.re" target="_blank">hello@workadventu.re</a>
        </section>
        <section>
            <h3>Our web site</h3>
            <p>If you want to know more about us, follow the link to our web site.</p>
            <a class="nes-pointer" href="https://workadventu.re/about-us" target="_blank">About us</a>
        </section>
        <section>
            <h3>Our social media</h3>
            <a href="https://discord.gg/YGtngdh9gt" target="_blank">
                <img class="nes-pointer" src="{discordImg}" alt="{'Discord'}">
            </a>
            <a href="https://www.facebook.com/workadventure.WA" target="_blank">
                <img class="nes-pointer" src="{facebookImg}" alt="{'Facebook'}">
            </a>
            <a href="https://www.instagram.com/workadventure_/" target="_blank">
                <img class="nes-pointer" src="{instagramImg}" alt="{'Instagram'}">
            </a>
            <a href="https://www.linkedin.com/company/workadventure-by-tcm/" target="_blank">
                <img class="nes-pointer" src="{linkedinImg}" alt="{'LinkedIn'}">
            </a>
            <a href="https://twitter.com/Workadventure_" target="_blank">
                <img class="nes-pointer" src="{twitterImg}" alt="{'Twitter'}">
            </a>
            <a href="https://www.youtube.com/channel/UCXJ9igV-kb9gw1ftR33y5tA" target="_blank">
                <img class="nes-pointer" src="{youtubeImg}" alt="{'Youtube'}">
            </a>
        </section>
    </section>
</div>


<style lang="scss">
    div.contact-main {
      height: calc(100% - 56px);
      width: 100%;

      section.container-overflow {
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: auto;
      }

      section {
        text-align: center;
        padding: 4px 5px;
        margin-bottom: 25px;

        p {
          margin: 0;
        }

        img {
          height: 50px;
          width: 50px;
        }
      }
    }
</style>