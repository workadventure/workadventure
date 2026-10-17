# Répétition de la première mise en production (minikube)

Rejoue la bascule du chart `contrib/helm` : serveurs TypeScript -> serveur Go -> retour au TypeScript, avec la même
release Helm (la bascule est un vrai `helm upgrade`). Profil minikube dédié `wa-rehearsal`; aucun autre profil n'est touché.

## Prérequis

- Docker (VM avec au moins 6 Go libres : minikube est plafonné à 4 Go, ~2,7 Go utilisés une fois déployé), `minikube`, `kubectl`, `helm`, `openssl`, `python3`.
- Images locales : les cinq images ghcr.io `play, back, map-storage, uploader, maps` au tag `master-6f4d023...` (tirées si absentes) et `wa-socle-front:master-6f4d023...` (construite par le socle).
- Le worktree `lang-go` est lu pour construire `wa-server-go:rehearsal` (cible `prod`, `API_VERSION` = `server-go/api-version.sh`, qui doit égaler le hash de l'API du front). `GO_SRC=...` change le dossier, `REBUILD_GO=1 ./up.sh` reconstruit.

## Commandes

```bash
./up.sh          # cluster, ingress, certificat, CoreDNS, images, relais 127.0.0.1:8443 vers le 443 du nœud (idempotent)
./deploy.sh ts   # chart + values-common.yaml + values-ts.yaml
./deploy.sh go   # idem avec values-go.yaml (server.enabled: true)
./down.sh        # supprime uniquement le profil wa-rehearsal
```

`deploy.sh` affiche la durée du `helm --wait` et celle jusqu'à ce que `/ping` réponde via l'ingress, puis les images des pods.
Toutes les commandes kubectl utilisent `--context wa-rehearsal` (up.sh démarre minikube avec `--keep-context`).

## URL (https, port 443)

- Carte : https://play-rehearsal.localhost/_/global/maps-rehearsal.localhost/starter/map.json
- `pusher-`, `map-storage-` (john.doe / password), `uploader-`, `icon-`, `assets-`, `maps-`, `room-api-` + `rehearsal.localhost`.
- Le certificat est auto-signé (`*.localhost`, dans `.certs/`, ignoré par git) : le navigateur doit l'accepter.

## Choix et pièges

- 8443 : un conteneur `alpine/socat` sur le réseau docker du profil (`wa-rehearsal-relay`) relaie 127.0.0.1:8443 vers le 443 du nœud (hostPort de l'ingress). `kubectl port-forward` lâchait sous charge. Publié sur 127.0.0.1 seulement : le cluster n'est pas joignable depuis le réseau local.
- CoreDNS : règle `rewrite name regex (.*)rehearsal\.localhost ... answer auto` vers le service de l'ingress (les hôtes ont un tiret : `play-rehearsal.localhost`).
- TLS dans les pods : TS : `NODE_TLS_REJECT_UNAUTHORIZED=0` (commonEnv). Go : pas de variable pour couper la vérification, le certificat est monté et `SSL_CERT_FILE` le désigne (il remplace donc le bundle système : pas d'accès https externe valide depuis le pod Go).
- Les images ghcr `maps` ne se chargent pas par `minikube image load` ("not found in tar") : up.sh les tire dans le noeud.
- `secretKey` et `MAP_STORAGE_API_TOKEN` fixes : les jetons survivent aux bascules. `front.enabled: true` dans les deux modes, donc seule l'image de play change.

## Différences avec la prod

Un noeud, un replica de play (la prod en a plusieurs et un cookie d'affinité), pas d'admin (LocalAdmin), pas de LiveKit, Redis du chart,
ingress nginx (la prod : Traefik), certificat auto-signé, images préchargées (pas de temps de pull), pas de limites de ressources, Room API non exposée en gRPC par l'ingress.
