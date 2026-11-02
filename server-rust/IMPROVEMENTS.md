# Qualité : revue du code Rust (17/10)

Les questions posées par Yannis via le socle, appliquées à ce code. Ce qui était simple ou touchait la sécurité est
corrigé (avec le commit) ; le reste est noté ici, avec la raison et la prochaine action. Lien depuis `PARITY.md`.

## Corrigé

| Point | Ce qui a été fait | Preuve |
|---|---|---|
| SSRF, « embeddable website » | Le serveur ne demande jamais une adresse privée (loopback, RFC 1918, ULA, link-local dont 169.254.169.254, CGNAT, multicast, documentation) : un résolveur DNS qui ne rend que les adresses publiques (le contrôle se fait à la connexion, un nom re-pointé entre-temps est refusé), une politique de redirection qui ne suit pas une adresse privée littérale. Un site d'un réseau privé est répondu « intégrable » sans être demandé : c'est le navigateur de l'utilisateur, pas le serveur, qui le charge. | test `private_networks_are_never_asked` ; `scripting_open_cowebsite` vert |
| OpenID | `id_token` vérifié : signature (JWKS du fournisseur, ou secret client pour HMAC), `iss` (issuer découvert), `aud`, `exp` (60 s de marge), `nonce` envoyé par ce serveur. Le verifier PKCE et le nonce voyagent dans un cookie scellé AES-256-GCM (clé dérivée de `SECRET_KEY`). Le `state` est exigé (avant : vérifié seulement s'il était présent). Vérifié côté admin SaaS : le fournisseur (`ronvanderheijden/openid-connect`) recopie le `nonce` et signe en RS256. | test `an_openid_login_needs_a_signed_id_token…` (bon nonce, mauvais nonce, cookie modifié, sans state) ; `oidc.spec` 2/2 contre le fournisseur de la stack |
| Erreurs avalées | Audit de `crates/server/src` (sous-agent Sonnet, ~45 envois à un acteur parti jugés bénins). Corrigé : un fichier JSON stocké illisible ou corrompu n'est plus traité comme absent puis **écrasé** (perte de données) : la modification est refusée et journalisée ; lectures disque, suppression d'asset, répertoires et WAM illisibles, ban refusé par l'admin, tags de room, révocation OIDC, lecture Redis de l'uploader, carte injoignable : journalisés. | test `a_corrupt_json_file_is_never_written_over` |
| Corps des PATCH map-storage | Comme `bodyParser.json` : types `application/json` et `application/json-patch+json` seulement (un autre type = corps vide), limite `BODY_PARSER_JSON_SIZE_LIMIT` (100mb par défaut, unités b/kb/mb/gb), 413 au-delà, mode strict (objet ou tableau). | test `a_wam_patch_is_read_like_body_parser…` |
| Dépendances | `cargo deny check` vert : rustls 0.23.46 (4 avis RUSTSEC-2026-0346 à 0349), licence SPDX `AGPL-3.0-only`, plus de version `*`. `cargo machete` : aucune dépendance inutilisée (celles du code protobuf généré sont déclarées). | job CI |
| Routes de debug du back | `GET /dump?token=` (rooms et joueurs, `[{roomUrl, users}]`), `POST /debug/close-space-connection?spaceName=&token=` (400 sans nom, 500 pour un space inconnu, 200 sinon). Il n'y a pas de lien pusher↔back à couper ici : la route ne coupe rien, `scripting_spaces:401` et `map_editor_livekit:62` ne prouvent donc pas une reprise sur ce serveur. | test `the_debug_routes_of_the_back…` |
| Style | `rustfmt.toml` à 120 colonnes (comme Prettier côté TS), tout reformaté, `cargo fmt --check` en CI. | job CI |

## Vérifié, rien à changer

- **Assets relayés depuis le conteneur front** : la réponse amont n'est recopiée que pour une liste blanche
  d'en-têtes (`Content-Type`, `Cache-Control`, `ETag`, `Last-Modified`, `Expires`) ; ni `Access-Control-*` ni
  `Set-Cookie` ne ressortent.
- **TLS** : `reqwest` avec rustls et `rustls-platform-verifier` (magasin du système ; sous Linux
  `rustls-native-certs`, qui lit `SSL_CERT_FILE`). Aucune option « insecure » dans le code.
- **Le cœur** ne dépend que de `serde`, `serde_json` et `regex` : ni transport, ni protobuf, ni HTTP, ni Redis, ni
  adaptateur. Les ports sont déclarés dans le cœur (`room::Sink`, `space::SpaceSink`, `room::Clock`) ; l'horloge
  est injectée (retour WebRTC après 20 s et finalisation après 5 s testés sans attendre). Les réunions analytics
  sont calculées dans le cœur (`meetings.rs`, le temps en paramètre) ; l'envoi est dans l'adaptateur.

## Fait dans la deuxième passe (17/10)

| Point | Ce qui a été fait | Preuve |
|---|---|---|
| Biais de migration : `logic.rs` | Découpé par famille : `logic/mod.rs` (routeur, entrée en room, déplacements), `moderation.rs`, `spaces.rs`, `queries.rs`, `analytics.rs`. Le `match` de la session ne fait plus que router. | `verify.sh`, specs de non-régression |
| Biais de migration : `room_actor.rs` | L'état de la room est une struct (`RoomActor`), chaque commande une méthode ; familles dans `room_actor/social.rs`, `admin.rs`, `variables.rs`, la carte dans `map_file.rs`, l'envoi aux sessions dans `fanout.rs`. `mod.rs` : 1 266 → 633 lignes. | idem ; `scripting_follow` échoué une fois en lot puis 2/2 seul |
| `serde_json::Value` pour les réponses de l'admin | Types générés des schémas zod que lisent le pusher et le back (`tools/gen-admin-types.sh` : zod → JSON Schema → cargo-typify, régénéré en CI). Réponses typées : A6, A12-A15, A17, A18, A24. A2 et A3, relayées presque telles quelles au front, sont validées par le schéma (au lieu d'heuristiques) ; une réponse qui ne colle pas est refusée et journalisée, comme le `parse` de zod. Deux écarts de traduction corrigés à l'extraction : `undefined` (`{"not": {}}`) retiré, objets ouverts (zod retire les clés inconnues, il ne les refuse pas). | test `real_answers_fit_and_broken_ones_do_not` ; `wamUrl` de A6 n'est pas dans le schéma : retiré comme zod le fait |
| Bibliothèques de référence | S3 par `aws-sdk-s3` (liste v1 paginée, suppression, URL présignées sur le CDN avec `response-content-disposition`, que `object_store` ne sait pas faire). LiveKit par `livekit-api` (jetons, salles, arrêt d'egress, webhooks vérifiés par le SDK). Exception : `start_room_composite_egress` du SDK ne transmet pas le webhook propre à l'egress, que le back envoie ; la requête est le type du SDK (`RoomCompositeEgressRequest`), envoyée en Twirp protobuf avec un jeton du SDK. | tests unitaires ; livekit, recording, screensharing : 10/11 en lot (`recording:62` lent en lot, 2/2 seul) |
| Couverture | `ws.rs` 56 % → 80,8 % (refus d'upgrade un par un, écrans d'erreur de l'admin) ; commandes réservées aux admins testées (`kickOffUser` et `mute` forcé seulement par un admin). | tests `an_upgrade_is_refused_for_each_reason…`, `only_an_admin_kicks_and_forces_a_mute…` |

## Rapport Codex, §5.3 (Rust)

| Priorité | Sujet | État |
|---|---|---|
| P0 | `room_actor` : I/O attendue dans une commande | **fait** (Jalon 6) : I/O dans des tâches, commandes d'édition dans l'ordre, sauvegardes versionnées ; test rouge avant, vert après |
| P1 | `core/space.rs` : recherches linéaires dans les membres | **non fait** : aucune mesure ne le justifie encore. À mesurer sur l'étude « salle à 10 000 » avant d'indexer (l'ordre des joins est observable par le front et doit rester) |
| P1 | `space_state.rs` : clones et sérialisation avant/après | **non fait** : chaque requête d'état clone l'état puis calcule le patch, comme le TS. À mesurer sur un space dense avant de faire des patchs ciblés |
| P1 | watchers et listes temporaires | **non fait**, même raison ; à mesurer avec le banc commun |
| P1 | `map_storage/` : octets préparés hors verrou, commit avec génération | **partiel** : écritures versionnées par génération (une sauvegarde en retard n'écrase rien), écritures disque en `spawn_blocking` ; la sérialisation se fait encore sous le verrou d'écriture |
| P2 | `session.rs` : partage `Bytes`, budgets, clients lents | **en place, non mesuré** : une trame encodée une fois et partagée (`Bytes`), budgets outbox et reprise globaux ; pas de mesure d'allocations ni de clients lents |
| — | Remarques : un `await` ne laisse pas passer la commande suivante du même acteur ; les budgets ne bornent pas toute la mémoire | la première est la règle du guide (`docs/ADDING_A_FEATURE.md`) ; la seconde rejoint le §5.4 (admission, endurance, pics), **non fait** |

## À faire (noté, pas corrigé)

| Point | Constat | Proposition |
|---|---|---|
| `main.rs` | Câblage seulement (ports, admin, analytics, arrêt) ; l'arrêt propre (vidage analytics) y est écrit en ligne. | Rien d'urgent ; sortir l'arrêt dans une fonction si une autre file s'ajoute. |
| SSRF : carte d'une room | Gardée comme le TS, **décision produit** (cartes auto-hébergées sur réseau privé, traitées comme « locales »). | — |
| Panique dans un acteur | Une panique termine la tâche de la room ou du space : l'état en mémoire est perdu, pas laissé à moitié modifié ; le registre recrée l'acteur à la prochaine demande. Pas de `catch_unwind`. | Tester ce chemin (panique provoquée) et décider : redémarrage silencieux ou fermeture des sessions avec un code de reconnexion. |
| Couverture restante | `logic/spaces.rs` 15 %, `logic/moderation.rs` 20 %, `logic/queries.rs` 35 % : ces chemins sont prouvés par les specs Playwright, pas par des tests de scénario. | Tests de scénario au fil de Matrix. |
| Code mort | Pas de toolchain nightly pour `cargo udeps` ; `cargo machete` ne trouve rien. | `cargo +nightly udeps` en CI si l'équipe le veut. |
| Admission sous saturation (§5.4) | Files bornées et budgets en place ; pas de politique d'admission. | Voir `PARITY.md`. |
