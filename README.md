# FriVilje Nettside

Moderne, innholdsstyrt nettside for FriVilje med tydelig hero-design, aktiviteter og adminstyring.

## Sider

- `/index.html` (hjem)
- `/om.html` (om prosjektet)
- `/kontakt.html` (kontakt + nyhetsbrev)
- `/admin` (skjult admin)

## Kjør lokalt

```bash
cd "/Users/piyush/Documents/New project"
node server.js
```

Åpne:

- `http://127.0.0.1:8080`

## Hvis du bruker VS Code Live Server

Hvis du åpner `admin.html` via Live Server (f.eks. `http://127.0.0.1:5500`), må admin kobles til backend:

1. Start backend med `node server.js` (port `8080`).
2. På admin-siden, sett API-adresse til `http://127.0.0.1:8080/api`.
3. Skriv admin-bruker/passord i feltet "Koble til API".

## Admin (skjult og beskyttet)

Admin er ikke i offentlig meny og er låst med HTTP Basic Auth.

- URL: `http://127.0.0.1:8080/admin`
- Standard brukernavn: `frivilje`
- Standard passord: `friVilje2026`

Endre innlogging lokalt:

```bash
ADMIN_USER="ditt-brukernavn" ADMIN_PASSWORD="ditt-passord" node server.js
```

## Viktig om admin-flyt

Når admin logger inn på `/admin`, opprettes en sikker admin-sesjonscookie.
Den brukes for lagring av:

- sideinnhold (`PUT /api/site-content`)
- aktiviteter/annonser (`POST/PUT/DELETE /api/posts`)

Hvis admin-sesjon utløper, åpne `/admin` på nytt og logg inn igjen.

## Innhold uten koding

Admin kan redigere eksisterende sideinnhold (tekst, knapper, hero-bilder) direkte i adminpanelet.
Lagring skjer i:

- `data/site-content.json`

## API

- `GET /api/health`
- `GET /api/posts` (offentlig)
- `POST /api/posts` (admin)
- `PUT /api/posts/:id` (admin)
- `DELETE /api/posts/:id` (admin)
- `GET /api/site-content` (offentlig)
- `PUT /api/site-content` (admin)
- `POST /api/inquiries`
- `POST /api/newsletter`

## Datalagring

- `data/posts.json`
- `data/site-content.json`
- `data/inquiries.json`
- `data/newsletter.json`
