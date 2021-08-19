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
                The WorkAdventure team is always happy to give you some guidance and advice.
                If you have any question, issue, new features or improvements you'd like to see or if you'd like to give us some feedback,
                please don't hesitate to reach out!
            </p>
        </section>
        <section>
            <h3>Our Office</h3>
            <p>
                Let's grab a coffee and have a chat on our virtual office .... on WorkAdventure. Our team loves meeting new people!
            </p>
            <a class="nes-pointer" href="https://play.staging.workadventu.re/@tcm/workadventure/wa-village" target="_blank">Visit us</a>
        </section>
        <section>
            <h3>Our Mail</h3>
            <p>You'd rather send us an email? Please, feel free to do so, although we hope we could meet you on our virtual office soon enough.</p>
            <a class="nes-pointer" href="mailto:hello@workadventu.re" target="_blank">hello@workadventu.re</a>
        </section>
        <section>
            <h3>Our web site</h3>
            <p>Do you want to know more about us? Just follow the link to our website.</p>
            <a class="nes-pointer" href="https://workadventu.re/about-us" target="_blank">About us</a>
        </section>
        <section>
            <h3>Our social media</h3>
            <p>Follow us and keep you updated on the latest news and upcoming new features!</p>
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
        margin-bottom: 15px;

        p {
          margin: 0;
        }
        img {
          margin-top: 10px;
        }

        img {
          height: 50px;
          width: 50px;
        }
      }
    }
</style>