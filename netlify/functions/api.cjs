const crypto = require("node:crypto");

const STORE_NAME = "frivilje-cms";
const KEYS = {
  posts: "posts",
  inquiries: "inquiries",
  newsletter: "newsletter",
  siteContent: "site-content"
};

const ADMIN_USER = String(process.env.ADMIN_USER || "frivilje").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "friVilje2026").trim();
const memoryStore = new Map();
let activeLambdaEvent = null;

let storageMode = "unknown";
let storageError = "";

exports.handler = async function handler(event) {
  activeLambdaEvent = event || null;
  try {
    const method = String(event.httpMethod || "GET").toUpperCase();
    const path = getApiPath(event);

    if (method === "OPTIONS") {
      return sendOptions();
    }

    if (method === "GET" && path === "/health") {
      return sendJson(200, {
        ok: true,
        service: "frivilje-netlify-api",
        now: new Date().toISOString(),
        storageMode,
        storageError
      });
    }

    if (method === "GET" && path === "/posts") {
      return handleGetPosts();
    }

    if (method === "GET" && path === "/site-content") {
      return handleGetSiteContent();
    }

    if (method === "PUT" && path === "/site-content") {
      if (!isAdminRequest(event)) {
        return sendJson(401, { ok: false, error: "Uautorisert. Oppgi admin-bruker og passord." });
      }
      return handleUpdateSiteContent(event);
    }

    if (method === "POST" && path === "/posts") {
      if (!isAdminRequest(event)) {
        return sendJson(401, { ok: false, error: "Uautorisert. Oppgi admin-bruker og passord." });
      }
      return handleCreatePost(event);
    }

    const postMatch = path.match(/^\/posts\/([^/]+)$/);
    if (postMatch) {
      const id = decodeURIComponent(postMatch[1] || "");

      if (method === "PUT") {
        if (!isAdminRequest(event)) {
          return sendJson(401, { ok: false, error: "Uautorisert. Oppgi admin-bruker og passord." });
        }
        return handleUpdatePost(id, event);
      }

      if (method === "DELETE") {
        if (!isAdminRequest(event)) {
          return sendJson(401, { ok: false, error: "Uautorisert. Oppgi admin-bruker og passord." });
        }
        return handleDeletePost(id);
      }
    }

    if (method === "POST" && path === "/inquiries") {
      return handleCreateInquiry(event);
    }

    if (method === "POST" && path === "/newsletter") {
      return handleCreateNewsletter(event);
    }

    return sendJson(404, { ok: false, error: "Not found" });
  } catch (error) {
    console.error("Netlify API error:", error);
    return sendJson(500, { ok: false, error: "Internal server error" });
  } finally {
    activeLambdaEvent = null;
  }
};

function getStoreClient() {
  return {
    async get(key, options = {}) {
      try {
        const { getStore, connectLambda } = await import("@netlify/blobs");
        if (typeof connectLambda === "function" && activeLambdaEvent) {
          connectLambda(activeLambdaEvent);
        }
        const store = getStore({ name: STORE_NAME });
        storageMode = "netlify-blobs";
        storageError = "";
        return await store.get(key, options);
      } catch (error) {
        storageMode = "memory-fallback";
        storageError = String(error?.message || error);
        console.error("Falling back to memory storage:", error);
        return memoryStore.has(key) ? memoryStore.get(key) : null;
      }
    },
    async setJSON(key, value) {
      try {
        const { getStore, connectLambda } = await import("@netlify/blobs");
        if (typeof connectLambda === "function" && activeLambdaEvent) {
          connectLambda(activeLambdaEvent);
        }
        const store = getStore({ name: STORE_NAME });
        storageMode = "netlify-blobs";
        storageError = "";
        await store.setJSON(key, value);
      } catch (error) {
        storageMode = "memory-fallback";
        storageError = String(error?.message || error);
        console.error("Falling back to memory storage:", error);
        memoryStore.set(key, value);
      }
    }
  };
}

async function handleGetPosts() {
  const posts = await readPosts();
  posts.sort((a, b) => toTimestamp(b.eventDate || b.createdAt) - toTimestamp(a.eventDate || a.createdAt));
  return sendJson(200, { ok: true, posts });
}

async function handleGetSiteContent() {
  const content = await readSiteContent();
  return sendJson(200, { ok: true, content });
}

async function handleUpdateSiteContent(event) {
  try {
    const input = readJsonBody(event);
    const content = normalizeSiteContent(input);
    content.updatedAt = new Date().toISOString();
    await writeSiteContent(content);
    return sendJson(200, { ok: true, content });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke lagre sideinnhold.");
  }
}

async function handleCreatePost(event) {
  try {
    const payload = sanitizePost(readJsonBody(event));
    const posts = await readPosts();
    const now = new Date().toISOString();

    const post = {
      id: createId(),
      ...payload,
      createdAt: now,
      updatedAt: now
    };

    posts.push(post);
    await writePosts(posts);
    return sendJson(201, { ok: true, post });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke opprette aktivitet.");
  }
}

async function handleUpdatePost(id, event) {
  try {
    if (!id) {
      throw makeClientError("Mangler aktivitet-ID.");
    }

    const payload = sanitizePost(readJsonBody(event));
    const posts = await readPosts();
    const index = posts.findIndex((item) => item.id === id);

    if (index < 0) {
      return sendJson(404, { ok: false, error: "Aktiviteten finnes ikke." });
    }

    const updated = {
      ...posts[index],
      ...payload,
      updatedAt: new Date().toISOString()
    };

    posts[index] = updated;
    await writePosts(posts);
    return sendJson(200, { ok: true, post: updated });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke oppdatere aktivitet.");
  }
}

async function handleDeletePost(id) {
  try {
    if (!id) {
      throw makeClientError("Mangler aktivitet-ID.");
    }

    const posts = await readPosts();
    const exists = posts.some((item) => item.id === id);

    if (!exists) {
      return sendJson(404, { ok: false, error: "Aktiviteten finnes ikke." });
    }

    const filtered = posts.filter((item) => item.id !== id);
    await writePosts(filtered);
    return sendJson(200, { ok: true, deletedId: id });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke slette aktivitet.");
  }
}

async function handleCreateInquiry(event) {
  try {
    const payload = sanitizeInquiry(readJsonBody(event));
    const inquiries = await readInquiries();
    const inquiry = {
      id: createId(),
      ...payload,
      createdAt: new Date().toISOString()
    };

    inquiries.push(inquiry);
    await writeInquiries(inquiries);
    return sendJson(201, { ok: true, inquiry });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke sende forespørselen.");
  }
}

async function handleCreateNewsletter(event) {
  try {
    const payload = sanitizeNewsletter(readJsonBody(event));
    const list = await readNewsletter();

    const existing = list.find((item) => String(item.email || "").toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      return sendJson(200, { ok: true, alreadyExists: true, subscriber: existing });
    }

    const subscriber = {
      id: createId(),
      ...payload,
      createdAt: new Date().toISOString()
    };

    list.push(subscriber);
    await writeNewsletter(list);
    return sendJson(201, { ok: true, alreadyExists: false, subscriber });
  } catch (error) {
    return sendHandledError(error, "Kunne ikke registrere nyhetsbrev-påmelding.");
  }
}

function getApiPath(event) {
  const rawPath = String(event.path || "").split("?")[0] || "/";

  const prefixes = ["/.netlify/functions/api", "/api"];
  for (const prefix of prefixes) {
    if (rawPath === prefix) {
      return "/";
    }
    if (rawPath.startsWith(`${prefix}/`)) {
      return rawPath.slice(prefix.length) || "/";
    }
  }

  return rawPath || "/";
}

function headerValue(event, name) {
  const headers = event.headers || {};
  const target = String(name || "").toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === target) {
      return String(value || "");
    }
  }

  return "";
}

function isAdminRequest(event) {
  const header = headerValue(event, "authorization");
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

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));

  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

function readJsonBody(event, maxBytes = 1_000_000) {
  const rawBody = String(event.body || "");
  if (!rawBody) {
    return {};
  }

  const text = event.isBase64Encoded ? Buffer.from(rawBody, "base64").toString("utf8") : rawBody;
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw makeClientError("Forespørselen er for stor.", 413);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw makeClientError("Ugyldig forespørsel-data.");
  }
}

async function readPosts() {
  const store = getStoreClient();
  const posts = await store.get(KEYS.posts, { type: "json" });

  if (Array.isArray(posts)) {
    return posts;
  }

  const seeded = [createSamplePost()];
  await store.setJSON(KEYS.posts, seeded);
  return seeded;
}

async function writePosts(posts) {
  const store = getStoreClient();
  await store.setJSON(KEYS.posts, Array.isArray(posts) ? posts : []);
}

async function readInquiries() {
  const store = getStoreClient();
  const inquiries = await store.get(KEYS.inquiries, { type: "json" });

  if (Array.isArray(inquiries)) {
    return inquiries;
  }

  const seeded = [];
  await store.setJSON(KEYS.inquiries, seeded);
  return seeded;
}

async function writeInquiries(inquiries) {
  const store = getStoreClient();
  await store.setJSON(KEYS.inquiries, Array.isArray(inquiries) ? inquiries : []);
}

async function readNewsletter() {
  const store = getStoreClient();
  const list = await store.get(KEYS.newsletter, { type: "json" });

  if (Array.isArray(list)) {
    return list;
  }

  const seeded = [];
  await store.setJSON(KEYS.newsletter, seeded);
  return seeded;
}

async function writeNewsletter(list) {
  const store = getStoreClient();
  await store.setJSON(KEYS.newsletter, Array.isArray(list) ? list : []);
}

async function readSiteContent() {
  const store = getStoreClient();
  const raw = await store.get(KEYS.siteContent, { type: "json" });

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return normalizeSiteContent(raw);
  }

  const seeded = createDefaultSiteContent();
  await store.setJSON(KEYS.siteContent, seeded);
  return seeded;
}

async function writeSiteContent(content) {
  const store = getStoreClient();
  await store.setJSON(KEYS.siteContent, content && typeof content === "object" ? content : createDefaultSiteContent());
}

function createSamplePost() {
  return {
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

  return { title, summary, body, category, eventDate, location };
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

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (localMatch) {
    const [, y, m, d, hh, mm] = localMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
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

function makeClientError(message, statusCode = 400) {
  const error = new Error(String(message || "Ugyldig forespørsel."));
  error.statusCode = statusCode;
  return error;
}

function sendHandledError(error, fallbackMessage) {
  const status = Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500 ? Number(error.statusCode) : 500;
  const message = status >= 500 ? fallbackMessage : (error?.message || fallbackMessage);

  if (status >= 500) {
    console.error("Operation failed:", error);
  }

  return sendJson(status, { ok: false, error: message });
}

function sendOptions() {
  return {
    statusCode: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Cache-Control": "no-store"
    },
    body: ""
  };
}

function sendJson(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization"
    },
    body: JSON.stringify(payload)
  };
}
