{{/*
Expand the name of the chart.
*/}}
{{- define "workadventure.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "workadventure.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "workadventure.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "workadventure.labels" -}}
helm.sh/chart: {{ include "workadventure.chart" . }}
{{ include "workadventure.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "workadventure.selectorLabels" -}}
app.kubernetes.io/name: {{ include "workadventure.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "workadventure.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "workadventure.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the domains
*/}}
{{- define "workadventure.playDomainName" -}}
{{- coalesce .Values.play.ingress.frontDomainName (printf "play%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end }}
{{- define "workadventure.playUrl" -}}
{{- if .Values.singleDomain -}}
{{- printf "https://%s" .Values.domainName }}
{{- else -}}
{{- if .Values.play.ingress.frontDomainName -}}
{{ printf "https://%s" .Values.play.ingress.frontDomainName }}
{{- else -}}
{{- printf "https://play%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end }}
{{- end }}

{{- define "workadventure.pusherDomainName" -}}
{{- coalesce .Values.play.ingress.pusherDomainName (printf "pusher%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.pusherUrl" -}}
{{- if .Values.singleDomain -}}
/
{{- else -}}
{{- if .Values.play.ingress.pusherDomainName -}}
{{ printf "https://%s" .Values.play.ingress.pusherDomainName }}
{{- else -}}
{{- printf "https://pusher%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.roomApiDomainName" -}}
{{- coalesce .Values.play.ingress.roomApiDomainName (printf "room-api%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.roomApiUrl" -}}
{{- if .Values.singleDomain -}}
/
{{- else -}}
{{- if .Values.play.ingress.roomApiDomainName -}}
{{ printf "https://%s" .Values.play.ingress.roomApiDomainName }}
{{- else -}}
{{- printf "https://room-api%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.mapStorageDomainName" -}}
{{- coalesce .Values.mapstorage.ingress.domainName (printf "map-storage%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.mapStorageUrl" -}}
{{- if .Values.singleDomain -}}
https://{{ .Values.domainName }}/map-storage
{{- else -}}
{{- if .Values.mapstorage.ingress.domainName -}}
{{ printf "https://%s" .Values.mapstorage.ingress.domainName }}
{{- else -}}
{{- printf "https://map-storage%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.iconDomainName" -}}
{{- coalesce .Values.icon.ingress.domainName (printf "icon%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.iconUrl" -}}
{{- if .Values.singleDomain -}}
/icon
{{- else -}}
{{- if .Values.icon.ingress.domainName -}}
{{ printf "https://%s" .Values.icon.ingress.domainName }}
{{- else -}}
{{- printf "https://icon%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.uploaderDomainName" -}}
{{- coalesce .Values.uploader.ingress.domainName (printf "uploader%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.uploaderUrl" -}}
{{- if .Values.singleDomain -}}
https://{{ .Values.domainName }}/uploader
{{- else -}}
{{- if .Values.uploader.ingress.domainName -}}
{{ printf "https://%s" .Values.uploader.ingress.domainName }}
{{- else -}}
{{- printf "https://uploader%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.mapsDomainName" -}}
{{- coalesce .Values.maps.ingress.domainName (printf "maps%s%s" .Values.domainNamePrefix .Values.domainName) }}
{{- end -}}
{{- define "workadventure.mapsUrl" -}}
{{- if .Values.singleDomain -}}
https://{{ .Values.domainName }}/maps
{{- else -}}
{{- if .Values.maps.ingress.domainName -}}
{{ printf "https://%s" .Values.maps.ingress.domainName }}
{{- else -}}
{{- printf "https://maps%s%s" .Values.domainNamePrefix .Values.domainName }}
{{- end }}
{{- end -}}
{{- end }}

{{- define "workadventure.isBooleanText" -}}
{{- if or (or (or (eq . "false") (eq . "0")) (not .)) (eq . "FALSE") -}}{{- else -}}1{{- end -}}
{{- end }}

{{- define "imagePullSecret" }}
{{- with .Values.imageCredentials }}
{{- printf "{\"auths\":{\"%s\":{\"username\":\"%s\",\"password\":\"%s\",\"email\":\"%s\",\"auth\":\"%s\"}}}" (required "imageCredentials.registry is required when imageCredentials.enabled = true" .registry) (required "imageCredentials.username is required when imageCredentials.enabled = true" .username) (required "imageCredentials.password is required when imageCredentials.enabled = true" .password) (required "imageCredentials.email is required when imageCredentials.enabled = true" .email) (printf "%s:%s" .username  (required "imageCredentials.password is required when imageCredentials.enabled = true" .password) | b64enc) | b64enc }}
{{- end }}
{{- end }}