# Améliorations notées

Points relevés par la revue « biais de migration » du 17/10 et en chemin. Chaque ligne donne le constat, l'endroit,
le risque et la proposition. Les emplacements sont ceux de la branche `lang-go` au 17/10.

## En cours (lots D)

| Point | État |
|---|---|
| Découper `ws.Session` (D1) | fait (9be46b880) : transport, presence, memberships, chat, stats ; couverture de `ws` 70 % |
| Gros `switch` (D2) | fait (3e9b6caee) : une méthode par message, modération à part |
| Tests des commandes admin `mute`/`kickOff` et de la signature de `spaceMessage` | fait (2088a02d5) |
| Chemins de reprise du cœur à 0 % | faits (4e75d69d4) ; `core` 88 % |
| `wam` : `apply`, assertions de type, WAM malformé | fait : un fichier hors schéma est refusé par `Edit` (il était écrasé) ; `wam` 77 % |
| `core` importe `analytics` : port `MeetingReporter` | fait (da1c29527) ; `core` n'importe plus qu'`actor` et `spacestate` |
| `Msg.Event any` et `*pb.*` dans `core` : `core.Event` scellé | fait (da1c29527) ; structs `FrontEnv` et `MapDetails` (bef6ca294) |
| `core.Media`, 7 fermetures : interfaces nommées (`MediaProvider`) | fait (D4) : `MediaProvider` (`core.ServerLiveKit`, `livekit.Worlds`), `Meetings`, `RecordingReporter` ; `main.go` découpé, `ws.Deps`, plus de mutation de la config |
| Horloge : port `Clock` (`Now`, `AfterFunc`) avec `actor.After` | fait (8fccf5e6e) : `core.Clock` injecté par `Media.Clock`, minuteries LiveKit et enregistrement sur `actor.After` ; les tests du cœur avancent une horloge factice au lieu de dormir |

## Notés

| Constat | Emplacement | Risque | Proposition |
|---|---|---|---|
| `admin.Admin` a 19 méthodes | `admin/admin.go` | chaque faux admin des tests implémente tout ; interface difficile à lire | la découper par usage (identité, carte, modération, quêtes…) |
| `core/space.go` (647 lignes) et `mapstorage/files.go` (535) mélangent plusieurs responsabilités | idem | relecture difficile | découpage par sujet (membres, filtres, médias ; envoi, édition, déplacement) |
| `/debug/close-space-connection` répond sans effet (pas de flux back↔pusher) | `ws/debug.go` | la reprise d'un space n'est pas éprouvée par `map_editor_livekit:62` | vraie simulation : vider le space et faire rejoindre ses membres, comme après un redémarrage du back |
| Autres optimisations Codex non faites | — | — | patchs de SpaceState au lieu d'états complets ; cache des variables au join ; métriques Redis ; profil du fanout ; reconstruction d'un acteur après un panic (en partie : 3dba72eda éjecte les membres d'une salle ou d'un space après une panic, puis l'abandonne une fois vide) ; contrôle d'admission ; tests d'endurance et de pics |

## Faits depuis le 17/10

| Constat | Fait |
|---|---|
| Tampons : reprise 512 Kio par client, outbox bornée en nombre de messages (décision Q1 : gardé pour l'instant) | budget de reprise pour tout le processus, `RESUME_BUFFER_BUDGET_BYTES` (456948203) ; l'outbox reste bornée en nombre de messages : elle ne tient que des pointeurs vers des messages partagés et encodés une fois, une borne en octets obligerait à encoder à l'envoi |
| Pas de test des commandes admin `mute` et `kickOff`, ni de la signature de `spaceMessage` | voir « En cours » (2088a02d5) ; `TestOnlyAnAdminForcesAMuteOrKicksOff` |
| `roomsFromSameWorld` sans admin liste les cartes de tout le stockage | 8bcf5200a : seules les cartes du dossier du monde de la salle |
| Un ban que l'admin refuse devient un kick | f18aee7a4 : personne n'est éjecté, le modérateur est prévenu ; admin injoignable : kick, et le modérateur l'apprend |
| Une position absente devient (0,0) | aefc8e2f7 (mouvement : dernière position gardée, sans viewport ignoré) et 4a1c9ecd7 (join refusé), comme en TS |
| `writeJSON` en 3 exemplaires, `clientIP` ×2, 12 `http.Client`, dont celui d'`analytics/queue.go` sans délai | a492e3147 (`httpx.WriteJSON`, un délai sur chaque client, dont la file analytics) et 3808fb749 (`netguard.ClientIP`, derrière `TRUSTED_PROXIES`) |
| Les minuteries de `core/space.go` passent par `time.AfterFunc` + `later` | 8fccf5e6e : `actor.After`, qui n'appelle plus rien après `Stop` |
| Pas de port `MeetingReporter` ni `Clock` | da1c29527 (`MeetingReporter`), 8fccf5e6e (`Clock`) |
| 17 `_ = s.room.X(...)` | 5b27a0be7 : `metrics.Ignore` journalise en Warn et compte dans `server_ignored_errors_total{op}` |
| Erreurs avalées « comme le TS » | 5b27a0be7 (erreurs ignorées : Warn et métrique) et 7bc427570 (messages du client non gérés : `server_unhandled_messages_total{type}`, Warn une fois par type) |
| `waitStatus` des tests d'enregistrement regarde un statut déjà vu ; « idle » est donc toujours vrai | 697a1a7ad : attend le dernier statut envoyé |
| JSON Patch (RFC 6902) écrit à la main | 18e8bca39 : `evanphx/json-patch/v5`, réglé comme fast-json-patch (index négatifs refusés) ; seul écart, un `test` compare les nombres par valeur (1 vaut 1.0), comme la RFC |
