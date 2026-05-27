# FriVilje Nettside

Moderne, innholdsstyrt nettside for FriVilje med admin, aktiviteter og API via Netlify Functions.

## Sider

- `/index.html` (hjem)
- `/om.html` (om prosjektet)
- `/kontakt.html` (kontakt + nyhetsbrev)
- `/admin` (admin)

## Kjør lokalt (Node-server)

```bash
cd "/Users/piyush/Documents/FriVilje"
node server.js
```

Åpne:

- `http://127.0.0.1:8080`

## Netlify-oppsett

Prosjektet bruker:

- `netlify/functions/api.cjs`
- `netlify.toml` med rewrite fra `/api/*` til funksjonen
- `@netlify/blobs` for lagring av innlegg/innhold

### Netlify Environment Variables

Legg disse inn i Netlify:

- `ADMIN_USER` (f.eks. `frivilje`)
- `ADMIN_PASSWORD` (sett et sterkt passord)

`ADMIN_SESSION_SECRET` er ikke nødvendig i funksjonsvarianten.

## Hvordan logge inn admin på Netlify

1. Gå til `https://ditt-domene.netlify.app/admin`.
2. I boksen **Koble til API**:
   - API-adresse: `https://ditt-domene.netlify.app/api`
   - Admin-bruker: verdien i `ADMIN_USER`
   - Admin-passord: verdien i `ADMIN_PASSWORD`
3. Trykk **Koble til API**.
4. Nå kan du lagre sideinnhold og opprette/redigere/slette aktiviteter.

## Hvis du bruker VS Code Live Server lokalt

Hvis du åpner `admin.html` via Live Server (f.eks. `http://127.0.0.1:5500`):

1. Start backend med `node server.js` (port `8080`).
2. På admin-siden, sett API-adresse til `http://127.0.0.1:8080/api`.
3. Skriv admin-bruker/passord i feltet **Koble til API**.

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

## Feilsøking (Netlify 502 / lagring)

1. Etter deploy, åpne `https://ditt-domene.netlify.app/api/health`.
2. Sjekk `storageMode` i svaret:
   - `netlify-blobs`: alt OK.
   - `memory-fallback`: API svarer, men vedvarende lagring er ikke aktiv.
3. Hvis `storageError` sier at `@netlify/blobs` mangler:
   - deploy via Git-koblet Netlify-prosjekt eller Netlify CLI (ikke bare statisk upload uten build).
