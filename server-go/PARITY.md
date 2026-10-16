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
- **SaaS** : **remplacement interdit.** Le client de l'admin distante couvre A1, A2, A3, A18 à A21 (17/10), sans parcours SaaS joué. Le white label n'isole pas encore les cartes par domaine, ni les spaces par monde.

## Manques bloquants, par ordre

1. **Admin distante** (contrat `dev/contracts/admin-api.md`) : capacités, `/api/map`, `/api/room/access` (avec ses refus), listes Woka et compagnon, ICE, vérification de domaine (17/10, tests contre un faux admin). Restent : la carte d'une salle tirée de `/api/map` (mondes `/@/`, `wamUrl` par domaine), ban, report, tags, sameWorld, membres, refresh OAuth, analytics, routes et socket appelés par l'admin, challenge Cloudflare, `/profile-callback`, `access_key`.
2. **LiveKit** : la bascule, les jetons et les salles sont codés et testés en unitaire (17/10) ; les specs `livekit` et `map_editor_livekit` restent à jouer. L'enregistrement en dépend et manque encore.
3. **Durabilité des variables** : les écritures ne se perdent plus pendant une coupure (corrigé le 17/10). Reste qu'une room démarrée pendant une coupure garde les valeurs par défaut (`varsOnce`).
4. **Isolation des tenants** :
   - clé de stockage sans le domaine (`USE_DOMAIN_NAME_IN_PATH`) ;
   - clé de space faite de l'origine et non du `world` de l'admin ;
   - `roomsFromSameWorld` qui liste tout map-storage.
5. **Modération** : le ban n'est ni persistant ni par IP ; `banIpPreview` est absent ; `reportPlayer` et `playGlobalMessage` sont jetés.
6. **Front** : servi depuis `ASSETS_INTERNAL_URL` (un conteneur front nginx est toujours à côté, décision du socle du 17/10) ; pas de mode local.
7. **Image de production** : `/maps` inscriptible, ports 3000 à 3003 et 50051, `healthcheck`, `API_VERSION` obligatoire (la CI le calcule) ; reste à construire en CI et à déployer par `deploy`.
8. **Uploader** : en mémoire seulement (pas de S3 ni de Redis).
9. **Matrix** : provisionnement Synapse, salons des zones (`/roomArea`, `resourceUrl`), entrée et sortie de zone, `updateChatId`.
10. Jitsi JWT et BBB, emotes, `itemEvent`, `entityMessage`, analytics.

## Admin distante (A1 à A31 de `dev/contracts/admin-api.md`)

| Appel | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|
| A1 capacités : au démarrage, nouvelle tentative toutes les `ADMIN_API_RETRY_DELAY` (404 compris), puis `window.capabilities` | validé (unitaire) | `admin/http_test.go` : `TestTheServerWaitsForTheAdminsCapabilities` | — | parcours SaaS |
| A3 `/api/room/access` : succès, refus `ErrorApiData` (renvoyé tel quel par `/me`, écran d'erreur au WebSocket), `ROOM_ACCESS_ERROR` / `ROOM_ACCESS_VALIDATION` construits localement | validé (unitaire) | `TestTheAdminLetsAMemberIn`, `TestTheAdminsRefusalReachesTheFrontAsIs`, `TestAnUnreachableOrConfusedAdminIsAnErrorScreenNotACrash`, `httpapi_test.go` | délai de 10 s par appel (le TS n'en avait aucun : écart volontaire) | — |
| A2 `/api/map` : page, `/map` (sans `thirdParty`), JWT toléré expiré, `MAP_VALIDATION` | partiel | `TestTheAdminDescribesTheMap`, `TestTheAdminsRefusalAndSecretsOnTheHTTPRoutes` | la salle ne tire pas encore sa carte de `/api/map` (côté back) ; pas de redirection, metatags ni couleurs dans la page | carte de salle via A2 |
| A18 ICE (`ADMIN_URL`), A19 Woka, A20 compagnon, A21 vérification de domaine | validé (unitaire) | `TestCapabilitiesChooseBetweenTheAdminAndTheServer` | — | — |
| A4 à A17, A22 à A31 | absent | — | voir les manques bloquants | suivant le contrat |

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
| `/private/files` (JWT) | VerifyJwt.ts:33 | validé | `mapstorage_test.go` (avec et sans `PATH_PREFIX`) | — | — |
| `USE_DOMAIN_NAME_IN_PATH` | PathMapper.ts:76 | absent | — | le domaine de la clé vient du `wamUrl` donné par l'admin, ou de l'hôte HTTP ; sans admin, toutes les salles ont l'hôte de `PUBLIC_MAP_STORAGE_URL` | tranche admin |
| `WAM_TEMPLATE_URL` | UploadController.ts:604 | validé | `mapstorage_test.go` : `TestAMapUploadedAloneStartsFromTheWAMTemplate` | — | — |
| `resourceUrl` (DELETE), webhooks, validateur d'API key, S3 | MS Services | absent | JOURNAL J3a | SaaS : toute écriture répond 401 | avec le contrat admin et Matrix |
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
| `/ping` (liveness), `/ready` (readiness : 503 tant que le gabarit du front manque), `/api-version` (le hash du protocole, pour le pipeline SaaS) | PingController.ts:39,58 | validé | `httpapi_test.go` : `TestProbesTellLivenessReadinessAndTheProtocol` | `/ping-backs` absent (pas de back séparé) | — |
| Sous-commande `healthcheck` (GET 127.0.0.1:`PUSHER_HTTP_PORT`/ping, code de sortie) pour les `service_healthy` de compose | — (exigence du socle) | implémenté non vérifié | `cmd/server/main.go` | — | essayer en compose |
| Ports : WS 3001, map-storage 3002 et uploader 3003 actifs par défaut, Room API 50051 si `ROOM_API_SECRET_KEY` | chart `server.enabled` | implémenté non vérifié | `config.go`, `Dockerfile` (EXPOSE) | — | `deploy` OSS |
| `PATH_PREFIX` de map-storage (fichiers privés derrière `/map-storage`) | VerifyJwt.ts:33 | validé | `mapstorage_test.go` : `TestPrivateFilesBehindAPathPrefix` | — | — |
| Uploader : messages audio (60 s), fichiers du chat, CORS `ALLOWED_CORS_ORIGIN`/`PLAY_URL`, `ENABLE_CHAT_UPLOAD`, `UPLOAD_MAX_FILESIZE` | uploader/src/Controller/FileController.ts | partiel | `uploader_test.go` (2 tests) | en mémoire (256 Mo au plus), sans S3 ni Redis : perdu au redémarrage ; pas de limite par l'admin (`api/limit/fileSize`) | S3/Redis si la prod sert des fichiers |
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
| Stratégie initiale WebRTC ; sans LiveKit configuré, WebRTC quelle que soit la taille | AbstractCommunicationState.ts:45-106 | validé | `core/space_test.go:32`, `space_livekit_test.go` (`TestWithoutLiveKitABubbleStaysOnWebRTCWhateverItsSize`) | — | — |
| Bascule au-delà de `MAX_USERS_FOR_WEBRTC` ou sur CPU limité (bulle de 3+) | TransitionPolicy.ts:37-55 | validé (unitaire) | `space_livekit_test.go` (bascule à 5, CPU limité à 3) | — | `livekit.spec.ts` sur la stack |
| Retour en WebRTC 20 s après, annulé si la condition revient | CommunicationManager.ts:286-396 | validé (unitaire) | `TestABubbleGoesBackToWebRTCOnlyOnceItStayedSmall`, `TestSomeoneComingBackKeepsTheBubbleOnLiveKit` | pas encore bloqué par un enregistrement (absent) | avec l'enregistrement |
| `switchMessage`, puis `finalizeSwitchMessage` de l'ancienne stratégie 5 s après | StateLifecycleManager.ts:52-84 | validé (unitaire) | idem | — | — |
| Twirp ListRooms, CreateRoom, DeleteRoom ; jeton HS256 (grants, identité `spaceUserId`, métadonnées) | LivekitService.ts:110-163 | validé (unitaire) | `livekit/livekit_test.go` (2 tests) | **écart volontaire** : la salle est supprimée à la finalisation du retour en WebRTC (le TS la laissait orpheline) | — |
| Invitations (membres du filtre et observateurs), déconnexion, salle supprimée quand plus personne ne diffuse | LivekitCommunicationStrategy.ts:60-229 | validé (unitaire) | `TestABubblePastFourMovesToLiveKitAndEveryoneGetsAToken`, `TestAMegaphoneRoomLastsAsLongAsSomeoneSpeaks` | — | spec |
| Relance `meetingConnectionRestart` sans pair : nouveau jeton | LivekitCommunicationStrategy.ts:250-263 | implémenté non vérifié | `core/space_livekit.go` (`restartLiveKit`), `ws/spaces.go` | — | test |
| Identifiants LiveKit par monde (`api/livekit/credentials`) | StateFactory.ts:48-75 | absent | — | SaaS (LiveKit Cloud) | avec l'admin |

## Enregistrement

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `canRecord` et `recording.buttonState` | LocalAdmin.ts:69-75,236,342 | validé (masqué) | `admin_test.go` : `TestNoRecordingIsOfferedWhileThisServerCannotRecord` | bouton masqué tant que ce serveur n'enregistre pas (`recordingSupported`) | à ouvrir avec l'egress |
| start/stop, sessions, arrêts automatiques, webhook egress | RecordingManager.ts, LivekitWebhookController.ts | absent | `core/space_state.go:228` (`ErrNoRecording`) | — | après LiveKit ; le socle a maintenant l'egress (`--profile recording`) |
| Liste, vignettes, URL signées, suppression S3 | RecordingService.ts | absent | « Query not supported » | — | client S3 SigV4 |
| Réglages d'enregistrement du WAM | MSS:391 | implémenté non vérifié | `wam/wam.go:89` | pas de test de `SetRecording` | test |
| Notification à l'admin `api/recordings/events` | back AdminApi.ts:35-65 | absent | — | webhook client `recording.completed` | avec l'admin |

## Room API

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Serveur gRPC h2c (`ROOM_API_PORT`, ou `SERVER_ROOM_API_PORT`, servi si `ROOM_API_SECRET_KEY`), clé `X-API-Key`, room sous `FRONT_URL` | play/src/server.ts:139-150, AuthenticationGuard.ts, LocalAuthenticator.ts | validé (unitaire) | `roomapi_test.go` : `TestTheRoomAPIWantsItsKeyAndARoomOfThisServer` | autorisation par l'admin absente (`api/room-api/authorization`) ; `room-api.spec.ts` à jouer | spec J3c ; admin |
| readVariable, saveVariable (sans `writableBy`, variable non déclarée refusée, relecture de la carte) | RoomApiServer.ts, GameRoom.ts:672-735 | validé (unitaire) | `core/roomapi_test.go` (3 tests), `roomapi_test.go` | — | spec |
| listenVariable, listenToEvent, broadcastEvent (ciblé : joueurs seulement) | RoomManager.ts:615-748 | validé (unitaire) | `core/roomapi_test.go`, `roomapi_test.go` | un écouteur trop lent est coupé (RESOURCE_EXHAUSTED) au-delà de 256 messages en attente | spec |

## Persistance

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| Variables de room : hash Redis à la clé de l'URL, `""` donne HDEL | RedisVariablesRepository.ts:15-30 | implémenté non vérifié (format) ; validé (règles) | `core/roomvars_test.go:8`, `store/store_test.go` | pas de test du format Redis réel | test contre le faux Redis |
| Variables de joueur `pr_<uuid>_\|@\|_<room>` avec `"<expiry>:<0\|1>:<json>"` | PlayerVariables.ts:29-95 | implémenté non vérifié | `ws/variables.go:196-247` | portée monde `pw_` absente ; pas d'EXPIRE sur la clé | test aller-retour ; `pw_` avec `group` |
| Écriture pendant une coupure Redis | node-redis : file hors ligne rejouée ; `variables.spec.ts:113-148` | validé (cœur) | `store_test.go` : `TestAVariableWrittenWhileRedisIsDownIsStoredWhenItComesBack`, `TestFlushTellsHowManyWritesAreLost` | dernière valeur par champ, réessai sans fin, vidage à l'arrêt (10 s) ; « storage works » à jouer par le socle | — |
| Room démarrée pendant une coupure Redis | TS attend | partiel | `core/roomvars.go:44-49` (`varsOnce`) | garde les valeurs par défaut et peut écraser les valeurs persistées | recharger ou refuser l'écriture persistante |
| Variables de zone, état des spaces | en mémoire (TS aussi) | validé | `core/roommap_test.go` | ne survivent pas à un redémarrage, comme en TS | — |
| Éditions de carte | MapsManager.ts : écho avant écriture, sauvegarde toutes les 15 s | validé | écriture avant l'écho, par fichier temporaire puis rename (`mapstorage.go`) | plus durable que le TS | — |
| Cartes sur S3 ; fichiers de l'uploader | fileSystem.ts, uploader | absent | disque seulement | bloquant si la prod les utilise | décider avec l'équipe |

## Métriques et analytics

| Fonction | Contrat TS | État | Preuve | Écart | Prochaine action |
|---|---|---|---|---|---|
| `/metrics` (501 sans jeton ni port, 401) et pprof | PrometheusController.ts | validé | `metrics_test.go` (2 tests) | pprof derrière le même jeton | — |
| `nb_sockets`, `nb_clients_per_room`, `nb_rooms`, `nb_spaces` | GaugeManager.ts | implémenté non vérifié | `metrics.go` | une série au lieu de deux jobs (pusher, back) | revoir les tableaux de bord |
| `nb_publishers_per_space`, `nb_watchers_per_world` | back GaugeManager.ts:38-69 | absent | — | bug TS (`world` contre `name`) | définir la sémantique |
| `nodejs_*` | collectDefaultMetrics | remplacé par `go_*` | — | alertes à revoir | — |
| Analytics (back et pusher), télémétrie d'installation | AnalyticsEventsQueue.ts, TelemetryService.ts | absent | message jeté en silence | SaaS ; installations OSS plus comptées | avec l'admin ; requête quotidienne |
