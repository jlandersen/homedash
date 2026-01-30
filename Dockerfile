FROM golang:1.24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o homedash .

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /app/homedash /homedash

EXPOSE 8080

ENTRYPOINT ["/homedash"]
