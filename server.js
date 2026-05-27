const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname);
const DATA_DIR = path.join(ROOT, "data");

const POSTS_FILE = path.join(DATA_DIR, "posts.json");
const INQUIRIES_FILE = path.join(DATA_DIR, "inquiries.json");
const NEWSLETTER_FILE = path.join(DATA_DIR, "newsletter.json");
const SITE_CONTENT_FILE = path.join(DATA_DIR, "site-content.json");

const ADMIN_USER = String(process.env.ADMIN_USER || "frivilje").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "friVilje2026").trim();
const ADMIN_SESSION_COOKIE = "frivilje_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const ADMIN_SESSION_SECRET = String(process.env.ADMIN_SESSION_SECRET || `${ADMIN_USER}:${ADMIN_PASSWORD}:friVilje`).trim();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

if (require.main === module) {
  createServer().catch((error) => {
    console.error("Failed to start FriVilje server:", error);
    process.exit(1);
  });
}

async function createServer() {
  await ensureDataFiles();

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (req.method === "OPTIONS" && requestUrl.pathname.startsWith("/api/")) {
        return sendOptions(res);
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/health") {
        return sendJson(res, 200, {
          ok: true,
          service: "frivilje-web",
          now: new Date().toISOString()
        });
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/posts") {
        return handleGetPosts(res);
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/site-content") {
        return handleGetSiteContent(res);
      }

      if (req.method === "PUT" && requestUrl.pathname === "/api/site-content") {
        if (!requireAdminApi(req, res)) {
          return;
        }
        return handleUpdateSiteContent(req, res);
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/posts") {
        if (!requireAdminApi(req, res)) {
          return;
        }
        return handleCreatePost(req, res);
      }

      if (requestUrl.pathname.startsWith("/api/posts/") && /^\/api\/posts\/[^/]+$/.test(requestUrl.pathname)) {
        const id = decodeURIComponent(requestUrl.pathname.split("/").pop() || "");

        if (req.method === "PUT") {
          if (!requireAdminApi(req, res)) {
            return;
          }
          return handleUpdatePost(id, req, res);
        }

        if (req.method === "DELETE") {
          if (!requireAdminApi(req, res)) {
            return;
          }
          return handleDeletePost(id, req, res);
        }
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/inquiries") {
        return handleCreateInquiry(req, res);
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/newsletter") {
        return handleNewsletterSignup(req, res);
      }

      if (isAdminPagePath(requestUrl.pathname)) {
        if (!isAdminAuthorized(req)) {
          return challengeAdminPage(res);
        }

        setAdminSessionCookie(res);
        return serveStatic("/admin.html", res);
      }

      if (requestUrl.pathname === "/admin.js") {
        if (!isAdminAuthorized(req)) {
          return challengeAdminPage(res);
        }

        setAdminSessionCookie(res);
      }

      return serveStatic(requestUrl.pathname, res);
    } catch (error) {
      console.error("Request error:", error);
      return sendJson(res, 500, {
        ok: false,
        error: "Internal server error"
      });
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`FriVilje running on http://${HOST}:${PORT}`);
    console.log(`Admin login user: ${ADMIN_USER}`);
  });
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await ensureArrayFile(POSTS_FILE);
  await ensureArrayFile(INQUIRIES_FILE);
  await ensureArrayFile(NEWSLETTER_FILE);
  await ensureObjectFile(SITE_CONTENT_FILE, createDefaultSiteContent());
  await seedInitialPost();
}

async function ensureArrayFile(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]\n", "utf8");
  }
}

async function ensureObjectFile(filePath, fallbackObject) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, `${JSON.stringify(fallbackObject, null, 2)}\n`, "utf8");
  }
}

async function seedInitialPost() {
  const posts = await readArrayFile(POSTS_FILE);
  if (posts.length > 0) {
    return;
  }

  const initial = {
    id: "sample-frivilje-1",
    title: "Fellesøkt ved Sognsvann",
    summary: "Rolig fellesløp med plass til alle nivåer, etterfulgt av kaffe og prat.",
    body: "Vi møtes for en sosial økt der både gående og løpende deltakere er velkommen. Ta med en venn om du vil.",
    category: "Aktivitet",
    eventDate: "2026-06-10T17:00:00.000Z",
    location: "Sognsvann",
    createdAt: "2026-05-27T00:00:00.000Z",
    updatedAt: "2026-05-27T00:00:00.000Z"
  };

  await writeArrayFile(POSTS_FILE, [initial]);
}

function isAdminPagePath(pathname) {
  return pathname === "/admin" || pathname === "/admin/" || pathname === "/admin.html";
}

function requireAdminApi(req, res) {
  if (!isAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized. Logg inn på /admin på nytt." });
    return false;
  }

  return true;
}

function challengeAdminPage(res) {
  res.writeHead(401, {
    "Content-Type": "text/plain; charset=utf-8",
    "WWW-Authenticate": 'Basic realm="FriVilje Admin", charset="UTF-8"',
    "Cache-Control": "no-cache"
  });
  res.end("Admin authorization required.");
}

function isAdminRequest(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Basic ")) {
    return false;
  }

  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return false;
  }

  const user = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);

  return safeEqual(user, ADMIN_USER) && safeEqual(password, ADMIN_PASSWORD);
}

function isAdminAuthorized(req) {
  return isAdminRequest(req) || hasValidAdminSession(req);
}

function setAdminSessionCookie(res) {
  const now = Date.now();
  const expiresAt = now + ADMIN_SESSION_TTL_SECONDS * 1000;
  const payload = `${ADMIN_USER}:${expiresAt}`;
  const signature = signValue(payload);
  const token = Buffer.from(payload, "utf8").toString("base64url");
  const cookieValue = `${token}.${signature}`;
  const cookie = `${ADMIN_SESSION_COOKIE}=${cookieValue}; Path=/; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; HttpOnly; SameSite=Lax`;

  appendSetCookieHeader(res, cookie);
}

function hasValidAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  const rawToken = cookies[ADMIN_SESSION_COOKIE];
  if (!rawToken || !rawToken.includes(".")) {
    return false;
  }

  const [encodedPayload, signature] = rawToken.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  let payload = "";
  try {
    payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const separator = payload.lastIndexOf(":");
  if (separator < 0) {
    return false;
  }

  const sessionUser = payload.slice(0, separator);
  const expiresRaw = payload.slice(separator + 1);
  const expiresAt = Number(expiresRaw);

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  if (!safeEqual(sessionUser, ADMIN_USER)) {
    return false;
  }

  const expected = signValue(payload);
  return safeEqual(signature, expected);
}

function signValue(value) {
  return crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(String(value)).digest("hex");
}

function parseCookies(headerValue) {
  const out = {};
  const raw = String(headerValue || "");

  if (!raw) {
    return out;
  }

  const parts = raw.split(";");
  for (const part of parts) {
    const [keyRaw, ...valueParts] = part.split("=");
    const key = String(keyRaw || "").trim();
    if (!key) {
      continue;
    }

    const rawValue = valueParts.join("=").trim();
    try {
      out[key] = decodeURIComponent(rawValue);
    } catch {
      out[key] = rawValue;
    }
  }

  return out;
}

function appendSetCookieHeader(res, cookieLine) {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", cookieLine);
    return;
  }

  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, cookieLine]);
    return;
  }

  res.setHeader("Set-Cookie", [String(current), cookieLine]);
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

async function handleGetPosts(res) {
  const posts = await readArrayFile(POSTS_FILE);

  posts.sort((a, b) => {
    const aTime = toTimestamp(a.eventDate || a.createdAt);
    const bTime = toTimestamp(b.eventDate || b.createdAt);
    return bTime - aTime;
  });

  return sendJson(res, 200, {
    ok: true,
    posts
  });
}

async function handleGetSiteContent(res) {
  const content = normalizeSiteContent(await readObjectFile(SITE_CONTENT_FILE));
  return sendJson(res, 200, {
    ok: true,
    content
  });
}

async function handleUpdateSiteContent(req, res) {
  try {
    const raw = await readJsonBody(req);
    const content = normalizeSiteContent(raw);
    content.updatedAt = new Date().toISOString();
    await writeObjectFile(SITE_CONTENT_FILE, content);

    return sendJson(res, 200, {
      ok: true,
      content
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke lagre sideinnhold.");
  }
}

async function handleCreatePost(req, res) {
  try {
    const payload = sanitizePost(await readJsonBody(req));
    const posts = await readArrayFile(POSTS_FILE);
    const now = new Date().toISOString();

    const created = {
      id: createId(),
      ...payload,
      createdAt: now,
      updatedAt: now
    };

    posts.push(created);
    await writeArrayFile(POSTS_FILE, posts);

    return sendJson(res, 201, {
      ok: true,
      post: created
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke opprette aktivitet.");
  }
}

async function handleUpdatePost(id, req, res) {
  try {
    if (!id) {
      throw makeClientError("Mangler aktivitet-ID.");
    }

    const payload = sanitizePost(await readJsonBody(req));
    const posts = await readArrayFile(POSTS_FILE);
    const index = posts.findIndex((post) => post.id === id);

    if (index === -1) {
      return sendJson(res, 404, { ok: false, error: "Aktiviteten finnes ikke." });
    }

    const updated = {
      ...posts[index],
      ...payload,
      updatedAt: new Date().toISOString()
    };

    posts[index] = updated;
    await writeArrayFile(POSTS_FILE, posts);

    return sendJson(res, 200, {
      ok: true,
      post: updated
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke oppdatere aktivitet.");
  }
}

async function handleDeletePost(id, req, res) {
  try {
    if (!id) {
      throw makeClientError("Mangler aktivitet-ID.");
    }

    const posts = await readArrayFile(POSTS_FILE);
    const exists = posts.some((post) => post.id === id);

    if (!exists) {
      return sendJson(res, 404, { ok: false, error: "Aktiviteten finnes ikke." });
    }

    const nextPosts = posts.filter((post) => post.id !== id);
    await writeArrayFile(POSTS_FILE, nextPosts);

    return sendJson(res, 200, {
      ok: true,
      deletedId: id
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke slette aktivitet.");
  }
}

async function handleCreateInquiry(req, res) {
  try {
    const payload = sanitizeInquiry(await readJsonBody(req));
    const list = await readArrayFile(INQUIRIES_FILE);
    const created = {
      id: createId(),
      ...payload,
      createdAt: new Date().toISOString()
    };

    list.push(created);
    await writeArrayFile(INQUIRIES_FILE, list);

    return sendJson(res, 201, {
      ok: true,
      inquiry: created
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke sende forespørselen.");
  }
}

async function handleNewsletterSignup(req, res) {
  try {
    const payload = sanitizeNewsletter(await readJsonBody(req));
    const list = await readArrayFile(NEWSLETTER_FILE);
    const existing = list.find((item) => item.email.toLowerCase() === payload.email.toLowerCase());

    if (existing) {
      return sendJson(res, 200, {
        ok: true,
        alreadyExists: true,
        subscriber: existing
      });
    }

    const created = {
      id: createId(),
      ...payload,
      createdAt: new Date().toISOString()
    };

    list.push(created);
    await writeArrayFile(NEWSLETTER_FILE, list);

    return sendJson(res, 201, {
      ok: true,
      alreadyExists: false,
      subscriber: created
    });
  } catch (error) {
    return sendHandledError(res, error, "Kunne ikke registrere nyhetsbrev-påmelding.");
  }
}

function createDefaultSiteContent() {
  return {
    brandName: "FriVilje",
    footerTagline: "Du hører til her.",
    home: {
      kicker: "Norges viktigste løpefellesskap",
      title: "Et fellesskap der alle kan delta",
      lead: "FriVilje samler mennesker gjennom aktivitet, fellesskap og sosial støtte. Målet vårt er enkelt: flere skal få være med, oppleve mestring og kjenne at de hører til.",
      primaryCtaLabel: "Meld deg på oppdateringer",
      primaryCtaHref: "/kontakt.html#oppdateringer",
      secondaryCtaLabel: "Bli med i Strava-gruppen",
      secondaryCtaHref: "https://www.strava.com",
      heroImage: "https://images.pexels.com/photos/8556686/pexels-photo-8556686.jpeg?auto=compress&cs=tinysrgb&w=1600",
      heroImageAlt: "Løpegruppe i fellesskap",
      featureImage: "https://images.pexels.com/photos/1727717/pexels-photo-1727717.jpeg?auto=compress&cs=tinysrgb&w=1400",
      featureImageAlt: "Løpere som støtter hverandre",
      stat1Title: "12. sep 2026",
      stat1Text: "Oslo Maraton",
      stat2Title: "For alle nivåer",
      stat2Text: "Ingen krav til fart",
      stat3Title: "Fellesskap først",
      stat3Text: "Vi går og løper sammen",
      feature1Title: "Norges viktigste løpegruppe",
      feature1Text: "Løpegruppen finner du på Strava og Løpevenn under navnet FriVilje. Her handler det ikke om prestisje, men om å møte opp og løfte hverandre.",
      feature2Title: "Vil du bli med?",
      feature2Text: "Vi ønsker nye deltakere, frivillige og samarbeidspartnere velkommen. Ta kontakt, så finner vi en måte å delta på som passer deg.",
      featureCtaLabel: "Gå til kontakt",
      featureCtaHref: "/kontakt.html"
    },
    about: {
      kicker: "Om prosjektet",
      title: "Historien bak FriVilje",
      heroImage: "https://images.pexels.com/photos/8556496/pexels-photo-8556496.jpeg?auto=compress&cs=tinysrgb&w=1400",
      heroImageAlt: "FriVilje løpefellesskap",
      intro: "Mitt navn er Ask Edin Goldmann, og dette er min idé.",
      body: "FriVilje startet med en tanke jeg ikke klarte å slippe: Hvorfor er det så mange mennesker som ønsker å delta, bidra og leve meningsfulle liv, men som likevel ender opp utenfor?\n\nJeg har valgt å sette studiene på pause for å satse fullt på dette prosjektet, fordi jeg tror på noe grunnleggende: Alle mennesker fortjener muligheten til å leve en verdifull hverdag og få være en del av samfunnet rundt seg.\n\nJeg tror ikke mennesker havner utenfor fordi de mangler verdi, vilje eller ressurser. Jeg tror altfor mange blir stående utenfor fordi samfunnet rundt dem ikke er bygget med plass til dem. Fordi inngangen mangler. Fordi tilretteleggingen ikke er god nok. Fordi vi fortsatt er flinkere til å se begrensninger enn muligheter.\n\nFriVilje er et initiativ for å skape engasjement rundt det å kunne velge sin egen hverdag, uansett funksjonsnivå, tilstand eller forutsetninger. Jeg tror at alle mennesker har noe å bidra med. Alle mennesker har verdier, drømmer, interesser og ressurser som fortjener plass. Å høre til i samfunnet skal ikke være et privilegium for noen få. Det skal være mulig for alle.\n\nFriVilje ønsker å utfordre måten vi tenker på. Hva skjer når vi slutter å spørre «Hva kan ikke dette mennesket?» og heller spør «Hva trenger vi å gjøre for at dette mennesket skal få delta?» Dette handler om frihet. Om verdighet. Om å bli sett for det man kan, ikke definert av det man strever med.\n\nJeg ønsker å bidra til et samfunn som ikke bare inkluderer i teorien, men i praksis. Et samfunn der flere får kjenne på mestring, tilhørighet og muligheten til å forme sitt eget liv.",
      runTitle: "Norges viktigste løpegruppe",
      runText: "Løpegruppen finner du på Strava og Løpevenn under navnet FriVilje. Målet er klart: Vi stiller til start under Oslo Maraton 12. september 2026.",
      whyTitle: "Hvorfor vi løper",
      whyText: "Dette handler ikke om tid, prestasjon eller perfekte forutsetninger. Det handler om å møte opp. Om fellesskap. Om å bevise at deltakelse skal være mulig for flere, og at mennesker blir sterkere når noen tror på dem og går ved siden av dem. Du hører til her.",
      stravaCtaLabel: "Se Strava-gruppen",
      stravaCtaHref: "https://www.strava.com"
    },
    contact: {
      kicker: "Kontakt oss",
      title: "Spørsmål, forespørsel eller samarbeid",
      lead: "Send oss en melding, så svarer vi så fort vi kan.",
      heroImage: "https://images.pexels.com/photos/6339459/pexels-photo-6339459.jpeg?auto=compress&cs=tinysrgb&w=1400",
      heroImageAlt: "FriVilje fellesskap",
      inquiryTitle: "Forespørsel",
      newsletterTitle: "Få oppdateringer på e-post",
      newsletterLead: "Få invitasjoner til aktiviteter, annonser og nyheter fra FriVilje."
    },
    updatedAt: new Date().toISOString()
  };
}

function normalizeSiteContent(input) {
  const base = createDefaultSiteContent();
  const safe = input && typeof input === "object" ? input : {};
  const home = safe.home && typeof safe.home === "object" ? safe.home : {};
  const about = safe.about && typeof safe.about === "object" ? safe.about : {};
  const contact = safe.contact && typeof safe.contact === "object" ? safe.contact : {};

  return {
    brandName: cleanText(safe.brandName, 120) || base.brandName,
    footerTagline: cleanText(safe.footerTagline, 220) || base.footerTagline,
    home: {
      kicker: cleanText(home.kicker, 120) || base.home.kicker,
      title: cleanText(home.title, 180) || base.home.title,
      lead: cleanMultiline(home.lead, 1600) || base.home.lead,
      primaryCtaLabel: cleanText(home.primaryCtaLabel, 80) || base.home.primaryCtaLabel,
      primaryCtaHref: cleanUrl(home.primaryCtaHref) || base.home.primaryCtaHref,
      secondaryCtaLabel: cleanText(home.secondaryCtaLabel, 80) || base.home.secondaryCtaLabel,
      secondaryCtaHref: cleanUrl(home.secondaryCtaHref) || base.home.secondaryCtaHref,
      heroImage: cleanUrl(home.heroImage) || base.home.heroImage,
      heroImageAlt: cleanText(home.heroImageAlt, 160) || base.home.heroImageAlt,
      featureImage: cleanUrl(home.featureImage) || base.home.featureImage,
      featureImageAlt: cleanText(home.featureImageAlt, 160) || base.home.featureImageAlt,
      stat1Title: cleanText(home.stat1Title, 70) || base.home.stat1Title,
      stat1Text: cleanText(home.stat1Text, 110) || base.home.stat1Text,
      stat2Title: cleanText(home.stat2Title, 70) || base.home.stat2Title,
      stat2Text: cleanText(home.stat2Text, 110) || base.home.stat2Text,
      stat3Title: cleanText(home.stat3Title, 70) || base.home.stat3Title,
      stat3Text: cleanText(home.stat3Text, 110) || base.home.stat3Text,
      feature1Title: cleanText(home.feature1Title, 120) || base.home.feature1Title,
      feature1Text: cleanMultiline(home.feature1Text, 700) || base.home.feature1Text,
      feature2Title: cleanText(home.feature2Title, 120) || base.home.feature2Title,
      feature2Text: cleanMultiline(home.feature2Text, 700) || base.home.feature2Text,
      featureCtaLabel: cleanText(home.featureCtaLabel, 80) || base.home.featureCtaLabel,
      featureCtaHref: cleanUrl(home.featureCtaHref) || base.home.featureCtaHref
    },
    about: {
      kicker: cleanText(about.kicker, 120) || base.about.kicker,
      title: cleanText(about.title, 180) || base.about.title,
      heroImage: cleanUrl(about.heroImage) || base.about.heroImage,
      heroImageAlt: cleanText(about.heroImageAlt, 160) || base.about.heroImageAlt,
      intro: cleanMultiline(about.intro, 500) || base.about.intro,
      body: cleanMultiline(about.body, 12000) || base.about.body,
      runTitle: cleanText(about.runTitle, 130) || base.about.runTitle,
      runText: cleanMultiline(about.runText, 1200) || base.about.runText,
      whyTitle: cleanText(about.whyTitle, 130) || base.about.whyTitle,
      whyText: cleanMultiline(about.whyText, 1200) || base.about.whyText,
      stravaCtaLabel: cleanText(about.stravaCtaLabel, 80) || base.about.stravaCtaLabel,
      stravaCtaHref: cleanUrl(about.stravaCtaHref) || base.about.stravaCtaHref
    },
    contact: {
      kicker: cleanText(contact.kicker, 120) || base.contact.kicker,
      title: cleanText(contact.title, 180) || base.contact.title,
      lead: cleanMultiline(contact.lead, 900) || base.contact.lead,
      heroImage: cleanUrl(contact.heroImage) || base.contact.heroImage,
      heroImageAlt: cleanText(contact.heroImageAlt, 160) || base.contact.heroImageAlt,
      inquiryTitle: cleanText(contact.inquiryTitle, 120) || base.contact.inquiryTitle,
      newsletterTitle: cleanText(contact.newsletterTitle, 140) || base.contact.newsletterTitle,
      newsletterLead: cleanMultiline(contact.newsletterLead, 900) || base.contact.newsletterLead
    },
    updatedAt: cleanText(safe.updatedAt, 80) || base.updatedAt
  };
}

function sanitizePost(input) {
  if (!input || typeof input !== "object") {
    throw makeClientError("Ugyldig aktivitet-data.");
  }

  const title = cleanText(input.title, 140);
  const summary = cleanText(input.summary, 400);
  const body = cleanMultiline(input.body, 3000);
  const category = cleanText(input.category, 80);
  const location = cleanText(input.location, 120);
  const eventDate = normalizeDate(input.eventDate);

  if (!title || !summary || !category || !eventDate) {
    throw makeClientError("Fyll ut tittel, kort tekst, kategori og gyldig dato/tid.");
  }

  return {
    title,
    summary,
    body,
    category,
    eventDate,
    location
  };
}

function sanitizeInquiry(input) {
  if (!input || typeof input !== "object") {
    throw makeClientError("Ugyldig forespørsel-data.");
  }

  const name = cleanText(input.name, 120);
  const email = cleanEmail(input.email);
  const type = cleanText(input.type, 60);
  const message = cleanMultiline(input.message, 3500);

  if (!name || !email || !type || !message) {
    throw makeClientError("Fyll ut alle obligatoriske felter.");
  }

  return { name, email, type, message };
}

function sanitizeNewsletter(input) {
  if (!input || typeof input !== "object") {
    throw makeClientError("Ugyldig nyhetsbrev-data.");
  }

  const name = cleanText(input.name, 120);
  const email = cleanEmail(input.email);

  if (!email) {
    throw makeClientError("Gyldig e-post er påkrevd.");
  }

  return { name, email };
}

function cleanText(value, maxLen = 500) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLen);
}

function cleanMultiline(value, maxLen = 2000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLen);
}

function cleanUrl(value) {
  const text = String(value || "").trim().slice(0, 1000);
  if (!text) {
    return "";
  }

  if (text.startsWith("/") || text.startsWith("http://") || text.startsWith("https://")) {
    return text;
  }

  return "";
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) {
    return "";
  }

  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
  return ok ? email.slice(0, 240) : "";
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localMatch) {
    const [, y, m, d, hh, mm] = localMatch;
    const year = Number(y);
    const month = Number(m) - 1;
    const day = Number(d);
    const hours = Number(hh);
    const minutes = Number(mm);
    const date = new Date(year, month, day, hours, minutes, 0, 0);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function toTimestamp(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readArrayFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`${path.basename(filePath)} har ugyldig format. Forventer en liste.`);
    }
    return parsed;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    console.error(`Failed to read ${filePath}:`, error);
    await recoverJsonFile(filePath, []);
    return [];
  }
}

async function writeArrayFile(filePath, data) {
  await writeJsonFile(filePath, data);
}

async function readObjectFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${path.basename(filePath)} har ugyldig format. Forventer et objekt.`);
    }
    return parsed;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }

    console.error(`Failed to read ${filePath}:`, error);
    await recoverJsonFile(filePath, {});
    return {};
  }
}

async function writeObjectFile(filePath, data) {
  await writeJsonFile(filePath, data);
}

async function writeJsonFile(filePath, data) {
  const serialized = `${JSON.stringify(data, null, 2)}\n`;
  const tmpPath = `${filePath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await fs.writeFile(tmpPath, serialized, "utf8");
  await fs.rename(tmpPath, filePath);
}

async function recoverJsonFile(filePath, fallbackValue) {
  try {
    const backupPath = `${filePath}.corrupt-${Date.now()}.bak`;
    try {
      await fs.rename(filePath, backupPath);
    } catch {
      // Ignore if file does not exist or cannot be moved; fallback write may still succeed.
    }
    await writeJsonFile(filePath, fallbackValue);
  } catch (error) {
    console.error(`Failed to recover ${filePath}:`, error);
  }
}

function explainServerError(error, fallbackMessage) {
  if (error && typeof error === "object") {
    const code = String(error.code || "");
    if (["EACCES", "EPERM", "EROFS"].includes(code)) {
      return "Server mangler skrivetilgang til data-mappen. Sjekk filrettigheter for prosjektet.";
    }
    if (code === "ENOSPC") {
      return "Serveren er tom for lagringsplass. Frigjør plass og prøv igjen.";
    }
  }
  return fallbackMessage;
}

async function serveStatic(requestPath, res) {
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  const decodedPath = decodeURIComponent(relativePath);
  const filePath = path.join(ROOT, decodedPath);

  if (!filePath.startsWith(ROOT)) {
    return sendJson(res, 403, { ok: false, error: "Forbidden" });
  }

  try {
    const content = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const type = MIME[extension] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return sendJson(res, 404, { ok: false, error: "Not found" });
    }

    throw error;
  }
}

async function readJsonBody(req, maxBytes = 1_000_000) {
  const parts = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw makeClientError("Forespørselen er for stor.", 413);
    }
    parts.push(chunk);
  }

  if (!parts.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    throw makeClientError("Ugyldig forespørsel-data.");
  }
}

function sendOptions(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*"
  });
  res.end(JSON.stringify(payload));
}

function makeClientError(message, statusCode = 400) {
  const error = new Error(String(message || "Ugyldig forespørsel."));
  error.statusCode = statusCode;
  return error;
}

function sendHandledError(res, error, fallbackMessage) {
  const status = Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500 ? Number(error.statusCode) : 500;
  const message = status >= 500 ? explainServerError(error, fallbackMessage) : (error?.message || fallbackMessage);

  if (status >= 500) {
    console.error("Server operation failed:", error);
  }

  return sendJson(res, status, {
    ok: false,
    error: message
  });
}

module.exports = {
  createServer
};
