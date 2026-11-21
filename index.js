/* ============================================================
   ARENA LIVE v2 — app.js
   Scores + calendrier de tous les championnats.
   Aucun flux vidéo n'est hébergé : on oriente vers les diffuseurs officiels.
   ============================================================ */

const $ = id => document.getElementById(id);

const dateInput = $("matchDate");
const searchInput = $("searchInput");
const message = $("message");

const REFRESH_MS = 120000;

const state = { matches: [], status: "all", league: "all", leagueKey: "all", query: "", req: 0 };

/* ---------- Statuts ---------- */
const LIVE = ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"];
const DONE = ["FT", "AET", "PEN", "AWD", "WO"];

const categoryOf = m => {
  const s = String(m.status || "NS").toUpperCase();
  return LIVE.includes(s) ? "live" : DONE.includes(s) ? "finished" : "upcoming";
};

function statusText(m) {
  const s = String(m.status || "NS").toUpperCase();
  const c = categoryOf(m);
  if (c === "live") {
    if (s === "HT") return "HT";
    if (s === "SUSP" || s === "INT") return "PAUSED";
    return m.elapsed != null ? `LIVE ${m.elapsed}'` : "LIVE";
  }
  if (c === "finished") return s === "AET" ? "AET" : s === "PEN" ? "PEN" : "FT";
  if (s === "PST") return "POSTPONED";
  if (s === "CANC") return "CANCELLED";
  if (s === "ABD") return "ABANDONED";
  return m.time || "TBC";
}

/* ---------- Utilitaires ---------- */
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function todayTunis() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function shiftDate(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function safeImg(url) {
  try { const u = new URL(url); return u.protocol === "https:" ? u.href : ""; }
  catch { return ""; }
}

function logo(url, name, cls = "") {
  const src = safeImg(url);
  return src
    ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<span class="logo-ph ${cls}" aria-hidden="true">${esc(String(name || "?").trim().charAt(0))}</span>`;
}

/* Deux couleurs de fond, stables, déduites du nom des équipes */
function hue(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
const colors = m =>
  `--c1:hsl(${hue(m.home)} 58% 26%);--c2:hsl(${hue(m.away)} 58% 26%)`;

/* ---------- Championnats (filtres) ---------- */
const LEAGUES = [
  { id: "all", label: "All" },
  { id: "tn", label: "🇹🇳 Tunisia", test: m => m.country === "Tunisia" },
  { id: "ucl", label: "Champions League", test: m => m.league === "UEFA Champions League" },
  { id: "uel", label: "Europa League", test: m => m.league === "UEFA Europa League" },
  { id: "epl", label: "Premier League", test: m => m.league === "Premier League" && m.country === "England" },
  { id: "liga", label: "La Liga", test: m => m.league === "La Liga" && m.country === "Spain" },
  { id: "sa", label: "Serie A", test: m => m.league === "Serie A" && m.country === "Italy" },
  { id: "bun", label: "Bundesliga", test: m => m.league === "Bundesliga" && m.country === "Germany" },
  { id: "l1", label: "Ligue 1", test: m => m.league === "Ligue 1" && m.country === "France" },
  { id: "caf", label: "Africa", test: m => /CAF|Africa/i.test(m.league) }
];

const isMajor = m => LEAGUES.slice(1).some(l => l.test(m));

function leagueRank(m) {
  const i = LEAGUES.slice(1).findIndex(l => l.test(m));
  return i === -1 ? 100 : i;
}

function renderLeaguePills() {
  $("leaguePills").innerHTML = LEAGUES.map(l =>
    `<button class="pill ${l.id === state.league ? "is-on" : ""}" data-league="${l.id}" type="button">${esc(l.label)}</button>`
  ).join("");
}

/* ---------- Sources officielles (voir sources.js) ---------- */
const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;
const TWITCH_CHANNEL = /^[A-Za-z0-9_]{3,25}$/;
const YT_CHANNEL = /^UC[A-Za-z0-9_-]{20,}$/;

/* Transforme un lien en lien "embed" ; null si le fournisseur n'est pas autorisé */
function toEmbedURL(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    let id = null;
    if (parts[0] === "embed" || parts[0] === "live") id = parts[1];
    else if (parts[0] === "watch") id = url.searchParams.get("v");
    return id && VIDEO_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return VIDEO_ID.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "twitch.tv" || host === "player.twitch.tv") {
    const channel = host === "twitch.tv"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("channel");
    return channel && TWITCH_CHANNEL.test(channel)
      ? `https://player.twitch.tv/?channel=${channel}&parent=${location.hostname}` : null;
  }
  return null;
}

const has = (text, part) => String(text || "").toLowerCase().includes(String(part).toLowerCase());

function findSource(m) {
  const day = m.timestamp ? new Date(m.timestamp * 1000).toISOString().slice(0, 10) : dateInput.value;
  return (window.ARENA_SOURCES || []).find(r =>
    (r.id == null || String(r.id) === String(m.id)) &&
    (!r.league || r.league === m.league) &&
    (!r.country || r.country === m.country) &&
    (!r.home || has(m.home, r.home)) &&
    (!r.away || has(m.away, r.away)) &&
    (!r.from || day >= r.from) &&
    (!r.to || day <= r.to)
  ) || null;
}

const hasSource = m => !!findSource(m);

function sourceEmbed(src) {
  if (src.youtubeChannel && YT_CHANNEL.test(src.youtubeChannel))
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${src.youtubeChannel}`;
  return src.embed ? toEmbedURL(src.embed) : null;
}

function sourceLink(src) {
  if (src.youtubeChannel && YT_CHANNEL.test(src.youtubeChannel))
    return `https://www.youtube.com/channel/${src.youtubeChannel}/live`;
  return src.embed || "";
}

function noSignal(text, title = "No signal") {
  return `
    <div class="nosignal">
      <div class="nosignal__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <strong>${esc(title)}</strong>
      <p>${esc(text)}</p>
    </div>`;
}

const startsSoon = m => !m.timestamp || (m.timestamp * 1000 - Date.now()) < 45 * 60 * 1000;

/* Le lecteur n'apparaît que s'il existe une source déclarée ET que le match est en cours (ou va commencer) */
function playerHTML(m) {
  const c = categoryOf(m);
  const src = findSource(m);

  if (!src) return noSignal("No official stream is available for this match. Use the official links below.");
  const embed = sourceEmbed(src);
  if (!embed) return noSignal("The source configured for this match is not valid.", "Source error");
  if (c === "finished") return noSignal("This match is over. Check the official highlights below.", "Match finished");
  if (c === "upcoming" && !startsSoon(m)) return noSignal(`The stream opens shortly before kick-off (${m.time || "TBC"}).`, "Not started yet");

  const link = sourceLink(src);
  return `
    <div class="player">
      <iframe src="${esc(embed)}" title="Official stream"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerpolicy="strict-origin-when-cross-origin"></iframe>
    </div>
    <p class="note player__note">Source: ${esc(src.label || "official source")}.
      Black screen? The provider may block embedding${link ? ` — <a href="${esc(link)}" target="_blank" rel="noopener noreferrer">open it on the source</a>` : ""}.</p>`;
}

/* ---------- Cartes ---------- */
function card(m) {
  const c = categoryOf(m);
  const hasScore = m.homeGoals != null && m.awayGoals != null && c !== "upcoming";
  return `
    <button class="mcard" type="button" data-id="${esc(m.id)}">
      <div class="mcard__art" style="${colors(m)}">
        ${hasSource(m) ? '<span class="src">▶ Stream</span>' : ""}
        <span class="badge ${c === "live" ? "badge--live" : ""}">${esc(statusText(m))}</span>
        ${logo(m.homeLogo, m.home)}
        <div class="mid">
          ${safeImg(m.leagueLogo) ? `<img src="${esc(safeImg(m.leagueLogo))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
          ${hasScore ? `<b>${m.homeGoals} - ${m.awayGoals}</b>` : `<small>VS</small>`}
        </div>
        ${logo(m.awayLogo, m.away)}
      </div>
      <div class="mcard__info">
        <span class="mcard__league">${esc(m.league)}</span>
        <span class="mcard__title">${esc(m.home)} vs ${esc(m.away)}</span>
      </div>
    </button>`;
}

/* ---------- Hero : le match à la une ---------- */
function pickFeatured(list) {
  const live = list.filter(m => categoryOf(m) === "live");
  const pool = live.length ? live : list.filter(m => categoryOf(m) === "upcoming");
  const best = (pool.length ? pool : list).slice().sort((a, b) => leagueRank(a) - leagueRank(b))[0];
  return best || null;
}

function renderHero() {
  const hero = $("hero");
  const m = pickFeatured(state.matches);
  if (!m) { hero.hidden = true; return; }

  const c = categoryOf(m);
  const hasScore = m.homeGoals != null && m.awayGoals != null && c !== "upcoming";
  hero.hidden = false;
  hero.style.cssText = colors(m);
  hero.innerHTML = `
    <div>
      <div class="hero__tag"><span class="badge ${c === "live" ? "badge--live" : ""}" style="position:static">${esc(statusText(m))}</span></div>
      <div class="hero__teams">
        <div class="hero__team">${logo(m.homeLogo, m.home)}<strong>${esc(m.home)}</strong></div>
        <div class="hero__score">${hasScore ? `${m.homeGoals} - ${m.awayGoals}` : "VS"}</div>
        <div class="hero__team">${logo(m.awayLogo, m.away)}<strong>${esc(m.away)}</strong></div>
      </div>
      <p class="hero__league">${esc(m.league)}${m.country ? " · " + esc(m.country) : ""}</p>
      <button class="btn" type="button" data-id="${esc(m.id)}">Match details &amp; where to watch</button>
    </div>`;
}

/* ---------- Données affichées ---------- */
const byRankThenTime = (a, b) => (leagueRank(a) - leagueRank(b)) || ((a.timestamp || 0) - (b.timestamp || 0));

function visibleMatches() {
  const lg = LEAGUES.find(l => l.id === state.league);
  const q = state.query.trim().toLowerCase();
  return state.matches
    .filter(m => state.status === "all" || categoryOf(m) === state.status)
    .filter(m => state.league === "all" || (lg && lg.test(m)))
    .filter(m => state.leagueKey === "all" || `${m.league}|${m.country}` === state.leagueKey)
    .filter(m => !q || `${m.home} ${m.away} ${m.league} ${m.country}`.toLowerCase().includes(q))
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function leagueSection(key, list) {
  const [league, country] = key.split("|");
  return `
    <section class="league">
      <div class="league__head">
        ${safeImg(list[0].leagueLogo) ? `<img src="${esc(safeImg(list[0].leagueLogo))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}
        <h2>${esc(league)}</h2>
        <small>${esc(country || "International")} · ${list.length}</small>
      </div>
      <div class="grid">${list.map(card).join("")}</div>
    </section>`;
}

/* ---------- Pages ---------- */
const currentView = () => {
  const v = (location.hash || "#home").slice(1);
  return ["home", "live", "matches"].includes(v) ? v : "home";
};

/* Liste déroulante : TOUS les championnats présents ce jour-là */
function renderSelect() {
  const sel = $("leagueSelect");
  const counts = new Map();
  state.matches.forEach(m => {
    const k = `${m.league}|${m.country}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  });
  const items = [...counts.entries()].map(([k, n]) => {
    const [l, c] = k.split("|");
    return { k, l, c, n };
  }).sort((a, b) => (a.c || "").localeCompare(b.c || "") || a.l.localeCompare(b.l));

  sel.innerHTML = `<option value="all">All competitions (${items.length})</option>` +
    items.map(i => `<option value="${esc(i.k)}">${esc(i.c || "World")} — ${esc(i.l)} (${i.n})</option>`).join("");

  if (counts.has(state.leagueKey)) sel.value = state.leagueKey;
  else { state.leagueKey = "all"; sel.value = "all"; }
}

function renderHome() {
  const all = state.matches;
  const live = all.filter(m => categoryOf(m) === "live").sort(byRankThenTime);
  const done = all.filter(m => categoryOf(m) === "finished")
    .sort((a, b) => (leagueRank(a) - leagueRank(b)) || ((b.timestamp || 0) - (a.timestamp || 0)));
  const soon = all.filter(m => categoryOf(m) === "upcoming").sort(byRankThenTime);

  renderHero();
  $("homeEmpty").hidden = all.length > 0;

  $("homeLive").hidden = !live.length;
  $("homeLiveGrid").innerHTML = live.slice(0, 12).map(card).join("");

  $("resultsBlock").hidden = !done.length;
  $("resultsGrid").innerHTML = done.slice(0, 12).map(card).join("");

  $("soonBlock").hidden = !soon.length;
  $("soonGrid").innerHTML = soon.slice(0, 12).map(card).join("");

  $("matchCount").textContent = `${all.length} match${all.length === 1 ? "" : "es"} on this day`;
}

function renderLiveView() {
  const live = state.matches.filter(m => categoryOf(m) === "live").sort(byRankThenTime);
  $("liveGrid").innerHTML = live.map(card).join("");
  $("liveEmpty").hidden = live.length > 0;
  $("matchCount").textContent = `${live.length} live match${live.length === 1 ? "" : "es"}`;
}

function renderMatchesView() {
  const list = visibleMatches();
  $("matchCount").textContent = `${list.length} match${list.length === 1 ? "" : "es"}`;

  if (!list.length) {
    $("leagues").innerHTML = `<div class="empty">No match found. Try another day or another filter.</div>`;
    return;
  }

  const groups = new Map();
  list.forEach(m => {
    const key = `${m.league}|${m.country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });

  const ordered = [...groups.entries()].sort((a, b) =>
    (leagueRank(a[1][0]) - leagueRank(b[1][0])) || a[0].localeCompare(b[0]));

  const major = ordered.filter(([, l]) => isMajor(l[0]));
  const others = ordered.filter(([, l]) => !isMajor(l[0]));

  let html = major.map(([k, l]) => leagueSection(k, l)).join("");

  const filtering = state.league !== "all" || state.leagueKey !== "all" || state.query;
  if (filtering) {
    html += others.map(([k, l]) => leagueSection(k, l)).join("");
  } else if (others.length) {
    const total = others.reduce((n, [, l]) => n + l.length, 0);
    html += `<details class="more"><summary>Other competitions (${others.length} leagues · ${total} matches)</summary>
      ${others.map(([k, l]) => leagueSection(k, l)).join("")}</details>`;
  }
  $("leagues").innerHTML = html;
}

function render() {
  renderSelect();
  const v = currentView();
  if (v === "home") renderHome();
  else if (v === "live") renderLiveView();
  else renderMatchesView();
}

function setView() {
  const v = currentView();
  document.body.dataset.view = v;
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("is-active", a.dataset.nav === v));
  render();
  window.scrollTo({ top: 0 });
}

/* ---------- Fenêtre de détails + « Où regarder » ---------- */
const OFFICIAL = [
  { test: m => m.league === "La Liga", links: [["LaLiga — official site", "https://www.laliga.com"]] },
  { test: m => m.league === "Premier League" && m.country === "England", links: [["Premier League — where to watch", "https://www.premierleague.com"]] },
  { test: m => /UEFA/.test(m.league), links: [["UEFA.tv", "https://www.uefa.com"]] },
  { test: m => /FIFA|World Cup/i.test(m.league), links: [["FIFA", "https://www.fifa.com"]] },
  { test: m => m.country === "Tunisia", links: [["Fédération Tunisienne de Football", "https://www.ftf.org.tn"]] }
];

function modalHTML(m) {
  const c = categoryOf(m);
  const hasScore = m.homeGoals != null && m.awayGoals != null && c !== "upcoming";
  const official = (OFFICIAL.find(o => o.test(m)) || { links: [] }).links;
  const q = encodeURIComponent(`${m.home} vs ${m.away}`);
  const links = [
    ...official,
    ["Where to watch in your country", `https://www.google.com/search?q=${encodeURIComponent(`where to watch ${m.home} vs ${m.away}`)}`],
    ["Official highlights on YouTube", `https://www.youtube.com/results?search_query=${q}+highlights`]
  ];

  return `
    <div class="modal__art" style="${colors(m)}">
      <button class="modal__close" type="button" data-close aria-label="Close">✕</button>
      <span class="badge ${c === "live" ? "badge--live" : ""}" style="position:static">${esc(statusText(m))}</span>
      <div class="modal__teams">
        <div class="modal__team">${logo(m.homeLogo, m.home)}<span>${esc(m.home)}</span></div>
        <div class="modal__score">${hasScore ? `${m.homeGoals} - ${m.awayGoals}` : "VS"}</div>
        <div class="modal__team">${logo(m.awayLogo, m.away)}<span>${esc(m.away)}</span></div>
      </div>
      <p class="modal__league" id="mTitle">${esc(m.league)}${m.round ? " · " + esc(m.round) : ""}</p>
    </div>
    <div class="modal__player">${playerHTML(m)}</div>
    <div class="modal__info">
      <div>
        <h3>Where to watch</h3>
        <ul class="links">
          ${links.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer"><span>${esc(t)}</span><span aria-hidden="true">↗</span></a></li>`).join("")}
        </ul>
      </div>
      <p class="note">Broadcast rights depend on your country. These links lead to official sources only.</p>
    </div>`;
}

/* ---------- Chargement des données ---------- */
async function load(silent = false) {
  const date = dateInput.value;
  if (!date) return;

  if (!window.ARENA_API_URL) {
    message.textContent = "API configuration is missing. Check config.js.";
    return;
  }

  const id = ++state.req;
  if (!silent) {
    message.innerHTML = `<span class="loader"></span>Loading matches…`;
    $("leagues").innerHTML = "";
  }

  try {
    const url = new URL(window.ARENA_API_URL);
    url.searchParams.set("date", date);
    const res = await fetch(url);
    const data = await res.json();
    if (id !== state.req) return;

    if (!res.ok) throw new Error(data.error || "Unable to load matches");
    if (!Array.isArray(data.matches)) throw new Error("Invalid API response");

    state.matches = data.matches;
    message.textContent = "";
    render();
    const left = data.quota != null && data.quota !== "" ? ` · API calls left today: ${data.quota}` : "";
    $("lastUpdated").textContent = "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + left;
  } catch (err) {
    if (id !== state.req) return;
    if (silent && state.matches.length) {
      $("lastUpdated").textContent = "Update failed — showing last data";
    } else {
      state.matches = [];
      $("leagues").innerHTML = "";
      $("hero").hidden = true;
      $("homeEmpty").hidden = true;
      $("matchCount").textContent = "0 matches";
      message.textContent = `Unable to load matches: ${err.message}`;
    }
  }
}

/* ---------- Événements ---------- */
document.addEventListener("click", e => {
  const open = e.target.closest("[data-id]");
  if (open) {
    const m = state.matches.find(x => String(x.id) === open.dataset.id);
    if (m) { $("modalBody").innerHTML = modalHTML(m); $("modal").showModal(); }
    return;
  }
  const st = e.target.closest("[data-status]");
  if (st) {
    state.status = st.dataset.status;
    document.querySelectorAll("[data-status]").forEach(b => b.classList.toggle("is-on", b === st));
    render();
    return;
  }
  const lg = e.target.closest("[data-league]");
  if (lg) { state.league = lg.dataset.league; state.leagueKey = "all"; renderLeaguePills(); render(); return; }

  if (e.target.closest("[data-close]") || e.target === $("modal")) $("modal").close();
});

$("modal").addEventListener("close", () => { $("modalBody").innerHTML = ""; });

searchInput.addEventListener("input", () => { state.query = searchInput.value; render(); });
$("searchToggle").addEventListener("click", () => {
  if (currentView() !== "matches") location.hash = "#matches";
  setTimeout(() => searchInput.focus(), 50);
});

$("leagueSelect").addEventListener("change", e => {
  state.leagueKey = e.target.value;
  state.league = "all";
  renderLeaguePills();
  render();
});

window.addEventListener("hashchange", setView);

dateInput.addEventListener("change", () => load(false));
$("prevDay").addEventListener("click", () => { dateInput.value = shiftDate(dateInput.value, -1); load(false); });
$("nextDay").addEventListener("click", () => { dateInput.value = shiftDate(dateInput.value, 1); load(false); });
$("todayBtn").addEventListener("click", () => { dateInput.value = todayTunis(); load(false); });

/* Si un logo ne charge pas, on le cache proprement */
document.addEventListener("error", e => {
  if (e.target.tagName === "IMG") e.target.style.visibility = "hidden";
}, true);

/* ---------- Démarrage ---------- */
dateInput.value = todayTunis();
renderLeaguePills();
setView();
load(false);

/* Actualisation automatique : seulement pour aujourd'hui, onglet visible */
setInterval(() => {
  if (!document.hidden && dateInput.value === todayTunis()) load(true);
}, REFRESH_MS);
