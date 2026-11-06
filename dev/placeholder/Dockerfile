# Placeholder candidate for the "server" variant: answers /ping and nothing else. It shows the contract a real
# candidate (server-go/, server-rust/) honours: a "dev" target, and the command in dev.env.
FROM busybox:1.37 AS dev
RUN mkdir -p /www && echo pong > /www/ping
