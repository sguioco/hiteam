{{- define "hiteam.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "hiteam.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- include "hiteam.name" . -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.apiServiceName" -}}
{{- printf "%s-svc-api" (include "hiteam.fullname" .) -}}
{{- end -}}

{{- define "hiteam.webAdminServiceName" -}}
{{- printf "%s-svc-web-admin" (include "hiteam.fullname" .) -}}
{{- end -}}

{{- define "hiteam.postgresServiceName" -}}
{{- default "svc-postgres" .Values.postgres.service.name -}}
{{- end -}}

{{- define "hiteam.redisServiceName" -}}
{{- default "svc-redis" .Values.redis.service.name -}}
{{- end -}}

{{- define "hiteam.minioServiceName" -}}
{{- default "svc-minio" .Values.minio.service.name -}}
{{- end -}}

{{- define "hiteam.comprefaceServiceName" -}}
{{- default "svc-compreface" .Values.compreface.service.name -}}
{{- end -}}

{{- define "hiteam.pullSecretName" -}}
{{- .Values.sharedInfo.pullSecret.name -}}
{{- end -}}

{{- define "hiteam.publicFrontendUrl" -}}
{{- if .Values.webAdmin.env.WEB_ADMIN_BASE_URL -}}
{{- .Values.webAdmin.env.WEB_ADMIN_BASE_URL -}}
{{- else if and .Values.ingress.frontend.enabled .Values.ingress.frontend.host -}}
{{- printf "https://%s" .Values.ingress.frontend.host -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.publicApiUrl" -}}
{{- if .Values.api.env.API_PUBLIC_URL -}}
{{- .Values.api.env.API_PUBLIC_URL -}}
{{- else if and .Values.ingress.backend.enabled .Values.ingress.backend.host -}}
{{- printf "https://%s" .Values.ingress.backend.host -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.databaseUrl" -}}
{{- if .Values.api.env.DATABASE_URL -}}
{{- .Values.api.env.DATABASE_URL -}}
{{- else if .Values.postgres.enabled -}}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.postgres.auth.username .Values.postgres.auth.password (include "hiteam.postgresServiceName" .) .Values.postgres.service.port .Values.postgres.auth.database -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.redisUrl" -}}
{{- if .Values.api.env.REDIS_URL -}}
{{- .Values.api.env.REDIS_URL -}}
{{- else if .Values.redis.enabled -}}
{{- printf "redis://%s:%v" (include "hiteam.redisServiceName" .) .Values.redis.service.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.s3Endpoint" -}}
{{- if .Values.api.env.S3_ENDPOINT -}}
{{- .Values.api.env.S3_ENDPOINT -}}
{{- else if .Values.minio.enabled -}}
{{- printf "http://%s:%v" (include "hiteam.minioServiceName" .) .Values.minio.service.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.s3AccessKey" -}}
{{- if .Values.api.env.S3_ACCESS_KEY -}}
{{- .Values.api.env.S3_ACCESS_KEY -}}
{{- else if .Values.minio.enabled -}}
{{- .Values.minio.rootUser -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.s3SecretKey" -}}
{{- if .Values.api.env.S3_SECRET_KEY -}}
{{- .Values.api.env.S3_SECRET_KEY -}}
{{- else if .Values.minio.enabled -}}
{{- .Values.minio.rootPassword -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.s3Bucket" -}}
{{- if .Values.api.env.S3_BUCKET -}}
{{- .Values.api.env.S3_BUCKET -}}
{{- else if .Values.minio.enabled -}}
{{- .Values.minio.bucket -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.s3PublicBaseUrl" -}}
{{- if .Values.api.env.S3_PUBLIC_BASE_URL -}}
{{- .Values.api.env.S3_PUBLIC_BASE_URL -}}
{{- else if and .Values.ingress.storage.enabled .Values.ingress.storage.host -}}
{{- printf "https://%s/%s" .Values.ingress.storage.host (include "hiteam.s3Bucket" .) -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.compreFaceBaseUrl" -}}
{{- if .Values.api.env.COMPRE_FACE_BASE_URL -}}
{{- .Values.api.env.COMPRE_FACE_BASE_URL -}}
{{- else if .Values.compreface.enabled -}}
{{- printf "http://%s:%v" (include "hiteam.comprefaceServiceName" .) .Values.compreface.service.port -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.webAdminInternalApiUrl" -}}
{{- if .Values.webAdmin.env.INTERNAL_API_URL -}}
{{- .Values.webAdmin.env.INTERNAL_API_URL -}}
{{- else -}}
{{- printf "http://%s:%v" (include "hiteam.apiServiceName" .) .Values.api.service.port -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.webAdminBaseUrl" -}}
{{- if .Values.webAdmin.env.WEB_ADMIN_BASE_URL -}}
{{- .Values.webAdmin.env.WEB_ADMIN_BASE_URL -}}
{{- else -}}
{{- include "hiteam.publicFrontendUrl" . -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.webAdminPublicApiUrl" -}}
{{- if .Values.webAdmin.env.NEXT_PUBLIC_API_URL -}}
{{- .Values.webAdmin.env.NEXT_PUBLIC_API_URL -}}
{{- else -}}
{{- include "hiteam.publicApiUrl" . -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.webAdminPublicGraphqlUrl" -}}
{{- if .Values.webAdmin.env.NEXT_PUBLIC_GRAPHQL_URL -}}
{{- .Values.webAdmin.env.NEXT_PUBLIC_GRAPHQL_URL -}}
{{- else if (include "hiteam.webAdminPublicApiUrl" .) -}}
{{- printf "%s/graphql" (include "hiteam.webAdminPublicApiUrl" .) -}}
{{- else -}}
{{- "" -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.frontendTlsSecret" -}}
{{- if .Values.ingress.frontend.tlsSecret -}}
{{- .Values.ingress.frontend.tlsSecret -}}
{{- else -}}
{{- printf "%s-frontend-tls" (include "hiteam.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.backendTlsSecret" -}}
{{- if .Values.ingress.backend.tlsSecret -}}
{{- .Values.ingress.backend.tlsSecret -}}
{{- else -}}
{{- printf "%s-backend-tls" (include "hiteam.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.storageTlsSecret" -}}
{{- if .Values.ingress.storage.tlsSecret -}}
{{- .Values.ingress.storage.tlsSecret -}}
{{- else -}}
{{- printf "%s-storage-tls" (include "hiteam.fullname" .) -}}
{{- end -}}
{{- end -}}

{{- define "hiteam.comprefaceTlsSecret" -}}
{{- if .Values.ingress.compreface.tlsSecret -}}
{{- .Values.ingress.compreface.tlsSecret -}}
{{- else -}}
{{- printf "%s-compreface-tls" (include "hiteam.fullname" .) -}}
{{- end -}}
{{- end -}}
