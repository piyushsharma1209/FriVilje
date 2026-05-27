const API_ROOT = "/api";
const API_BASE_STORAGE_KEY = "frivilje_api_base";
const ADMIN_AUTH_STORAGE_KEY = "frivilje_admin_basic_auth";

const state = {
  posts: [],
  editingId: "",
  apiBase: "",
  authHeader: ""
};

const elements = {
  contentForm: document.getElementById("contentForm"),
  contentStatus: document.getElementById("contentStatus"),

  postForm: document.getElementById("postForm"),
  postStatus: document.getElementById("postStatus"),
  savePostBtn: document.getElementById("savePostBtn"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  adminPosts: document.getElementById("adminPosts"),
  adminMeta: document.getElementById("adminMeta"),

  postId: document.getElementById("postId"),
  postTitle: document.getElementById("postTitle"),
  postSummary: document.getElementById("postSummary"),
  postBody: document.getElementById("postBody"),
  postCategory: document.getElementById("postCategory"),
  postDate: document.getElementById("postDate"),
  postLocation: document.getElementById("postLocation"),

  homeHeroPreview: document.getElementById("homeHeroPreview"),
  homeFeaturePreview: document.getElementById("homeFeaturePreview"),
  aboutHeroPreview: document.getElementById("aboutHeroPreview"),
  contactHeroPreview: document.getElementById("contactHeroPreview"),

  connectionForm: document.getElementById("connectionForm"),
  apiBaseInput: document.getElementById("apiBaseInput"),
  adminUserInput: document.getElementById("adminUserInput"),
  adminPasswordInput: document.getElementById("adminPasswordInput"),
  clearAuthBtn: document.getElementById("clearAuthBtn"),
  connectionStatus: document.getElementById("connectionStatus")
};

initialize();

async function initialize() {
  state.apiBase = resolveInitialApiBase();
  state.authHeader = readFromStorage(ADMIN_AUTH_STORAGE_KEY);

  setYear();
  initializeConnectionForm();
  bind();
  if (elements.postDate && !elements.postDate.value) {
    elements.postDate.value = toInputDateTime(new Date().toISOString());
  }
  await Promise.all([loadContentForm(), loadPosts()]);
}

function setYear() {
  document.querySelectorAll(".year").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
}

function initializeConnectionForm() {
  if (elements.apiBaseInput) {
    elements.apiBaseInput.value = state.apiBase || "";
  }

  if (elements.connectionForm) {
    elements.connectionForm.addEventListener("submit", handleConnectionSubmit);
  }

  elements.clearAuthBtn?.addEventListener("click", clearSavedAuth);

  const isCrossOrigin = isCrossOriginBase(state.apiBase);
  if (isCrossOrigin && !state.authHeader) {
    setConnectionStatus("Skriv inn admin-bruker og passord for å redigere via ekstern API-adresse.", true);
  } else {
    setConnectionStatus(`Koblet til API: ${state.apiBase}`);
  }
}

function bind() {
  elements.contentForm?.addEventListener("submit", handleContentSubmit);

  elements.postForm?.addEventListener("submit", handlePostSubmit);
  elements.cancelEditBtn?.addEventListener("click", resetPostForm);

  setupImagePreview("homeHeroImage", "homeHeroImageAlt", elements.homeHeroPreview);
  setupImagePreview("homeFeatureImage", "homeFeatureImageAlt", elements.homeFeaturePreview);
  setupImagePreview("aboutHeroImage", "aboutHeroImageAlt", elements.aboutHeroPreview);
  setupImagePreview("contactHeroImage", "contactHeroImageAlt", elements.contactHeroPreview);
}

async function loadContentForm() {
  try {
    const data = await fetchJson(`${API_ROOT}/site-content`);
    fillContentForm(data.content || {});
    setContentStatus("Innhold lastet.");
    setConnectionStatus(`Koblet til API: ${state.apiBase}`);
  } catch (error) {
    setContentStatus(error.message || "Kunne ikke laste sideinnhold.", true);
    setConnectionStatus(error.message || "Kunne ikke koble til API.", true);
  }
}

function fillContentForm(content) {
  setField("brandName", content.brandName);
  setField("footerTagline", content.footerTagline);

  setField("homeKicker", content.home?.kicker);
  setField("homeTitle", content.home?.title);
  setField("homeLead", content.home?.lead);
  setField("homePrimaryLabel", content.home?.primaryCtaLabel);
  setField("homePrimaryHref", content.home?.primaryCtaHref);
  setField("homeSecondaryLabel", content.home?.secondaryCtaLabel);
  setField("homeSecondaryHref", content.home?.secondaryCtaHref);
  setField("homeHeroImage", content.home?.heroImage);
  setField("homeHeroImageAlt", content.home?.heroImageAlt);
  setField("homeFeatureImage", content.home?.featureImage);
  setField("homeFeatureImageAlt", content.home?.featureImageAlt);
  setField("homeStat1Title", content.home?.stat1Title);
  setField("homeStat1Text", content.home?.stat1Text);
  setField("homeStat2Title", content.home?.stat2Title);
  setField("homeStat2Text", content.home?.stat2Text);
  setField("homeStat3Title", content.home?.stat3Title);
  setField("homeStat3Text", content.home?.stat3Text);
  setField("homeFeature1Title", content.home?.feature1Title);
  setField("homeFeature1Text", content.home?.feature1Text);
  setField("homeFeature2Title", content.home?.feature2Title);
  setField("homeFeature2Text", content.home?.feature2Text);
  setField("homeFeatureCtaLabel", content.home?.featureCtaLabel);
  setField("homeFeatureCtaHref", content.home?.featureCtaHref);

  setField("aboutKicker", content.about?.kicker);
  setField("aboutTitle", content.about?.title);
  setField("aboutHeroImage", content.about?.heroImage);
  setField("aboutHeroImageAlt", content.about?.heroImageAlt);
  setField("aboutIntro", content.about?.intro);
  setField("aboutBody", content.about?.body);
  setField("aboutRunTitle", content.about?.runTitle);
  setField("aboutRunText", content.about?.runText);
  setField("aboutWhyTitle", content.about?.whyTitle);
  setField("aboutWhyText", content.about?.whyText);
  setField("aboutStravaLabel", content.about?.stravaCtaLabel);
  setField("aboutStravaHref", content.about?.stravaCtaHref);

  setField("contactKicker", content.contact?.kicker);
  setField("contactTitle", content.contact?.title);
  setField("contactLead", content.contact?.lead);
  setField("contactHeroImage", content.contact?.heroImage);
  setField("contactHeroImageAlt", content.contact?.heroImageAlt);
  setField("contactInquiryTitle", content.contact?.inquiryTitle);
  setField("contactNewsletterTitle", content.contact?.newsletterTitle);
  setField("contactNewsletterLead", content.contact?.newsletterLead);

  refreshImagePreviews();
}

async function handleContentSubmit(event) {
  event.preventDefault();

  const payload = {
    brandName: getField("brandName"),
    footerTagline: getField("footerTagline"),
    home: {
      kicker: getField("homeKicker"),
      title: getField("homeTitle"),
      lead: getField("homeLead"),
      primaryCtaLabel: getField("homePrimaryLabel"),
      primaryCtaHref: getField("homePrimaryHref"),
      secondaryCtaLabel: getField("homeSecondaryLabel"),
      secondaryCtaHref: getField("homeSecondaryHref"),
      heroImage: getField("homeHeroImage"),
      heroImageAlt: getField("homeHeroImageAlt"),
      featureImage: getField("homeFeatureImage"),
      featureImageAlt: getField("homeFeatureImageAlt"),
      stat1Title: getField("homeStat1Title"),
      stat1Text: getField("homeStat1Text"),
      stat2Title: getField("homeStat2Title"),
      stat2Text: getField("homeStat2Text"),
      stat3Title: getField("homeStat3Title"),
      stat3Text: getField("homeStat3Text"),
      feature1Title: getField("homeFeature1Title"),
      feature1Text: getField("homeFeature1Text"),
      feature2Title: getField("homeFeature2Title"),
      feature2Text: getField("homeFeature2Text"),
      featureCtaLabel: getField("homeFeatureCtaLabel"),
      featureCtaHref: getField("homeFeatureCtaHref")
    },
    about: {
      kicker: getField("aboutKicker"),
      title: getField("aboutTitle"),
      heroImage: getField("aboutHeroImage"),
      heroImageAlt: getField("aboutHeroImageAlt"),
      intro: getField("aboutIntro"),
      body: getField("aboutBody"),
      runTitle: getField("aboutRunTitle"),
      runText: getField("aboutRunText"),
      whyTitle: getField("aboutWhyTitle"),
      whyText: getField("aboutWhyText"),
      stravaCtaLabel: getField("aboutStravaLabel"),
      stravaCtaHref: getField("aboutStravaHref")
    },
    contact: {
      kicker: getField("contactKicker"),
      title: getField("contactTitle"),
      lead: getField("contactLead"),
      heroImage: getField("contactHeroImage"),
      heroImageAlt: getField("contactHeroImageAlt"),
      inquiryTitle: getField("contactInquiryTitle"),
      newsletterTitle: getField("contactNewsletterTitle"),
      newsletterLead: getField("contactNewsletterLead")
    }
  };

  try {
    await fetchJson(`${API_ROOT}/site-content`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    setContentStatus("Sideinnhold lagret.");
  } catch (error) {
    setContentStatus(error.message || "Kunne ikke lagre sideinnhold.", true);
  }
}

async function loadPosts() {
  setPostMeta("Laster...");

  try {
    const data = await fetchJson(`${API_ROOT}/posts`);
    state.posts = Array.isArray(data.posts) ? data.posts : [];
    renderAdminPosts();
    setPostMeta(`${state.posts.length} innlegg`);
  } catch (error) {
    renderAdminError(error.message || "Kunne ikke laste innlegg.");
    setPostMeta("Feil ved lasting");
    setConnectionStatus(error.message || "Kunne ikke koble til API.", true);
  }
}

function renderAdminPosts() {
  if (!elements.adminPosts) {
    return;
  }

  if (!state.posts.length) {
    elements.adminPosts.innerHTML = '<p class="meta-text">Ingen innlegg publisert enda.</p>';
    return;
  }

  elements.adminPosts.innerHTML = state.posts
    .map((post) => {
      return `
        <article class="admin-post-item">
          <h4>${escapeHtml(post.title || "")}</h4>
          <p>${escapeHtml(post.summary || "")}</p>
          <p>${formatDate(post.eventDate || post.createdAt)}${post.location ? ` - ${escapeHtml(post.location)}` : ""}</p>
          <div class="actions">
            <button type="button" data-action="edit" data-id="${escapeHtml(post.id)}">Rediger</button>
            <button type="button" data-action="delete" data-id="${escapeHtml(post.id)}">Slett</button>
          </div>
        </article>
      `;
    })
    .join("");

  elements.adminPosts.querySelectorAll("button[data-action='edit']").forEach((button) => {
    button.addEventListener("click", () => startEdit(button.dataset.id || ""));
  });

  elements.adminPosts.querySelectorAll("button[data-action='delete']").forEach((button) => {
    button.addEventListener("click", () => deletePost(button.dataset.id || ""));
  });
}

function renderAdminError(message) {
  if (!elements.adminPosts) {
    return;
  }

  elements.adminPosts.innerHTML = `<p class="meta-text">${escapeHtml(message)}</p>`;
}

async function handlePostSubmit(event) {
  event.preventDefault();

  if (!elements.postForm) {
    return;
  }

  const formData = new FormData(elements.postForm);
  const id = String(formData.get("id") || "").trim();

  const payload = {
    title: String(formData.get("title") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    body: String(formData.get("body") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    eventDate: String(formData.get("eventDate") || "").trim(),
    location: String(formData.get("location") || "").trim()
  };

  if (!payload.title || !payload.summary || !payload.category || !payload.eventDate) {
    return setPostStatus("Fyll ut tittel, kort tekst, kategori og dato.", true);
  }

  try {
    if (id) {
      await fetchJson(`${API_ROOT}/posts/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setPostStatus("Innlegg oppdatert.");
    } else {
      await fetchJson(`${API_ROOT}/posts`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      setPostStatus("Innlegg publisert.");
    }

    resetPostForm();
    await loadPosts();
  } catch (error) {
    setPostStatus(error.message || "Kunne ikke lagre innlegg.", true);
  }
}

function startEdit(id) {
  const post = state.posts.find((item) => item.id === id);
  if (!post) {
    return;
  }

  state.editingId = id;
  elements.postId.value = post.id || "";
  elements.postTitle.value = post.title || "";
  elements.postSummary.value = post.summary || "";
  elements.postBody.value = post.body || "";
  elements.postCategory.value = post.category || "";
  elements.postDate.value = toInputDateTime(post.eventDate || "");
  elements.postLocation.value = post.location || "";

  elements.savePostBtn.textContent = "Lagre endringer";
  elements.cancelEditBtn?.classList.remove("hidden");
  setPostStatus(`Redigerer: ${post.title}`);

  document.querySelector(".section-card:last-of-type")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deletePost(id) {
  const post = state.posts.find((item) => item.id === id);
  if (!post) {
    return;
  }

  if (!window.confirm(`Slette innlegget "${post.title}"?`)) {
    return;
  }

  try {
    await fetchJson(`${API_ROOT}/posts/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (state.editingId === id) {
      resetPostForm();
    }

    setPostStatus("Innlegg slettet.");
    await loadPosts();
  } catch (error) {
    setPostStatus(error.message || "Kunne ikke slette innlegg.", true);
  }
}

function resetPostForm() {
  elements.postForm?.reset();
  state.editingId = "";
  elements.postId.value = "";
  elements.savePostBtn.textContent = "Publiser innlegg";
  elements.cancelEditBtn?.classList.add("hidden");
  elements.postDate.value = toInputDateTime(new Date().toISOString());
}

function setField(name, value) {
  const field = elements.contentForm?.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = String(value || "");
  }
}

function getField(name) {
  const field = elements.contentForm?.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    return field.value.trim();
  }

  return "";
}

function setContentStatus(message, isError = false) {
  if (!elements.contentStatus) {
    return;
  }

  elements.contentStatus.textContent = message || "";
  elements.contentStatus.classList.toggle("error", Boolean(isError));
  elements.contentStatus.classList.toggle("ok", !isError && Boolean(message));
}

function setPostStatus(message, isError = false) {
  if (!elements.postStatus) {
    return;
  }

  elements.postStatus.textContent = message;
  elements.postStatus.classList.toggle("error", Boolean(isError));
  elements.postStatus.classList.toggle("ok", !isError && Boolean(message));
}

function setPostMeta(message) {
  if (elements.adminMeta) {
    elements.adminMeta.textContent = message;
  }
}

async function fetchJson(url, options = {}) {
  const apiRequest = url.startsWith(`${API_ROOT}/`) || url === API_ROOT;
  if (!apiRequest) {
    return requestJson(url, options, {
      authHeader: state.authHeader,
      credentials: "same-origin"
    });
  }

  const candidates = getApiCandidates();
  let lastError;

  for (const apiBase of candidates) {
    const finalUrl = toApiUrl(apiBase, url);
    const crossOrigin = isCrossOriginUrl(finalUrl);
    const credentials = crossOrigin ? "omit" : "same-origin";

    try {
      const data = await requestJson(finalUrl, options, {
        authHeader: state.authHeader,
        credentials
      });

      if (state.apiBase !== apiBase) {
        state.apiBase = apiBase;
        saveToStorage(API_BASE_STORAGE_KEY, apiBase);
        if (elements.apiBaseInput) {
          elements.apiBaseInput.value = apiBase;
        }
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
    throw new Error("Fant ikke API-endepunkt. Hvis du bruker Live Server, sett API-adresse til http://127.0.0.1:8080/api.");
  }

  throw lastError || new Error("Kunne ikke koble til API-serveren.");
}

async function requestJson(url, options = {}, requestOptions = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (requestOptions.authHeader) {
    headers.Authorization = requestOptions.authHeader;
  }

  let response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      credentials: requestOptions.credentials || "same-origin",
      headers,
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
    const message = data.error || `Serverfeil (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.retryable = response.status === 404 || response.status >= 500;

    if (response.status === 401) {
      if (isCrossOriginUrl(url)) {
        error.message = "Uautorisert. Legg inn admin-bruker og passord i 'Koble til API'.";
      } else {
        error.message = "Admin-sesjon mangler eller er utløpt. Last /admin på nytt og logg inn.";
      }
      error.retryable = false;
    }

    throw error;
  }

  return data;
}

function getApiCandidates() {
  const raw = [
    state.apiBase,
    resolveSameOriginApiBase(),
    resolveLocalhostApiBase(window.location.hostname || "127.0.0.1"),
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

function resolveLocalhostApiBase(hostname) {
  const host = String(hostname || "").trim() || "127.0.0.1";
  if (host === "localhost" || host === "127.0.0.1") {
    return `http://${host}:8080/api`;
  }

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

function isCrossOriginBase(apiBase) {
  if (!apiBase || apiBase === API_ROOT) {
    return false;
  }

  try {
    const absolute = new URL(apiBase, window.location.href);
    return absolute.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isCrossOriginUrl(url) {
  try {
    const absolute = new URL(url, window.location.href);
    return absolute.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function setConnectionStatus(message, isError = false) {
  if (!elements.connectionStatus) {
    return;
  }

  elements.connectionStatus.textContent = message || "";
  elements.connectionStatus.classList.toggle("error", Boolean(isError));
  elements.connectionStatus.classList.toggle("ok", !isError && Boolean(message));
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

function encodeBasicAuth(user, password) {
  const raw = `${user}:${password}`;
  try {
    const bytes = new TextEncoder().encode(raw);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return `Basic ${btoa(binary)}`;
  } catch {
    return `Basic ${btoa(raw)}`;
  }
}

function handleConnectionSubmit(event) {
  event.preventDefault();

  const enteredBase = normalizeApiBase(elements.apiBaseInput?.value || "");
  if (!enteredBase) {
    setConnectionStatus("Skriv inn en gyldig API-adresse.", true);
    return;
  }

  state.apiBase = enteredBase;
  saveToStorage(API_BASE_STORAGE_KEY, enteredBase);

  const user = String(elements.adminUserInput?.value || "").trim();
  const password = String(elements.adminPasswordInput?.value || "").trim();

  if (user && password) {
    state.authHeader = encodeBasicAuth(user, password);
    saveToStorage(ADMIN_AUTH_STORAGE_KEY, state.authHeader);
    setConnectionStatus(`Koblet til ${enteredBase} med admin-innlogging.`);
  } else {
    state.authHeader = readFromStorage(ADMIN_AUTH_STORAGE_KEY);
    setConnectionStatus(`Koblet til ${enteredBase}.`);
  }

  loadContentForm();
  loadPosts();
}

function clearSavedAuth() {
  state.authHeader = "";
  saveToStorage(ADMIN_AUTH_STORAGE_KEY, "");
  if (elements.adminUserInput) {
    elements.adminUserInput.value = "";
  }
  if (elements.adminPasswordInput) {
    elements.adminPasswordInput.value = "";
  }
  setConnectionStatus("Lokal admin-innlogging fjernet.");
}

function setupImagePreview(urlFieldName, altFieldName, imageElement) {
  if (!imageElement || !elements.contentForm) {
    return;
  }

  const urlField = elements.contentForm.elements.namedItem(urlFieldName);
  const altField = elements.contentForm.elements.namedItem(altFieldName);

  const update = () => {
    const src = getField(urlFieldName);
    const alt = getField(altFieldName);

    imageElement.src = src || "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
    imageElement.alt = alt || "Forhåndsvisning";
  };

  if (imageElement.dataset.previewBound !== "true") {
    if (urlField instanceof HTMLInputElement) {
      urlField.addEventListener("input", update);
      urlField.addEventListener("change", update);
    }

    if (altField instanceof HTMLInputElement) {
      altField.addEventListener("input", update);
      altField.addEventListener("change", update);
    }

    imageElement.dataset.previewBound = "true";
  }

  update();
}

function refreshImagePreviews() {
  setupImagePreview("homeHeroImage", "homeHeroImageAlt", elements.homeHeroPreview);
  setupImagePreview("homeFeatureImage", "homeFeatureImageAlt", elements.homeFeaturePreview);
  setupImagePreview("aboutHeroImage", "aboutHeroImageAlt", elements.aboutHeroPreview);
  setupImagePreview("contactHeroImage", "contactHeroImageAlt", elements.contactHeroPreview);
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

function toInputDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
