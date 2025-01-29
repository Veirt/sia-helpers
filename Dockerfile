FROM golang:alpine AS builder

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux \
    go build -a -installsuffix cgo -o server cmd/server/main.go && \
    go build -a -installsuffix cgo -o khs_monitor cmd/khs_monitor/main.go && \
    go build -a -installsuffix cgo -o entrypoint cmd/docker_entrypoint/main.go

FROM scratch

WORKDIR /app
COPY --from=builder /app/server .
COPY --from=builder /app/khs_monitor .
COPY --from=builder /app/entrypoint .
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 33125/tcp

CMD ["/app/entrypoint"]
