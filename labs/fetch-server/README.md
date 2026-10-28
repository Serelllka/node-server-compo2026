# Fetch server

Dependency-free Node.js 24 server for the course fetch assignment.

```sh
npm start
npm test
docker build -t serelllka-fetch .
docker run --rm -p 3000:3000 serelllka-fetch
```

The server binds to `0.0.0.0`, using `PORT` or `3000`. The hosting provider must supply HTTPS; submit its public HTTPS root URL ending in `/`.

- `GET /login` returns HTTP 200 and exactly `serelllka` as plain text.
- `GET /id/N` requests `https://nd.kodaktor.ru/users/N` on the server, without an outgoing `Content-Type` header, and returns only the user's `login` as plain text.
- Numeric IDs contain 1–20 digits. Invalid IDs return 400, unknown users 404, and upstream errors or a 12-second timeout 502.
- Repeated and trailing path slashes are normalized without redirects. Other routes return 404, and other methods return 405.

No API keys, arbitrary upstream URLs, or npm dependencies are required.
