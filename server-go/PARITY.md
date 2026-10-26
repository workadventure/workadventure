# Parité du candidat Go avec le serveur TypeScript

Matrice du jalon 1 (« parité production »). Une ligne par fonction : contrat attendu, état réel, preuve, écart,
prochaine action. Les numéros de ligne TS renvoient au checkout de la branche `lang-go`.

États admis :
- `validé` : un test Go avec assertions, ou une spec Playwright passée sur la stack Go, les deux cités ;
- `implémenté non vérifié` : le code existe, mais rien ne le prouve ;
- `partiel` : il manque une partie, que la ligne nomme ;
- `absent` ;
- `hors périmètre explicite`.

Un paramètre lu ou un test sans assertion ne suffit pas à « valider ».

Mise à jour : 2026-10-17, sur `626a4978a` (master fusionné, API `d2d82672`). L'inventaire a été fait par quatre agents en lecture seule (TS et Go), puis relu. Les résultats Playwright cités viennent de `JOURNAL.md` (J1 à J3a) ; J3b reste à rejouer (voir le journal).

Relecture du 2026-10-21 : contradictions levées (OIDC, LiveKit, A23 à A27 dans les tables par sujet) et correctifs récents reportés (proxys de confiance, pprof, Sentry, budget de reprise, mouvements sans position, `httpx`, erreurs ignorées et messages non gérés, panics d'acteur, horloge, ban, cartes du même monde, JSON Patch, schémas zod).

## Verdict

- **OSS (LocalAdmin)** : J1, J2 et J3a sont validés par Playwright. J3b est codé mais pas encore validé. LiveKit, l'enregistrement et la Room API sont validés par les tests Go (l'enregistrement aussi par `recording.spec.ts`, 5/5) ; `livekit.spec.ts` et `room-api.spec.ts` restent à jouer sur la stack Go.
- **SaaS** : les 31 appels du contrat sont faits ; **le parcours SaaS est joué de bout en bout le 17/10 sur `dev/saas`** (OIDC, deux mondes dont un white label sans fuite, A27, `/ws/admin/rooms`, ban en cours de session, Room API, uploader ; voir JOURNAL). Il reste à le jouer contre une vraie admin de préproduction et à rejouer `proximityChatFileTransfer` avec un front au niveau de master.

Améliorations relevées mais non faites : [IMPROVEMENTS.md](IMPROVEMENTS.md). Ajouter une fonctionnalité : [docs/ADDING_A_FEATURE.md](docs/ADDING_A_FEATURE.md).

**Hors périmètre par construction** : `POST /debug/close-space-connection`. Il n'y a pas de flux back↔pusher en
serveur unique : la route répond comme le back (400, 500 pour un space inconnu, 200), mais sans effet. Elle accepte le
nom du back (`<monde>.<nom local>`) et le nom local. Conséquence : `map_editor_livekit.spec.ts:62` n'éprouve pas la
reconnexion côté Go.

## Manques bloquants, par ordre

1. **Admin distante** : les 31 appels sont faits, testés contre un faux admin et joués contre l'admin locale (`dev/saas`) ; pas encore contre une préproduction.
2. **Front** : servi depuis `ASSETS_INTERNAL_URL` (conteneur front nginx à côté, décision du socle du 17/10) ; pas de mode local.
3. **Image de production** : à construire en CI et à déployer par `deploy` (branche `deploy-go` du socle).
4. **Campagne des 86 specs** : jouée le 17/10 (246 réussis, 8 échecs, tous communs avec le TS ; voir JOURNAL). Restent les rejeux Matrix sur une base Synapse vierge.

## Admin distante (A1 à A31 de `dev/contracts/admin-api.md`)

| Appel | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|
| A1 capacités : au démarrage, nouvelle tentative toutes les `ADMIN_API_RETRY_DELAY` (404 compris), puis `window.capabilities` | validé (unitaire) | `admin/http_test.go` : `TestTheServerWaitsForTheAdminsCapabilities` | — | parcours SaaS |
| A3 `/api/room/access` : succès, refus `ErrorApiData` (renvoyé tel quel par `/me`, écran d'erreur au WebSocket), `ROOM_ACCESS_ERROR` / `ROOM_ACCESS_VALIDATION` construits localement | validé (unitaire) | `TestTheAdminLetsAMemberIn`, `TestTheAdminsRefusalReachesTheFrontAsIs`, `TestAnUnreachableOrConfusedAdminIsAnErrorScreenNotACrash`, `httpapi_test.go` | délai de 10 s par appel (le TS n'en avait aucun : écart volontaire) | — |
| A2 `/api/map` : page, `/map` (sans `thirdParty`), JWT toléré expiré, `MAP_VALIDATION` | partiel | `TestTheAdminDescribesTheMap`, `TestTheAdminsRefusalAndSecretsOnTheHTTPRoutes` | la salle ne tire pas encore sa carte de `/api/map` (côté back) ; redirection, `metatags`, couleurs et favicon faits (b6ff43589) | carte de salle via A2 |
| A18 ICE (`ADMIN_URL`), A19 Woka, A20 compagnon, A21 vérification de domaine | validé (unitaire) | `TestCapabilitiesChooseBetweenTheAdminAndTheServer` | — | — |
| A4 challenge Cloudflare (404 sur `workadventu.re`, 526 en échec), A9 à A11 `/save-*` (joueur connecté, capacité, 204 exigé), A29 limite de l'uploader (413 et 423 relayés, sinon 401), A31 `?access_key=` (page vers `AUTOLOGIN_URL`) et `/profile-callback` | validé (tests Go) | `httpapi/whitelabel_test.go` (2 tests), `uploader_test.go` : `TestTheAdminDecidesWhatSizeAPlayerMayUpload`, `admin/http_test.go` | — | — |
| A23 fin d'enregistrement (capacité `api/recordings/events`, 3 réessais, `recordingSessionId`, fichiers et durées tirés de `ListEgress`), A25 Room API autorisée par l'admin (`X-API-Key`, codes gRPC, cache en production selon `Cache-Control`), A26 validateur de map-storage (bearer autre que `AUTHENTICATION_TOKEN`, par domaine, même cache), A27 webhook de map-storage (`update` à chaque écriture d'un WAM, `delete`) | validé (tests Go) | `admin/http_test.go`, `core/space_recording_test.go`, `livekit/egressinfo_test.go`, `roomapi/admin_test.go`, `mapstorage/admin_test.go` | A27 comme generateCacheFile : un appel sans `mapPath` pour un upload, une suppression, un déplacement ou une copie, et jamais `delete` (comme le TS) ; domaine vide pour une édition sans `USE_DOMAIN_NAME_IN_PATH` | — |
| A24 identifiants LiveKit par monde (capacité `api/livekit/credentials` : demandés avec le `playUri` d'un membre à chaque passage en LiveKit, sans cache ; en échec, le space reste en WebRTC) | validé (tests Go) | `core/space_livekit_test.go` : `TestAWorldsOwnLiveKitIsAskedForEachMove`, `admin/http_test.go` | l'enregistrement passe par l'egress du LiveKit du monde | — |

Les réponses de l'admin (`/api/map`, `/api/room/access`, `sameWorld`, membres du chat, membres) sont validées contre les schémas zod du pusher, exportés en JSON Schema (`schemas/`, `internal/admin/admin.schema.json`, types générés dans `admin.gen.go`) ; voir `schemas/README.md`.

## Connexion, salle, mouvements

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Upgrade WS `/ws/room`, rejets (version, jeton, texture) | IoSocketController.ts:252, 488-507 | validé | `ws/server_test.go:162,227` ; J1 Playwright | `WorldConnectionMessage` jamais émis (remplacé par ErrorScreen) | tester les autres rejets |
| joinRoom → RoomJoinedMessage | PSM:393 → BSM:191 | validé | `core/roomevents_test.go` : `TestANewcomerGetsTheStateOfTheInteractiveObjects` ; `ws/server_test.go` : `TestAJoinWithoutAPositionIsRefused` ; J1 | un join sans position est refusé comme en TS (`ErrorMessage`, puis Kick : `WS_CLOSE_CODE_SESSION_DESTROYED`) au lieu de placer le joueur en (0,0) | — |
| Reprise de transport (connectionId) | PusherWebSocket.replaceSocket | validé | `ws/server_test.go:189,218`, `buffers_test.go` (dont `TestResumeBudgetIsSharedAndGivenBack`) | 512 Kio par session, et un budget pour tout le processus (`RESUME_BUFFER_BUDGET_BYTES`, 256 Mio par défaut, 0 sans limite ; jauge `server_resume_buffer_bytes`) : une fois dépensé, une nouvelle session n'a pas de tampon et repart de zéro après une coupure (le TS n'avait pas de plafond) | — |
| userMoves, viewport, setPlayerDetails | IOC:613-647 | validé | `core/room_test.go:81,125,181`, `ws/server_test.go` : `TestAMoveWithoutAPositionKeepsTheLastOne` | comme en TS : sans viewport, le mouvement est ignoré ; sans position, le joueur garde la dernière, son viewport est suivi | — |
| Bulles (groupes, verrou) | BSM:500-527, 1253 | validé | `core/room_test.go:117,154` ; J1 | — | — |
| Suivre (request, confirm, abort) | BSM:1208-1234 | validé | `core/roomplayers_test.go:48` ; J3b à rejouer | pas de sortie de zone autour du meneur | — |
| askPosition (MoveTo, Locate) | BSM:1313 | validé (unitaire) | `core/recovery_test.go` : `TestAskingWhereAPlayerIsMovesOrLocates` | — | — |
| Emotes | BSM:1196 | validé (unitaire) | `core/roomevents_test.go` : `TestAnEmoteReachesThoseWhoSeeTheSenderAndOnlyIfItIsAnEmoji` | — | — |
| itemEvent, entityMessage | BSM:279, 325 | partiel | `ws/handlers.go` (`onItemEvent`, `onEntity`) ; `TestANewcomerGetsTheStateOfTheInteractiveObjects` | `entityMessage` sans test | test |
| abortQuery | IOC:1046 | validé | `server_test.go` : `TestAnAbortedJoinLeavesTheSpace` ; `map_editor_livekit:111` | — | — |
| Messages reçus juste avant la fermeture traités avant le départ de la salle ; socket admin qui part juste après s'être abonné (70d0a91b36) | back RoomManager.ts (master) | validé | `ws/variables_room_test.go` : `TestTheWritesSentJustBeforeClosingAreApplied` ; `core/roomapi_test.go` : `TestAWatcherThatLeftRightAfterSubscribingHearsNothingMore` | garanti par construction, sans code ajouté : le lecteur d'une connexion poste chaque message à l'acteur de salle avant de lire la trame suivante, et `destroy` attend la fin des lecteurs avant de poster le départ ; l'abonnement et le désabonnement du socket admin sont deux closures de l'acteur, traitées dans l'ordre | — |
| Invitations à une réunion | BSM:1355-1391 | validé (cœur) | `core/roomvars_test.go:52` ; J3b à rejouer | — | — |

## Spaces, chat, Matrix

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| join/leave space, filtres, updateSpaceUser, metadata | PSM:497-1405 | validé | `core/space_test.go`, `space_filter_test.go` ; J2, `scripting_spaces` | rejoindre deux fois renvoie un succès | — |
| SpaceState (main levée, parole, sondages, setKind) | BSp:693-725 | validé | `core/space_filter_test.go:116-166` ; types et validation générés du schéma zod (`spacestate.schema.json`, `spacestate/validate_test.go`) | revokeFloor, deletePoll et questions non testés | tests |
| Chat de bulle (spaceMessage, isTyping) | EventProcessorInit.ts:5-45 | implémenté non vérifié | `ws/spaces.go:172,387` ; E2E vert (J2) | signature (nom, woka) non testée | test |
| chatMembersQuery (A12), roomTagsQuery (A8) | PSM:1540, 1321 | validé | `admin/http_test.go` : `TestTheChatAndTheMapEditorSearchTheMembersOfTheAdmin` | — | — |
| searchMember (A13), getMember (A15), searchTags (A14), refresh OAuth (A17) | PSM:1487-1642 | validé | `admin/http_test.go`, `ws/conference_test.go` : `TestConferencesAndTheOAuthRefresh` | — | — |
| Jitsi JWT (rôle de modérateur par `jitsiRoomAdminTag` de la carte Tiled et du WAM), BBB (création de la réunion, URL de connexion, mots de passe HMAC), réglages de l'admin (`thirdParty`) ou de l'environnement (`JITSI_URL`, `JITSI_ISS`, `SECRET_JITSI_KEY`, `BBB_URL`, `BBB_SECRET`) | back SocketManager.ts:770-904, ModeratorTagFinder.ts | validé (tests Go ; slug, hash et URL BBB identiques à ceux du TS) | `ws/conference_test.go` (2 tests) | la carte est relue à chaque requête (le TS la garde en cache par salle) | E2E Jitsi/BBB si la stack en a |
| Matrix : `matrixUserId`, SSO, `/matrix-callback` | AuthenticateController.ts:322-405 | validé | `httpapi/oidc_test.go:101,132,142` | — | — |
| Matrix : provider Synapse (connexion admin, levée du rate limit, salons privés des zones dans l'espace « current-visited-room », invitation, modérateur pour le tag admin, renommage, vidage), `/roomArea` (`MAP_STORAGE_API_TOKEN`), enter/leaveChatRoomArea, sortie à la fermeture, updateChatId (A16) | MatrixProvider.ts, MatrixRoomAreaController.ts, PSM:1552, 1703-1758 | validé (tests Go) | `matrix_test.go`, `ws/matrix_test.go` (2 tests) | jeton admin partagé entre pods par Redis (`matrix-admin-access-token:*`, verrou de 30 s) ; E2E `matrixChatArea` à jouer | campagne |

## Éditeur de carte et map-storage

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Éditions hors de l'acteur de salle, file par carte | — (relecture du 15/10) | validé | `mapedit_test.go` (salle livrée pendant l'écriture, ordre, cartes indépendantes) | annoncée à la seule salle de l'éditeur | — |
| Version attendue à l'écriture | — | validé | `mapstorage/edit_test.go` (v10 n'écrase pas v11, abandon après 5 essais) | — | — |
| Droits : zones, entités, réglages, métadonnées | MSS:154-405 | validé | `mapedit_test.go` ; J3a `area_rights`, `custom_entity_rights` | — | — |
| Édition d'entité refusée (67bce38773, 59a1ade946, 370a0c86da) : erreur au seul émetteur, ni appliquée ni diffusée ; droits vérifiés au coin haut-gauche, sur la position actuelle et sur la destination ; suppression vérifiée (sauf entité déjà disparue) ; upload d'entité ou de fichier réservé à qui peut écrire quelque part sur la carte | MapStorageServer.ts (master) | validé | `mapedit_test.go` : `TestAMemberPlacesFurnitureOnlyWhereItsTagsMayWrite`, `TestAMemberDeletesOnlyTheEntitiesWhereItMayWrite`, `TestUploadingTakesWriteAccessSomewhereOnTheMap` ; refus au seul émetteur : `ws/mapedit_test.go` | le refus était déjà renvoyé au seul émetteur en Go ; 370a0c86da (largeur et hauteur inversées) concerne le contrôle du front, le serveur ne lit plus la taille | — |
| Revendication de zone personnelle | MSS:232 | validé | `mapedit_test.go` (3 tests) ; J3a | `personal_area_claim:20` échoue aussi en TS | rejouer |
| Entités personnalisées | MSS:346-370 | validé | `mapedit_test.go` (3 tests) | — | — |
| Rattrapage `lastCommandId` | BSM:132-185 | validé | `mapstorage/edit_test.go`, `core/roommap_test.go:55` | — | — |
| Variables de zone (verrou, maxUsers) | GR:864 | partiel | `core/roommap_test.go` (5 tests) | seule la clé `lock` est acceptée | toute clé autorisée |
| HTTP map-storage : upload, PUT, PATCH, DELETE, move, copy, download, maps | MS UploadController.ts | validé | `mapstorage_test.go:89-178` ; J3a | `/maps` renvoie une `version` factice (`go-1`) ; corps de PATCH sans limite | vrai hash ; limite |
| `/private/files` (JWT) | VerifyJwt.ts:33 | validé | `mapstorage_test.go` (avec et sans `PATH_PREFIX`) | — | — |
| `USE_DOMAIN_NAME_IN_PATH` | PathMapper.ts:76 | absent | — | le domaine de la clé vient du `wamUrl` donné par l'admin, ou de l'hôte HTTP ; sans admin, toutes les salles ont l'hôte de `PUBLIC_MAP_STORAGE_URL` | tranche admin |
| `WAM_TEMPLATE_URL` | UploadController.ts:604 | validé | `mapstorage_test.go` : `TestAMapUploadedAloneStartsFromTheWAMTemplate` | — | — |
| `resourceUrl` des propriétés de zone (POST à l'ajout, PATCH au changement, DELETE au retrait et à la suppression de la zone ; seulement `PUSHER_URL` et `WHITELISTED_RESOURCE_URLS`) | ResourceUrlModule.ts, UpdateAreaMapStorageCommand.ts | validé | `mapedit/resource_test.go`, `ws/matrix_test.go` | un seul DELETE à la suppression d'une zone (le TS en envoie deux) | — |
| webhooks, validateur d'API key, S3 de map-storage | MS Services | partiel | A26, A27 (table de l'admin) | webhook et validateur faits ; S3 absent (disque seulement) | décider avec l'équipe (voir « Persistance ») |
| embeddableWebsite, mapStorageJwt, roomsFromSameWorld | PSM:1420, 1760, 1346 | implémenté non vérifié | `ws/queries.go` ; J3a `start_exit:40` | sans admin, seules les cartes du dossier du monde de la salle (avec `USE_DOMAIN_NAME_IN_PATH`), comme `/maps` de map-storage : `ws/mapedit_test.go` : `TestRoomsFromSameWorldStayInTheWorld` | tests d'`embeddableWebsite` et `mapStorageJwt` |

## Variables, scripts, modération

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Variables de room (Redis ou mémoire, redémarrage) | GR:672, RedisVariablesRepository.ts | validé (cœur) | `core/roomvars_test.go:8`, `ws/variables_test.go`, `store_test.go` ; J3b à rejouer | — | rejouer `variables` |
| Variables de joueur `pr_` | PlayerVariables.ts | partiel | `ws/variables.go:196` | pas de portée monde `pw_` | avec l'admin (`group`) |
| sendEvent, `/global/event`, `/rooms` | BSM:709, AdminController.ts | partiel | `core/roomplayers_test.go:26` | pas d'écouteurs Room API ; routes admin non testées | Room API |
| Kick (message final, puis fermeture) | — | validé | J3a `map_storage_upload:85` passe, rejoué seul | — | — |
| Ban | PSM:772-821 | validé (tests Go) | `ws/session_test.go` : `TestOnlyAnAdminEjectsAPlayer`, `TestARefusedBanEjectsNoOne` ; `core/roomplayers_test.go:5` | enregistré par l'admin (compte, ou IP du joueur dans le monde avec `byIp`). **Écart volontaire** : un ban que l'admin refuse n'éjecte personne et le modérateur en est prévenu (le pusher éjectait quand même) ; admin injoignable : kick, comme le pusher, et le modérateur apprend que ce n'était qu'un kick | — |
| reportPlayer, playGlobalMessage, banIpPreview | PSM:756, 1177, 986 | implémenté non vérifié | `ws/moderation.go` (`onReport`), `ws/handlers.go` (`playGlobalMessage`, admins seulement), `ws/world.go` (`banIPPreview`) | aucun test | tests |
| mute/kickOff réservés aux admins | EPI-p:5-53 | validé (unitaire) | `ws/session_test.go` : `TestOnlyAnAdminForcesAMuteOrKicksOff` | — | — |

## HTTP, configuration, déploiement

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `/ping` (liveness), `/ready` (readiness : 503 tant que le gabarit du front manque), `/api-version` (le hash du protocole, pour le pipeline SaaS) | PingController.ts:39,58 | validé | `httpapi_test.go` : `TestProbesTellLivenessReadinessAndTheProtocol` | `/ping-backs` absent (pas de back séparé) | — |
| Sous-commande `healthcheck` (GET 127.0.0.1:`PUSHER_HTTP_PORT`/ping, code de sortie) pour les `service_healthy` de compose | — (exigence du socle) | implémenté non vérifié | `cmd/server/main.go` | — | essayer en compose |
| Ports : WS 3001, map-storage 3002 et uploader 3003 actifs par défaut, Room API 50051 si `ROOM_API_SECRET_KEY` | chart `server.enabled` | implémenté non vérifié | `config.go`, `Dockerfile` (EXPOSE) | — | `deploy` OSS |
| `PATH_PREFIX` de map-storage (fichiers privés derrière `/map-storage`) | VerifyJwt.ts:33 | validé | `mapstorage_test.go` : `TestPrivateFilesBehindAPathPrefix` | — | — |
| Uploader : messages audio (60 s), fichiers du chat, CORS `ALLOWED_CORS_ORIGIN`/`PLAY_URL`, `ENABLE_CHAT_UPLOAD`, `UPLOAD_MAX_FILESIZE` ; stockage S3 (`AWS_*`, téléchargement par lien signé, `UPLOADER_AWS_SIGNED_URL_EXPIRATION`), sinon Redis, sinon mémoire ; audio dans Redis, sinon mémoire | uploader/src/Controller/FileController.ts, Service/*StorageProvider.ts | validé (tests Go) | `uploader_test.go` (4 tests) | règles CORS posées sur le bucket au démarrage ; Redis partagé avec les variables (`REDIS_DB_NUMBER` ignoré) ; mémoire limitée à 256 Mo | — |
| `/metrics` | PrometheusController.ts | validé | `metrics_test.go` (4 tests) | moins de métriques ; `/debug/pprof` derrière `PROMETHEUS_AUTHORIZATION_TOKEN`, 404 sans lui (les métriques restent ouvertes, comme en TS) | — |
| OpenID (login, callback, logout, `/me`) | AuthenticateController.ts | validé | `httpapi/oidc_test.go` ; J2 `oidc` | id_token vérifié par go-oidc (signature, émetteur, audience, nonce) ; le code verifier PKCE et le nonce voyagent dans un cookie scellé (AES-GCM, clé tirée de `SECRET_KEY`) ; les claims viennent de userinfo, comme dans le pusher | — |
| Jeton de rafraîchissement OpenID (337a325986, c7b7075963) : `OPENID_ACCESS_TYPE` sur la demande d'autorisation ; refresh token chiffré dans le jeton d'auth ; à `/me`, jeton vérifié avant l'appel à l'admin et renouvelé seulement si le fournisseur répond 401 ; claims (nom, langue, tags) relus au renouvellement ; refresh token révoqué au logout | OpenIDClient.ts, AuthenticateController.ts (master) | validé | `httpapi/oidc_test.go` : `TestOpenIDRenewsTheAccessTokenTheProviderRejects`, `TestOpenIDLoginMeAndLogout` | chiffrement AES-256-GCM (le scellé des cookies, clé SHA-256 de `SECRET_KEY`) au lieu d'AES-256-CBC sans authentification : un refresh token chiffré par le pusher TS n'est pas lisible en Go, l'utilisateur se reconnecte à l'expiration de son jeton d'accès ; le renouvellement ne réagit qu'au 401 (le TS accepte aussi `invalid_grant`, qu'un userinfo ne renvoie pas) | — |
| `/profile-callback`, `access_key`, challenge Cloudflare, `save-*` | AuthenticateController.ts:470, FrontController.ts | validé (tests Go) | voir A4, A9 à A11, A31 (table de l'admin) | — | — |
| `/room/refresh`, `/message`, `/external-module/event` (`ADMIN_API_TOKEN`) | AdminController.ts | validé | `server_test.go` : `TestTheAdminTalksToThePlayersOfARoom` | — | — |
| `/ws/admin/rooms` (`ADMIN_SOCKETS_TOKEN` : `listen` → `MemberJoin`/`MemberLeave`, `banned` sur les salles du monde, fermetures 1007/1008) | IoSocketController.ts:86, SocketManager.ts:113 | validé | `adminrooms_test.go` : `TestTheAdminSocketFollowsTheMembersAndBans` ; `roomapi_test.go` : `TestAWatcherSeesWhoComesAndGoes` | file de 1000 messages, les suivants perdus (pas de limite en octets ni de délai de vidage) ; pas de fermeture 1011 (pas de back séparé à perdre) | — |
| OpenAPI, swagger-ui (`ENABLE_OPENAPI_ENDPOINT`) | SwaggerController.ts | validé | `swagger_doc.spec.ts` | swagger-ui depuis un CDN (5.32.6) | — |
| Front sans `ASSETS_URL` (mode local) | FrontAssets.ts:79 | absent | `httpapi/front.go:36` | toutes les pages répondent 503 | mode local, ou `ASSETS_URL` obligatoire |
| Fichiers du front relayés en repli (`/assets`, `/static`, `/resources`, `/collections`, `iframe_api.js`, `service-worker-prod.js`) ; plus de `service-worker-dev.js` ni de `notification-service-worker.js` (576bcb9df6, 7dfe35f327) | FrontAssets.ts:165 (master) | validé | `httpapi_test.go` : `TestFrontPage` | — | — |
| Variables d'environnement : mêmes noms que TS | EnvironmentVariable*.ts | partiel | `config/config.go` | ports `SERVER_MAP_STORAGE_PORT` (défaut 0) ; `UPLOADER_URL` et `ICON_URL` plus requises ; `EMBEDDED_DOMAINS_WHITELIST` non normalisée ; "" retiré de `window.env` ; `NODE_TLS_REJECT_UNAUTHORIZED=0` sans effet : un certificat auto-signé (LiveKit, S3, admin de test) se donne par `SSL_CERT_FILE`/`SSL_CERT_DIR`, que Go lit seul ; nouvelles, sans équivalent TS : `TRUSTED_PROXIES` et `RESUME_BUFFER_BUDGET_BYTES` (documentées dans `docs/others/self-hosting/env-variables.md`) | aligner ; décision de Yannis s'il faut aussi un interrupteur sans vérification |
| `NODE_ENV` absent de `window.env` (94fd550008) | FrontConfigurationInterface.ts (master) | validé | `config/config_test.go` : `TestDefaults` | le serveur lit toujours `NODE_ENV` pour lui-même (validateur de map-storage, Room API) | — |
| Dockerfile de prod | play/Dockerfile | partiel | `Dockerfile` | voir manque 7 | étape « Déploiement » |
| Sentry serveur : `SENTRY_DSN_PUSHER` (le conteneur play que ce serveur remplace), sinon `SENTRY_DSN` (le back) ; vide : rien n'est envoyé. `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`. Envoyés : chaque `slog.Error` (attributs `actor`, `room`, `space`, `session`, `user`, `world`… en tags, les autres en contexte `attributes`), les panics rattrapées des acteurs et des sessions (pile jusqu'à la panic), les panics et réponses 5xx du handler HTTP principal (`sentryhttp`, sans corps). Nettoyés avant envoi : en-têtes `Authorization`, cookies, `X-Forwarded-For`, paramètres `token`/`jwt`, tout ce qui ressemble à un JWT, un email ou une IPv4. Vidé 2 s à l'arrêt | back/src/server.ts:20, pusher EnvironmentVariable.ts:125 | validé (unitaire) | `sentryx_test.go` (3 tests) | `SENTRY_TRACES_SAMPLE_RATE` lu mais pas de traces (une requête WebSocket dure toute la visite) ; ports map-storage et uploader dédiés non couverts par le middleware HTTP (leurs `slog.Error` le sont) | — |
| IP cliente : l'adresse la plus à droite de `X-Forwarded-For` qui n'est pas un proxy de confiance (`TRUSTED_PROXIES`, CIDR séparés par des virgules, plages privées par défaut), le pair compris ; une seule fonction (`netguard.ClientIP`) pour le WebSocket, le socket admin et `/me` | — | validé (unitaire) | `netguard_test.go` : `TestClientIPTrustsOnlyTheProxies` | **écart volontaire** : le TS prend la première entrée, que le client écrit lui-même (un ban par IP se contournait) | — |
| Clients HTTP sortants : chacun a un délai (file analytics : `ANALYTICS_TIMEOUT_MS` ; gabarit WAM : 10 s) ; une seule `httpx.WriteJSON`, qui n'échappe pas le HTML, comme `JSON.stringify` | — | validé (unitaire) | `httpx_test.go`, `analytics_test.go` : `TestASlowAdminDoesNotHoldTheQueue` | — | — |
| Erreurs ignorées : journalisées en Warn et comptées dans `server_ignored_errors_total{op}` (un contexte annulé ne compte pas) ; messages du client non gérés : comptés dans `server_unhandled_messages_total{type}`, le premier de chaque type en Warn, une fois par processus | — | validé (unitaire) | `metrics_test.go` : `TestAnIgnoredErrorIsCountedUnlessItIsACancellation`, `TestAnUnhandledMessageIsCountedEachTimeAndLoggedOncePerType` | le TS les avalait ou les journalisait en Debug | — |
| Panic dans une salle ou un space : comptée (`server_actor_panics_total{kind}`), envoyée à Sentry, puis tous les membres sont éjectés (Kick, `WS_CLOSE_CODE_SESSION_DESTROYED`) et les nouveaux refusés jusqu'à ce que l'acteur soit vide et abandonné | back : exception d'un handler | validé (unitaire) | `core/recovery_test.go` : `TestAPanicInARoomKicksEveryoneAndRefusesNewcomers`, `TestAPanicInASpaceKicksItsMembersAndRefusesNewcomers` ; `actor_test.go` | **écart volontaire** : le TS ferme la connexion de l'émetteur et continue ; l'acteur Go ne connaît pas l'émetteur, et une panic peut laisser l'état à moitié modifié : le comportement d'un crash du back, limité à une salle | — |
| Télémétrie, drain (`DRAIN_TIMEOUT_MS`) | — | absent | — | — | — |

## LiveKit

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Stratégie initiale WebRTC ; sans LiveKit configuré, WebRTC quelle que soit la taille | AbstractCommunicationState.ts:45-106 | validé | `core/space_test.go:32`, `space_livekit_test.go` (`TestWithoutLiveKitABubbleStaysOnWebRTCWhateverItsSize`) | — | — |
| Bascule au-delà de `MAX_USERS_FOR_WEBRTC` ou sur CPU limité (bulle de 3+) | TransitionPolicy.ts:37-55 | validé (unitaire) | `space_livekit_test.go` (bascule à 5, CPU limité à 3) | — | `livekit.spec.ts` sur la stack |
| Retour en WebRTC 20 s après, annulé si la condition revient | CommunicationManager.ts:286-396 | validé (unitaire) | `TestABubbleGoesBackToWebRTCOnlyOnceItStayedSmall`, `TestSomeoneComingBackKeepsTheBubbleOnLiveKit` (horloge factice : minuteries sur `actor.After` et `core.Clock`) | bloqué pendant un enregistrement (voir « Enregistrement ») | — |
| `switchMessage`, puis `finalizeSwitchMessage` de l'ancienne stratégie 5 s après | StateLifecycleManager.ts:52-84 | validé (unitaire) | idem | — | — |
| Twirp ListRooms, CreateRoom, DeleteRoom ; jeton HS256 (grants, identité `spaceUserId`, métadonnées) | LivekitService.ts:110-163 | validé (unitaire) | `livekit/livekit_test.go` (2 tests) | **écart volontaire** : la salle est supprimée à la finalisation du retour en WebRTC (le TS la laissait orpheline) | — |
| Invitations (membres du filtre et observateurs), déconnexion, salle supprimée quand plus personne ne diffuse | LivekitCommunicationStrategy.ts:60-229 | validé (unitaire) | `TestABubblePastFourMovesToLiveKitAndEveryoneGetsAToken`, `TestAMegaphoneRoomLastsAsLongAsSomeoneSpeaks` | — | spec |
| Relance `meetingConnectionRestart` sans pair : nouveau jeton | LivekitCommunicationStrategy.ts:250-263 | validé (unitaire) | `core/recovery_test.go` : `TestAMemberThatLostLiveKitIsInvitedAgain` | — | — |
| Identifiants LiveKit par monde (`api/livekit/credentials`) | StateFactory.ts:48-75 | validé (tests Go) | voir A24 (table de l'admin) | — | — |

## Enregistrement

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| start/stop, une session par space, arrêt par le seul recorder, arrêts automatiques, pas de retour WebRTC pendant l'enregistrement | RecordingManager.ts | validé | `recording.spec.ts` 5/5 (17/10) ; `core/space_recording_test.go` (3, `waitStatus` attend le statut courant) | état de l'egress interrogé chaque seconde au lieu du webhook | — |
| `canRecord`, `recording.buttonState` | LocalAdmin.ts:69-75,236,342 | validé | `admin_test.go` ; `recording.spec.ts:144,358` | — | — |
| Liste, suppression, vignettes, URL signée S3 | RecordingService.ts | validé | `recording.spec.ts` ; `s3_test.go` (signature AWS) ; `recordings_test.go` | — | — |
| Notification à l'admin `api/recordings/events` | back AdminApi.ts:35-65 | validé (tests Go) | voir A23 (table de l'admin) | — | — |

## Room API

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Serveur gRPC h2c (`ROOM_API_PORT`, ou `SERVER_ROOM_API_PORT`, servi si `ROOM_API_SECRET_KEY`), clé `X-API-Key`, room sous `FRONT_URL` | play/src/server.ts:139-150, AuthenticationGuard.ts, LocalAuthenticator.ts | validé (unitaire) | `roomapi_test.go` : `TestTheRoomAPIWantsItsKeyAndARoomOfThisServer` | autorisation par l'admin : voir A25 ; `room-api.spec.ts` à jouer | spec J3c |
| readVariable, saveVariable (sans `writableBy`, variable non déclarée refusée, relecture de la carte) | RoomApiServer.ts, GameRoom.ts:672-735 | validé (unitaire) | `core/roomapi_test.go` (3 tests), `roomapi_test.go` | — | spec |
| listenVariable, listenToEvent, broadcastEvent (ciblé : joueurs seulement) | RoomManager.ts:615-748 | validé (unitaire) | `core/roomapi_test.go`, `roomapi_test.go` | un écouteur trop lent est coupé (RESOURCE_EXHAUSTED) au-delà de 256 messages en attente | spec |

## Persistance

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Variables de room : hash Redis à la clé de l'URL, `""` donne HDEL | RedisVariablesRepository.ts:15-30 | implémenté non vérifié (format) ; validé (règles) | `core/roomvars_test.go:8`, `store/store_test.go` | pas de test du format Redis réel | test contre le faux Redis |
| Variables de joueur `pr_<uuid>_\|@\|_<room>` avec `"<expiry>:<0\|1>:<json>"` | PlayerVariables.ts:29-95 | implémenté non vérifié | `ws/variables.go:196-247` | portée monde `pw_` absente ; pas d'EXPIRE sur la clé | test aller-retour ; `pw_` avec `group` |
| Écriture pendant une coupure Redis | node-redis : file hors ligne rejouée ; `variables.spec.ts:113-148` | validé (cœur) | `store_test.go` : `TestAVariableWrittenWhileRedisIsDownIsStoredWhenItComesBack`, `TestFlushTellsHowManyWritesAreLost` | dernière valeur par champ, réessai sans fin, vidage à l'arrêt (10 s) ; « storage works » à jouer par le socle | — |
| Room démarrée pendant une coupure Redis | TS attend (la salle échoue) | validé (cœur) | `core/roomvars_test.go` : `TestARoomStartedWhileRedisWasDownTakesTheStoredValuesOnceItIsBack` | la salle démarre avec les valeurs de la carte, redemande toutes les 2 s, puis prend la valeur stockée de chaque variable que personne n'a écrite entre-temps (une écriture pendant la coupure l'emporte sur la valeur stockée) | — |
| Variables de zone, état des spaces | en mémoire (TS aussi) | validé | `core/roommap_test.go` | ne survivent pas à un redémarrage, comme en TS | — |
| Éditions de carte | MapsManager.ts : écho avant écriture, sauvegarde toutes les 15 s | validé | écriture avant l'écho, par fichier temporaire puis rename (`mapstorage.go`) | plus durable que le TS | — |
| Cartes sur S3 ; fichiers de l'uploader | fileSystem.ts, uploader | absent | disque seulement | bloquant si la prod les utilise | décider avec l'équipe |

## Métriques et analytics

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `/metrics` (501 sans jeton ni port, 401) et pprof | PrometheusController.ts | validé | `metrics_test.go` : `TestMetricsAreClosedUnlessOnTheirOwnPortOrBehindAToken`, `TestTheProfilerWantsTheMetricsToken` | pprof derrière le même jeton, 404 sans jeton | — |
| `nb_sockets`, `nb_clients_per_room`, `nb_rooms`, `nb_spaces` | GaugeManager.ts | implémenté non vérifié | `metrics.go` | une série au lieu de deux jobs (pusher, back) | revoir les tableaux de bord |
| `nb_publishers_per_space`, `nb_watchers_per_world` | back GaugeManager.ts:38-69 | absent | — | bug TS (`world` contre `name`) | définir la sémantique |
| `nodejs_*` | collectDefaultMetrics | remplacé par `go_*` | — | alertes à revoir | — |
| Analytics du pusher (A22) : file (lots, 4 essais, 422 découpé un par un, débordement des plus anciens, drain à l'arrêt), événements du front (liste blanche du catalogue, source, `eventId`, au plus 100 par message), intervalles mesurés par le serveur (`timed_event.open/close`, `user.connected`/`user.disconnected`, plafond de 32), échantillons vidéo, `analyticsEventsEnabled`, capacité `api/analytics/events-batch` | AnalyticsEventsQueue.ts, AnalyticsReportMessageHandler.ts, AnalyticsTimedEventTracker.ts | validé | `analytics_test.go` (5 tests, dont la comparaison au catalogue TS) ; `ws/analytics_test.go` : `TestTheFrontsEventsReachTheAdminSignedByTheServer` | propriétés validées contre les schémas du catalogue (JSON Schema généré depuis zod, `catalog.json`, fraîcheur testée) ; une session reprise garde son `user.connected` (le TS en ouvre un par socket) ; pas de compteurs de la file dans `/metrics` | — |
| Analytics du back : `meeting.participation.ended`, `meeting.ended` (SessionAnalytics : présence par filtre ou observation, actifs, rangs, temps de parole, secondes WebRTC/LiveKit, fermeture `back_shutdown` à l'arrêt), file `back:<hôte>` sans capacité | back/src/Model/SessionAnalytics.ts, CommunicationManager.ts:595 | validé | `meeting_test.go` (2 tests), `space_analytics_test.go` (2 tests) | le transport n'est jamais `NONE` (le Go n'a que WEBRTC et LIVEKIT) | — |
| Télémétrie d'installation | TelemetryService.ts | absent | — | installations OSS plus comptées | requête quotidienne |
