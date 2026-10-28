# Fetch Worker

Standalone Cloudflare Worker for the course fetch assignment. No dependencies or secrets.

- `GET /login` returns `serelllka` as plain text.
- `GET /id/N` fetches `https://nd.kodaktor.ru/users/N` without a Content-Type request header and returns only its login.
- Repeated and trailing slashes are normalized without redirects. Upstream requests time out after 12 seconds.

From this directory, run:

```sh
node --test worker.test.mjs
```

For dashboard deployment, create a Worker, replace its source with the full contents of `worker.mjs`, and deploy. No build step is required. Submit its root HTTPS address, ending in `/`, to the course checker.

Alternatively, after signing into Cloudflare, use the Wrangler already installed in this repository (from this directory):

```sh
node ../../web/node_modules/wrangler/bin/wrangler.js deploy --config wrangler.jsonc
```

Check `/login` and `/id/3` on the deployed address before submitting. Local tests verify behavior with mocked upstream responses; they do not prove that the course checker can reach the deployment.
