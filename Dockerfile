# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install ca-certificates for HTTPS health checks
RUN apk add --no-cache ca-certificates

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o homedash .

# Final stage - minimal image
FROM scratch

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=builder /app/homedash /homedash

# Expose default port
EXPOSE 8080

# Run
ENTRYPOINT ["/homedash"]
