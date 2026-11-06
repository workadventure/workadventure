# Contrat avec l'admin distante (SaaS)

Fait de contrat partagé avec les deux équipes candidates. Ce document décrit ce que font aujourd'hui les services
TypeScript (pusher `play/src/pusher` et `play/src/room-api`, back, map-storage, uploader) face à l'admin SaaS : ce
qu'ils envoient, ce qu'ils attendent, et ce qui en dépend. Il ne propose aucune implémentation.

- Référence : worktree `dev-socle`, commit `50b327c96` (base master gelé). Les chemins sont relatifs à la racine
  du dépôt `workadventure`, les numéros de ligne sont ceux de ce commit.
- `saas:` renvoie au dépôt externe `workadventure-saas` (branche `develop`, `fec377cd2`). Ces renvois montrent
  seulement ce que l'admin attend ou renvoie.
- Aucune valeur de secret n'est citée, seulement les noms des variables.

Sommaire : [0. Règles communes](#0-règles-communes) · [1. Tableau récapitulatif](#1-tableau-récapitulatif) ·
[2. Fiches par appel](#2-fiches-par-appel) · [3. Tenant, white label, domaines](#3-résolution-du-tenant-white-label-et-contrôles-de-domaine) ·
[4. Sens inverse](#4-sens-inverse--ce-que-ladmin-appelle) · [5. Variables d'environnement](#5-variables-denvironnement) ·
[6. Tests](#6-tests) · [7. Écarts et singularités](#7-écarts-et-singularités-observés)

---

## 0. Règles communes

### Activation

| Service | Condition | Repli sans admin |
|---|---|---|
| Pusher | `adminService = adminApi.isEnabled() ? adminApi : localAdmin` (`play/src/pusher/services/AdminService.ts:5`), avec `isEnabled() = !!ADMIN_API_URL` | `LocalAdmin` (`play/src/pusher/services/LocalAdmin.ts`), décrit dans chaque fiche |
| Room API | `ADMIN_API_URL ? AdminAuthenticator : LocalAuthenticator` (`play/src/room-api/guards/AuthenticationGuard.ts:17`) | clé `ROOM_API_SECRET_KEY` |
| Back | chaque méthode teste `ADMIN_API_URL` (`back/src/Services/AdminApi.ts:36,68,87`, `back/src/Model/GameRoom.ts:1058`) | dérivation locale ou variables d'environnement |
| Uploader | `if (ADMIN_API_URL)` (`uploader/src/Controller/FileController.ts:127`) | `ENABLE_CHAT_UPLOAD`, `UPLOAD_MAX_FILESIZE` |
| Map-storage | ne lit pas `ADMIN_API_URL` : trois URL complètes, `AUTHENTICATION_VALIDATOR_URL`, `WEB_HOOK_URL` et `WAM_TEMPLATE_URL` | jeton statique, pas de webhook, WAM vide |

### URL de base

- Presque tous les appels partent sur `ADMIN_API_URL`, l'adresse interne de l'admin (SaaS : `http://<prefix>admin`).
  Trois appels du pusher partent sur **`ADMIN_URL`**, l'URL publique de l'admin : A16 (PUT chatId), A17 (POST
  oauth/refreshtoken) et A18 (GET ice-servers).
- Le pusher et l'uploader concatènent (`ADMIN_API_URL + "/api/…"`). Le back résout (`new URL("api/…", ADMIN_API_URL)`) :
  si la base avait un chemin sans `/` final, il serait remplacé. La file analytics retire les `/` finaux, puis
  concatène. Tant que `ADMIN_API_URL` n'a pas de chemin (cas SaaS), les trois manières donnent la même URL.

### Authentification

- La plupart des appels portent `Authorization: <ADMIN_API_TOKEN>`, le jeton brut sans préfixe.
- Un seul porte `Authorization: Bearer <ADMIN_API_TOKEN>` : A22 (analytics).
- Le garde `node-token` de l'admin SaaS accepte les deux formes. Il refuse tout si son propre `ADMIN_API_TOKEN` est
  vide (`saas: admin/app/Providers/AuthServiceProvider.php:57`).
- Appels sans jeton admin :
  - A1 (capabilities) et A4 (cf-challenge) : aucun en-tête d'authentification ;
  - A25 (Room API) : `X-API-Key` fourni par le client gRPC ;
  - A26 (map-storage) : `X-API-Key`, c'est-à-dire le bearer reçu ;
  - A28 (gabarit WAM) : aucun en-tête ;
  - A29 (uploader) : en-tête `userRoomToken`.
- A27 (webhook map-storage) envoie `Authorization: <WEB_HOOK_API_TOKEN>`. En SaaS, ce jeton vaut `ADMIN_API_TOKEN`
  par défaut et la route est protégée par `auth:node-api`.

### Langue

- Seuls A2 (pusher), A3, A5 et A6 envoient `Accept-Language`.
- Quand l'appel naît d'une requête HTTP ou WebSocket du navigateur, la valeur est l'en-tête `Accept-Language` brut
  de ce navigateur. Sinon, c'est `"en"` (`locale ?? "en"`).
- Le back n'envoie jamais de langue, mais `Accept: application/json` (A2 côté back, A23, A24).

### Query string

Client axios 1.16 :

- un tableau est sérialisé `cle[]=v1&cle[]=v2` ;
- un paramètre `undefined` est omis ;
- l'encodage est le form-urlencoded d'axios : il garde `:` `$` `,` `[` `]` et met les espaces en `+`.

A6 et A8 construisent leur query à la main (voir leurs fiches).

### Statuts HTTP et erreurs métier

- axios rejette toute réponse hors 2xx. Le corps d'une 4xx ou d'une 5xx n'est donc jamais interprété, sauf pour A25,
  A29 et le 422 de A22.
- Une erreur métier (salle introuvable, accès refusé, monde plein…) doit arriver en **HTTP 200 avec un corps
  `ErrorApiData`**. C'est ce que fait l'admin SaaS : `Error::$httpCode` vaut 200 par défaut
  (`saas: admin/app/Models/Error.php:31,358`).

### Délais

- axios n'a pas de timeout par défaut, et le code n'en fixe aucun sur les appels du pusher, du back et de l'uploader
  vers l'admin.
- Exceptions :

  | Appel | Timeout |
  |---|---|
  | A22 | `ANALYTICS_TIMEOUT_MS` (défaut 2000 ms) |
  | A23 | 5000 ms |
  | A27 | 10000 ms |
  | A30 (OIDC) | 50000 ms, via `custom.setHttpOptionsDefaults` |

- Un admin qui ne répond plus bloque donc `/me`, l'ouverture du WebSocket, `/map` et le rendu de page, jusqu'à la
  coupure TCP.

### Validation

- Les schémas zod ne sont pas stricts : un champ inconnu est accepté, puis retiré du résultat.
- Les capacités (A1) sont lues une seule fois au démarrage et jamais rafraîchies. Les services Woka, compagnon et
  vérification de domaine sont choisis une fois pour toutes.

### Comportement du pusher en cas d'échec

- A2 et A3 ne lèvent jamais : une erreur de transport ou une réponse non conforme devient un `ErrorApiErrorData`
  construit localement.
- Les autres appels lèvent. C'est le contexte appelant qui décide de la suite : réponse `error` à une requête
  WebSocket, `errorMessage` générique, HTTP 500, ou erreur avalée (voir chaque fiche).

---

## 1. Tableau récapitulatif

`AdminApi.ts` désigne `play/src/pusher/services/AdminApi.ts`, et `SocketManager.ts` désigne
`play/src/pusher/services/SocketManager.ts`.

| # | Appel | Code de l'appel HTTP (fichier:ligne) | Appelé depuis | Réponse attendue (zod) | Capacité |
|---|---|---|---|---|---|
| A1 | `GET /api/capabilities` | `AdminApi.ts:186` ; back `libs/shared-utils/src/SharedAdminApi.ts:84` | démarrage (`play/src/pusher/app.ts:123`, `back/src/App.ts:61`) | `isCapabilities` | — |
| A2 | `GET /api/map` | `AdminApi.ts:268` ; back `back/src/Services/AdminApi.ts:96` | rendu de page, `GET /map`, JWT map-storage ; back : création ou rafraîchissement de salle | `isMapDetailsData` \| `isRoomRedirect` \| `isErrorApiErrorData` | — |
| A3 | `GET /api/room/access` | `AdminApi.ts:399` | `GET /me`, ouverture de `/ws/room` | `isFetchMemberDataByUuidResponse` | — |
| A4 | `GET /white-label/cf-challenge` | `AdminApi.ts:459` | `GET /.well-known/cf-custom-hostname-challenge/*` | `string` | — |
| A5 | `POST /api/report` | `AdminApi.ts:508` | message WebSocket `reportPlayerMessage` | ignorée | — |
| A6 | `GET /api/room/sameWorld` | `AdminApi.ts:580` | message global au monde, `roomsFromSameWorldQuery` | `ShortMapDescriptionList` | — |
| A7 | `POST /api/ban` | `AdminApi.ts:670` | message WebSocket `banPlayerMessage` | 2xx ; `{status:"error"}` = refus | `api/ban` (front) |
| A8 | `GET /api/room/tags` | `AdminApi.ts:714` | `roomTagsQuery` | `string[]` | — |
| A9 | `POST /api/save-name` | `AdminApi.ts:767` | `POST /save-name` | 204 | `api/save-name` |
| A10 | `POST /api/save-textures` | `AdminApi.ts:832` | `POST /save-textures` | 204 | `api/save-textures` |
| A11 | `POST /api/save-companion-texture` | `AdminApi.ts:895` | `POST /save-companion-texture` | 204 | `api/save-textures` |
| A12 | `GET /api/chat/members` | `AdminApi.ts:947` | `chatMembersQuery` | `WorldChatMembersData` | — |
| A13 | `GET /api/members` | `AdminApi.ts:983` | `searchMemberQuery` | `MemberData[]` | — |
| A14 | `GET /api/world/tags` | `AdminApi.ts:995` | `searchTagsQuery` | non validée (`string[]`) | — |
| A15 | `GET /api/members/{uuid}` | `AdminApi.ts:1026` | `getMemberQuery` | non validée (`MemberData`) | — |
| A16 | `PUT {ADMIN_URL}/api/members/{id}/chatId` | `AdminApi.ts:1069` | message WebSocket `updateChatIdMessage` | ignorée | — |
| A17 | `POST {ADMIN_URL}/api/oauth/refreshtoken` | `AdminApi.ts:1113` | `oauthRefreshTokenQuery` | `isOauthRefreshToken` | — |
| A18 | `GET {ADMIN_URL}/api/ice-servers` | `AdminApi.ts:1177` | `iceServersQuery` | `IceServer[]` | `api/ice-servers` |
| A19 | `GET /api/woka/list` | `play/src/pusher/services/AdminWokaService.ts:48` | `GET /woka/list` | `wokaList` | `api/woka/list`=`v1` |
| A20 | `GET /api/companion/list` | `play/src/pusher/services/AdminCompanionService.ts:49` | `GET /companion/list` | `CompanionTextureCollection[]` | `api/companion/list`=`v1` |
| A21 | `GET /api/domain/verify` | `play/src/pusher/services/verifyDomain/AdminVerifyDomainService.ts:32` | `GET /login-screen`, `GET /logout` | 2xx = valide | `api/domain/verify`=`v1` |
| A22 | `POST /api/analytics/events-batch` | `libs/shared-utils/src/AnalyticsEventsQueue.ts:273` | file analytics du pusher et du back | 202 ; 422 = lot invalide | `api/analytics/events-batch`=`v1` (pusher uniquement) |
| A23 | `POST /api/recordings/events` | `back/src/Services/AdminApi.ts:43` | fin d'un egress LiveKit | 2xx | `api/recordings/events`=`v1` |
| A24 | `GET /api/livekit/credentials` | `back/src/Services/AdminApi.ts:76` | bascule d'un space vers LiveKit | `LivekitCredentialsResponse` | `api/livekit/credentials`=`v1` |
| A25 | `GET /api/room-api/authorization` | `play/src/room-api/authentication/AdminAuthenticator.ts:33` | chaque appel gRPC de la Room API | `{success}` (union) | — |
| A26 | `GET AUTHENTICATION_VALIDATOR_URL` (SaaS : `/api/map-storage/authorization`) | `map-storage/src/Services/Authentication.ts:58` | REST map-storage authentifié | 2xx = autorisé | — |
| A27 | `POST WEB_HOOK_URL` (SaaS : `/api/map-storage/webhook`) | `map-storage/src/Services/WebHookService.ts:28` | WAM créé, modifié ou supprimé | ignorée | — |
| A28 | `GET WAM_TEMPLATE_URL` (SaaS : `/api/map-storage/wam-template`) | `map-storage/src/Upload/UploadController.ts:605` | upload d'un TMJ sans WAM | `WAMFileFormat` | — |
| A29 | `GET /api/limit/fileSize` | `uploader/src/Controller/FileController.ts:131` | `POST /upload-file` | 2xx ; erreurs 413/423 | — |
| A30 | OpenID Connect (l'admin SaaS est le fournisseur) | `play/src/pusher/services/OpenIDClient.ts:33,98,152,157,184,190` | `/login-screen`, `/openid-callback`, `/me`, `/profile*`, `/logout` | userinfo | — |
| A31 | redirections du navigateur vers l'admin | `play/src/pusher/controllers/FrontController.ts:240`, `AdminApi.ts:593` | `?access_key=`, `/profile-callback` | — | — |

Hors contrat :

- `logoutOauth` (`AdminApi.ts:596-598`, `GET /oauth/logout?token=`) existe mais n'est jamais appelé.
- La télémétrie du back (`back/src/Services/TelemetryService.ts:13-31`) envoie `POST ${TELEMETRY_URL}/api/telemetry`
  avec `{version, play_url, admin_url, security_email}`, une fois au démarrage puis toutes les 24 h. Elle vise
  `TELEMETRY_URL` (défaut `https://stats.workadventu.re`), pas l'admin du tenant, et se coupe si `PLAY_URL` contient
  `localhost`.

### Parcours type d'un joueur SaaS

1. `GET https://<hôte>/@/<org>/<monde>/<salle>` déclenche A2 sans utilisateur. La réponse sert à rediriger ou à
   personnaliser le HTML. La page reçoit aussi `window.capabilities`, issu de A1.
2. Le front appelle `GET /map?playUri&authToken`, qui déclenche A2 avec `userId` et `accessToken`.
3. Si `authenticationMandatory` est vrai et qu'il n'y a pas de jeton : `GET /login-screen` → A21 → redirection OIDC
   vers l'admin (A30) → `/openid-callback` → userinfo → JWT du pusher → retour sur `playUri?token=…`.
4. `GET /me` déclenche A3, plus l'appel userinfo de A30 si l'utilisateur est connecté.
5. Les écrans de Woka et de compagnon appellent A19 et A20, puis A9, A10 et A11 à l'enregistrement.
6. L'ouverture de `WS /ws/room` rappelle A3. Le pusher rejoint ensuite le back, qui appelle A2 pour créer la salle.
7. En jeu : A18 (ICE), A6, A8, A12, A13, A14 et A15 (requêtes), A16 (chat Matrix), A5 et A7 (modération), A17
   (modules externes), A22 (analytics, en continu), A24 (bascule LiveKit), A23 (fin d'un enregistrement).

---

## 2. Fiches par appel

Chaque fiche suit le même plan : 1. appelant · 2. requête · 3. réponse · 4. quand l'appel part et ce qui en dépend,
erreurs, cache, repli sans admin · 5. capacité.

### A1 — `GET /api/capabilities`

1. **Appelants**
   - Pusher : `AdminApi.initialise` (`AdminApi.ts:131-165`), qui fait l'appel à la ligne 186. Lancé par
     `play/src/pusher/app.ts:123`.
   - Back : `SharedAdminApi.initialise` (`libs/shared-utils/src/SharedAdminApi.ts:29-63`), qui fait l'appel à la ligne
     84. Lancé par `back/src/App.ts:61`, qui range le résultat avec `setCapabilities`.
2. **Requête** : `GET ${ADMIN_API_URL}/api/capabilities`, sans en-tête et sans query.
3. **Réponse** : `isCapabilities` (`libs/messages/src/JsonMessages/CapabilitiesData.ts`), un objet de chaînes
   optionnelles.
   - Clés reconnues : `api/companion/list`, `api/woka/list`, `api/domain/verify`, `api/save-name`,
     `api/save-textures`, `api/livekit/credentials`, `api/ice-servers`, `api/analytics/events-batch`, `api/ban`,
     `api/recordings/events`. La valeur qui active une fonction est `"v1"`.
   - L'admin SaaS renvoie toutes ces clés à `"v1"`, plus `api/analytics/video-quality-batch`, que zod retire
     (`saas: admin/app/Http/Controllers/GameApiController.php:78-93`).
4. **Comportement**
   - Démarrage : le pusher (`play/src/server.ts:55`) et le back (`back/src/server.ts`, `await App.init()`) attendent
     cette réponse avant d'écouter.
   - Échec (réseau, toute réponse hors 2xx, **404 compris**, JSON invalide) : nouvelle tentative toutes les
     `ADMIN_API_RETRY_DELAY` ms (défaut 500), sans limite, avec un seul avertissement dans les logs. Pas de
     rafraîchissement une fois la réponse obtenue.
   - Usage côté pusher :
     - choix des services Woka et compagnon (`app.ts:124-125`) ;
     - activation de la file analytics (`app.ts:126`) ;
     - injection telle quelle dans la page, sous la forme `window.capabilities = …`
       (`play/src/pusher/controllers/FrontController.ts:54-61`). Le front s'en sert pour `api/save-name`,
       `api/save-textures`, `api/ban` et `api/analytics/events-batch` ;
     - si l'initialisation lève, le pusher logge l'erreur et garde les services locaux (`app.ts:127-130`).
   - Usage côté back : `getCapability()` lève tant que les capacités ne sont pas initialisées.
   - Sans admin :
     - `initialise()` renvoie `{}`, donc le pusher choisit les services locaux ;
     - `LocalAdmin.getCapabilities()` renvoie `{"api/woka/list":"v1","api/companion/list":"v1"}`, et c'est cet objet
       que la page reçoit ;
     - le back range `{}`.
5. **Capacité** : —

### A2 — `GET /api/map`

1. **Appelants**
   - Pusher : `AdminApi.fetchMapDetails` (`AdminApi.ts:191-331`), appel HTTP à la ligne 268. Il est utilisé par :
     - `play/src/pusher/services/MetaTagsBuilder.ts:86` : rendu HTML et `manifest.json` ;
     - `MetaTagsBuilder.ts:110` : bots, quand l'admin ne fournit pas de metatags ;
     - `play/src/pusher/controllers/MapController.ts:70` : `GET /map` ;
     - `SocketManager.ts:1763` : `mapStorageJwtQuery`.
   - Back : `back/src/Services/AdminApi.ts:86-164`, appel HTTP à la ligne 96. Il passe par
     `GameRoom.getMapDetails` (`back/src/Model/GameRoom.ts:1057-1107`), appelé depuis `GameRoom.create` (`:177`) et
     `incrementVersion` (`:981`).
2. **Requête** : `GET ${ADMIN_API_URL}/api/map`.
   - Query :
     - `playUri` : obligatoire, URL complète de la salle ;
     - `userId` et `accessToken` : seulement depuis `GET /map` quand le front fournit `authToken`. Le pusher les lit
       dans son propre JWT, même expiré. Un JWT invalide fait répondre `401 "The Token is invalid"` à `/map`, sans
       appeler l'admin.
   - En-têtes du pusher : `Authorization`, plus `Accept-Language` (celui du navigateur pour `/map`, `"en"` ailleurs).
   - En-têtes du back : `Authorization` et `Accept: application/json`. Pas d'utilisateur, pas de langue.
3. **Réponse** : le pusher essaie trois schémas dans cet ordre.
   - `isMapDetailsData` (`libs/messages/src/JsonMessages/MapDetailsData.ts:150`).
     - Seul champ requis : `group` (string ou null).
     - Champs optionnels : `mapUrl`, `wamUrl` (URL), `authenticationMandatory`, `contactPage`,
       `opidLogoutRedirectUrl`, `opidWokaNamePolicy`, `expireOn`, `canReport`, `editable`, `loadingLogo`,
       `loginSceneLogo`, `backgroundSceneImage`, `showPoweredBy`, `metadata`, `roomName`, `pricingUrl`,
       `enableMatrixChat`, `enableChat`, `enableChatUpload`, `enableChatOnlineList`, `enableChatDisconnectedList`,
       `enableSay`, `enableIssueReport`, `defaultWokaName`, `defaultWokaTexture`, `legals`, `customizeWokaScene`,
       `backgroundColor`, `primaryColor`, `reportIssuesUrl`, `entityCollectionsUrls`, `errorSceneLogo`, `modules`,
       `isLogged`, `provideDefaultWokaName`, `provideDefaultWokaTexture`, `skipCameraPage`,
       `defaultCameraPrivacySettings`, `defaultMicrophonePrivacySettings`, `bypassPwa`.
     - Champs optionnels structurés :
       - `thirdParty` : `{bbb:{url, secret}, jitsi:{url, iss, secret}}` ;
       - `metatags` : `title`, `description`, `author`, `provider`, `favIcons`, `manifestIcons`, `appName`,
         `shortAppName`, `themeColor`, `cardImage` ;
       - `recording` : `{buttonState: "hidden" | "enabled" | "disabled", disabledReason}`.
   - `isRoomRedirect` : `{redirectUrl}`.
   - `isErrorApiErrorData` : `{status:"error", type:"error", code, title, subtitle, details, image?, imageLogo?}`.
     Les autres types d'erreur (`redirect`, `unauthorized`, `retry`) ne sont pas reconnus pour cet appel.
4. **Comportement**
   - **Affichage de page.** Concerne `GET` et `POST` sur `/_/*`, `/@/*`, `/~/*`, et `GET` sur `/`, `/login`, `/jwt`.
     - Un appel par requête : le résultat est mémorisé par instance de `MetaTagsBuilder`.
     - `playUri` est l'URL complète vue par le pusher, query string comprise (voir §3).
     - Si la réponse est une redirection, le pusher répond 302 vers `redirectUrl`.
     - Si c'est un `MapDetailsData` : `metatags` alimente le `<head>`, et `primaryColor` et `backgroundColor`
       deviennent des variables CSS.
     - Si l'appel échoue, la page est rendue sans personnalisation (`FrontController.ts:221-226,285-287`).
   - **Manifeste PWA.** `/manifest.json?url=` construit le manifeste à partir des metatags.
   - **Bots.** Si le user-agent contient `bot`, `facebook` ou `preview` et que l'admin ne fournit pas de metatags, le
     pusher rappelle A2 (sans mémorisation) pour lire `mapName` et `mapDescription` dans le fichier de carte.
   - **`GET /map`** (front, au chargement).
     - La réponse de l'admin est renvoyée au front en JSON 200 : `MapDetailsData`, `RoomRedirect` ou erreur.
     - Si `DISABLE_ANONYMOUS` est vrai, le pusher force `authenticationMandatory = true`.
     - Le pusher **retire `thirdParty`** (secrets Jitsi et BBB) avant toute réponse (`AdminApi.ts:276-278`).
   - **`mapStorageJwtQuery`** (éditeur de carte). Le pusher lit `wamUrl` (vide si redirection ou erreur), puis signe
     un JWT HS256 `{wamUrl, tags}` valable 1 h avec `SECRET_KEY` (`SocketManager.ts:1760-1772`). Map-storage le
     vérifie sur `/private/files/*`.
   - **Back.** L'appel part à la création d'une `GameRoom` (premier utilisateur de la salle sur ce back) et sur
     `POST /room/refresh` (voir §4). Le back garde :
     - `thirdParty`, avec repli sur `JITSI_URL` / `BBB_URL` (`GameRoom.ts:1373-1400`) ;
     - `group`, qui délimite la portée des variables joueur ;
     - `mapUrl` et `wamUrl`, pour charger la carte ;
     - `editable`.
   - **Erreurs côté pusher.**
     - Réponse non conforme : `{status:"error", type:"error", code:"MAP_VALIDATION", …}`, plus un événement Sentry.
     - Erreur de transport ou réponse hors 2xx : `code:"ROOM_ACCESS_ERROR"`, avec le message axios dans `details`.
     - JWT invalide ou expiré : l'exception est relancée.
   - **Erreurs côté back.** Toute réponse qui n'est pas un `MapDetailsData` (redirection comprise) lève
     `Unexpected room redirect…` : la salle n'est pas créée.
   - **Cache** : aucun, en dehors de la mémorisation par requête.
   - **Sans admin.**
     - Pusher (`LocalAdmin.ts:263-349`) : la réponse est dérivée de l'URL.
       - `/` : redirection vers `START_ROOM_URL` ;
       - `/~/x` : `wamUrl = PUBLIC_MAP_STORAGE_URL/x`, et un `.tmj` est redirigé vers le `.wam` ;
       - `/_/<instance>/<hôte>/<chemin>` : `mapUrl` ;
       - sinon : erreur `UNSUPPORTED_URL_FORMAT`.
     - Back (`GameRoom.ts:1058-1091`) : même dérivation.
5. **Capacité** : —

### A3 — `GET /api/room/access`

1. **Appelants** : `AdminApi.fetchMemberDataByUuid` (`AdminApi.ts:333-456`), appel HTTP à la ligne 399. Il est
   utilisé par :
   - `play/src/pusher/controllers/AuthenticateController.ts:201` : `GET /me` ;
   - `play/src/pusher/controllers/IoSocketController.ts:361` : ouverture de `/ws/room`.
2. **Requête** : `GET ${ADMIN_API_URL}/api/room/access`, avec `Authorization` et `Accept-Language`.
   - `userIdentifier` : identifiant du JWT du pusher, c'est-à-dire l'email ou le `sub` OIDC, ou un UUID pour un
     anonyme. Vaut `""` pour un WebSocket ouvert sans jeton.
   - `playUri` : URL de la salle, soit le `playUri` de `/me`, soit le `roomId` du WebSocket.
   - `ipAddress` : première valeur de `X-Forwarded-For`, ou `""`.
   - `characterTextureIds[]` : textures du localStorage pour `/me`, ou de la query du WebSocket.
   - `companionTextureId` : omis s'il est absent.
   - `accessToken` : jeton OIDC porté par le JWT, omis pour un anonyme.
   - `isLogged` : `"1"` ou `"0"`, déprécié.
   - `chatID` : identifiant Matrix, omis s'il est absent.
   - Le paramètre `tags` de la méthode n'est **pas** transmis : seul `LocalAdmin` s'en sert.
3. **Réponse** : `isFetchMemberDataByUuidResponse`, l'union de `isFetchMemberDataByUuidSuccessResponse`
   (`AdminApi.ts:36-106`) et de `ErrorApiData`. `ErrorApiData` est une union discriminée sur `type` : `error`,
   `retry`, `redirect` ou `unauthorized`.
   - Champs requis du succès : `status:"ok"`, `email` (string ou null), `userUuid`, `tags[]`, `visitCardUrl` (string
     ou null), `isCharacterTexturesValid`, `characterTextures` (`WokaDetail[]` = `{id, url}`),
     `isCompanionTextureValid`, `world`.
   - Champs optionnels : `username`, `companionTexture` (`{id, url}` ou null), `userRoomToken`,
     `activatedInviteUser`, `applications` (`ApplicationDefinitionInterface[]`), `canEdit`, `chatID`, `canRecord`,
     `analyticsEventsEnabled`.
4. **Comportement**
   - **`/me`** (front, au démarrage et après connexion).
     - Erreur (`status:"error"`) : renvoyée telle quelle, en JSON 200.
     - Succès : fusionné dans `MeResponse` avec `authToken`, `username`, `locale`, `matrixUserId` et
       `matrixServerUrl`. Si l'utilisateur est connecté en OIDC, le résultat de userinfo (A30) est fusionné par-dessus
       et écrase les clés communes.
   - **WebSocket** (`IoSocketController.ts:373-470`).
     - `isCharacterTexturesValid=false` : la connexion est rejetée en `invalidTexture` (character).
     - `isCompanionTextureValid=false` : rejet en `invalidTexture` (companion).
     - `status` différent de `ok` : rejet avec un écran d'erreur (`SocketManager.toErrorScreenMessage`, pour les types
       error, retry, unauthorized et redirect).
     - Succès : les champs suivants entrent dans les données de la socket.
       - `userUuid` ;
       - `tags` : droits d'admin et d'éditeur, kick et ban, analytics ;
       - `visitCardUrl`, `characterTextures`, `companionTexture`, `userRoomToken`, `activatedInviteUser`,
         `applications` ;
       - `canEdit` (défaut false) et `canRecord` (défaut false) ;
       - `world` : préfixe des noms de spaces, donc des salles LiveKit, et clé des analytics ;
       - `analyticsEventsEnabled` : **true par défaut** si l'admin omet le champ.
   - **Erreurs.**
     - Réponse non conforme : `code:"ROOM_ACCESS_VALIDATION"`.
     - Erreur de transport ou réponse hors 2xx : `code:"ROOM_ACCESS_ERROR"`.
     - Dans les deux cas, l'utilisateur voit un écran d'erreur ; rien ne plante.
   - L'admin SaaS fait aussi, dans cet appel, le contrôle du bannissement (IP et compte) et de la capacité du monde
     (`saas: tests/tests/tests/test_room.spec.ts`, « World is full »).
   - **Cache** : aucun. L'appel part à chaque `/me` et à chaque connexion ou reconnexion du WebSocket.
   - **Sans admin** (`LocalAdmin.ts:81-261`) :
     - `canEdit` sur les URL `/~/`, selon `ENABLE_MAP_EDITOR`, `MAP_EDITOR_ALLOW_ALL_USERS`,
       `MAP_EDITOR_ALLOWED_USERS` et les tags `admin` ou `editor` du JWT ;
     - textures lues dans la liste locale ;
     - `applications` selon les variables `*_ENABLED` ;
     - `canRecord` si S3 est configuré et que l'utilisateur est connecté ;
     - `world` = origine de l'URL ;
     - `analyticsEventsEnabled = false`.
5. **Capacité** : —

### A4 — `GET /white-label/cf-challenge`

1. **Appelant** : `AdminApi.fetchWellKnownChallenge` (`AdminApi.ts:458-464`), utilisé par `FrontController.ts:173-189`
   sur la route `GET /.well-known/cf-custom-hostname-challenge/{*splat}`, derrière le middleware `notWaHost`.
2. **Requête** : `GET ${ADMIN_API_URL}/white-label/cf-challenge?host=<req.hostname>`, sans en-tête. Le chemin est hors
   `/api`, c'est une route web de l'admin (`saas: admin/routes/admin.php:102`).
3. **Réponse** : `z.string()`, le texte du challenge.
4. **Comportement**
   - Sert à valider un nom d'hôte personnalisé chez Cloudflare (custom hostname d'un monde en white label).
   - Succès : 200 avec le texte brut. Toute erreur : `526 "Fail on challenging hostname"`.
   - `notWaHost` répond 404 pour un hôte qui se termine par `workadventu.re`, sans interrompre la requête (voir §7).
   - Sans admin : le rejet de `LocalAdmin` donne 526.
5. **Capacité** : —

### A5 — `POST /api/report`

1. **Appelant** : `AdminApi.reportPlayer` (`AdminApi.ts:466-520`), appel HTTP à la ligne 508. Utilisé par
   `SocketManager.handleReportMessage` (`SocketManager.ts:756-770`), sur le message WebSocket `reportPlayerMessage`
   (`IoSocketController.ts:625`).
2. **Requête** : corps JSON `{reportedUserUuid, reportedUserComment, reporterUserUuid, reportWorldSlug}`. Malgré son
   nom, `reportWorldSlug` porte l'URL complète de la salle (`socketData.roomId`). En-têtes : `Authorization` et
   `Accept-Language: en` (valeur fixe).
3. **Réponse** : ignorée.
4. **Comportement** : signalement d'un joueur depuis le jeu. Toute erreur est avalée (log et Sentry) et rien ne
   revient au client. Sans admin : `LocalAdmin` rejette, l'erreur est avalée.
5. **Capacité** : — (le front n'a pas de garde).

### A6 — `GET /api/room/sameWorld`

1. **Appelant** : `AdminApi.getUrlRoomsFromSameWorld` (`AdminApi.ts:522-587`), appel HTTP à la ligne 580. Il est
   utilisé par :
   - `SocketManager.emitPlayGlobalMessage` (`SocketManager.ts:1190`) ;
   - `SocketManager.handleRoomsFromSameWorldQuery` (`SocketManager.ts:1349`).
2. **Requête** : `GET ${ADMIN_API_URL}/api/room/sameWorld?roomUrl=…&bypassTagFilter=true|false[&tags=…]`, construite
   avec `URLSearchParams`. `tags` contient les tags joints par des virgules ; le paramètre est présent même vide
   quand le tableau est vide. En-têtes : `Authorization` et `Accept-Language` (`"en"` dans les deux usages).
   - Message global : `roomUrl` = salle de l'émetteur, `tags=` vide, `bypassTagFilter=true`.
   - `roomsFromSameWorldQuery` : `tags` = tags de l'utilisateur, `bypassTagFilter=false`.
3. **Réponse** : `ShortMapDescriptionList` (`play/src/pusher/services/ShortMapDescription.ts`), un tableau de
   `{name, roomUrl, wamUrl?}` fusionné avec `WAMMetadata` (name, description, copyright, thumbnail,
   areasSearchable, entitiesSearchable…, tous nullable).
4. **Comportement**
   - **Message global au monde entier** (`playGlobalMessage.broadcastToWorld`). Réservé au tag `admin`, sinon le
     pusher lève une exception. Le pusher envoie un `AdminRoomMessage` à chaque `roomUrl` de la liste, via le back qui
     sert cette salle. Une erreur donne un `errorMessage` générique sur le WebSocket.
   - **`roomsFromSameWorldQuery`**. Alimente la liste des cartes (`MapList.svelte`) et l'éditeur de sorties. Une
     erreur donne une réponse `error`, avec le message et la pile d'appels.
   - **Sans admin.** Pour une URL `/~/`, la liste vient de `${INTERNAL_MAP_STORAGE_URL}/maps`. Sinon, `LocalAdmin`
     rejette.
5. **Capacité** : —

### A7 — `POST /api/ban`

1. **Appelant** : `AdminApi.banUserByUuid` (`AdminApi.ts:600-682`), appel HTTP à la ligne 670. Utilisé par
   `SocketManager.handleBanPlayerMessage` (`SocketManager.ts:772-821`), sur le message WebSocket `banPlayerMessage`
   (`IoSocketController.ts:1083`).
2. **Requête** : corps JSON `{uuidToBan, playUri, name, message, byUserUuid, ipAddress?}` ; seul en-tête :
   `Authorization`.
   - `playUri` : salle du modérateur.
   - `message` : la raison saisie, ou à défaut `User banned by admin <uuid>`.
   - `ipAddress` : envoyée seulement si le modérateur a coché le bannissement par IP, que l'utilisateur est trouvé dans
     le monde (`getWorldUsers`, via les backs) et que son IP diffère de celle du modérateur.
3. **Réponse**
   - 2xx avec un corps quelconque : ban enregistré.
   - 2xx avec `{status:"error", …}` : ban refusé. Seul `status` est testé.
4. **Comportement**
   - Réservé au tag `admin`, sinon le message est ignoré.
   - `kick: true` : aucun appel à l'admin.
   - Succès : `emitBan(…, "banned")`.
   - Échec (refus, transport ou pas d'admin) : l'utilisateur est éjecté quand même, comme un kick
     (`emitBan(…, "kicked")`).
   - L'admin doit ensuite refuser cet utilisateur dans A3.
5. **Capacité** : `api/ban`. Elle ne conditionne pas l'appel côté serveur, mais le front n'affiche le bouton
   « bannir » que si elle est présente (`play/src/front/Components/Moderation/ModerationModal.svelte:239`).

### A8 — `GET /api/room/tags`

1. **Appelant** : `AdminApi.getTagsList` (`AdminApi.ts:688-721`), appel HTTP à la ligne 714. Utilisé par
   `SocketManager.handleRoomTagsQuery` (`SocketManager.ts:1321-1344`), sur la requête `roomTagsQuery`
   (`InputRoomTags.svelte`, dans l'éditeur).
2. **Requête** : `GET ${ADMIN_API_URL}/api/room/tags?roomUrl=<encodeURIComponent(roomId)>`, avec `Authorization`.
3. **Réponse** : `string[]`. Un corps vide ou falsy donne `[]`.
4. **Comportement** : autocomplétion des tags dans l'éditeur de carte. Toute erreur donne `[]` en silence, avec un
   avertissement dans les logs. Sans admin : `LocalAdmin` rejette, d'où `[]`.
5. **Capacité** : —

### A9 — `POST /api/save-name`

1. **Appelant** : `AdminApi.saveName` (`AdminApi.ts:723-784`), appel HTTP à la ligne 767. Utilisé par
   `play/src/pusher/controllers/UserController.ts:61-88`, route `POST /save-name`. Le middleware `authenticated`
   exige le JWT du pusher dans `Authorization`.
2. **Requête** : corps JSON `{playUri, userIdentifier, name}`, avec `Authorization`. L'annotation OpenAPI parle de
   `roomUrl`, mais le code envoie `playUri`.
3. **Réponse** : exactement **204**. Tout autre 2xx lève une exception.
4. **Comportement**
   - Appelé seulement pour un utilisateur connecté, c'est-à-dire avec un JWT qui porte un `accessToken`.
   - Anonyme : le pusher répond 204 sans appeler l'admin.
   - Exception : HTTP 500, via le gestionnaire d'erreurs global.
   - Capacité absente : rien n'est envoyé, le pusher répond 204.
5. **Capacité** : `api/save-name`. Côté serveur, il suffit qu'elle soit définie (`!== undefined`) ; côté front, elle
   est testée avec `hasCapability`.

### A10 — `POST /api/save-textures`

1. **Appelant** : `AdminApi.saveTextures` (`AdminApi.ts:786-849`), appel HTTP à la ligne 832. Utilisé par
   `UserController.ts:134-161`, route `POST /save-textures`.
2. **Requête** : corps JSON `{playUri, userIdentifier, textures: string[]}`, avec `Authorization`.
3. **Réponse** : 204 exactement.
4. **Comportement** : identique à A9 (utilisateur connecté seulement, no-op sans capacité).
5. **Capacité** : `api/save-textures`.

### A11 — `POST /api/save-companion-texture`

1. **Appelant** : `AdminApi.saveCompanionTexture` (`AdminApi.ts:851-912`), appel HTTP à la ligne 895. Utilisé par
   `UserController.ts:205-236`, route `POST /save-companion-texture`.
2. **Requête** : corps JSON `{playUri, userIdentifier, texture}`, où `texture` vaut une chaîne ou null. En-tête :
   `Authorization`.
3. **Réponse** : 204 exactement.
4. **Comportement** : identique à A9.
5. **Capacité** : **`api/save-textures`**. Il n'existe pas de capacité dédiée au compagnon.

### A12 — `GET /api/chat/members`

1. **Appelant** : `AdminApi.getWorldChatMembers` (`AdminApi.ts:914-956`), appel HTTP à la ligne 947. Utilisé par
   `SocketManager.handleChatMembersQuery` (`SocketManager.ts:1540-1550`), sur `chatMembersQuery`
   (`play/src/front/Chat/UserProvider/AdminUserProvider.ts`).
2. **Requête** : `?playUri=<roomId>&searchText=<texte>`, avec `Authorization`. L'annotation OpenAPI parle de
   `roomUrl`.
3. **Réponse** : `WorldChatMembersData` (`play/src/pusher/services/WorldChatMembersData.ts`) =
   `{total ≥ 0, members: [{uuid, wokaName?, email (null devient undefined), chatId?, tags[]}]}`.
4. **Comportement** : liste des membres du monde dans le chat, y compris hors ligne. Une erreur donne une réponse
   `error` à la requête. Sans admin : `{members: [], total: 0}`.
5. **Capacité** : —

### A13 — `GET /api/members`

1. **Appelant** : `AdminApi.searchMembers` (`AdminApi.ts:982-988`). Utilisé par `SocketManager.handleSearchMemberQuery`
   (`SocketManager.ts:1487-1500`), sur `searchMemberQuery` (`MemberAutocomplete.svelte` dans l'éditeur : propriétaires
   de zones, droits).
2. **Requête** : `?playUri=<roomId>&searchText=…`, avec `Authorization`.
3. **Réponse** : `MemberData[]`, chacun `{id, name (ou null), email (ou null), visitCardUrl?, chatID?}`. Seuls `id`,
   `name` et `email` remontent au client.
4. **Comportement** : une erreur donne une réponse `error`. Sans admin : `LocalAdmin` rejette, d'où `error`.
5. **Capacité** : —

### A14 — `GET /api/world/tags`

1. **Appelant** : `AdminApi.searchTags` (`AdminApi.ts:994-1003`). Utilisé par `SocketManager.handleSearchTagsQuery`
   (`SocketManager.ts:1502-1508`), sur `searchTagsQuery`.
2. **Requête** : `?playUri=<roomId>&searchText=…`, avec `Authorization`. L'annotation OpenAPI indique `/api/tags`, mais
   le chemin réel est `/api/world/tags`.
3. **Réponse** : **non validée**. Le corps est transmis tel quel, comme un `string[]`.
4. **Comportement** : recherche de tags dans l'éditeur (droits de zones, enregistrement, mégaphone). Une erreur donne
   une réponse `error`. Sans admin : `[]`.
5. **Capacité** : —

### A15 — `GET /api/members/{memberUUID}`

1. **Appelant** : `AdminApi.getMember` (`AdminApi.ts:1025-1030`). Utilisé par `SocketManager.handleGetMemberQuery`
   (`SocketManager.ts:1519-1538`), sur `getMemberQuery` : carte de visite du propriétaire absent d'un bureau
   personnel. Le front n'envoie cette requête que si `ADMIN_URL` est défini
   (`play/src/front/Phaser/Game/MapEditor/AreasPropertiesListener.ts:1197`).
2. **Requête** : `GET ${ADMIN_API_URL}/api/members/<uuid>`, avec `Authorization`. L'uuid n'est pas encodé dans le
   chemin.
3. **Réponse** : **non validée**, lue comme `MemberData` (`id`, `name`, `email`, `visitCardUrl`, `chatID`).
4. **Comportement** : une erreur donne la réponse `error` « User not found, probably left ». Sans admin : `LocalAdmin`
   rejette, avec la même réponse.
5. **Capacité** : —

### A16 — `PUT /api/members/{userIdentifier}/chatId`

1. **Appelant** : `AdminApi.updateChatId` (`AdminApi.ts:1068-1080`). Utilisé par `SocketManager.handleUpdateChatId`
   (`SocketManager.ts:1552-1556`), sur le message WebSocket `updateChatIdMessage` (`IoSocketController.ts:688`).
2. **Requête** : `PUT ${ADMIN_URL}/api/members/<email>/chatId`, avec le corps `{chatId, userIdentifier, roomUrl}` et
   `Authorization`.
   - L'URL de base est **`ADMIN_URL`**, pas `ADMIN_API_URL`.
   - `email` vient du message du client, pas de l'identité de la socket, et n'est pas encodé dans le chemin.
3. **Réponse** : ignorée.
4. **Comportement** : envoyé après que le front a obtenu son identifiant Matrix. Le pusher met aussi à jour le
   `chatID` de la socket. Une erreur donne un `errorMessage` générique sur le WebSocket. Sans admin : no-op.
5. **Capacité** : —

### A17 — `POST /api/oauth/refreshtoken`

1. **Appelant** : `AdminApi.refreshOauthToken` (`AdminApi.ts:1112-1129`). Utilisé par
   `SocketManager.handleOauthRefreshTokenQuery` (`SocketManager.ts:1642-1651`), sur `oauthRefreshTokenQuery`
   (`play/src/front/ExternalModule/ExtensionModule.ts`).
2. **Requête** : `POST ${ADMIN_URL}/api/oauth/refreshtoken`, avec le corps
   `{accessToken: <jeton à rafraîchir>, provider?, userIdentifier?}` et `Authorization`.
   - L'URL de base est **`ADMIN_URL`**.
   - L'annotation OpenAPI décrit à la place un `GET /oauth/refreshtoken/{token}`.
3. **Réponse** : `isOauthRefreshToken` = `{message, token}`. Un échec de validation lève une exception.
4. **Comportement** : rafraîchit le jeton d'un fournisseur tiers (Microsoft Teams, Google…) pour un module externe.
   Toute erreur donne la réponse `error` « The token refresh failed. Please try to login again… »
   (`IoSocketController.ts:895-915`). Sans admin : `LocalAdmin` rejette, avec la même réponse.
5. **Capacité** : —

### A18 — `GET /api/ice-servers`

1. **Appelant** : `AdminApi.getIceServers` (`AdminApi.ts:1171-1186`). Utilisé par `SocketManager.handleIceServersQuery`
   (`SocketManager.ts:1510-1517`), sur `iceServersQuery` (`play/src/front/WebRtc/IceServersManager.ts`).
2. **Requête** : `GET ${ADMIN_URL}/api/ice-servers?roomUrl=<roomId>&userIdentifier=<userUuid>`, avec `Authorization`.
   L'URL de base est **`ADMIN_URL`**.
3. **Réponse** : `IceServer[]` (`play/src/pusher/services/IceServer.ts`), chacun
   `{urls: string[], username?, credential?, credentialType?: "password" | "oauth"}`.
4. **Comportement**
   - Fournit la configuration WebRTC (STUN et TURN).
   - Il faut un `userId`, l'identifiant numérique attribué par le back ; sans lui, la requête échoue.
   - Une erreur donne une réponse `error`.
   - Capacité absente ou pas d'admin : génération locale (`iceServersService.generateIceServers`, à partir des
     variables STUN et TURN).
5. **Capacité** : `api/ice-servers`.

### A19 — `GET /api/woka/list`

1. **Appelant** : `AdminWokaService.getWokaList` (`play/src/pusher/services/AdminWokaService.ts:13-62`), appel HTTP à
   la ligne 48. Il sert la route `GET /woka/list?roomUrl=` du pusher
   (`play/src/pusher/controllers/AuthenticatedProviderController.ts:31-78`), qui exige le JWT du pusher dans
   `Authorization`.
2. **Requête** : `?roomUrl=<roomUrl décodé>&uuid=<identifiant du JWT>`, avec `Authorization`.
3. **Réponse** : `wokaList` = `Record<partie, {collections: [{name, textures: [{id, name, url, tags?, tintable?}]}], required?}>`.
   Les parties sont `woka`, `body`, `eyes`, `hair`, `clothes`, `hat` et `accessory`.
4. **Comportement** : alimente l'écran de choix du Woka. Une erreur donne `undefined` (avec Sentry), et la route du
   pusher répond `500 "Error on getting data"`. Pas de cache.
5. **Capacité** : `api/woka/list` = `"v1"`. Sans elle, le pusher sert la liste locale.

### A20 — `GET /api/companion/list`

1. **Appelant** : `AdminCompanionService.getCompanionList` (`play/src/pusher/services/AdminCompanionService.ts:12-70`),
   appel HTTP à la ligne 49. Il sert la route `GET /companion/list?roomUrl=` du pusher, avec la même authentification
   que A19.
2. **Requête** : `?roomUrl=…&uuid=…`, avec `Authorization`.
3. **Réponse** : `CompanionTextureCollection[]` = `[{name, textures: [{id, name, url, behavior?: "cat" | "dog" | "red_panda"}]}]`.
4. **Comportement** : comme A19, une erreur donne une réponse 500.
5. **Capacité** : `api/companion/list` = `"v1"`. Sans elle, le pusher sert la liste locale.

### A21 — `GET /api/domain/verify`

1. **Appelant** : `AdminVerifyDomainService.verifyDomain`
   (`play/src/pusher/services/verifyDomain/AdminVerifyDomainService.ts:7-48`), appel HTTP à la ligne 32. Il est
   utilisé par :
   - `AuthenticateController.ts:119-125` : `GET /login-screen` ;
   - `AuthenticateController.ts:557-563` : `GET /logout`.
2. **Requête** : `?uri=<playUri>`, avec `Authorization`.
3. **Réponse** : le corps est ignoré. Tout 2xx (204 selon la documentation) signifie que le domaine est valide ; toute
   erreur (403 attendu) qu'il ne l'est pas.
4. **Comportement**
   - Empêche une redirection OAuth ou de déconnexion vers un domaine inconnu.
   - Domaine invalide : `403 "Unauthorized domain in playUri"`.
   - Capacité absente ou pas d'admin : `LocalVerifyDomainService` vérifie que le nom d'hôte de `playUri` est celui de
     `PUSHER_URL`.
5. **Capacité** : `api/domain/verify` = `"v1"`. Le singleton est choisi au premier appel.

### A22 — `POST /api/analytics/events-batch`

1. **Appelants**
   - Transport partagé : `libs/shared-utils/src/AnalyticsEventsQueue.ts`, méthode `postBatch` (lignes 263-280),
     appel HTTP à la ligne 273.
   - Instance du pusher : `play/src/pusher/services/AnalyticsEventsQueue.ts:349-405`, activée par
     `play/src/pusher/app.ts:126`.
   - Instance du back : `back/src/Services/AnalyticsEventsQueue.ts:19-32`, toujours activée.
2. **Requête** : `POST ${ADMIN_API_URL sans / final}/api/analytics/events-batch`.
   - En-têtes : `Authorization: Bearer <ADMIN_API_TOKEN>` et `Content-Type: application/json`.
   - Timeout : `ANALYTICS_TIMEOUT_MS` (défaut 2000) pour le pusher, 2000 pour le back, raccourci au temps restant
     pendant un drain.
   - Corps `AnalyticsEventsBatchPayload` (`libs/messages/src/JsonMessages/AnalyticsEventsBatch.ts`) :
     `{schemaVersion: 1, sentAt, pusherInstanceId, events}`.
     - `pusherInstanceId` vaut `HOSTNAME`, `SERVER_NAME` ou `"pusher"` ; pour le back, `"back:<hôte>"`.
     - Chaque événement porte : `eventName` (catalogue), `source`, `clientEventTime`, `pusherReceivedAt`, `eventId`
       (clé d'idempotence), `userUuid`, `userId` (ou null), `spaceUserId`, `clientIp` (ou null), `world`, `roomId`,
       `tabId` (ou null), `tags?` et `properties`.
3. **Réponse** : 202 attendu, corps ignoré. Un 401, un 413 ou tout autre 4xx est un rejet définitif ; un 422 signale
   un lot invalide.
4. **Comportement**
   - Envoi toutes les `ANALYTICS_FLUSH_INTERVAL_MS` (défaut 10000), et lors du drain d'arrêt (SIGTERM ou plantage).
   - Lots d'au plus `ANALYTICS_MAX_BATCH_SIZE` événements (défaut 1000). La file est bornée à
     `ANALYTICS_MAX_QUEUE_SIZE` (défaut 10000) : au-delà, les plus anciens sont jetés.
   - Jusqu'à 4 tentatives sur erreur réseau, 5xx, 408 ou 429. Le délai est exponentiel à partir de 250 ms, plafonné à
     5 s, plus une gigue de 50 à 250 ms.
   - Sur un autre 4xx (hors 408, 429 et 422), pas de nouvelle tentative : le lot est perdu.
   - Sur un 422 pour un lot de plusieurs événements, la file les renvoie un par un ; seuls les invalides sont jetés.
   - Rien ne part si `ADMIN_API_URL` ou `ADMIN_API_TOKEN` manque.
   - Côté pusher, chaque événement est filtré selon le catalogue et l'`analyticsEventsEnabled` de A3.
5. **Capacité** : `api/analytics/events-batch` = `"v1"` pour le pusher (et pour le front). Le back n'en demande
   aucune : il envoie dès qu'il est configuré.

### A23 — `POST /api/recordings/events` (back)

1. **Appelant** : `back/src/Services/AdminApi.ts:35-65`, appel HTTP à la ligne 43. Utilisé par
   `CommunicationManager.notifyRecordingEnded` (`back/src/Model/CommunicationManager.ts:521-544`), à la fin d'un
   egress LiveKit. Le back apprend cette fin par le webhook LiveKit que reçoit le pusher.
2. **Requête** : `POST new URL("api/recordings/events", ADMIN_API_URL)`, avec `Authorization` et
   `Accept: application/json` ; timeout 5000 ms.
   - Corps `RecordingEventPayload` : `{phase:"ended", status, egressId, recordingSessionId, playUri,
     recorder: {uuid, spaceUserId}, startedAt, endedAt, error, files}`.
   - `status` est le statut de l'egress ; `EGRESS_COMPLETE` signifie que l'enregistrement est utilisable.
   - `startedAt` et `endedAt` sont en ISO 8601, ou null ; `error` est un message ou null.
   - `files` : `[{filename, sizeBytes, durationSeconds}]`, la durée arrondie à la seconde.
3. **Réponse** : 2xx, corps ignoré.
4. **Comportement**
   - Fire-and-forget : l'enregistrement n'attend jamais cet appel.
   - 3 nouvelles tentatives (250 ms, 1 s, 4 s) sur erreur réseau, 5xx, 408 ou 429. Un autre 4xx arrête tout.
   - Échec final : log et Sentry, la notification est perdue.
   - L'admin SaaS transforme cette notification en webhook client `recording.completed`.
5. **Capacité** : `api/recordings/events` = `"v1"`. Sans elle, rien n'est envoyé.

### A24 — `GET /api/livekit/credentials` (back)

1. **Appelant** : `back/src/Services/AdminApi.ts:67-85`, appel HTTP à la ligne 76. Utilisé par
   `StateFactory.createLivekitState` (`back/src/Model/States/StateFactory.ts:54-58`). La disponibilité de LiveKit est
   calculée dans `back/src/Model/Services/LivekitAvailabilityService.ts:17-22`.
2. **Requête** : `?playUri=<playUri du contexte de transition>`, avec `Authorization` et `Accept`. Le `spaceId` passé
   à la méthode n'est pas envoyé.
3. **Réponse** : `LivekitCredentialsResponse` (`back/src/Services/Repository/LivekitCredentialsResponse.ts`) =
   `{livekitHost, livekitApiKey, livekitApiSecret}`.
4. **Comportement**
   - Appelé à chaque création d'un état LiveKit pour un space (bascule WebRTC vers LiveKit), sans cache.
   - En cas d'erreur, la transition échoue (log et Sentry) et le space garde son état
     (`back/src/Model/Services/TransitionOrchestrator.ts:46-72`).
   - Capacité absente : le back utilise `LIVEKIT_HOST`, `LIVEKIT_API_KEY` et `LIVEKIT_API_SECRET`. Sans ces
     variables, LiveKit est indisponible.
5. **Capacité** : `api/livekit/credentials` = `"v1"`. Sa présence rend aussi LiveKit « disponible » sans aucune
   variable locale.

### A25 — `GET /api/room-api/authorization` (Room API)

1. **Appelant** : `play/src/room-api/authentication/AdminAuthenticator.ts:29-95`, appel HTTP à la ligne 33. Le garde
   `play/src/room-api/guards/AuthenticationGuard.ts:9-19` l'exécute sur chaque appel gRPC.
2. **Requête** : `GET ${ADMIN_API_URL}/api/room-api/authorization?roomUrl=<encodeURI(room)>`, avec l'en-tête
   `X-API-Key: <clé du client gRPC>`. **Aucun** `Authorization` admin.
3. **Réponse** : `{success: true}` ou `{success: false, error, message}`, où `error` vaut `UNAUTHENTICATED`,
   `NOT_FOUND`, `PERMISSION_DENIED`, `INTERNAL` ou `UNKNOWN`.
4. **Comportement**
   - Correspondance avec les statuts gRPC :

     | Réponse de l'admin | Statut gRPC |
     |---|---|
     | `success: false` + code | le code correspondant |
     | réponse non conforme | `INTERNAL` |
     | HTTP 400 | `UNKNOWN` |
     | HTTP 401 | `UNAUTHENTICATED` |
     | HTTP 403 | `PERMISSION_DENIED` |
     | HTTP 404 | `NOT_FOUND` |
     | HTTP ≥ 500 | `INTERNAL` |
     | autre statut | `UNAUTHENTICATED` (message = corps de la réponse) |
     | pas de réponse | `INTERNAL` |

   - Sans métadonnée `X-API-Key` : `UNAUTHENTICATED`, sans appeler l'admin.
   - **Cache.**
     - Bibliothèque `axios-cache-interceptor` 1.12, active seulement quand `NODE_ENV=production`.
     - Clé : `room-api-authorization-<room>-<apiKey>`.
     - Seules les réponses GET 2xx sont mises en cache.
     - Durée : celle de l'en-tête `Cache-Control` de la réponse, sinon 5 min. L'admin SaaS envoie
       `public, max-age=3600`, soit 1 h (`saas: admin/routes/api.php:84-87`).
   - **Sans admin** : `ROOM_API_SECRET_KEY`, et l'URL de la salle doit commencer par `FRONT_URL`.
5. **Capacité** : —

### A26 — `GET AUTHENTICATION_VALIDATOR_URL` (map-storage)

1. **Appelant** : stratégie passport « bearer » de `map-storage/src/Services/Authentication.ts:41-82`, appel HTTP aux
   lignes 58-68. Elle protège les routes REST de `map-storage/src/Upload/UploadController.ts` : `GET /`,
   `POST /upload`, `PUT` et `PATCH` sur `*.wam`, `GET /download`, `DELETE`, `POST /move` et `POST /copy`.
2. **Requête** : `GET <AUTHENTICATION_VALIDATOR_URL>?domain=<getRequestDomain(req)>`, avec l'en-tête
   `X-API-Key: <bearer reçu>`. En SaaS, l'URL est `http://<prefix>admin/api/map-storage/authorization`.
3. **Réponse** : le corps est ignoré. 2xx signifie autorisé, avec le scope `all` ; une erreur signifie refusé (401).
4. **Comportement** : l'admin n'est interrogé que si le bearer diffère du jeton statique `AUTHENTICATION_TOKEN`. Le
   cache suit les mêmes règles que A25 : production seulement, clé `domain-authorization-<domain>-<token>`, et 1 h
   avec l'en-tête `Cache-Control` de l'admin SaaS.
5. **Capacité** : —

### A27 — `POST WEB_HOOK_URL` (map-storage)

1. **Appelant** : `map-storage/src/Services/WebHookService.ts:17-56`, appel HTTP à la ligne 28. Déclenché par
   `map-storage/src/Services/MapListService.ts` dans trois cas :
   - lignes 77-79 : régénération du cache de cartes d'un domaine ;
   - lignes 162-164 : WAM mis à jour ;
   - lignes 176-178 : WAM supprimé.
2. **Requête** : corps JSON `{domain, mapPath?, action: "update" | "delete"}`, avec `Content-Type` et, si la variable
   est définie, `Authorization: <WEB_HOOK_API_TOKEN>` ; timeout 10 s. En SaaS, l'URL est
   `…/api/map-storage/webhook`, derrière `auth:node-api`.
3. **Réponse** : ignorée.
4. **Comportement**
   - Fire-and-forget, sans nouvelle tentative ; une erreur est loguée et envoyée à Sentry.
   - Désactivé si `ENABLE_WEB_HOOK=false` (défaut `true`) ou si `WEB_HOOK_URL` est vide.
   - `domain` est le domaine map-storage du monde (§3), dont l'admin déduit le monde.
   - Côté admin, ce webhook remplace l'ancien `POST /room/refresh`, marqué `@deprecated` dans
     `saas: admin/app/Services/PusherApiClient.php`.
5. **Capacité** : —

### A28 — `GET WAM_TEMPLATE_URL` (map-storage)

1. **Appelant** : `map-storage/src/Upload/UploadController.ts:604-606`, dans `getFreshWAMFileContent`, quand un TMJ est
   uploadé sans WAM.
2. **Requête** : `GET` simple, sans en-tête. En SaaS, l'URL est `…/api/map-storage/wam-template`.
3. **Réponse** : `WAMFileFormat`, migré puis validé. `mapUrl` et `metadata` (`name`, `description`, `thumbnail`,
   `copyright`) sont ensuite remplacés.
4. **Comportement** : une erreur fait échouer l'upload. Sans `WAM_TEMPLATE_URL`, map-storage crée un WAM vide qui
   référence les `ENTITY_COLLECTION_URLS`.
5. **Capacité** : —

### A29 — `GET /api/limit/fileSize` (uploader)

1. **Appelant** : `uploader/src/Controller/FileController.ts:110-211`, appel HTTP à la ligne 131, sur la route
   `POST /upload-file`.
2. **Requête** : `GET ${ADMIN_API_URL}/api/limit/fileSize?fileSize=<octets>`, avec l'en-tête
   `userRoomToken: <champ userRoomToken du formulaire>`. Ce jeton vient de A3. Pas d'`Authorization`. Un appel par
   fichier.
3. **Réponse** : 2xx signifie que l'envoi est autorisé. En cas d'erreur, le corps attendu est
   `{message, maxFileSize}`.
4. **Comportement**
   - Sans `userRoomToken` : `401 {message:"not-logged"}`, sans appeler l'admin.
   - Réponse 413 de l'admin : 413. Réponse 423 : 423. Autre statut : 401. Dans les trois cas, le corps relaie
     `{message, maxFileSize}` de l'admin.
   - Erreur sans statut HTTP : l'exception remonte (500).
   - Sans admin : `ENABLE_CHAT_UPLOAD` et `UPLOAD_MAX_FILESIZE` s'appliquent localement.
5. **Capacité** : —

### A30 — OpenID Connect (l'admin SaaS est le fournisseur)

En SaaS, `OPENID_CLIENT_ISSUER` pointe vers l'URL « member » de l'admin
(`saas: docker-compose-platform-override.yaml:19`). Ce sont donc des appels à l'admin, faits avec le protocole OIDC.

1. **Appelants** : `play/src/pusher/services/OpenIDClient.ts`.
   - Découverte : lignes 31-64.
   - URL d'autorisation : lignes 66-115.
   - Callback et userinfo : lignes 117-177.
   - Révocation : lignes 179-186.
   - Userinfo seul : lignes 188-192.

   Routes qui s'en servent :

   | Route | Fichier:ligne |
   |---|---|
   | `/login-screen` | `AuthenticateController.ts:127` |
   | `/openid-callback` | `AuthenticateController.ts:304` |
   | `/me` | `AuthenticateController.ts:234` |
   | `/profile-callback` | `AuthenticateController.ts:488` |
   | `/logout` | `AuthenticateController.ts:572` |
   | `/profile` | `play/src/pusher/controllers/OpenIdProfileController.ts:29` |

2. **Requêtes**
   - **Découverte.** `Issuer.discover(OPID_CLIENT_ISSUER)`, avec repli sur `/.well-known/openid-configuration`. Le
     résultat est gardé en mémoire dans le process ; un échec est retenté au prochain appel.
   - **Autorisation**, côté navigateur.
     - Paramètres standards : `scope=OPID_SCOPE` (doit contenir `openid` et `email`), `prompt=OPID_PROMPT`, `state`,
       PKCE en S256.
     - Paramètres supplémentaires que l'admin lit : **`playUri`, `manuallyTriggered`, `chatRoomId`, `providerId`,
       `providerScopes`**.
     - Cookies posés : `code_verifier` (chiffré en AES-256-CBC avec une clé dérivée de `SECRET_KEY`), `oidc_state` et
       `playUri`.
   - **Callback.** Le code est échangé avec `redirect_uri = PUSHER_URL/openid-callback`, puis userinfo est appelé avec
     la query `playUri`.
   - **Userinfo simple** (bearer) pour `/me`, `/profile` et `/profile-callback`.
   - **Révocation** sur `/logout`, seulement si l'admin publie un `revocation_endpoint`.
   - Timeout : 50 s.
3. **Réponse** : claims lus dans userinfo.
   - `email`, et à défaut `sub`, comme identifiant ;
   - `OPID_USERNAME_CLAIM` (défaut `username`), `OPID_LOCALE_CLAIM` (`locale`), `OPID_TAGS_CLAIM` (`tags`) ;
   - `matrix_url` et `matrix_identity_provider`.

   `/profile` lit `email`, `name`, `profile` et `tags`. `/me` fusionne l'objet userinfo entier dans sa réponse.
4. **Comportement**
   - `/openid-callback` crée le JWT du pusher : 30 jours, HS256 signé avec `SECRET_KEY`,
     `{identifier, accessToken, username, locale, tags, matrixUserId}`. Il redirige ensuite vers `playUri?token=…`,
     ou passe d'abord par le SSO Matrix si `matrix_url` ou `MATRIX_PUBLIC_URI` est défini.
   - Échec de userinfo au callback : `500 "An error occurred while connecting to OpenID Provider"`.
   - Échec de userinfo sur `/me` : `401 "Invalid token"`, et le front relance la connexion.
5. **Capacité** : — (OIDC est activé par `OPENID_CLIENT_ID`).

### A31 — Redirections du navigateur vers l'admin (aucun appel serveur)

- **Connexion automatique.** Une page demandée avec `?access_key=…` reçoit un HTML qui redirige vers
  `AUTOLOGIN_URL?token=<access_key>&playUri=<URL sans access_key>` (`FrontController.ts:233-246`,
  `play/redirectToAdmin.html`). `AUTOLOGIN_URL` vaut par défaut `ADMIN_URL + "/workadventure/login"` ; en SaaS,
  `<member>/workadventure/login`.
- **Profil.** `GET /profile-callback?token&playUri` vérifie le jeton (userinfo), puis répond 302 vers
  `OPID_PROFILE_SCREEN_PROVIDER?accessToken=…&playUri=…`, sans encoder les valeurs (`AuthenticateController.ts:470-496`,
  `AdminApi.ts:589-594`). Défaut : `ADMIN_URL/profile` ; en SaaS, `<member>/profile`. Sans admin, la redirection vise
  `/profile?…`, servie par `OpenIdProfileController`.
- **Liens du front.** `window.env.ADMIN_URL` sert à construire `/second-step-register` et `/pricing`.

---

## 3. Résolution du tenant, white label et contrôles de domaine

### 3.1 Ce que les services envoient : `playUri`

Les services TypeScript ne résolvent jamais le tenant. Ils envoient l'URL complète vue par le navigateur, et c'est
l'admin qui en déduit le monde.

- **Page HTML.** L'URL est construite par `FrontController.getFullUrl` (`FrontController.ts:69-75`) :
  `X-Forwarded-Proto`, ou à défaut `req.protocol`, puis `://`, l'en-tête `Host` et `originalUrl`, **query string
  comprise**. L'ingress doit donc conserver `Host` et `X-Forwarded-Proto`.
- **Front.** Il envoie l'URL de la fenêtre comme `playUri` à `/map` et `/me`, et comme `roomId` au WebSocket. Le
  pusher la relaie telle quelle à A2 et A3, puis s'en sert comme `roomUrl` ou `playUri` pour A5 à A18.
- **Monde.** Le `world` renvoyé par A3 préfixe les noms de spaces (`${world}.${spaceName}`, `IoSocketController.ts:631`
  et suivantes), et donc les salles LiveKit. Il sert aussi de clé aux analytics et à la recherche des utilisateurs à
  bannir par IP.
- **Socket d'administration.** Pour un message `banned`, le pusher extrait le slug du monde de chaque roomId autorisé
  avec `roomId.split("/")[5]`. Pour `https://hôte/@/org/monde/salle`, cela donne `monde`
  (`IoSocketController.ts:216-218`).

### 3.2 Ce que fait l'admin SaaS (référence)

`RoomRouter::route` (`saas: admin/app/Services/RoomRouter.php:29-54`) compare `scheme://host` de l'URL :

| Cas | Routage |
|---|---|
| égal au `FRONT_URL` de l'admin | domaine principal : `/@/{org}/{monde}/{salle}`, `/_/…` (tests, éventuellement redirigés vers `/@/`), `/~/…` |
| égal au `World.custom_domain` d'un monde (white label) | ce monde, le chemin désignant la salle |
| autre | erreur « room not found » |

Conséquence : le schéma et l'hôte de `playUri` doivent être exactement ceux que voit le navigateur.

### 3.3 Rendu white label

Le rendu dépend de la réponse de A2 (`MapDetailsData`) :

- `metatags` : titre, description, favicons, icônes du manifeste, couleur de thème, image de carte ;
- `primaryColor` et `backgroundColor`, injectées en variables CSS dans la page ;
- les logos (`loadingLogo`, `loginSceneLogo`, `errorSceneLogo`) et `showPoweredBy` ;
- `legals`, `customizeWokaScene`, `contactPage`, `pricingUrl` et `reportIssuesUrl`.

Le challenge Cloudflare d'un domaine personnalisé passe par A4.

### 3.4 Contrôles de domaine et d'origine

| Contrôle | Avec admin | Sans admin |
|---|---|---|
| `playUri` de `/login-screen` et `/logout` | A21 (`api/domain/verify`) | nom d'hôte de `playUri` = nom d'hôte de `PUSHER_URL` (`play/src/pusher/services/verifyDomain/LocalVerifyDomainService.ts`) |
| Callbacks OIDC | `PUSHER_URL/openid-callback`, `/logout-callback`, `/matrix-callback` (un seul domaine pour tous les tenants, `playUri` transporté par cookie) | idem |
| `/logout-callback` sans cookie `playUri` | redirection vers `FRONT_URL` | idem |
| Room API | A25 (clé + salle) | `ROOM_API_SECRET_KEY` + la salle commence par `FRONT_URL` (sauf si `FRONT_URL` vaut `/`) |
| CORS du pusher | `ALLOWED_CORS_ORIGIN` (`"*"` renvoie l'origine) | idem |
| CORS de l'uploader | `ALLOWED_CORS_ORIGIN`, sinon `PLAY_URL`, sinon `"*"` | idem |
| CORS de map-storage | `cors()` ouvert | idem |
| Challenge Cloudflare | `notWaHost` : 404 si l'hôte se termine par `workadventu.re` | — |
| Ressources appelées par map-storage | `WHITELISTED_RESOURCE_URLS` + `PUSHER_URL` (`map-storage/src/Services/axiosInstance.ts`) | idem |

Il n'existe pas d'autre variable `ALLOWED_*` liée au domaine. `MAP_EDITOR_ALLOWED_USERS` ne sert qu'à `LocalAdmin`.

### 3.5 Map-storage : du domaine au dossier

- **Règle** (`map-storage/src/Services/PathMapper.ts:76-87`). Si `USE_DOMAIN_NAME_IN_PATH` est vrai (SaaS : `true`), la
  clé de stockage vaut `normalize(domaine + "/" + chemin)`. Un domaine qui contient `..` ou `/` est refusé. Sinon, la
  clé est le chemin seul.
- **Préfixe et décodage.** `PATH_PREFIX` est retiré en tête de chemin. Le chemin est décodé segment par segment ; un
  segment qui donne `..` ou un séparateur est refusé (`decodeStoragePath`, lignes 38-58).
- **Source du domaine selon le point d'entrée.** Express a `trust proxy` à true (`map-storage/src/index.ts:87`), donc
  `req.hostname` est la première valeur de `X-Forwarded-Host`, sans le port.

  | Point d'entrée | Domaine |
  |---|---|
  | `GET *.wam` (`map-storage/src/index.ts:105-128`) | `req.hostname` |
  | REST authentifié : upload, PUT, PATCH, download, delete, move, copy | `getRequestDomain(req)` = `X-Map-Storage-Host` > `X-Forwarded-Host` > `req.hostname` (`PathMapper.ts:13-15`) |
  | Régénération du cache (`UploadController.ts:270` contre `:424,545,769,823,865`) | `getRequestDomain` après un upload, `req.hostname` après les autres opérations (voir §7) |
  | `GET /maps` | `req.hostname` |
  | gRPC (commandes d'édition venues du back) | nom d'hôte de l'URL du WAM (`mapPathUsingUrl`, `map-storage/src/MapStorageServer.ts:184` et suivantes) |
  | `GET /private/files/*` | JWT `{wamUrl, tags}` signé par le pusher avec `SECRET_KEY` (`map-storage/src/Services/VerifyJwt.ts:18-58`) |

- **Lecture interne par le back et le pusher.** `MapFetcher` (`libs/map-editor/src/MapFetcher.ts:96-112`) réécrit
  l'URL publique en `INTERNAL_MAP_STORAGE_URL + chemin`, après avoir retiré `PUBLIC_MAP_STORAGE_PREFIX`. Il envoie
  `X-Forwarded-Host` = hôte de l'URL publique, port compris. Timeout 10 s, 50 Mo au plus.
- **Nommage côté admin SaaS.** Le domaine d'un monde vaut `<slug(monde)>-<id du monde><PUBLIC_MAP_STORAGE_DOMAIN>`,
  tronqué par la gauche à 63 caractères avant le suffixe (`saas: admin/app/Models/World.php:1060-1070`).
  `World::findByMapStorageDomain` fait l'inverse pour A26 et A27. Quand l'admin appelle map-storage, il envoie
  `X-Forwarded-Host = <ce domaine>` (voir §4.3).

---

## 4. Sens inverse : ce que l'admin appelle

### 4.1 Routes HTTP du pusher

Elles sont servies sur `PUSHER_HTTP_PORT` (défaut 3000). Le middleware `adminToken`
(`play/src/pusher/middlewares/AdminToken.ts`) accepte l'en-tête `admin-token` (déprécié) ou `Authorization`, à
condition qu'il soit **strictement égal** à `ADMIN_API_TOKEN`, sans préfixe `Bearer`. Il répond
`401 "No token configured!"` si le pusher n'a pas de jeton, et `401 "Incorrect token"` sinon.

L'admin appelle ces routes depuis `saas: admin/app/Services/PusherApiClient.php`, avec Guzzle, la base
`config('urls.pusher_url')` (variable `PUSHER_URL` de l'admin), `Authorization: <ADMIN_API_TOKEN>` et un timeout de 2 s.

| Route (`play/src/pusher/controllers/AdminController.ts`) | Corps | Effet | Réponse | Appelant côté admin |
|---|---|---|---|---|
| `POST /room/refresh` (`:53`) | `{roomId}` | gRPC `sendRefreshRoomPrompt` vers le back de la salle ; le back rappelle A2 (`incrementVersion`) et demande aux clients de rafraîchir | `"ok"` ; `roomId` non chaîne → exception (500) | `WorldController` (marqué `@deprecated`, remplacé par A27) |
| `POST /message` (`:122`) | `{text, type: "message" \| "capacity", targets: string[]}` | pour chaque salle, `sendAdminMessageToRoom` ou `sendWorldFullWarningToRoom` | `"ok"` ; paramètre invalide → exception (500) | `CustomKioskController`, `GameCommandsController` |
| `GET /rooms` (`:206`) | — | `getRooms` sur tous les backs, échéance 1 s | `{ "<roomUrl>": nbUsers }` | `PusherApiClient::getRooms` |
| `POST /global/event` (`:292`) | `{name, data?}` | `dispatchGlobalEvent` sur tous les backs, échéance 1 s (scripts `WA.event`) | `"ok"` | `Headband` (`headband:update`, `headband:delete`) |
| `POST /external-module/event` (`:353`) | `{data: {roomId, moduleId, recipientUuid, message}}` | `dispatchExternalModuleMessage` vers le back de la salle | `"ok"` ; erreur → `500 {cause}` | `GoogleApiWebhookController` |

`POST /chat/message` est encore appelé par `PusherApiClient::sendChatMessagePrompt` côté admin, mais la route n'existe
plus côté pusher (404), et ses appelants côté admin ne sont plus utilisés.

### 4.2 WebSocket d'administration `/ws/admin/rooms`

Défini dans `IoSocketController.ts:85-248` et servi sur `PUSHER_WS_PORT` (défaut 3001). Il n'est actif que si
`ADMIN_SOCKETS_TOKEN` est défini.

- **Client.** C'est le JavaScript du back-office de l'admin, dans le navigateur
  (`saas: admin/resources/js/sockets/connection.js`), et non le serveur de l'admin. Le JWT est obtenu auprès de
  l'admin (`/api/sockets/jwt`), signé en HS256 avec `ADMIN_SOCKETS_TOKEN`, avec la charge
  `{authorizedRoomIds: string[]}` (`play/src/pusher/services/JWTTokenManager.ts:42-60`).
- **Messages entrants** : JSON (`play/src/pusher/models/Websocket/Admin/AdminMessages.ts`).
  - `{event: "listen", roomIds, jwt}` : abonnement aux salles. Toute salle hors `authorizedRoomIds` fait fermer la
    connexion (1008).
  - `{event: "banned", world, message: {userUuid, message}, jwt}` : le pusher appelle `emitBan(…, "banned")` sur chaque
    salle autorisée de ce monde.
- **Messages sortants** :
  - `{type: "MemberJoin", data: {uuid, name, ipAddress, roomId}}` ;
  - `{type: "MemberLeave", data: {uuid}}` ;
  - `{type: "Error", data: {message}}`.
- **Fermetures** : 1007 pour un message invalide, 1008 pour un accès refusé, 1011 quand la connexion au back est
  perdue.
- **Limites.** Taille de message 16 Mio. Contre-pression : 1000 messages ou `PUSHER_ADMIN_WS_MAX_BACKPRESSURE_BYTES`
  (défaut 1 Mio), avec 10 s pour se vider. Au-delà, la socket est fermée.

### 4.3 Map-storage appelé par l'admin

`saas: admin/app/Services/MapStorage/MapStorageClient.php:248-260` envoie :

- `GET /maps` ;
- `HEAD`, `PUT` et `PATCH` sur un chemin ;
- `POST /upload`, `GET /download`, `DELETE`, `POST /move`, `POST /copy` ;
- `GET /validate`.

En-têtes : `X-Forwarded-Host = <domaine du monde>` (§3.5) et `Authorization: Bearer <MAP_STORAGE_AUTHENTICATION_TOKEN>`.
Ce jeton est accepté par map-storage comme `AUTHENTICATION_TOKEN`, ou validé par A26.

### 4.4 Autres points d'entrée liés au contrat

- **Room API** : gRPC, `ROOM_API_PORT` (défaut 50051). Elle démarre si `ADMIN_API_URL` ou `ROOM_API_SECRET_KEY` est
  défini (`play/src/server.ts:139-153`). Ce sont les clients des clients qui l'appellent, avec la métadonnée
  `X-API-Key` ; l'admin ne fait que l'autoriser (A25).
- **Documentation du contrat** : `GET /openapi/admin` et `/swagger-ui/` (« Pusher -> Admin »), si
  `ENABLE_OPENAPI_ENDPOINT` est vrai (`play/src/pusher/controllers/SwaggerController.ts:30-66`). Elle est générée à
  partir des annotations `@openapi` de `play/src/pusher/services/*.ts`, qui documentent aussi A23 (appel du back) et
  A22.
- **Debug** : `GET /dump?token=<ADMIN_API_TOKEN>` sur le pusher (`play/src/pusher/controllers/DebugController.ts`), et
  `/dump` et `/debug/*` sur le back avec le même `?token=` (`back/src/Controller/DebugController.ts`). Ces routes
  servent aux tests et à l'exploitation ; l'admin ne les appelle pas.
- **Back** : aucune route HTTP n'est appelée par l'admin.

---

## 5. Variables d'environnement

### Pusher (`play/src/pusher/enums/EnvironmentVariableValidator.ts`, `EnvironmentVariable.ts`)

| Variable | Rôle dans le contrat | SaaS |
|---|---|---|
| `ADMIN_API_URL` | active `AdminApi`, l'authentification admin de la Room API, A22 et le démarrage de la Room API | `http://<prefix>admin` |
| `ADMIN_API_TOKEN` | `Authorization` sortant ; garde des routes du §4.1 et de `/dump` | secret partagé avec l'admin |
| `ADMIN_URL` | base de A16, A17 et A18 ; défaut de `AUTOLOGIN_URL` et `OPENID_PROFILE_SCREEN_PROVIDER` ; exposée au front | URL publique de l'admin |
| `ADMIN_BO_URL` | lue, mais utilisée nulle part | — |
| `ADMIN_API_RETRY_DELAY` | délai entre deux essais de A1, en ms (défaut 500). Lue directement dans `process.env`, sans validation | — |
| `ADMIN_SOCKETS_TOKEN` | active `/ws/admin/rooms` ; secret HS256 du JWT d'administration | secret partagé avec l'admin |
| `PUSHER_ADMIN_WS_MAX_BACKPRESSURE_BYTES` | contre-pression de la socket d'administration (défaut 1048576) | — |
| `AUTOLOGIN_URL` | A31 | `<member>/workadventure/login` |
| `OPENID_CLIENT_ID`, `OPENID_CLIENT_SECRET`, `OPENID_CLIENT_ISSUER` (et `OPID_*` dépréciées), `OPENID_SCOPE`, `OPENID_PROMPT`, `OPENID_USERNAME_CLAIM`, `OPENID_LOCALE_CLAIM`, `OPENID_TAGS_CLAIM`, `OPENID_WOKA_NAME_POLICY` | A30 | issuer = `<member>` |
| `OPENID_PROFILE_SCREEN_PROVIDER` | A31 (profil) | `<member>/profile` |
| `PUSHER_URL` | URI de redirection OIDC ; vérification de domaine locale ; obligatoire si OIDC est configuré | — |
| `FRONT_URL` | repli de `/logout-callback` ; Room API locale | — |
| `ALLOWED_CORS_ORIGIN` | CORS des routes HTTP | — |
| `SECRET_KEY` | JWT du pusher (identité envoyée à A3), JWT map-storage (partagé avec map-storage), chiffrement du cookie PKCE | — |
| `ANALYTICS_FLUSH_INTERVAL_MS`, `ANALYTICS_TIMEOUT_MS`, `ANALYTICS_MAX_QUEUE_SIZE`, `ANALYTICS_MAX_BATCH_SIZE` | A22 (10000, 2000, 10000, 1000 par défaut) | — |
| `HOSTNAME`, `SERVER_NAME` | `pusherInstanceId` de A22 | — |
| `ROOM_API_SECRET_KEY`, `ROOM_API_PORT`, `ROOM_API_BIND_HOST` | Room API (§4.4) | clé vide : l'admin authentifie |
| `NODE_ENV` | cache de A25 seulement si `production` | — |
| `DISABLE_ANONYMOUS` | force `authenticationMandatory` (A2) ; refuse un WebSocket sans jeton ; `/anonymLogin` répond 403 | — |
| `ENABLE_OPENAPI_ENDPOINT` | `/openapi/admin` | — |
| `MAP_STORAGE_API_TOKEN` | appels de map-storage vers `/roomArea` du pusher (hors admin) | — |
| repli sans admin : `START_ROOM_URL`, `PUBLIC_MAP_STORAGE_URL`, `INTERNAL_MAP_STORAGE_URL`, `ENABLE_MAP_EDITOR`, `MAP_EDITOR_ALLOW_ALL_USERS`, `MAP_EDITOR_ALLOWED_USERS`, `ENABLE_CHAT*`, `ENABLE_SAY`, `ENABLE_ISSUE_REPORT`, les `*_ENABLED` des applications, `LIVEKIT_RECORDING_S3_*`, `MATRIX_*`, `DEFAULT_WOKA_*`, `PROVIDE_DEFAULT_WOKA_*`, `SKIP_CAMERA_PAGE`, `DEFAULT_*_PRIVACY_SETTINGS`, `BYPASS_PWA`, `OPID_WOKA_NAME_POLICY`, `ENABLE_TUTORIAL` | valeurs que `LocalAdmin` renvoie à la place de A2 et A3 | — |

### Back (`back/src/Enum/EnvironmentVariableValidator.ts`)

| Variable | Rôle |
|---|---|
| `ADMIN_API_URL`, `ADMIN_API_TOKEN`, `ADMIN_API_RETRY_DELAY` | A1, A2, A22, A23, A24 ; garde de `/dump` et `/debug/*` |
| `LIVEKIT_HOST`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | repli de A24 |
| `JITSI_URL`, `JITSI_ISS`, `SECRET_JITSI_KEY`, `BBB_URL`, `BBB_SECRET` | repli de `thirdParty` (A2) |
| `PUBLIC_MAP_STORAGE_URL`, `INTERNAL_MAP_STORAGE_URL`, `PUBLIC_MAP_STORAGE_PREFIX` | chargement de la carte désignée par A2 ; dérivation locale sans admin |
| `TELEMETRY_URL` | télémétrie (hors contrat du tenant) |
| `HOSTNAME`, `SERVER_NAME` | `pusherInstanceId` de A22 |

### Map-storage (`map-storage/src/Enum/EnvironmentVariableValidator.ts`)

| Variable | Rôle | SaaS (`saas: charts/admin/templates/shared-env.yaml:17-24`, `charts/admin/values.yaml:818-821`) |
|---|---|---|
| `ENABLE_BEARER_AUTHENTICATION`, `AUTHENTICATION_TOKEN`, `AUTHENTICATION_VALIDATOR_URL` | A26 | `true` ; `…/api/map-storage/authorization` |
| `AUTHENTICATION_STRATEGY` (dépréciée), `ENABLE_BASIC_AUTHENTICATION`, `ENABLE_DIGEST_AUTHENTICATION`, `AUTHENTICATION_USER`, `AUTHENTICATION_PASSWORD` | autres stratégies | basic `false` |
| `USE_DOMAIN_NAME_IN_PATH`, `PATH_PREFIX` | §3.5 | `true` |
| `ENABLE_WEB_HOOK`, `WEB_HOOK_URL`, `WEB_HOOK_API_TOKEN` | A27 | `true` ; `…/api/map-storage/webhook` ; jeton = `ADMIN_API_TOKEN` par défaut |
| `WAM_TEMPLATE_URL`, `ENTITY_COLLECTION_URLS` | A28 | `…/api/map-storage/wam-template` |
| `SECRET_KEY` | vérifie le JWT `/private/files` signé par le pusher | égal au `SECRET_KEY` du pusher |
| `MAP_STORAGE_API_TOKEN`, `PUSHER_URL`, `WHITELISTED_RESOURCE_URLS` | appels vers le pusher (`/roomArea`) | — |
| `DIRECT_UPLOAD_URL` | annoncé par `GET /upload-endpoint` ; le client qui l'utilise désigne le monde avec `X-Map-Storage-Host` | — |
| `NODE_ENV` | cache de A26 | — |

### Uploader (`uploader/src/Enum/EnvironmentVariable.ts`)

| Variable | Rôle |
|---|---|
| `ADMIN_API_URL` | A29 |
| `ENABLE_CHAT_UPLOAD`, `UPLOAD_MAX_FILESIZE` | repli sans admin |
| `ALLOWED_CORS_ORIGIN`, `PLAY_URL` | CORS |

### Côté admin, pour mémoire

- `PUSHER_URL` : base des appels du §4.1.
- `FRONT_URL` : routage du §3.2.
- `ADMIN_API_TOKEN` et `ADMIN_SOCKETS_TOKEN` : égaux à ceux du pusher.
- `MAP_STORAGE_AUTHENTICATION_TOKEN`, `PUBLIC_MAP_STORAGE_DOMAIN` et `PRIVATE_MAP_STORAGE_URL` : §4.3.

Les stacks de `dev/` (`dev/stack.yaml`) tournent **sans** `ADMIN_API_URL`. Seuls `ADMIN_API_TOKEN` (routes inverses et
`/dump`) et `ROOM_API_SECRET_KEY` y sont définis. Le contrat du §2 n'y est donc jamais exercé.

---

## 6. Tests

### 6.1 Tests unitaires existants (vitest)

| Fichier | Ce qu'il couvre |
|---|---|
| `play/tests/pusher/AdminApiMapDetails.test.ts` | A2 : `thirdParty` n'est jamais transmis |
| `play/tests/pusher/AdminApiBan.test.ts` | A7 : succès, envoi de l'IP, refus en 200 avec `status: "error"` qui fait rejeter |
| `play/tests/pusher/SocketManagerBan.test.ts` | côté appelant de A7 : choix de l'IP (moderateur avec la même IP, back muet, utilisateur parti), repli en kick ; `banIpPreviewQuery` |
| `play/tests/pusher/AnalyticsEventsQueue.test.ts` | A22 : enrichissement, filtre `analyticsEventsEnabled`, débordement, découpage sur 422, échec au milieu de l'envoi unitaire, drain |
| `play/tests/pusher/AnalyticsReportMessageHandler.test.ts`, `AnalyticsTimedEventTracker.test.ts`, `AnalyticsEventCatalog.test.ts` | production des événements de A22 (pas le transport) |
| `play/tests/room-api/authentication/AdminAuthenticator.test.ts` | A25 : mauvaise clé, mauvaise salle, réponse inattendue, erreur interne, salle inexistante, succès |
| `play/tests/room-api/guards/AuthenticationGuard.test.ts` | garde Room API : `X-API-Key` absente, succès |
| `back/tests/AdminApi.test.ts` | A23 : URL et jeton, pas d'envoi sans capacité, nouvelles tentatives, pas de nouvelle tentative sur 4xx |
| `back/tests/CommunicationManager.test.ts` | injection du notificateur de A23 |
| `map-storage/src/Services/tests/PathMapper.test.ts` | §3.5 : `USE_DOMAIN_NAME_IN_PATH` activé ou non, `PATH_PREFIX`, décodage, refus de la traversée de répertoires |
| `map-storage/src/Services/tests/CustomEntityCollectionService.test.ts` | chemins par domaine des entités personnalisées |

**Sans test unitaire** :

- A1 (y compris le blocage et les nouvelles tentatives au démarrage) ;
- A3 (`/me` et WebSocket), A4, A5, A6, A8 à A21 ;
- A24, A26, A27, A28, A29, A30 ;
- `MetaTagsBuilder`, `LocalAdmin` et la vérification de domaine ;
- les routes du §4.1 et la socket `/ws/admin/rooms`.

### 6.2 Playwright du dépôt OSS (`tests/tests/*.spec.ts`)

La stack E2E OSS et les stacks `dev/` tournent sans admin (`ADMIN_API_URL` vide : `.env.template:23`,
`docker-compose.yaml:95`, `dev/stack.yaml`). **Aucune spec n'exerce `AdminApi`.** Elles exercent le repli `LocalAdmin`
et une partie du sens inverse :

| Spec | Ce qui est vérifié |
|---|---|
| `swagger_doc.spec.ts` | la documentation « Pusher -> Admin » expose les modèles du contrat (`Capabilities`, `MapDetailsData`, `FetchMemberDataByUuidResponse`, `ErrorApi*`, compagnons…) |
| `moderation.spec.ts` | sans `api/ban`, pas de bouton « bannir » ; un admin peut faire un kick |
| `variables.spec.ts` | `GET /rooms` avec `ADMIN_API_TOKEN` (`tests/tests/utils/debug.ts:38-47`) |
| `scripting_events.spec.ts` | `POST /global/event` avec `ADMIN_API_TOKEN` |
| `spaces.spec.ts` | `GET /dump?token=` sur le pusher et le back |
| `room-api.spec.ts` | Room API avec authentification locale (`ROOM_API_SECRET_KEY`), pas A25 |
| `oidc.spec.ts`, `mobile/oidc.spec.ts` | même client OIDC (A30), mais contre le mock OIDC |
| `error_pages.spec.ts` | erreurs de `LocalAdmin` (URL non supportée, WAM introuvable) |
| `map_editor/*.spec.ts` | droits d'édition par les tags OIDC (`canEdit` de `LocalAdmin`) |

### 6.3 Playwright du SaaS (`saas: tests/tests/tests/*.spec.ts`, 32 specs)

Ce sont les seuls tests de bout en bout contre la vraie admin. La correspondance ci-dessous est tirée des titres des
tests ; elle n'a pas été vérifiée en lisant chaque scénario.

| Spec | Appels concernés |
|---|---|
| `connect`, `oidc`, `register-member`, `consent`, `fastpass` | A3, A21, A30, A31 |
| `moderation` | A7, puis le refus dans A3 |
| `save_name` | A9 |
| `woka` | A19, A10 |
| `room-api` | A25 |
| `whitelabel` | rendu white label (A2) |
| `headbanner` | `POST /global/event` (§4.1) |
| `webhooks` | A23, via « delivers a completed recording » |
| `map-editor`, `map_editor_area_rights` | A2 (`canEdit`), A6 (liste des salles), map-storage |
| `applications` | `applications` de A3 |
| `send-message-from-visitCard` | A15, A16 |
| `test_room` | redirection `/_/` de A2, 404, monde plein dans A3 |
| `video-quality-analytics` | données injectées : ne passe pas par A22 |

Les appels A4, A5, A8, A12, A13, A14, A17, A18, A20, A24, A28, A29 et la socket `/ws/admin/rooms` n'ont pas de spec
identifiable par leur titre.

---

## 7. Écarts et singularités observés

Ces points décrivent le comportement actuel. Chacun est à reproduire, ou à trancher explicitement.

1. **A1.** L'annotation OpenAPI dit qu'un 404 fait prendre les capacités par défaut. En réalité, le pusher et le back
   retentent sans fin et ne démarrent pas.
2. **A11** est conditionné par `api/save-textures` ; il n'existe pas de capacité pour le compagnon.
3. **A9 à A11** envoient `playUri` alors que la documentation annonce `roomUrl`. Ils exigent un 204 strict.
4. **Documentation fausse ailleurs** : A12 envoie `playUri` (documenté `roomUrl`) ; A14 vise `/api/world/tags`
   (documenté `/api/tags`) ; A17 est un `POST /api/oauth/refreshtoken` (documenté `GET /oauth/refreshtoken/{token}`) ;
   le `reportWorldSlug` de A5 contient l'URL complète.
5. **A16, A17 et A18** partent sur `ADMIN_URL` (adresse publique), pas sur `ADMIN_API_URL`.
6. **A3** ne transmet pas le paramètre `tags` de sa signature.
7. **A2** ne reconnaît que les erreurs `type: "error"` ; A3 reconnaît les quatre types.
8. **Statuts HTTP.** Une réponse hors 2xx devient une erreur générique (`ROOM_ACCESS_ERROR`) : le corps d'une 4xx est
   perdu. L'admin répond donc 200 avec un `ErrorApiData`.
9. **Délais.** Aucun timeout sur les appels synchrones (A2, A3, A6 à A21, A24, A25, A26, A28, A29).
10. **Encodage et identité dans les chemins.** A15 (uuid) et A16 (email) ne sont pas encodés dans le chemin. A16 utilise
    l'email fourni par le message du client, pas l'identité de la socket.
11. **A31.** `getProfileUrl` n'encode ni `accessToken` ni `playUri`. Si `AUTOLOGIN_URL` et `ADMIN_URL` manquent tous
    les deux, `AUTOLOGIN_URL` vaut la chaîne `"undefined/workadventure/login"`, si bien que la réponse 400
    « AUTOLOGIN_URL is not configured » ne se produit jamais.
12. **`notWaHost`** (`play/src/pusher/middlewares/NotWaHost.ts`) envoie un 404 puis appelle quand même `next()`. Le
    handler s'exécute donc, appelle l'admin (A4), puis échoue à répondre une seconde fois.
13. **`MetaTagsBuilder.fetchMapFile`** (`MetaTagsBuilder.ts:104-118`), réservé aux bots : il suit une redirection en
    rappelant A2 avec `this.url`, c'est-à-dire toujours la même URL, jusqu'à 11 fois.
14. **Map-storage.** Un upload range les fichiers sous le domaine de `X-Map-Storage-Host`, mais la régénération du
    cache après PUT, PATCH, DELETE, move et copy utilise `req.hostname`.
15. **A24** ne transmet pas le `spaceId` qu'il reçoit.
16. **Code mort côté pusher et back** : `logoutOauth`, `ADMIN_BO_URL` et `AdminBannedData`
    (`libs/shared-utils/src/SharedAdminApi.ts:7-12`).
17. **Code mort côté admin** : appels à `POST /chat/message`, route qui n'existe plus côté pusher.
18. **Capacités sans admin.** La page annonce `LocalAdmin.getCapabilities()` (woka et compagnon en `v1`), alors que les
    services du pusher sont choisis à partir de `{}`. C'est sans effet aujourd'hui, mais les deux sources divergent.
19. **Tags du JWT.** Les tags portés par le JWT du pusher (issus des claims OIDC) ne servent qu'à `LocalAdmin` et
    aux analytics. Avec l'admin, les droits viennent uniquement des `tags` de A3.
