# Infrastructure

The environment the two apps run in: the reverse proxy in front of them and the
process manager underneath them. The apps themselves are in `apps/`.

Only **production** is described here. Development and staging are a separate
piece of work.

## Topology

Production is two Amazon Linux 2023 machines, one app each, nginx in front of
each. They are not alone on those machines — unrelated applications share them,
which is why every server block below names an explicit host and why
`optional/00-default-server.conf` exists.

| | `cms-host` | `website-host` |
|---|---|---|
| Runs | Strapi | React Router on Express |
| Proxy | nginx → `127.0.0.1:$CMS_PORT` | nginx → `127.0.0.1:$WEBSITE_PORT` |
| App reads | `apps/cms/.env.production` | `apps/website/.env.production` |
| Host facts | `production/cms-host/.env` | `production/website-host/.env` |

The two machines are coupled in exactly two places, and both are configuration
rather than network paths: the CMS's `WEBSITE_URLS` names the site so that Entry
Preview can frame it, and the site's `CMS_ORIGIN` names the CMS so that its
Content-Security-Policy will permit being framed. Set one without the other and
preview silently renders an empty box.

## Layout

```
infra/
├── install.js                    installs one host's proxy configuration
└── production/
    ├── shared/nginx/             snippets both hosts must have identically
    ├── optional/                 not installed; read before using
    ├── cms-host/
    │   ├── .env.example          the record of which keys the host needs
    │   ├── nginx/gcc-cms.conf
    │   └── pm2/ecosystem.config.cjs
    └── website-host/
        ├── .env.example
        ├── nginx/gcc-website.conf
        └── pm2/ecosystem.config.cjs
```

Nothing under `infra/` is read from the checkout at runtime. `install.js` copies
into `/etc/nginx`, so nginx's running configuration changes only when a person
runs the installer — not when a `git pull` lands, and not when certbot's renewal
hook fires an unrelated `nginx -s reload`.

## Values that vary by deployment

They are not templated. `install.js` writes them as one-line fragments under
`/etc/nginx/gcc/`, and the committed configuration `include`s each one at the
point where that directive is legal. So the configuration you read in git is the
configuration nginx runs, and a missing value fails by name at install time
rather than rendering an empty string into a directive.

| Fragment | From | Included in |
|---|---|---|
| `cms-upstream.conf` | `CMS_PORT` | `upstream gcc_cms` |
| `cms-server-name.conf` | `CMS_SERVER_NAME` | the CMS `server` block |
| `website-upstream.conf` | `WEBSITE_PORT` | `upstream gcc_website` |
| `website-server-name.conf` | `WEBSITE_SERVER_NAME` | the website `server` block |
| `website-frame-ancestors.conf` | `CMS_ORIGIN` | the website `server` block |

## Installing

On each machine, from the checkout:

```bash
cp infra/production/cms-host/.env.example infra/production/cms-host/.env
```

Fill it in, then:

```bash
node infra/install.js cms-host --dry-run
```

`--dry-run` prints every file it would write, needs no root, and touches
nothing. When it looks right:

```bash
sudo node infra/install.js cms-host
```

It writes the files and runs `nginx -t`. If `nginx -t` rejects the result it
restores every file it overwrote and exits non-zero, so a bad install does not
leave a half-configured proxy behind.

It does **not** reload. nginx keeps serving the previous configuration until you
say otherwise:

```bash
sudo systemctl reload nginx
```

Pass `--reload-server` to have the script do that itself. Separating the two
makes going live a decision rather than the tail end of an install — but note
that between the install and the reload, /etc/nginx holds a configuration nginx
has not loaded, and anything that reloads nginx in that window applies it.
Certbot's renewal hook is the usual culprit. Keep the gap short.

Then PM2:

```bash
sudo mkdir -p /var/log/gcc && sudo chown "$USER" /var/log/gcc
```

```bash
pm2 start infra/production/cms-host/pm2/ecosystem.config.cjs --env production && pm2 save
```

`pm2 save` matters. The ecosystem file reads the host's `.env` when `pm2 start`
evaluates it, and `pm2 save` freezes the resolved values into PM2's dump.
`pm2 resurrect` after a reboot replays that dump — it never re-reads `.env`. To
pick up an edit, run `pm2 start ... --env production` and `pm2 save` again;
`pm2 restart --update-env` does **not** do this, as it re-reads the calling
shell's environment rather than this file.

## Per-machine checklist

Neither `.env` under `infra/` configures an app. Each machine also needs the
app's own env file, which is gitignored and therefore never arrives with a
deploy:

**`cms-host` — `apps/cms/.env.production`**

Note the filename, for the same reason the website's host has one: PM2 starts
the CMS with `ENV_PATH=.env.production`, so a file named `.env` is read only
outside production — and `scripts/ensure-local-env.js` writes exactly that file
from the development example whenever `pnpm dev` or `pnpm test` is run.

- `PORT`, equal to `CMS_PORT` in the host's `.env`. Nothing reconciles the two;
  set them apart and nginx proxies to a closed port.
- `WEBSITE_URL` / `WEBSITE_URLS` pointing at the website machine, not localhost.
- The Postgres and S3 blocks, a `REGISTRATION_RELAY_TOKEN` minted in the admin,
  and fresh values for every key the example carries a development literal for.

**`website-host` — `apps/website/.env.production`**

Note the filename. PM2 launches the app with `--env-file-if-exists
.env.production`, so a file named `.env` is ignored in production.

- `HTTP_SERVER_PORT`, equal to `WEBSITE_PORT` in the host's `.env`.
- `TRUST_PROXY=2`. Not optional now that there are proxies in front: left
  unset, `req.ip` is the proxy on every request, so the registration form's
  rate limiter sees one caller and stops limiting. Two, not one — the ALB
  appends the client and nginx appends the ALB, so the app sees two hops.
- `CMS_URL`. The code defaults to `http://localhost:1337`, which is wrong the
  moment the CMS is on another machine.
- `CMS_API_TOKEN`, `REGISTRATION_TOKEN_SECRET`, `CALENDAR_LINK_SECRET`.

## Amazon Linux 2023 notes

- There is no `sites-available` / `sites-enabled`. `nginx.conf` includes
  `conf.d/*.conf`, which is where the server blocks go. The fragments and
  snippets go in `/etc/nginx/gcc/` instead, deliberately outside that glob: it
  is included at `http` level, and a bare `server 127.0.0.1:1337;` there is a
  syntax error rather than a fragment.
- SELinux ships enabled but **permissive**, so it logs rather than blocks. If a
  machine is ever set to enforcing, nginx will not connect to a local port until
  `sudo setsebool -P httpd_can_network_connect 1`. Worth setting anyway — it is
  harmless while permissive and saves diagnosing a 502 later.
- `conf.d/*.conf` loads alphabetically, and the first block for a listening
  socket becomes its default server unless something declares `default_server`.
  See `production/optional/00-default-server.conf`.

## TLS and the load balancer

TLS terminates at the ALB. nginx is reached over plain HTTP and stays on
`listen 80`, which is correct rather than a leftover.

**The HTTP-to-HTTPS redirect belongs on the ALB, not here.** Give the ALB's
`:80` listener a single default action of `redirect` to `HTTPS:443` — it is a
listener rule, so it costs nothing and never reaches an instance. Doing it in
nginx instead would be wrong twice over: `$scheme` is always `http` on this side
of the ALB, so a redirect keyed on it loops forever, and keying it on
`$http_x_forwarded_proto` instead would work but drag every plain-HTTP request
across the network to an instance just to be told to go away.

Because nginx never sees the client's scheme first-hand, `X-Forwarded-Proto` is
forwarded from what the ALB said rather than set from `$scheme` — see
`shared/nginx/forwarded-proto-map.conf`.

HSTS is deliberately absent. It belongs on the website once HTTPS is confirmed
working end to end, and it should start with a short `max-age` — a browser that
has been told to use HTTPS for a year will not go back if something is wrong.

## Still open

**ALB health checks will not match either server block.** A health check arrives
with `Host: <instance-ip>`, which matches no `server_name` here, so nginx serves
it from whatever the default server for `:80` happens to be — a neighbouring
application, or a 444. Adding the IP to `server_name` is the obvious fix and the
wrong one on a shared machine: every neighbour's health check is addressed the
same way, so we would start answering for them.

The clean fix is a dedicated health-check port: a target group health check port
override — 8081, say — and a small server block listening there that proxies to
the app. Host matching stops being involved at all, and the check still fails
when the app is actually down, which pointing it at a static 200 would not.

That is deliberately not built here. It is recorded so that the first unhealthy
target is diagnosed in a minute rather than an afternoon.

There is also no rate limiting on the CMS admin login and no restriction on who
can reach `/admin` at all. Both are worth a decision rather than a default.
