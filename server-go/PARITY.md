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

Mise à jour : 2026-10-17, sur `12a438749`. L'inventaire a été fait par quatre agents en lecture seule (TS et Go), puis relu. Les résultats Playwright cités viennent de `JOURNAL.md` (J1 à J3a) ; J3b reste à rejouer (voir le journal).

## Verdict

- **OSS (LocalAdmin)** : J1, J2 et J3a sont validés par Playwright. J3b est codé mais pas encore validé. LiveKit, l'enregistrement et la Room API sont absents.
- **SaaS** : **remplacement interdit.** Le serveur refuse de démarrer avec `ADMIN_API_URL` (`cmd/server/main.go:53-55`) et il n'a aucun client admin. Le white label n'isole pas encore les cartes par domaine, ni les spaces par monde.

## Manques bloquants, par ordre

1. **Client de l'admin distante absent.** Concerne `/api/capabilities`, `/api/room/access` (et ses variantes `ErrorApiData`), `/api/map` côté pusher et back, ban, report, tags, sameWorld, membres, refresh OAuth, analytics. Attend le contrat `dev/contracts/admin-api.md` de la session socle.
2. **LiveKit absent.** Pas de bascule au-delà de `MAX_USERS_FOR_WEBRTC`, pas d'invitation, pas de jeton : grandes bulles, mégaphone et partage d'écran à plusieurs passent en P2P complet. L'enregistrement en dépend.
3. **Durabilité des variables plus faible que le TS** :
   - une écriture faite pendant une coupure de Redis est perdue en silence ;
   - la file jette au-delà de 4 096 et n'est pas vidée à l'arrêt ;
   - une room démarrée pendant une coupure peut écraser les valeurs persistées.
4. **Isolation des tenants** :
   - clé de stockage sans le domaine (`USE_DOMAIN_NAME_IN_PATH`) ;
   - clé de space faite de l'origine et non du `world` de l'admin ;
   - `roomsFromSameWorld` qui liste tout map-storage.
5. **Room API gRPC absente** : intégrations externes, écouteurs d'événements et de variables.
6. **Modération** : le ban n'est ni persistant ni par IP ; `banIpPreview` est absent ; `reportPlayer` et `playGlobalMessage` sont jetés.
7. **Front servi seulement derrière un conteneur front** : sans `ASSETS_URL`, toutes les pages répondent 503. Or contrib/docker et le chart Helm ne fixent pas `ASSETS_URL` par défaut.
8. **Image de production** :
   - `API_VERSION=dev` si la CI ne passe pas de build-arg ;
   - `STORAGE_DIRECTORY` non inscriptible en nonroot ;
   - ports map-storage (3002) et uploader (3003), attendus par le chart en mode `server`, non servis par défaut.
9. **Uploader absent** : fichiers du chat, messages audio.
10. **Matrix** : provisionnement Synapse, salons des zones (`/roomArea`, `resourceUrl`), entrée et sortie de zone, `updateChatId`.
11. Jitsi JWT et BBB, emotes, `itemEvent`, `entityMessage`, analytics.

## Connexion, salle, mouvements

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Upgrade WS `/ws/room`, rejets (version, jeton, texture) | IoSocketController.ts:252, 488-507 | validé | `ws/server_test.go:162,227` ; J1 Playwright | `WorldConnectionMessage` jamais émis (remplacé par ErrorScreen) | tester les autres rejets |
| joinRoom → RoomJoinedMessage | PSM:393 → BSM:191 | partiel | `ws/session.go:431-460`, `core/room.go:40` ; J1 | pas d'`item` (états d'objets) | itemEvent |
| Reprise de transport (connectionId) | PusherWebSocket.replaceSocket | validé | `ws/server_test.go:189,218`, `buffers_test.go:83,103` | — | — |
| userMoves, viewport, setPlayerDetails | IOC:613-647 | validé | `core/room_test.go:81,125,181`, `ws/server_test.go:322` | une position nil devient (0,0) | refuser les champs absents |
| Bulles (groupes, verrou) | BSM:500-527, 1253 | validé | `core/room_test.go:117,154` ; J1 | — | — |
| Suivre (request, confirm, abort) | BSM:1208-1234 | validé | `core/roomplayers_test.go:48` ; J3b à rejouer | pas de sortie de zone autour du meneur | — |
| askPosition (MoveTo, Locate) | BSM:1313 | implémenté non vérifié | `core/room.go:93` | aucun test | test |
| Emotes | BSM:1196 | absent (reporté depuis J1) | message jeté | les autres ne voient pas l'emote | porter |
| itemEvent, entityMessage | BSM:279, 325 | absent | message jeté | objets interactifs et sons d'entité sans effet | porter |
| abortQuery | IOC:1046 | absent | message jeté | un joinSpace abandonné laisse le joueur membre | gérer |
| Invitations à une réunion | BSM:1355-1391 | validé (cœur) | `core/roomvars_test.go:52` ; J3b à rejouer | — | — |

## Spaces, chat, Matrix

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| join/leave space, filtres, updateSpaceUser, metadata | PSM:497-1405 | validé | `core/space_test.go`, `space_filter_test.go` ; J2, `scripting_spaces` | rejoindre deux fois renvoie un succès | — |
| SpaceState (main levée, parole, sondages, setKind) | BSp:693-725 | validé | `core/space_filter_test.go:116-166` | revokeFloor, deletePoll et questions non testés | tests |
| Chat de bulle (spaceMessage, isTyping) | EventProcessorInit.ts:5-45 | implémenté non vérifié | `ws/spaces.go:172,387` ; E2E vert (J2) | signature (nom, woka) non testée | test |
| chatMembersQuery, roomTagsQuery | PSM:1540, 1321 | partiel (réponse vide) | `ws/session.go:531,542` | conforme en OSS, vide en SaaS | client admin |
| searchTags, getMember, searchMember, refresh OAuth | PSM:1487-1642 | absent | « Query not supported » | searchTags répond `[]` en OSS chez TS | répondre `[]` ; client admin |
| Matrix : `matrixUserId`, SSO, `/matrix-callback` | AuthenticateController.ts:322-405 | validé | `httpapi/oidc_test.go:101,132,142` | — | — |
| Matrix : provider, salons des zones, enter/leaveChatRoomArea, updateChatId | MatrixProvider.ts, PSM:1703-1758 | absent | — | zones de chat sans salon | porter avec `/roomArea` |

## Éditeur de carte et map-storage

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Éditions hors de l'acteur de salle, file par carte | — (relecture du 15/10) | validé | `mapedit_test.go` (salle livrée pendant l'écriture, ordre, cartes indépendantes) | annoncée à la seule salle de l'éditeur | — |
| Version attendue à l'écriture | — | validé | `mapstorage/edit_test.go` (v10 n'écrase pas v11, abandon après 5 essais) | — | — |
| Droits : zones, entités, réglages, métadonnées | MSS:154-405 | validé | `mapedit_test.go` ; J3a `area_rights`, `custom_entity_rights` | suppression d'entité ouverte à tous, comme MSS | — |
| Revendication de zone personnelle | MSS:232 | validé | `mapedit_test.go` (3 tests) ; J3a | `personal_area_claim:20` échoue aussi en TS | rejouer |
| Entités personnalisées | MSS:346-370 | validé | `mapedit_test.go` (3 tests) | — | — |
| Rattrapage `lastCommandId` | BSM:132-185 | validé | `mapstorage/edit_test.go`, `core/roommap_test.go:55` | — | — |
| Variables de zone (verrou, maxUsers) | GR:864 | partiel | `core/roommap_test.go` (5 tests) | seule la clé `lock` est acceptée | toute clé autorisée |
| HTTP map-storage : upload, PUT, PATCH, DELETE, move, copy, download, maps | MS UploadController.ts | validé | `mapstorage_test.go:89-178` ; J3a | `/maps` renvoie une `version` factice (`go-1`) ; corps de PATCH sans limite | vrai hash ; limite |
| `/private/files` (JWT) | VerifyJwt.ts:33 | partiel | `mapstorage_test.go:192` | `PATH_PREFIX` ignoré, d'où un 404 derrière `/map-storage` | lire `PATH_PREFIX` |
| `USE_DOMAIN_NAME_IN_PATH` | PathMapper.ts:76 | absent | — | deux domaines partagent la même carte | **en cours** |
| `WAM_TEMPLATE_URL`, `resourceUrl` (DELETE), webhooks, validateur d'API key, S3 | MS Services | absent | JOURNAL J3a | SaaS : toute écriture répond 401 | avec le contrat admin |
| embeddableWebsite, mapStorageJwt, roomsFromSameWorld | PSM:1420, 1760, 1346 | implémenté non vérifié | `ws/queries.go` ; J3a `start_exit:40` | roomsFromSameWorld liste tout map-storage | filtrer par domaine |

## Variables, scripts, modération

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Variables de room (Redis ou mémoire, redémarrage) | GR:672, RedisVariablesRepository.ts | validé (cœur) | `core/roomvars_test.go:8`, `ws/variables_test.go`, `store_test.go` ; J3b à rejouer | — | rejouer `variables` |
| Variables de joueur `pr_` | PlayerVariables.ts | partiel | `ws/variables.go:196` | pas de portée monde `pw_` | avec l'admin (`group`) |
| sendEvent, `/global/event`, `/rooms` | BSM:709, AdminController.ts | partiel | `core/roomplayers_test.go:26` | pas d'écouteurs Room API ; routes admin non testées | Room API |
| Kick (message final, puis fermeture) | — | validé | J3a `map_storage_upload:85` passe, rejoué seul | — | — |
| Ban | PSM:772-821 | partiel | `core/roomplayers_test.go:5` | toujours un kick : ni persisté, ni par IP | client admin |
| reportPlayer, playGlobalMessage, banIpPreview | PSM:756, 1177, 986 | absent | messages jetés | — | porter |
| mute/kickOff réservés aux admins | EPI-p:5-53 | implémenté non vérifié | `ws/spaces.go:179-205` | frontière de sécurité sans test | tests |

## HTTP, configuration, déploiement

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `/ping`, `/ready` | PingController.ts:39,58 | implémenté non vérifié | `httpapi.go:44-45` | pas de test ; `/ping-backs` absent | test |
| `/metrics` | PrometheusController.ts | implémenté non vérifié | `metrics.go` | moins de métriques ; `/debug/pprof` sans jeton | protéger pprof |
| OpenID (login, callback, logout, `/me`) | AuthenticateController.ts | validé | `httpapi/oidc_test.go` ; J2 `oidc` | id_token non vérifié ; code verifier en clair (ponytail) | revue sécurité |
| `/profile-callback`, `access_key`, challenge Cloudflare, `save-*` | AuthenticateController.ts:470, FrontController.ts | absent | — | SaaS | avec l'admin |
| `/room/refresh`, `/message`, `/external-module/event`, `/ws/admin/rooms` | AdminController.ts, IOC:86 | absent | — | SaaS | avec l'admin |
| OpenAPI, swagger-ui | SwaggerController.ts | absent | — | J3c `swagger_doc` | J3c |
| Front sans `ASSETS_URL` (mode local) | FrontAssets.ts:79 | absent | `httpapi/front.go:36` | toutes les pages répondent 503 | mode local, ou `ASSETS_URL` obligatoire |
| Variables d'environnement : mêmes noms que TS | EnvironmentVariable*.ts | partiel | `config/config.go` | ports `SERVER_MAP_STORAGE_PORT` (défaut 0) ; `UPLOADER_URL` et `ICON_URL` plus requises ; `EMBEDDED_DOMAINS_WHITELIST` non normalisée ; "" retiré de `window.env` | aligner |
| Dockerfile de prod | play/Dockerfile | partiel | `Dockerfile` | voir manque 7 | étape « Déploiement » |
| Sentry serveur, télémétrie, drain (`DRAIN_TIMEOUT_MS`) | — | absent | — | — | — |

## LiveKit

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Stratégie initiale WebRTC / Void | AbstractCommunicationState.ts:45-106 | validé (WebRTC seulement) | `core/space_test.go:32,80` | toujours `WEBRTC` (`core/space.go:248`) | garder sans LiveKit configuré |
| Bascule au-delà de `MAX_USERS_FOR_WEBRTC` (4), et sur saturation CPU | TransitionPolicy.ts:37-55 | absent | — | P2P maillé quelle que soit la taille | politique en fonction pure, testée en table |
| Retour en WebRTC différé de 20 s, bloqué pendant un enregistrement | CommunicationManager.ts:286-396 | absent | — | — | minuteur annulable dans l'acteur |
| `switchMessage`, puis `finalizeSwitchMessage` 5 s après | StateLifecycleManager.ts:52-84 | absent | — | — | — |
| Twirp ListRooms, CreateRoom, DeleteRoom | LivekitService.ts:110-163 | absent | — | défaut TS : salle orpheline après un retour en WebRTC (`cleanup` jamais appelé) | appels hors acteur ; supprimer à la finalisation |
| Jeton (HS256, grants, identité `spaceUserId`) et invitation `{token, serverUrl}` | LivekitService.ts:126-153 | absent | — | — | golang-jwt déjà présent |
| Déconnexion, relance `meetingConnectionRestart` | LivekitCommunicationStrategy.ts:101-263 | absent | `ws/spaces.go:223` **ignore la relance en silence** | — | — |
| Mégaphone et diffusion (filtres, `isPublishing`) | Space.ts:310-318 | partiel | `core/space_filter_test.go:18,55,229,268` | N auditeurs = N flux P2P | avec LiveKit |
| Identifiants LiveKit par monde (`api/livekit/credentials`) | StateFactory.ts:48-75 | absent | — | SaaS (LiveKit Cloud) | avec l'admin |

## Enregistrement

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `canRecord` et `recording.buttonState` | LocalAdmin.ts:69-75,236,342 | **réponse factice** | `admin/admin.go:180,244-270` | annoncé dès que les variables S3 sont là, alors que l'enregistrement est toujours refusé | `RecordingConfigured=false` tant que l'egress manque |
| start/stop, sessions, arrêts automatiques, webhook egress | RecordingManager.ts, LivekitWebhookController.ts | absent | `core/space_state.go:228` (`ErrNoRecording`) | — | après LiveKit ; le socle a maintenant l'egress (`--profile recording`) |
| Liste, vignettes, URL signées, suppression S3 | RecordingService.ts | absent | « Query not supported » | — | client S3 SigV4 |
| Réglages d'enregistrement du WAM | MSS:391 | implémenté non vérifié | `wam/wam.go:89` | pas de test de `SetRecording` | test |
| Notification à l'admin `api/recordings/events` | back AdminApi.ts:35-65 | absent | — | webhook client `recording.completed` | avec l'admin |

## Room API

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Serveur gRPC (`ROOM_API_PORT`, h2c), clé `X-API-Key` | play/src/server.ts:139-150, AuthenticationGuard.ts | absent | `SERVER_ROOM_API_PORT` non lu (`dev/stack.yaml:179`) | clients npm et `room-api.spec.ts` cassés | gRPC écrit à la main sur h2c (plan dans le journal) |
| readVariable, listenVariable, saveVariable | RoomApiServer.ts:10-96, GameRoom.ts:672-735 | absent | le cœur `core/roomvars.go` est réutilisable | une room sans joueur ne charge pas ses variables | écouteurs non joueurs |
| broadcastEvent, listenToEvent | RoomManager.ts:711-748 | absent | `Room.SendEvent`, `core/roomplayers_test.go:26` | pas d'écouteurs | idem |

## Persistance

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Variables de room : hash Redis à la clé de l'URL, `""` donne HDEL | RedisVariablesRepository.ts:15-30 | implémenté non vérifié (format) ; validé (règles) | `core/roomvars_test.go:8`, `store/store_test.go` | pas de test du format Redis réel | test contre le faux Redis |
| Variables de joueur `pr_<uuid>_\|@\|_<room>` avec `"<expiry>:<0\|1>:<json>"` | PlayerVariables.ts:29-95 | implémenté non vérifié | `ws/variables.go:196-247` | portée monde `pw_` absente ; pas d'EXPIRE sur la clé | test aller-retour ; `pw_` avec `group` |
| Écriture pendant une coupure Redis | node-redis : file hors ligne rejouée ; `variables.spec.ts:113-148` | partiel | `store/store.go:62-103` : un essai, puis perte journalisée ; la file jette au-delà de 4 096 | **perte silencieuse**, contredit « storage works » | réessayer dans l'ordre, ne jamais jeter, vider à l'arrêt |
| Room démarrée pendant une coupure Redis | TS attend | partiel | `core/roomvars.go:44-49` (`varsOnce`) | garde les valeurs par défaut et peut écraser les valeurs persistées | recharger ou refuser l'écriture persistante |
| Variables de zone, état des spaces | en mémoire (TS aussi) | validé | `core/roommap_test.go` | ne survivent pas à un redémarrage, comme en TS | — |
| Éditions de carte | MapsManager.ts : écho avant écriture, sauvegarde toutes les 15 s | validé | écriture avant l'écho, par fichier temporaire puis rename (`mapstorage.go`) | plus durable que le TS | — |
| Cartes sur S3 ; fichiers de l'uploader | fileSystem.ts, uploader | absent | disque seulement | bloquant si la prod les utilise | décider avec l'équipe |

## Métriques et analytics

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `/metrics` (501 sans jeton ni port, 401) | PrometheusController.ts | implémenté non vérifié | `metrics/metrics.go:48-72` | **`/debug/pprof` sans jeton** sur le port des métriques | protéger |
| `nb_sockets`, `nb_clients_per_room`, `nb_rooms`, `nb_spaces` | GaugeManager.ts | implémenté non vérifié | `metrics.go` | une série au lieu de deux jobs (pusher, back) | revoir les tableaux de bord |
| `nb_publishers_per_space`, `nb_watchers_per_world` | back GaugeManager.ts:38-69 | absent | — | bug TS (`world` contre `name`) | définir la sémantique |
| `nodejs_*` | collectDefaultMetrics | remplacé par `go_*` | — | alertes à revoir | — |
| Analytics (back et pusher), télémétrie d'installation | AnalyticsEventsQueue.ts, TelemetryService.ts | absent | message jeté en silence | SaaS ; installations OSS plus comptées | avec l'admin ; requête quotidienne |
