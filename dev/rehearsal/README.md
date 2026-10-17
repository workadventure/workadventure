# Répétition de la première mise en production (minikube)

Rejoue la bascule du chart `contrib/helm` : serveurs TypeScript -> serveur candidat (Go ou Rust) -> retour au TypeScript,
avec la même release Helm (la bascule est un vrai `helm upgrade`). Profil minikube dédié `wa-rehearsal`; aucun autre profil n'est touché.

## Prérequis

- Docker (VM avec au moins 6 Go libres : minikube est plafonné à 4 Go, ~2,7 Go utilisés une fois déployé), `minikube`, `kubectl`, `helm`, `openssl`, `python3`.
- Images locales : les cinq images ghcr.io `play, back, map-storage, uploader, maps` au tag `master-6f4d023...` (tirées si absentes) et `wa-socle-front:master-6f4d023...` (construite par le socle).
- Candidats : `wa-server-go:rehearsal` est construit depuis le worktree `lang-go` (`server-go/`), `wa-server-rust:rehearsal` depuis `lang-rust` (`server-rust/`).
  Contrat d'image commun : un `Dockerfile` avec une cible `prod`, un `api-version.sh` dont la sortie (`API_VERSION`) doit égaler le hash de l'API du front,
  un serveur qui écoute comme `play` dans le chart, `SSL_CERT_FILE`, `REDIS_DB_NUMBER` et les cartes dans `/maps` (voir `values-go.yaml` / `values-rust.yaml`).
  `GO_SRC=...` / `RUST_SRC=...` changent le dossier. Un candidat sans dossier est sauté par `up.sh` : on peut aussi fournir l'image soi-même (`docker tag mon-image wa-server-rust:rehearsal`).

## Commandes

```bash
./up.sh          # cluster, ingress, certificat, CoreDNS, images, relais 127.0.0.1:8443 vers le 443 du nœud (idempotent)
./deploy.sh ts   # chart + values-common.yaml + values-ts.yaml
./deploy.sh go   # idem avec values-go.yaml (server.enabled: true)
./deploy.sh rust # idem avec values-rust.yaml
./update.sh go   # après une modification du code : rebuild + chargement + déploiement + redémarrage (aussi : rust)
./rehearse.sh    # la répétition complète TS -> Go -> TS avec Playwright (Go seulement pour l'instant)
./down.sh        # supprime uniquement le profil wa-rehearsal
```

`deploy.sh` affiche la durée du `helm --wait` et celle jusqu'à ce que `/ping` réponde via l'ingress, puis les images des pods.
Toutes les commandes kubectl utilisent `--context wa-rehearsal` (up.sh démarre minikube avec `--keep-context`).

## Après une modification du code

L'image garde toujours le tag `rehearsal` (`pullPolicy: Never`) : un `helm upgrade` seul ne voit aucun changement et garde l'ancien pod.
Il faut reconstruire, recharger l'image dans minikube et redémarrer le Deployment `play`. `update.sh` fait tout :

```bash
./update.sh go      # ou rust ; ~20 s si le cache docker sert, plusieurs minutes sinon
```

Ce qu'il fait, à la main :

```bash
REBUILD_GO=1 ./up.sh                    # 1. docker build --target prod + minikube image load (REBUILD_RUST=1 pour Rust)
./deploy.sh go                          # 2. helm upgrade --install avec values-go.yaml
kubectl --context wa-rehearsal -n wa rollout restart deploy/rehearsal-workadventure-play   # 3. nouveau pod
kubectl --context wa-rehearsal -n wa rollout status deploy/rehearsal-workadventure-play
```

`.go-image-info` / `.rust-image-info` notent le commit, le nombre de fichiers non commités et l'`API_VERSION` de la dernière image construite.
Autres cas :
- **Changement du front ou de l'API** (`messages/`, protos) : `API_VERSION` change ; l'image du front (`wa-socle-front`) doit être reconstruite par le socle avec le même hash, sinon le navigateur refuse la connexion.
- **Changement de `values-*.yaml` ou du chart** : `./deploy.sh go` suffit (helm voit la différence et refait les pods).
- **Retour au TypeScript** : `./deploy.sh ts`.

## Commandes Helm et kubectl utiles

Toujours avec le contexte explicite (le contexte global de kubectl n'est pas modifié) :

```bash
helm --kube-context wa-rehearsal -n wa list                       # release `rehearsal`
helm --kube-context wa-rehearsal -n wa history rehearsal          # une révision par deploy.sh
helm --kube-context wa-rehearsal -n wa rollback rehearsal 27      # revenir à une révision (mode et valeurs compris)
helm --kube-context wa-rehearsal -n wa get values rehearsal       # valeurs appliquées
helm template rehearsal ../../contrib/helm -f ../../contrib/helm/values.yaml -f values-common.yaml -f values-go.yaml   # rendu sans déployer
kubectl --context wa-rehearsal -n wa get pods
kubectl --context wa-rehearsal -n wa logs deploy/rehearsal-workadventure-play -f
kubectl --context wa-rehearsal -n wa describe pod -l app.kubernetes.io/instance=rehearsal
minikube image ls -p wa-rehearsal | grep wa-server                # images candidates présentes dans le nœud
```

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
