# Améliorations notées

Points relevés par la revue « biais de migration » du 17/10 et en chemin. Chaque ligne donne le constat, l'endroit,
le risque et la proposition. Les emplacements sont ceux de la branche `lang-go` au 17/10.

## En cours (lots D)

| Point | État |
|---|---|
| Découper `ws.Session` (D1) | fait (9be46b880) : transport, presence, memberships, chat, stats ; couverture de `ws` 70 % |
| Tests des commandes admin `mute`/`kickOff` et de la signature de `spaceMessage` | fait (2088a02d5) |
| Chemins de reprise du cœur à 0 % | faits (4e75d69d4) ; `core` 88 % |
| `wam` : `apply`, assertions de type, WAM malformé | fait : un fichier hors schéma est refusé par `Edit` (il était écrasé) ; `wam` 77 % |
| `core` importe `analytics` : port `MeetingReporter` | à faire (D3/D4) |
| `Msg.Event any` et `*pb.*` dans `core` : `core.Event` scellé | à faire (D3) |
| `core.Media`, 7 fermetures : interfaces nommées (`MediaProvider`) | à faire (D4) |
| Horloge : port `Clock` (`Now`, `AfterFunc`) avec `actor.After` | à faire |

## Notés

| Constat | Emplacement | Risque | Proposition |
|---|---|---|---|
| Tampons : reprise 512 Kio par client, outbox bornée en nombre de messages (décision Q1 : gardé pour l'instant) | `ws/outbox.go`, nonces et rejeu de `ws/session.go` | des milliers de clients lents peuvent tenir beaucoup de mémoire avant d'être coupés | budget global de reprise et outbox bornée en octets (rapport Codex §5.2, P0) |
| Pas de test des commandes admin `mute` et `kickOff`, ni de la signature de `spaceMessage` | `ws/spaces.go` (événements privés), `core/space.go` | une régression de droits passerait les tests unitaires | tests de scénario : non-admin refusé, `force` posé pour l'admin, message signé par le serveur |
| `roomsFromSameWorld` sans admin liste les cartes de tout le stockage | `ws/queries.go:124` | un monde voit les cartes des autres sur un serveur partagé sans admin | filtrer par le préfixe de monde, comme le fait le chemin avec admin |
| Un ban que l'admin refuse devient un kick | `ws/session.go:547` | l'utilisateur revient aussitôt ; le modérateur croit avoir banni | répondre l'échec au modérateur au lieu d'éjecter |
| Une position absente devient (0,0) | lecture de `PositionMessage` dans `ws/` | un joueur apparaît au coin de la carte | refuser le message, ou garder la dernière position connue |
| `writeJSON` en 3 exemplaires, `clientIP` ×2, 12 `http.Client`, dont celui d'`analytics/queue.go` sans délai | `uploader/uploader.go:287`, `mapstorage/mapstorage.go:334`, `httpapi/httpapi.go:138` ; `httpapi/httpapi.go:192`, `ws/server.go:183` | comportements qui divergent ; un admin lent bloque la file analytics | un petit paquet `httpx` (JSON, IP cliente, clients avec délai) ; un délai pour la file analytics |
| `admin.Admin` a 19 méthodes | `admin/admin.go` | chaque faux admin des tests implémente tout ; interface difficile à lire | la découper par usage (identité, carte, modération, quêtes…) |
| Les minuteries de `core/space.go` passent par `time.AfterFunc` + `later` | `core/space.go`, `core/space_recording.go` | fuites possibles si l'acteur s'arrête entre-temps | `actor.After(d, f)` qui n'appelle rien après `Stop` |
| `core/space.go` (647 lignes) et `mapstorage/files.go` (535) mélangent plusieurs responsabilités | idem | relecture difficile | découpage par sujet (membres, filtres, médias ; envoi, édition, déplacement) |
| Pas de port `MeetingReporter` ni `Clock` | `core/` | tests qui dorment ; dépendance directe à `time.Now` | interfaces injectées, horloge factice en test |
| 17 `_ = s.room.X(...)` | `ws/` | erreurs perdues sans trace | un assistant qui journalise l'erreur une fois |
| Erreurs avalées « comme le TS » | divers (`_ =` sur des appels réseau) | panne silencieuse | journaliser au niveau Warn, avec une métrique |
| `waitStatus` des tests d'enregistrement regarde un statut déjà vu ; « idle » est donc toujours vrai | `core/space_recording_test.go` | un test d'arrêt qui ne vérifie rien | attendre le statut courant, ou la fin signalée à l'admin |
| `/debug/close-space-connection` répond sans effet (pas de flux back↔pusher) | `ws/debug.go` | la reprise d'un space n'est pas éprouvée par `map_editor_livekit:62` | vraie simulation : vider le space et faire rejoindre ses membres, comme après un redémarrage du back |
| JSON Patch (RFC 6902) écrit à la main | `wam/patch.go` | code de protocole à maintenir soi-même | `evanphx/json-patch` (celui de Kubernetes), dans l'esprit de la décision « bibliothèques standard » ; les exemples de la RFC sont testés (`edit_test.go`) et le resteront |
| Autres optimisations Codex non faites | — | — | patchs de SpaceState au lieu d'états complets ; cache des variables au join ; métriques Redis ; profil du fanout ; reconstruction d'un acteur après un panic ; contrôle d'admission ; tests d'endurance et de pics |
