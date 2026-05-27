const API_ROOT = "/api";
const API_BASE_STORAGE_KEY = "frivilje_api_base";
const CONTACT_EMAIL = "post@frivilje.com";
const INQUIRY_FORM_NAME = "frivilje-kontakt";
const NEWSLETTER_FORM_NAME = "frivilje-oppdateringer";

const DEFAULT_CONTENT = Object.freeze({
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
  }
});

const elements = {
  menuToggle: document.getElementById("menuToggle"),
  mainNav: document.getElementById("mainNav"),

  postsContainer: document.getElementById("postsContainer"),
  postsMeta: document.getElementById("postsMeta"),
  refreshPostsBtn: document.getElementById("refreshPostsBtn"),

  inquiryForm: document.getElementById("inquiryForm"),
  inquiryStatus: document.getElementById("inquiryStatus"),

  newsletterForm: document.getElementById("newsletterForm"),
  newsletterStatus: document.getElementById("newsletterStatus")
};

const runtime = {
  apiBase: resolveInitialApiBase()
};

initialize();

async function initialize() {
  setYear();
  setupMenu();
  bindActions();

  await loadSiteContent();

  if (elements.postsContainer) {
    await loadPosts();
  }
}

function setYear() {
  document.querySelectorAll(".year").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
}

function setupMenu() {
  if (!elements.menuToggle || !elements.mainNav) {
    return;
  }

  elements.menuToggle.addEventListener("click", () => {
    const isOpen = elements.mainNav.classList.toggle("open");
    elements.menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  elements.mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      elements.mainNav.classList.remove("open");
      elements.menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function bindActions() {
  elements.refreshPostsBtn?.addEventListener("click", () => {
    loadPosts();
  });

  elements.inquiryForm?.addEventListener("submit", handleInquirySubmit);
  elements.newsletterForm?.addEventListener("submit", handleNewsletterSubmit);
}

async function loadSiteContent() {
  try {
    const data = await fetchJson(`${API_ROOT}/site-content`);
    const content = normalizeContent(data.content || {});
    applyContent(content);
  } catch {
    applyContent(normalizeContent({}));
  }
}

function normalizeContent(input) {
  const safe = input && typeof input === "object" ? input : {};
  const homeInput = safe.home && typeof safe.home === "object" ? safe.home : {};
  const aboutInput = safe.about && typeof safe.about === "object" ? safe.about : {};
  const contactInput = safe.contact && typeof safe.contact === "object" ? safe.contact : {};

  return {
    brandName: readString(safe.brandName, DEFAULT_CONTENT.brandName),
    footerTagline: readString(safe.footerTagline, DEFAULT_CONTENT.footerTagline),
    home: {
      kicker: readString(homeInput.kicker, DEFAULT_CONTENT.home.kicker),
      title: readString(homeInput.title, DEFAULT_CONTENT.home.title),
      lead: readString(homeInput.lead, DEFAULT_CONTENT.home.lead),
      primaryCtaLabel: readString(homeInput.primaryCtaLabel, DEFAULT_CONTENT.home.primaryCtaLabel),
      primaryCtaHref: readString(homeInput.primaryCtaHref, DEFAULT_CONTENT.home.primaryCtaHref),
      secondaryCtaLabel: readString(homeInput.secondaryCtaLabel, DEFAULT_CONTENT.home.secondaryCtaLabel),
      secondaryCtaHref: readString(homeInput.secondaryCtaHref, DEFAULT_CONTENT.home.secondaryCtaHref),
      heroImage: readString(homeInput.heroImage, DEFAULT_CONTENT.home.heroImage),
      heroImageAlt: readString(homeInput.heroImageAlt, DEFAULT_CONTENT.home.heroImageAlt),
      featureImage: readString(homeInput.featureImage, DEFAULT_CONTENT.home.featureImage),
      featureImageAlt: readString(homeInput.featureImageAlt, DEFAULT_CONTENT.home.featureImageAlt),
      stat1Title: readString(homeInput.stat1Title, DEFAULT_CONTENT.home.stat1Title),
      stat1Text: readString(homeInput.stat1Text, DEFAULT_CONTENT.home.stat1Text),
      stat2Title: readString(homeInput.stat2Title, DEFAULT_CONTENT.home.stat2Title),
      stat2Text: readString(homeInput.stat2Text, DEFAULT_CONTENT.home.stat2Text),
      stat3Title: readString(homeInput.stat3Title, DEFAULT_CONTENT.home.stat3Title),
      stat3Text: readString(homeInput.stat3Text, DEFAULT_CONTENT.home.stat3Text),
      feature1Title: readString(homeInput.feature1Title, DEFAULT_CONTENT.home.feature1Title),
      feature1Text: readString(homeInput.feature1Text, DEFAULT_CONTENT.home.feature1Text),
      feature2Title: readString(homeInput.feature2Title, DEFAULT_CONTENT.home.feature2Title),
      feature2Text: readString(homeInput.feature2Text, DEFAULT_CONTENT.home.feature2Text),
      featureCtaLabel: readString(homeInput.featureCtaLabel, DEFAULT_CONTENT.home.featureCtaLabel),
      featureCtaHref: readString(homeInput.featureCtaHref, DEFAULT_CONTENT.home.featureCtaHref)
    },
    about: {
      kicker: readString(aboutInput.kicker, DEFAULT_CONTENT.about.kicker),
      title: readString(aboutInput.title, DEFAULT_CONTENT.about.title),
      heroImage: readString(aboutInput.heroImage, DEFAULT_CONTENT.about.heroImage),
      heroImageAlt: readString(aboutInput.heroImageAlt, DEFAULT_CONTENT.about.heroImageAlt),
      intro: readString(aboutInput.intro, DEFAULT_CONTENT.about.intro),
      body: readString(aboutInput.body, DEFAULT_CONTENT.about.body),
      runTitle: readString(aboutInput.runTitle, DEFAULT_CONTENT.about.runTitle),
      runText: readString(aboutInput.runText, DEFAULT_CONTENT.about.runText),
      whyTitle: readString(aboutInput.whyTitle, DEFAULT_CONTENT.about.whyTitle),
      whyText: readString(aboutInput.whyText, DEFAULT_CONTENT.about.whyText),
      stravaCtaLabel: readString(aboutInput.stravaCtaLabel, DEFAULT_CONTENT.about.stravaCtaLabel),
      stravaCtaHref: readString(aboutInput.stravaCtaHref, DEFAULT_CONTENT.about.stravaCtaHref)
    },
    contact: {
      kicker: readString(contactInput.kicker, DEFAULT_CONTENT.contact.kicker),
      title: readString(contactInput.title, DEFAULT_CONTENT.contact.title),
      lead: readString(contactInput.lead, DEFAULT_CONTENT.contact.lead),
      heroImage: readString(contactInput.heroImage, DEFAULT_CONTENT.contact.heroImage),
      heroImageAlt: readString(contactInput.heroImageAlt, DEFAULT_CONTENT.contact.heroImageAlt),
      inquiryTitle: readString(contactInput.inquiryTitle, DEFAULT_CONTENT.contact.inquiryTitle),
      newsletterTitle: readString(contactInput.newsletterTitle, DEFAULT_CONTENT.contact.newsletterTitle),
      newsletterLead: readString(contactInput.newsletterLead, DEFAULT_CONTENT.contact.newsletterLead)
    }
  };
}

function applyContent(content) {
  setText("brandName", content.brandName);
  setText("footerBrand", content.brandName);
  setText("footerTagline", content.footerTagline);

  if (document.body.classList.contains("page-home")) {
    applyHome(content.home);
  }

  if (document.body.classList.contains("page-about")) {
    applyAbout(content.about);
  }

  if (document.body.classList.contains("page-contact")) {
    applyContact(content.contact);
  }
}

function applyHome(home) {
  setText("homeKicker", home.kicker);
  setText("homeTitle", home.title);
  setText("homeLead", home.lead);
  setLink("homePrimaryCta", home.primaryCtaLabel, home.primaryCtaHref);
  setLink("homeSecondaryCta", home.secondaryCtaLabel, home.secondaryCtaHref);
  setImage("homeHeroImage", home.heroImage, home.heroImageAlt);
  setImage("homeFeatureImage", home.featureImage, home.featureImageAlt);
  setText("homeStat1Title", home.stat1Title);
  setText("homeStat1Text", home.stat1Text);
  setText("homeStat2Title", home.stat2Title);
  setText("homeStat2Text", home.stat2Text);
  setText("homeStat3Title", home.stat3Title);
  setText("homeStat3Text", home.stat3Text);
  setText("homeFeature1Title", home.feature1Title);
  setText("homeFeature1Text", home.feature1Text);
  setText("homeFeature2Title", home.feature2Title);
  setText("homeFeature2Text", home.feature2Text);
  setLink("homeFeatureCta", home.featureCtaLabel, home.featureCtaHref);
}

function applyAbout(about) {
  setText("aboutKicker", about.kicker);
  setText("aboutTitle", about.title);
  setImage("aboutHeroImage", about.heroImage, about.heroImageAlt);
  setText("aboutIntro", about.intro);
  renderParagraphs("aboutBody", about.body);
  setText("aboutRunTitle", about.runTitle);
  setText("aboutRunText", about.runText);
  setText("aboutWhyTitle", about.whyTitle);
  setText("aboutWhyText", about.whyText);
  setLink("aboutStravaCta", about.stravaCtaLabel, about.stravaCtaHref);
}

function applyContact(contact) {
  setText("contactKicker", contact.kicker);
  setText("contactTitle", contact.title);
  setText("contactLead", contact.lead);
  setImage("contactHeroImage", contact.heroImage, contact.heroImageAlt);
  setText("contactInquiryTitle", contact.inquiryTitle);
  setText("contactNewsletterTitle", contact.newsletterTitle);
  setText("contactNewsletterLead", contact.newsletterLead);
}

function renderParagraphs(elementId, text) {
  const container = document.getElementById(elementId);
  if (!container) {
    return;
  }

  const parts = String(text || "")
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts.length) {
    container.textContent = "";
    return;
  }

  container.innerHTML = parts.map((part) => `<p>${escapeHtml(part)}</p>`).join("");
}

async function loadPosts() {
  setPostsMeta("Laster innlegg...");

  try {
    const data = await fetchJson(`${API_ROOT}/posts`);
    const posts = Array.isArray(data.posts) ? data.posts : [];
    renderPosts(posts);
    const count = posts.length;
    setPostsMeta(`${count} ${count === 1 ? "innlegg" : "innlegg"} lastet`);
  } catch (error) {
    renderPostsError(error.message || "Kunne ikke hente innlegg.");
    setPostsMeta("Kunne ikke laste innlegg");
  }
}

function renderPosts(posts) {
  if (!elements.postsContainer) {
    return;
  }

  if (!posts.length) {
    elements.postsContainer.innerHTML = '<article class="post-card"><h3>Ingen annonser enda</h3><p class="post-summary">Nye oppdateringer kommer snart.</p></article>';
    return;
  }

  elements.postsContainer.innerHTML = posts
    .map((post) => {
      const body = post.body ? `<p class="post-body">${escapeHtml(post.body)}</p>` : "";
      const location = post.location ? `<p class="post-location">Sted: ${escapeHtml(post.location)}</p>` : "";

      return `
        <article class="post-card">
          <div class="post-meta">
            <span class="tag">${escapeHtml(post.category || "Info")}</span>
            <span class="post-date">${formatDate(post.eventDate || post.createdAt)}</span>
          </div>
          <h3>${escapeHtml(post.title || "")}</h3>
          <p class="post-summary">${escapeHtml(post.summary || "")}</p>
          ${body}
          ${location}
        </article>
      `;
    })
    .join("");
}

function renderPostsError(message) {
  if (!elements.postsContainer) {
    return;
  }

  elements.postsContainer.innerHTML = `
    <article class="post-card">
      <h3>Noe gikk galt</h3>
      <p class="post-summary">${escapeHtml(message)}</p>
    </article>
  `;
}

async function handleInquirySubmit(event) {
  event.preventDefault();

  if (!elements.inquiryForm) {
    return;
  }

  const formData = new FormData(elements.inquiryForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    type: String(formData.get("type") || "").trim(),
    message: String(formData.get("message") || "").trim()
  };

  if (!payload.name || !payload.email || !payload.type || !payload.message) {
    return setStatus(elements.inquiryStatus, "Fyll ut alle feltene før du sender.", true);
  }
  if (!isValidEmail(payload.email)) {
    return setStatus(elements.inquiryStatus, "Skriv inn en gyldig e-postadresse.", true);
  }

  try {
    const [mailResult, apiResult] = await Promise.allSettled([
      submitNetlifyForm(INQUIRY_FORM_NAME, payload),
      fetchJson(`${API_ROOT}/inquiries`, {
        method: "POST",
        body: JSON.stringify(payload)
      })
    ]);

    if (mailResult.status === "rejected" && apiResult.status === "rejected") {
      throw mailResult.reason || apiResult.reason || new Error("Kunne ikke sende melding.");
    }

    elements.inquiryForm.reset();
    if (mailResult.status === "fulfilled") {
      setStatus(elements.inquiryStatus, `Takk! Meldingen er sendt til ${CONTACT_EMAIL}.`);
    } else {
      setStatus(elements.inquiryStatus, `Meldingen er mottatt. Hvis du ikke får bekreftelse, send oss direkte på ${CONTACT_EMAIL}.`);
    }
  } catch (error) {
    setStatus(elements.inquiryStatus, error.message || "Kunne ikke sende melding.", true);
  }
}

async function handleNewsletterSubmit(event) {
  event.preventDefault();

  if (!elements.newsletterForm) {
    return;
  }

  const formData = new FormData(elements.newsletterForm);
  const payload = {
    name: String(formData.get("name") || "").trim(),
    email: String(formData.get("email") || "").trim()
  };

  if (!payload.email) {
    return setStatus(elements.newsletterStatus, "Skriv inn e-post for å melde deg på.", true);
  }
  if (!isValidEmail(payload.email)) {
    return setStatus(elements.newsletterStatus, "Skriv inn en gyldig e-postadresse.", true);
  }

  try {
    const [mailResult, apiResult] = await Promise.allSettled([
      submitNetlifyForm(NEWSLETTER_FORM_NAME, payload),
      fetchJson(`${API_ROOT}/newsletter`, {
        method: "POST",
        body: JSON.stringify(payload)
      })
    ]);

    if (mailResult.status === "rejected" && apiResult.status === "rejected") {
      throw mailResult.reason || apiResult.reason || new Error("Kunne ikke melde deg på.");
    }

    elements.newsletterForm.reset();

    let alreadyExists = false;
    if (apiResult.status === "fulfilled" && apiResult.value && apiResult.value.alreadyExists) {
      alreadyExists = true;
    }

    if (alreadyExists) {
      setStatus(elements.newsletterStatus, `Denne e-posten er allerede registrert hos ${CONTACT_EMAIL}.`);
    } else if (mailResult.status === "fulfilled") {
      setStatus(elements.newsletterStatus, `Supert! Du er påmeldt, og oppfølging går til ${CONTACT_EMAIL}.`);
    } else {
      setStatus(elements.newsletterStatus, `Påmeldingen er registrert. Send gjerne en e-post til ${CONTACT_EMAIL} ved spørsmål.`);
    }
  } catch (error) {
    setStatus(elements.newsletterStatus, error.message || "Kunne ikke melde deg på.", true);
  }
}

async function submitNetlifyForm(formName, payload) {
  const body = new URLSearchParams();
  body.set("form-name", formName);

  for (const [key, value] of Object.entries(payload || {})) {
    body.set(key, String(value || ""));
  }

  let response;
  try {
    response = await fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
  } catch {
    throw new Error("Kunne ikke sende henvendelsen.");
  }

  if (!response.ok) {
    throw new Error(`Kunne ikke sende henvendelsen (${response.status}).`);
  }
}

async function fetchJson(url, options = {}) {
  const apiRequest = url.startsWith(`${API_ROOT}/`) || url === API_ROOT;
  if (!apiRequest) {
    return requestJson(url, options);
  }

  const candidates = getApiCandidates();
  let lastError;

  for (const apiBase of candidates) {
    const finalUrl = toApiUrl(apiBase, url);
    const crossOrigin = isCrossOriginUrl(finalUrl);

    try {
      const data = await requestJson(finalUrl, options, crossOrigin ? "omit" : "same-origin");
      if (runtime.apiBase !== apiBase) {
        runtime.apiBase = apiBase;
        saveToStorage(API_BASE_STORAGE_KEY, apiBase);
      }
      return data;
    } catch (error) {
      lastError = error;
      if (error.retryable !== true) {
        throw error;
      }
    }
  }

  if (lastError && lastError.retryable) {
    throw new Error("Fant ikke API-endepunkt. Start backend på http://127.0.0.1:8080.");
  }

  throw lastError || new Error("Kunne ikke koble til serveren.");
}

async function requestJson(url, options = {}, credentials = "same-origin") {
  let response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      credentials,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      body: options.body
    });
  } catch {
    const error = new Error("Kunne ikke koble til serveren.");
    error.retryable = true;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || "Serverfeil");
    error.status = response.status;
    error.retryable = response.status === 404 || response.status >= 500;
    throw error;
  }

  return data;
}

function getApiCandidates() {
  const raw = [
    runtime.apiBase,
    resolveSameOriginApiBase(),
    resolveLocalApiBase(window.location.hostname || "127.0.0.1"),
    "http://127.0.0.1:8080/api",
    "http://localhost:8080/api"
  ];

  const unique = [];
  for (const value of raw) {
    const normalized = normalizeApiBase(value);
    if (!normalized) {
      continue;
    }
    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }
  }
  return unique;
}

function resolveInitialApiBase() {
  const stored = normalizeApiBase(readFromStorage(API_BASE_STORAGE_KEY));
  if (stored) {
    return stored;
  }
  return resolveSameOriginApiBase();
}

function resolveSameOriginApiBase() {
  if (window.location.origin && window.location.origin !== "null") {
    return `${window.location.origin}${API_ROOT}`;
  }
  return normalizeApiBase(API_ROOT);
}

function resolveLocalApiBase(hostname) {
  const host = String(hostname || "").trim() || "127.0.0.1";
  return `http://${host}:8080/api`;
}

function normalizeApiBase(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  const trimmed = raw.replace(/\/+$/g, "");
  if (trimmed === API_ROOT || trimmed.endsWith(API_ROOT)) {
    return trimmed;
  }

  return `${trimmed}${API_ROOT}`;
}

function toApiUrl(apiBase, apiPath) {
  const suffix = apiPath.startsWith(API_ROOT) ? apiPath.slice(API_ROOT.length) : apiPath;
  if (apiBase === API_ROOT) {
    return `${API_ROOT}${suffix}`;
  }
  return `${apiBase}${suffix}`;
}

function isCrossOriginUrl(url) {
  try {
    const absolute = new URL(url, window.location.href);
    return absolute.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function readFromStorage(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function saveToStorage(key, value) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage failures.
  }
}

function setPostsMeta(message) {
  if (elements.postsMeta) {
    elements.postsMeta.textContent = message;
  }
}

function setStatus(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message || "";
  element.classList.toggle("error", Boolean(isError));
  element.classList.toggle("ok", !isError && Boolean(message));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = String(value || "");
}

function setLink(id, label, href) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.textContent = String(label || "");
  element.setAttribute("href", String(href || "#"));
}

function setImage(id, src, alt) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLImageElement)) {
    return;
  }

  element.src = String(src || "");
  element.alt = String(alt || "");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Uten dato";
  }

  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function readString(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(value || "").trim());
}
