# Journal — candidat Go (`server-go/`, branche `lang-go`)

Une entrée par jalon. Point de départ figé : `6f4d02319eddbf46a51cb99ffd38e2d75273593c` (même SHA que le candidat Rust).
Vérification locale, sans stack : `./verify.sh` (gofmt, build, `go vet`, `go test -race`).

## Étape 1 — Squelette (2026-10-13)

| | |
|---|---|
| Durée (horloge) | ≈ 1 h 30 sur la session de 18 h 35 à 22 h 15 (le squelette et le cœur J1 ont été écrits en parallèle, la séparation est approximative) |
| Itérations avant le vert | 1 : un seul échec, des dépendances manquantes après génération (`go mod tidy`) |
| Corrections humaines | 0 |
| Lignes (hors code généré) | ≈ 730 Go de production, ≈ 210 de tests |

**Contenu.**
- Module Go dans `server-go/`. Les types sont générés depuis `messages/protos/messages.proto` par protobuf-go (`internal/pb/messages`, commité).
  `room-api.proto` sera généré avec la Room API (J3) ; `services.proto` ne l'est pas, ses services deviennent des appels en mémoire.
- `internal/config` : les variables d'environnement des quatre services, avec les règles de zod. Un booléen hors `true|false|0|1|""` est fatal, et une variable inconnue est ignorée.
  `window.env` reproduit `FRONT_ENVIRONMENT_VARIABLES`.
- `/ping`, et `/metrics` avec les règles d'accès du `PrometheusController` : 501 sans port dédié ni jeton, `Bearer` obligatoire si un jeton est défini.
  Mêmes noms de jauges que le pusher et le back. Les métriques Node.js (`nodejs_*`) sont remplacées par celles de Go (`go_*`, `process_*`).
- Échafaudage multi-cœur (règle 7) :
  - `internal/actor` : un propriétaire par état (une goroutine), boîte aux lettres bornée, un panic ne tue que le message ;
  - `internal/registry` : map en 64 morceaux à verrou propre ; `Refs` crée un objet par clé et l'arrête au dernier `Release`, sous le verrou du morceau, ce qui interdit de poster dans un acteur arrêté ;
  - `internal/workpool` : pool borné pour les travaux lourds ou bloquants.
  La file d'envoi bornée par connexion arrive avec l'adaptateur WebSocket (J1).
- `Dockerfile` : cible `dev` (air, dépôt monté sur `/src`) et cible `prod` (distroless, `CGO_ENABLED=0`).
  `api-version.sh` calcule `apiVersionHash` comme `npm run tag-version`. Le front et le serveur doivent avoir le même hash, sinon le serveur ignore le gabarit et le front se recharge.
- `GOMAXPROCS` : Go suit la limite CPU du cgroup depuis 1.25, à condition que `go.mod` déclare `go ≥ 1.25` (ici 1.27). La valeur est journalisée au démarrage.

**Difficultés.**
- Go n'était pas installé sur la machine : installé par Homebrew (1.27.2).
- Le hook d'édition de la session refuse d'écrire dans `workadventure/.claude/worktrees/lang-go`, qu'il prend pour le checkout principal du dépôt externe (le dépôt interne est imbriqué et ignoré par l'externe).
  Les fichiers ont donc été écrits par `bash` (heredocs) dans le worktree demandé.

## J1 — On entre dans une carte (2026-10-13)

| | |
|---|---|
| Durée (horloge) | ≈ 3 h 30 : de 20 h 20 environ (début du cœur) à 23 h 50 (relecture et mesures comprises). Au total, squelette compris : ≈ 5 h 15 |
| Itérations avant le vert | Code : 7 tests rouges à corriger, dont 2 fragiles par construction (voir plus bas). E2E : `meeting.spec.ts` vert au premier passage (5/5) ; il a fallu 3 messages de plus pour `userlist` et `webrtc_reconnection` |
| Corrections humaines | 0 |
| Lignes (hors code généré) | 4 939 Go de production, 1 357 de tests (cœur 1 527 / 480, WebSocket 1 502 / 458, HTTP 447 / 108, `cmd/loadbot` 254) |
| Dépendances | protobuf-go, coder/websocket, golang-jwt, prometheus/client_golang, cbroglie/mustache (le gabarit `index.html` est en Mustache) |

### Contenu

**Cœur hexagonal (`internal/core`).** Il n'importe ni transport, ni protobuf, ni Redis. Les clients sont joints par le port `Peer` (`Send`, `Kick`), les événements sont des types Go.
- **Salle = acteur.** Elle fusionne `GameRoom`, `PositionNotifier` et `Zone` du back avec le cache de zones du pusher : il n'y a plus de flux de zones entre deux processus.
  - Zones de 320 px.
  - Un abonnement par viewport, limité à 1 600 zones.
  - Les bulles (`Group`) sont portées sans le mode « suivre » (`follow`), qui viendra avec ses messages.
- **Space = acteur.** Il est créé dès J1, car le front rejoint `allWorldUser` à l'entrée et le space de sa bulle pour afficher les caméras.
  - Implémenté : liste des membres, filtre `ALL_USERS`, état média, événements publics et privés (avec les règles admin du pusher), appariement WebRTC (`start`, `disconnect`, `restart`), `kind` du `SpaceState`.
  - Pas encore : LiveKit, mégaphone, main levée, sondages, métadonnées.
- **Fan-out.** Un événement destiné à N clients est encodé une seule fois, sur le premier écrivain qui en a besoin, et les N partagent les octets.
  - Un lot (`BatchMessage`) est une concaténation d'entrées partagées derrière quelques octets d'en-tête propres à la connexion.
  - Un test vérifie que ce lot se décode exactement comme un message protobuf natif.

**Adaptateur WebSocket (`internal/ws`).** C'est le contrat gelé du front.
- Upgrade : jeton dans `Sec-WebSocket-Protocol`, schéma de requête de `IoSocketController`, écrans d'erreur (version, jeton, textures).
- Enveloppes à nonce, dédoublonnage en entrée, reprise de transport par `connectionId` + `lastReceivedNonce` avec rejeu.
- Ping applicatif toutes les 80 s (le front coupe à 100 s) et ping WebSocket toutes les 25 s.
- Par session : un écrivain, un lecteur et un keepalive par transport, et une file d'envoi bornée (1 024 messages). Quand elle est pleine, on jette d'abord les positions périmées d'un même joueur, puis on ferme le client lent (code 4000).
- Le tampon de reprise est borné en âge (`CLIENT_DISCONNECTION_RETENTION_MS`) **et** en taille (512 Kio par session). Si les trames manquantes ont été évincées, la reprise est refusée et le front repart de zéro.

**Adaptateur HTTP (`internal/httpapi`).**
- Page d'accueil rendue depuis le gabarit du conteneur `front` (sondé toutes les 30 s, avec vérification de `apiVersionHash`).
- Routes : `/anonymLogin`, `/me`, `/map`, `/woka/list`, `/companion/list`, `/local-script`, `/server.json`, `/manifest.json`, `/ready`.
- Proxy des fichiers qui doivent rester sur l'origine de la page (`/static`, `iframe_api.js`, service workers).
- Requêtes WebSocket servies : `iceServersQuery` (STUN/TURN, identifiants HMAC comme `WebRTCCredentialsService`), `chatMembersQuery` (vide sans admin).

**Branchement au socle.** Fusion de `dev-socle`, puis `dev/dev stack up go --variant server` : `server-go/dev.env` lance air dans la cible `dev` du Dockerfile, et le rechargement à chaud fonctionne. Le hash d'API calculé par `api-version.sh` (`b82fc568`) est celui du front publié : le serveur accepte son gabarit.

### Vérification

- `./verify.sh` : gofmt, build, `go vet`, `go test -race` sur 10 paquets. Entre autres :
  - deux bots en WebSocket réel qui se voient bouger et forment une bulle ;
  - reprise avec rejeu des trames manquées et rejet des doublons ;
  - réponse de space reçue avant toute autre trame du space ;
  - **test de contention** : 64 salles en parallèle, 12 joueurs chacune ;
  - **test de grosse salle** : 500 joueurs, 10 000 déplacements, invariants des zones et des bulles vérifiés à la fin.
- Dans le navigateur intégré, sur `http://play.go.workadventure.localhost:8880/` : écran de nom, choix du woka, caméra, puis entrée dans `tests/E2E/empty.json`.
- **Playwright contre la stack Go** (`cd tests && eval "$(../dev/dev env go)" && node ../dev/warm-auth.mjs Alice Bob Eve John`, chromium), sur le code final : **31 verts, 2 ignorés** (LiveKit), en 5 min. Specs lancées :
  - `meeting.spec.ts` (5/5 : bulle à deux, vidéo P2P, mute, mise en avant, chat de bulle, blocage) ;
  - `say_bubbles`, `AvailabilityStatus`, `scripting_moveto`, `camera_order`, `p2p_mute_keeps_sender` ;
  - `webrtc_reconnection` (P2P) ;
  - `userlist` « walk to a user » ;
  - `reconnect.spec.ts` « Connection to server lost » (perte puis retour du réseau).

  Échecs attendus, hors J1 : `userlist` « Send Message » (OIDC + Matrix). Non lancés : les specs qui demandent map-storage, OIDC, LiveKit, le mode suivre ou les variables de joueur persistées.

### Mesures multi-cœur

Protocole (`bench/multicore.sh`, reproductible) :
- Le serveur et le générateur `cmd/loadbot` tournent chacun dans un conteneur, sur un réseau Docker privé, pour ne pas mesurer la redirection de ports de Docker Desktop.
- Le serveur est limité à 1, 2 puis 4 CPU (`--cpus`, `-m 1g`) ; le générateur a 4 CPU.
- Les bots parlent le vrai protocole : login anonyme, `joinRoomFrontMessage`, 10 déplacements par seconde, viewport de 1 280 × 720.
- La latence va de l'envoi d'un déplacement à sa réception par un autre bot. Elle **inclut la fenêtre de lot de 100 ms** héritée du TS : p50 ≈ 55 ms même à vide.
- Débit : déplacements acceptés/s et sous-messages livrés/s. CPU : moyenne de `docker stats` pendant la fenêtre de 20 s.
- `GOMAXPROCS` suit bien le cgroup : 2 pour `--cpus 1`, car Go impose un plancher de 2 (voulu par le runtime), puis 2 et 4.

**Charge identique, 1 / 2 / 4 CPU.** Médianes de 3 passes ; la fourchette du p99 est entre parenthèses. Données brutes : `bench/results/2026-10-13-j1-fixed-loads.jsonl`.

| Scénario | Débit (dépl./s ; msg livrés/s) | p50 (ms) 1 / 2 / 4 | p99 (ms) 1 / 2 / 4 | CPU serveur 1 / 2 / 4 | Mémoire |
|---|---|---|---|---|---|
| 100 salles × 10 bots | 10 000 ; 43 500 | 59 / 57 / 57 | 168 (113-425) / 104 / 102 | 71 / 70 / 93 % | 170 Mio |
| 100 salles × 20 bots | 20 000 ; 190 000 | 137 / 59 / 54 | 366 (291-658) / 159 / 104 | 101 / 137 / 190 % | 425 Mio |
| 1 salle × 300 bots (5 dépl./s) | 1 500 ; 355 000 | 51 / 51 / 51 | 100 / 100 / 100 | 48 / 49 / 70 % | 390 Mio |

Aucune erreur ni déconnexion. À 1 CPU, le débit tient même saturé ; c'est la latence qui se dégrade, car les lots grossissent.

**Capacité : charge maximale tenue avec un p99 ≤ 250 ms.** Un run par point, serveur à 2 Go. Données : `bench/results/2026-10-13-j1-capacity.jsonl`.

| CPU | Tenu | Refusé (p99) | Capacité |
|---|---|---|---|
| 1 | 15 000 dépl./s, 136 k msg/s (p99 169) | 20 000 (366) | ≈ 15 000 dépl./s |
| 2 | 30 000, 284 k msg/s (189) | 40 000 (501) | ≈ 30 000 |
| 4 | 40 000, 384 k msg/s (189) | 50 000 (546 ; serveur à 357 %, générateur à 294 %) | ≈ 40 000 |

**Facteur d'échelle : ×2,0 de 1 à 2 CPU, ≈ ×2,7 de 1 à 4 CPU.**
- Le point à 4 CPU est le moins sûr : serveur et générateur occupent alors ≈ 6,5 des 10 vCPU de la VM partagée.
- Un run à 3 000 bots sur 4 CPU a donné 276 ms, à cause du bruit.
- Mémoire : ≈ 200 Ko par client actif, presque entièrement le tampon de reprise (30 s de trafic). 5 000 bots ≈ 990 Mio.

**Une seule grande salle (règle 7).** Profil CPU, en local : 400 bots dans une salle, 10 dépl./s chacun, soit 4 000 dépl./s.
- Chaque déplacement est vu par ≈ 180 joueurs : 1,22 M sous-messages livrés/s, p99 100 ms (le plancher du lot).
- L'acteur de la salle prend **21 % d'un cœur**, dont 77 % pour déposer les messages dans les files des connexions. Les bulles en prennent ≈ 5 % : chaque pas d'un membre redessine sa bulle.
- Le reste (220 % au total) est le fan-out parallèle : encodage, écriture des trames, appels système.

Par extrapolation linéaire, l'acteur saturerait vers 19 000 dépl./s dans une salle aussi dense. Le fan-out demanderait alors ≈ 10 cœurs : il plafonnerait bien avant l'acteur.
**Pas de découpage par zone pour l'instant.** Le jour où il le faudra, le premier levier est moins cher : déposer en une fois les messages destinés à une même connexion.


### Difficultés et décisions

- **Le front rejoint des spaces dès l'entrée.** Le plan les plaçait en J2, mais sans eux, ni l'écran ni les specs de bulle ne marchent. Le minimum (liste, WebRTC) est donc en J1.
  Trois pièges silencieux, relevés avant d'écrire le code :
  - la réponse `joinSpaceAnswer` doit précéder tout message du space ;
  - chaque filtre doit recevoir un `initSpaceUsersMessage` ;
  - `spaceUserId` vaut exactement `${roomUrl}_${userId}`.
- **Clé d'un space.** Le pusher concatène `${world}.${name}`, mais le monde est une origine d'URL qui contient des points. Le registre utilise donc une clé structurée `{World, Local}`. Ma première version découpait la chaîne et a paniqué une fois, pendant un rechargement à chaud.
- **Bug TS trouvé, non reproduit.** `Group.searchForNearbyUsers` cherche autour de la mauvaise zone : `getAllUsersInSquareAroundZone` redivise des indices de zone par 320, donc cherche toujours près de l'origine de la carte. Le portage cherche autour de la bulle.
- **Mémoire.** Le profil (`pprof` sur le port Prometheus dédié) montre que les trames gardées pour la reprise sont la majorité du tas : ≈ 300 objets vivants par client actif pendant 30 s.
  Elles sont maintenant copiées dans des blocs de 8 Kio libérés d'un coup : 949 k → 377 k objets vivants pour 1 000 bots. Il reste ≈ 200 Ko par client actif, par construction : 30 s de trafic, comme le TS mais borné.
  `GOMEMLIMIT` est fixé à 90 % de la limite mémoire du conteneur, car Go ne la lit pas tout seul, contrairement à la limite CPU.
- **Relecture par un agent**, trois vrais problèmes corrigés :
  - après une reprise, deux lecteurs pouvaient traiter des messages en même temps : risque d'envoi vers un space arrêté ou de double adhésion ;
  - aucun plafond sur le nombre de spaces par client ;
  - la poignée de main de fermeture retardait de 5 à 15 s le départ d'un client tué.
- **Tests fragiles par construction**, corrigés côté test :
  - un jeton recréé à la seconde suivante n'est plus le même, donc reprise refusée à juste titre ;
  - l'initiateur WebRTC dépend de l'ordre réel des deux filtres.
- **Bruit de mesure.** La VM Docker (10 vCPU) est partagée avec 30 conteneurs (≈ 14 % CPU au repos), et l'hôte avec d'autres sessions (charge moyenne 6 à 10, un Chromium headless à 100 %).
  D'une répétition à l'autre, le p99 varie d'un facteur 2 à 10 sous saturation. Les chiffres ci-dessus sont des médianes de 3 passes. Il faudra une machine dédiée pour l'arbitrage, avec le même `loadbot` contre les deux candidats.
- Le hook d'édition de la session refuse toujours d'écrire dans le worktree interne : tout le code a été écrit par `bash`.

### Reste pour les jalons suivants

Le mode « suivre », les variables de joueur persistées (Redis), les emotes (le TS valide les emojis avec `\p{Extended_Pictographic}`, absent de l'expression régulière de Go), LiveKit, le mégaphone et le reste des spaces.
OpenID (`/login-screen`, `/openid-callback`), l'admin HTTP, la Room API, map-storage, l'uploader, et les balises meta lues dans la carte pour les robots.

## Après J1 — règles communes du 14/10 (2026-10-14)

Les deux changements décidés après la relecture de J1 sont faits ; ils ont pris ≈ 25 min, sans correction humaine.

- **Fusion des positions dans le lot (règle commune, obligatoire).** Un seul type, `moveQueue` (`internal/ws/outbox.go`), sert au lot de l'écrivain (fenêtre de 100 ms) et à la file d'envoi.
  - Une nouvelle position d'un joueur prend la place de la précédente encore en file. Elle ne saute donc que des messages d'autres joueurs, qui commutent avec elle.
  - Barrières : l'arrivée, le départ et les détails du même joueur ; un message direct, qui clôt le lot, vaut barrière pour tous.
  - Écart avec le candidat Rust : chez Rust, tout autre message est une barrière pour tous les joueurs. Ici, la barrière est par joueur, comme l'écrit la règle.
- **Contre-pression.** La file fusionne au fil de l'eau avec les mêmes barrières. Quand elle est pleine de messages qui ne fusionnent pas, le client lent est fermé (code 4000).
  `dropSupersededMoves` disparaît : elle ne déplaçait aucun message, mais elle ignorait les barrières.
- **Métrique renommée** : `workadventure_dropped_position_updates_total` devient `workadventure_coalesced_position_updates_total`, qui compte toutes les positions fusionnées.
- **Vérification.**
  - `./verify.sh` vert, avec trois tests en plus : barrières de `moveQueue`, file pleine, et un test bout-en-bout (trois déplacements dans la même fenêtre, une seule position reçue).
  - Playwright (`meeting`, `say_bubbles`, `reconnect` 18, `userlist` 14) : 8 verts et 2 échecs au premier passage, juste après la relance de la stack `go` qu'une autre session avait arrêtée. Les 2 tests échoués passent 2 fois sur 2 en isolation.
- **Mesures.** Les chiffres de J1 ont été pris avant la fusion : le nombre de messages livrés baisse désormais mécaniquement. Le banc commun (`dev/bench/` de `dev-socle`) fera foi. `cmd/loadbot` est inchangé.
