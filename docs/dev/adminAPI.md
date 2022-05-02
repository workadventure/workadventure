# Implement your own admin API
## Why
The major interest in developing your own admin API is first of all to integrate Work Adventure into an existing computer system.
To be able to manage the accesses and the rooms be even according to what already exists.
To do this, you must link the existing user database with Work Adventure.
In addition, the advantage of implementing your own admin API is to be able to create rooms or access dynamically to Work Adventure.

## Architecture
[![](https://mermaid.ink/img/pako:eNpdkEFrwzAMhf-K0S4JpJexMDBjkNIVBjuE7VDKvIMbK4tJYgdHXldK__sUklKYTk9PTx9CZ6i8QZDwHfTQiLd35QTXSKcORVG-sgq-RXlX1w-Puc7mdnW0hhp5P_wuhhS5yJfVeJhZOx_awvygoxhwnk21TbbBO0rF02r1LMpEQRnHBoOCVEzOOlnrqk3nBXTmH3W_-1Sw9zGIIx5GS6jg6wbnixlYmN66STPzNisZz_zJvrIhgx5Dr63hD5wnWwE12DNUsnQYKehOgXIXjsbBaMIXY8kHkLXuRsxAR_IfJ1eBpBDxGtpYzef2S-ryBwzWbw8)](https://mermaid-js.github.io/mermaid-live-editor/edit#pako:eNpdkEFrwzAMhf-K0S4JpJexMDBjkNIVBjuE7VDKvIMbK4tJYgdHXldK__sUklKYTk9PTx9CZ6i8QZDwHfTQiLd35QTXSKcORVG-sgq-RXlX1w-Puc7mdnW0hhp5P_wuhhS5yJfVeJhZOx_awvygoxhwnk21TbbBO0rF02r1LMpEQRnHBoOCVEzOOlnrqk3nBXTmH3W_-1Sw9zGIIx5GS6jg6wbnixlYmN66STPzNisZz_zJvrIhgx5Dr63hD5wnWwE12DNUsnQYKehOgXIXjsbBaMIXY8kHkLXuRsxAR_IfJ1eBpBDxGtpYzef2S-ryBwzWbw8)
<figcaption class="figure-caption text-center">Diagram of the architecture of Work Adventure</figcaption>
<br>

First you need to understand how Work Adventure architecture is made.
Work Adventure is divided in 3 sections :
- **Front**<br>
    The front is the visible part of Work Adventure, the one that serves the game.
- **Pusher**<br>
    The pusher is the one that centralizes the connections and makes exchanges through WebSocket tunnels with the clients of the Front.
    In addition, he speaks with the Back and the admin API if it's determinate.
- **Back**<br>
    The back is the service that allows all metrics, movements, bubbles to persist.

Finally, the Admin API is the part where the members are managed. This part is fully optional.
If you are reading this documentation this is surely because you want to implement your own admin API.

## Principles
The first principle that you must understand is that it is not your site that will call the pusher but the reverse.<br>
When you define access to your external API, the pusher will then directly ask it for the information and authorizations it needs.

[![](https://mermaid.ink/img/pako:eNqNkk9LxDAQxb9KyNUtvfewsFILggtFWbz0MiajDTZ_TCYsy7Lf3cRutWtdMKdkfu_NvJAcubASecUDfkQ0AmsFbx50Z1haDjwpoRwYYg2DwBpvDS1Zm1kbQ49-CTftfcYbqZXJh1EBkayJ-mVyNKxYr29YW7FSgxtr7VhLnlQFp35I7lkkWGTDFlyNBGoINRB8W79w8zeeTfPW6hKEwBCuTF0oLqY3SKLfYr5J7n972EUlHzE4awIuwvxDPcu2t-9QDirQlWS_-EWu58Qe5tYpwgT4imv0GpRMz3_Mso5Tjxo7XqWtwUgeho535pSk0UkgvJOKrOfVKwwBVzw_4tPBCF6RjziJzl_orDp9AnkPvDI)](https://mermaid-js.github.io/mermaid-live-editor/edit#pako:eNqNkk9LxDAQxb9KyNUtvfewsFILggtFWbz0MiajDTZ_TCYsy7Lf3cRutWtdMKdkfu_NvJAcubASecUDfkQ0AmsFbx50Z1haDjwpoRwYYg2DwBpvDS1Zm1kbQ49-CTftfcYbqZXJh1EBkayJ-mVyNKxYr29YW7FSgxtr7VhLnlQFp35I7lkkWGTDFlyNBGoINRB8W79w8zeeTfPW6hKEwBCuTF0oLqY3SKLfYr5J7n972EUlHzE4awIuwvxDPcu2t-9QDirQlWS_-EWu58Qe5tYpwgT4imv0GpRMz3_Mso5Tjxo7XqWtwUgeho535pSk0UkgvJOKrOfVKwwBVzw_4tPBCF6RjziJzl_orDp9AnkPvDI)
<figcaption class="figure-caption text-center">Sequence diagram of the initialization of the Game Scene</figcaption>
<br>

There are 3 end points that are the most important :
- `/api/map`<br>
  _On the sequence diagram this is the call n°2._<br>
  This end point returns a map mapping map name to file name of the map.
  It will process the playURI and the uuid to return the information of the map if the user can access it.<br>
  In case of success, this endpoint returns a `MapDetailsData` object.
- `/api/room/access`<br>
  _On the sequence diagram this is the call n°6._<br>
  This end point returns the member's information if he can access this room.<br>
  In case of success, this endpoint returns a `FetchMemberDataByUuidResponse` object.
- `/api/woka/list`<br>
  _On the sequence diagram this is the call n°10._<br>
  This end point returns a list of all the woka from the world specified.<br>
  In case of success, this endpoint returns a `WokaList` object.

## What to do
1. You will need to implement, in your website, all the URLs that are listed in this swagger documentation : [WA Pusher](http://pusher.workadventure.localhost/swagger-ui/).
2. In the `.env` file :
   * Set the URL of your admin API, set the environment variable :
      `ADMIN_API_URL=http://example.com`
   * Set the token of the API to check if each request is authenticated by this token :
      `ADMIN_API_TOKEN=myapitoken`
      If the call is not correctly authenticated by the Bearer token in the header, make sure to answer with a 403 response.
