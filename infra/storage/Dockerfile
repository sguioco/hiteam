FROM golang:1.24.9-bookworm AS minio-build
ENV CGO_ENABLED=0
RUN go install github.com/minio/minio@7aac2a2c5b7c882e68c1ce017d8256be2feea27f

FROM golang:1.24.9-bookworm AS mc-build
ENV CGO_ENABLED=0
RUN go install github.com/minio/mc@77f82e18b5401a65958f1619df6ebb994634bd88

FROM debian:bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

FROM runtime AS minio
COPY --from=minio-build /go/bin/minio /usr/bin/minio
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data"]

FROM runtime AS mc
COPY --from=mc-build /go/bin/mc /usr/bin/mc
ENTRYPOINT ["/usr/bin/mc"]
