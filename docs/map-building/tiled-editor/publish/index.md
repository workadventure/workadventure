---
sidebar_position: 11
---

# Publishing your map

You have several options to host your map.

- [**Upload your map to the WorkAdventure server**](./wa-hosted) (_recommended_): we recommend this option as it is the easiest to
  set up. Note that you can upload the map to the WorkAdventure server either locally, or from a CI/CD pipeline (if you are a developer)
- [**Host your map on GitHub Pages**](./github-pages): when using this option, you push your map on a GitHub repository and GitHub
  will host your map for you. This is a good option if you are a developer and do not have a web server.
- [**Host your map on a self-hosted web server**](./hosting): if you want maximum freedom, or if you have special
  privacy needs, you can host your map on your own web server. WorkAdventure will load your map wherever your map is hosted.

```mermaid
flowchart TB
  subgraph Self-hosted
    direction BT
    Y3[Your computer] -- upload map --> WS[Your web server]
    WA3[WorkAdventure] -. load map .-> WS
  end
  subgraph GitHub pages
    direction BT
    Y2[Your computer] -- push --> GH[GitHub]
    GH[GitHub] -- GitHub actions --> GHP[GitHub Pages]
    WA2[WorkAdventure] -. load map .-> GHP
  end
  subgraph WorkAdventure
    direction BT
    Y1[Your computer] -- upload map --> WA1[WorkAdventure]
  end
  style WA1 fill:#14304C,color:#fff
  style WA2 fill:#14304C,color:#fff
  style WA3 fill:#14304C,color:#fff
```
