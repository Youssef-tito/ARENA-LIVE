```javascript
/* =========================================================
   ARENA LIVE — ULTIMATE FOOTBALL APP
   API-SPORTS + CLOUDFLARE WORKER
   OFFICIAL SOURCES INTEGRATION
   Version 4.0
========================================================= */

"use strict";

/* =========================================================
   CONFIGURATION
========================================================= */

const ARENA_CONFIG = {
  workerUrl: "https://arena-live.youssefmehrzi666.workers.dev",
  refreshInterval: 60000,
  timezone: "Africa/Tunis",
  defaultLanguage: "en",
  defaultTheme: "dark"
};

const LIVE_STATUSES = new Set([
  "1H", "2H", "HT", "ET", "P", "LIVE", "BT"
]);

const FINISHED_STATUSES = new Set([
  "FT", "AET", "PEN", "AWD", "WO", "ABD"
]);

const POSTPONED_STATUSES = new Set([
  "PST", "CANC", "SUSP", "INT", "TBD"
]);

/* =========================================================
   TRANSLATIONS
========================================================= */

const TRANSLATIONS = {

  en: {
    matches: "Matches",
    live: "Live Now",
    overview: "Overview",
    liveMatches: "Live Matches",
    overviewTitle: "ARENA LIVE Overview",
    subtitle: "Real-time fixtures and football information.",
    liveSubtitle: "Matches currently in play right now.",
    overviewSubtitle: "Today's featured fixtures across top leagues.",
    everyMatch: "EVERY MATCH.",
    oneArena: "ONE ARENA.",
    footballWorld: "THE WORLD OF FOOTBALL",
    heroDescription: "Follow football around the world. Discover fixtures, live scores and match information in one place.",
    watchLive: "WATCH LIVE",
    exploreMatches: "EXPLORE MATCHES",
    matchCenter: "MATCH CENTER",
    status: "MATCH STATUS",
    popular: "POPULAR COMPETITIONS",
    fixtures: "FOOTBALL FIXTURES",
    allMatches: "All Matches",
    all: "All",
    upcoming: "Upcoming",
    finished: "Finished",
    today: "TODAY",
    search: "Search teams, competitions or countries...",
    allCompetitions: "All competitions",
    loading: "Loading football matches",
    loadingDescription: "Connecting to the ARENA LIVE football database...",
    noMatches: "No matches found",
    noMatchesDescription: "Try another date or change your filters.",
    error: "Unable to load matches",
    retry: "Retry",
    updated: "Updated",
    dataConnected: "DATA CONNECTED",
    openSource: "Open Source",
    openChannel: "Official Website",
    replay: "REPLAY",
    stream: "LIVE",
    noStream: "No stream available",
    noStreamDescription: "An authorized video source has not been configured for this match.",
    player: "ARENA LIVE PLAYER",
    matchInformation: "Match information",
    officialDisclaimer: "Video availability depends on official sources and their embedding permissions.",
    footer: "The world of football, all in one arena.",
    home: "Home",
    away: "Away",
    quota: "Quota",
    allStatus: "All Matches",
    match: "match",
    matchesPlural: "matches",
    competitions: "competitions",
    liveLabel: "LIVE",
    postponed: "Postponed",
    cancelled: "Cancelled",
    unknown: "Unknown",
    noSource: "No authorized video source is available for this match.",
    sourceHelp: "Check the official competition website for broadcast information.",
    connectionError: "Check your internet connection and try again.",
    dataError: "The server returned invalid match data.",
    sourcesTitle: "Official Football Sources",
    sourcesDescription: "Discover official football websites, competitions and video platforms.",
    sourcesEmpty: "No sources available.",
    openWebsite: "Visit Website",
    unverified: "Unverified sources"
  },

  fr: {
    matches: "Matchs",
    live: "En direct",
    overview: "Accueil",
    liveMatches: "Matchs en direct",
    overviewTitle: "ARENA LIVE",
    subtitle: "Matchs et informations football en temps réel.",
    liveSubtitle: "Les matchs actuellement en cours.",
    overviewSubtitle: "Les rencontres du jour dans les grands championnats.",
    everyMatch: "CHAQUE MATCH.",
    oneArena: "UNE ARENA.",
    footballWorld: "LE MONDE DU FOOTBALL",
    heroDescription: "Suivez le football dans le monde entier. Découvrez les matchs, les scores en direct et les informations.",
    watchLive: "VOIR EN DIRECT",
    exploreMatches: "EXPLORER",
    matchCenter: "CENTRE DES MATCHS",
    status: "STATUT DU MATCH",
    popular: "COMPÉTITIONS POPULAIRES",
    fixtures: "CALENDRIER DU FOOTBALL",
    allMatches: "Tous les matchs",
    all: "Tous",
    upcoming: "À venir",
    finished: "Terminés",
    today: "AUJOURD'HUI",
    search: "Rechercher une équipe ou compétition...",
    allCompetitions: "Toutes les compétitions",
    loading: "Chargement des matchs",
    loadingDescription: "Connexion à la base de données ARENA LIVE...",
    noMatches: "Aucun match trouvé",
    noMatchesDescription: "Essayez une autre date ou modifiez les filtres.",
    error: "Impossible de charger les matchs",
    retry: "Réessayer",
    updated: "Mis à jour",
    dataConnected: "DONNÉES CONNECTÉES",
    openSource: "Ouvrir la source",
    openChannel: "Site officiel",
    replay: "REPLAY",
    stream: "DIRECT",
    noStream: "Aucun flux disponible",
    noStreamDescription: "Aucune source vidéo autorisée n'est configurée pour ce match.",
    player: "LECTEUR ARENA LIVE",
    matchInformation: "Informations du match",
    officialDisclaimer: "La disponibilité vidéo dépend des sources officielles et de leurs autorisations d'intégration.",
    footer: "Le monde du football dans une seule arena.",
    home: "Domicile",
    away: "Extérieur",
    quota: "Quota",
    allStatus: "Tous les matchs",
    match: "match",
    matchesPlural: "matchs",
    competitions: "compétitions",
    liveLabel: "EN DIRECT",
    postponed: "Reporté",
    cancelled: "Annulé",
    unknown: "Inconnu",
    noSource: "Aucune source vidéo autorisée n'est disponible.",
    sourceHelp: "Consultez le site officiel de la compétition.",
    connectionError: "Vérifiez votre connexion Internet.",
    dataError: "Le serveur a renvoyé des données invalides.",
    sourcesTitle: "Sources officielles du football",
    sourcesDescription: "Découvrez les sites officiels, les compétitions et les plateformes vidéo.",
    sourcesEmpty: "Aucune source disponible.",
    openWebsite: "Visiter le site",
    unverified: "Sources non vérifiées"
  },

  ar: {
    matches: "المباريات",
    live: "مباشر",
    overview: "الرئيسية",
    liveMatches: "المباريات المباشرة",
    overviewTitle: "ARENA LIVE",
    subtitle: "معلومات ونتائج كرة القدم في الوقت الحقيقي.",
    liveSubtitle: "المباريات التي تُلعب حالياً.",
    overviewSubtitle: "أبرز مباريات اليوم في البطولات الكبرى.",
    everyMatch: "كل مباراة.",
    oneArena: "في مكان واحد.",
    footballWorld: "عالم كرة القدم",
    heroDescription: "تابع كرة القدم حول العالم واكتشف المباريات والنتائج والمعلومات في مكان واحد.",
    watchLive: "شاهد المباشر",
    exploreMatches: "اكتشف المباريات",
    matchCenter: "مركز المباريات",
    status: "حالة المباراة",
    popular: "البطولات الشهيرة",
    fixtures: "مباريات كرة القدم",
    allMatches: "كل المباريات",
    all: "الكل",
    upcoming: "القادمة",
    finished: "المنتهية",
    today: "اليوم",
    search: "ابحث عن فريق أو بطولة...",
    allCompetitions: "كل البطولات",
    loading: "جاري تحميل المباريات",
    loadingDescription: "الاتصال بقاعدة بيانات ARENA LIVE...",
    noMatches: "لم يتم العثور على مباريات",
    noMatchesDescription: "جرّب تاريخاً آخر أو غيّر الفلاتر.",
    error: "تعذّر تحميل المباريات",
    retry: "إعادة المحاولة",
    updated: "آخر تحديث",
    dataConnected: "البيانات متصلة",
    openSource: "فتح المصدر",
    openChannel: "الموقع الرسمي",
    replay: "إعادة",
    stream: "مباشر",
    noStream: "لا يوجد بث متاح",
    noStreamDescription: "لم يتم إعداد مصدر فيديو مرخّص لهذه المباراة.",
    player: "مشغل ARENA LIVE",
    matchInformation: "معلومات المباراة",
    officialDisclaimer: "توفر الفيديو يعتمد على المصادر الرسمية وأذونات التضمين.",
    footer: "عالم كرة القدم في مكان واحد.",
    home: "الفريق المضيف",
    away: "الفريق الضيف",
    quota: "الحصة",
    allStatus: "كل المباريات",
    match: "مباراة",
    matchesPlural: "مباريات",
    competitions: "بطولات",
    liveLabel: "مباشر",
    postponed: "مؤجلة",
    cancelled: "ملغاة",
    unknown: "غير معروف",
    noSource: "لا يوجد مصدر فيديو مرخّص لهذه المباراة.",
    sourceHelp: "تحقق من الموقع الرسمي للبطولة لمعرفة معلومات البث.",
    connectionError: "تحقق من اتصال الإنترنت وحاول مجدداً.",
    dataError: "الخادم أرسل بيانات مباريات غير صالحة.",
    sourcesTitle: "مصادر كرة القدم الرسمية",
    sourcesDescription: "اكتشف المواقع الرسمية والبطولات ومنصات الفيديو.",
    sourcesEmpty: "لا توجد مصادر متاحة.",
    openWebsite: "زيارة الموقع",
    unverified: "مصادر غير موثوقة"
  }

};


/* =========================================================
   STATE
========================================================= */

const state = {

  selectedDate: getTodayDate(),
  matches: [],
  quota: null,
  statusFilter: "all",
  featuredFilter: "all",
  competitionFilter: "__ALL__",
  searchQuery: "",
  route: getRoute(),

  theme: localStorage.getItem("arena_theme") || ARENA_CONFIG.defaultTheme,

  language: localStorage.getItem("arena_language") || ARENA_CONFIG.defaultLanguage,

  isLoading: false,
  errorMessage: "",
  lastUpdated: "",
  activeMatch: null,
  activeMediaUrl: "",
  requestId: 0

};


/* =========================================================
   DOM
========================================================= */

const $ = id => document.getElementById(id);

const els = {

  viewTitle: $("viewTitle"),
  viewSubtitle: $("viewSubtitle"),

  datePicker: $("datePicker"),
  dateDisplay: $("dateDisplay"),

  prevDayBtn: $("prevDayBtn"),
  nextDayBtn: $("nextDayBtn"),
  todayBtn: $("todayBtn"),

  searchInput: $("searchInput"),
  clearSearchBtn: $("clearSearchBtn"),

  statusChips: $("statusChips"),
  featuredLeagueChips: $("featuredLeagueChips"),

  competitionSelect: $("competitionSelect"),

  matchesCount: $("matchesCount"),
  updatedTime: $("updatedTime"),
  quotaBadge: $("quotaBadge"),

  stateContainer: $("stateContainer"),
  matchesList: $("matchesList"),

  themeBtn: $("themeBtn"),
  language: $("language"),

  navLinks: [...document.querySelectorAll(".nav-link")],

  watchModal: $("watchModal"),
  closeModalBtn: $("closeModalBtn"),

  modalLeagueLogo: $("modalLeagueLogo"),
  modalMatchTitle: $("modalMatchTitle"),
  modalMatchMeta: $("modalMatchMeta"),

  modalHomeLogo: $("modalHomeLogo"),
  modalHomeName: $("modalHomeName"),

  modalAwayLogo: $("modalAwayLogo"),
  modalAwayName: $("modalAwayName"),

  modalScore: $("modalScore"),
  modalStatusBadge: $("modalStatusBadge"),

  playerModeBadge: $("playerModeBadge"),

  playerPlaceholder: $("playerPlaceholder"),
  playerPlaceholderTitle: $("playerPlaceholderTitle"),
  playerPlaceholderDesc: $("playerPlaceholderDesc"),

  matchStreamFrame: $("matchStreamFrame"),
  matchReplayVideo: $("matchReplayVideo"),

  modalExtraInfo: $("modalExtraInfo"),
  toggleSourceBtn: $("toggleSourceBtn")

};


/* =========================================================
   TRANSLATION HELPER
========================================================= */

function t(key) {

  const language = TRANSLATIONS[state.language] || TRANSLATIONS.en;

  return language[key] || TRANSLATIONS.en[key] || key;

}


/* =========================================================
   DATE FUNCTIONS
========================================================= */

function getTodayDate() {

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARENA_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = {};

  parts.forEach(part => {
    values[part.type] = part.value;
  });

  return `${values.year}-${values.month}-${values.day}`;

}


function shiftDate(dateString, amount) {

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(
    year,
    month - 1,
    day + amount
  ));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");

}


function formatDate(dateString) {

  if (!dateString) return "";

  const [year, month, day] = dateString.split("-");

  return `${day}/${month}/${year}`;

}


function formatMatchTime(match) {

  if (
    typeof match.timestamp === "number" &&
    Number.isFinite(match.timestamp)
  ) {

    return new Intl.DateTimeFormat(
      state.language === "ar" ? "ar-TN" : state.language === "fr" ? "fr-FR" : "en-GB",
      {
        timeZone: ARENA_CONFIG.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(new Date(match.timestamp * 1000));

  }

  if (match.time && /^\d{2}:\d{2}$/.test(match.time)) {
    return match.time;
  }

  return "--:--";

}


/* =========================================================
   ROUTING
========================================================= */

function getRoute() {

  const hash = (location.hash || "#matches").toLowerCase();

  if (hash.startsWith("#live")) return "live";

  if (hash.startsWith("#home")) return "home";

  return "matches";

}


function updateRoute() {

  state.route = getRoute();

  state.statusFilter = state.route === "live" ? "live" : "all";

  els.navLinks.forEach(link => {

    link.classList.toggle(
      "active",
      link.dataset.route === state.route
    );

  });

  if (state.route === "live") {

    els.viewTitle.textContent = t("liveMatches");

    els.viewSubtitle.textContent = t("liveSubtitle");

  } else if (state.route === "home") {

    els.viewTitle.textContent = t("overviewTitle");

    els.viewSubtitle.textContent = t("overviewSubtitle");

  } else {

    els.viewTitle.textContent = t("matches");

    els.viewSubtitle.textContent = t("subtitle");

  }

  updateStatusChips();

}


/* =========================================================
   THEME
========================================================= */

function applyTheme() {

  document.body.classList.toggle(
    "light",
    state.theme === "light"
  );

  document.documentElement.dataset.theme = state.theme;

  if (els.themeBtn) {

    els.themeBtn.textContent =
      state.theme === "light" ? "☾" : "☀";

  }

  localStorage.setItem("arena_theme", state.theme);

}


function toggleTheme() {

  state.theme =
    state.theme === "dark" ? "light" : "dark";

  applyTheme();

}


/* =========================================================
   LANGUAGE
========================================================= */

function applyLanguage() {

  const language = TRANSLATIONS[state.language]
    ? state.language
    : "en";

  state.language = language;

  document.documentElement.lang = language;

  document.documentElement.dir =
    language === "ar" ? "rtl" : "ltr";

  if (els.language) {
    els.language.value = language;
  }

  const heroTitle = document.querySelector(".hero h1");

  if (heroTitle) {

    heroTitle.innerHTML =
      `${t("everyMatch")}<br><span>${t("oneArena")}</span>`;

  }

  const heroLabel = document.querySelector(".hero-label");

  if (heroLabel) {
    heroLabel.lastChild.textContent = " " + t("footballWorld");
  }

  const heroDescription = document.querySelector(".hero-description");

  if (heroDescription) {
    heroDescription.textContent = t("heroDescription");
  }

  const watchButton = document.querySelector(".hero-actions .primary-button");

  if (watchButton) {
    watchButton.lastChild.textContent = " " + t("watchLive");
  }

  const exploreButton = document.querySelector(".hero-actions .secondary-button");

  if (exploreButton) {
    exploreButton.firstChild.textContent = t("exploreMatches") + " ";
  }

  if (els.searchInput) {
    els.searchInput.placeholder = t("search");
  }

  updateRoute();

  renderMatches();

  renderOfficialSources();

  localStorage.setItem("arena_language", language);

}


/* =========================================================
   MATCH STATUS
========================================================= */

function getStatusCategory(status) {

  const code = String(status || "").toUpperCase();

  if (LIVE_STATUSES.has(code)) return "live";

  if (FINISHED_STATUSES.has(code)) return "finished";

  if (POSTPONED_STATUSES.has(code)) return "upcoming";

  return "upcoming";

}


function getStatusLabel(match) {

  const code = String(match.status || "").toUpperCase();

  const category = getStatusCategory(code);

  if (category === "live") {

    if (match.elapsed != null) {
      return `${t("liveLabel")} • ${match.elapsed}'`;
    }

    return t("liveLabel");

  }

  if (category === "finished") {
    return code || "FT";
  }

  if (POSTPONED_STATUSES.has(code)) {
    return match.statusText || t("postponed");
  }

  return formatMatchTime(match);

}


/* =========================================================
   FILTERS
========================================================= */

function updateStatusChips() {

  if (!els.statusChips) return;

  els.statusChips.querySelectorAll(".chip").forEach(chip => {

    chip.classList.toggle(
      "active",
      chip.dataset.status === state.statusFilter
    );

  });

}


function matchesFeaturedFilter(match, filter) {

  if (!filter || filter === "all") return true;

  const league = String(match.league || "").toLowerCase();

  const country = String(match.country || "").toLowerCase();

  switch (filter) {

    case "tunisia":
      return country.includes("tunisia");

    case "ucl":
      return league.includes("champions league") &&
        !league.includes("afc") &&
        !league.includes("concacaf");

    case "uel":
      return league.includes("europa league");

    case "epl":
      return league.includes("premier league") &&
        (country.includes("england") || country.includes("uk"));

    case "laliga":
      return league.includes("la liga") ||
        (league.includes("primera division") && country.includes("spain"));

    case "seriea":
      return league.includes("serie a") &&
        country.includes("italy");

    case "bundesliga":
      return league.includes("bundesliga") &&
        country.includes("germany");

    case "ligue1":
      return league.includes("ligue 1") &&
        country.includes("france");

    case "africa":
      return (
        country.includes("egypt") ||
        country.includes("morocco") ||
        country.includes("algeria") ||
        country.includes("tunisia") ||
        country.includes("south africa") ||
        league.includes("caf") ||
        league.includes("africa")
      );

    default:
      return false;

  }

}


function getCompetitionKey(match) {

  return `${match.country || t("unknown")} — ${match.league || t("unknown")}`;

}


/* =========================================================
   HTML SECURITY
========================================================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

}


function isSafeMediaUrl(value) {

  try {

    const url = new URL(value);

    return url.protocol === "https:";

  } catch {

    return false;

  }


}


/* =========================================================
   OFFICIAL SOURCES DIRECTORY
========================================================= */

function getOfficialSources() {

  return Array.isArray(window.ARENA_OFFICIAL_SOURCES)
    ? window.ARENA_OFFICIAL_SOURCES
    : [];

}


function getSourceCategoryName(category) {

  const names = {

    official: {
      en: "Official Sports & TV",
      fr: "Sports et télévision officiels",
      ar: "القنوات والمصادر الرياضية الرسمية"
    },

    competition: {
      en: "Official Competitions",
      fr: "Compétitions officielles",
      ar: "البطولات الرسمية"
    },

    scores: {
      en: "Scores & Results",
      fr: "Scores et résultats",
      ar: "النتائج والمباريات"
    },

    platform: {
      en: "Video Platforms",
      fr: "Plateformes vidéo",
      ar: "منصات الفيديو"
    }

  };

  return names[category]?.[state.language] ||
    names[category]?.en ||
    category;

}


function renderOfficialSources() {

  const sources = getOfficialSources();

  let container = $("arenaSourcesDirectory");

  if (!container) {

    container = document.createElement("section");

    container.id = "arenaSourcesDirectory";

    container.className = "arena-sources-directory";

    const main = document.querySelector("main");

    if (!main) return;

    main.appendChild(container);

  }

  if (!sources.length) {

    container.innerHTML = "";

    return;

  }

  const grouped = {};

  sources.forEach(source => {

    if (!source || !source.name || !source.url) return;

    if (!isSafeMediaUrl(source.url)) return;

    const category = source.category || "official";

    if (!grouped[category]) grouped[category] = [];

    grouped[category].push(source);

  });

  const sourceCards = Object.entries(grouped).map(([category, items]) => {

    return `

      <div class="source-category">

        <h3>${escapeHtml(getSourceCategoryName(category))}</h3>

        <div class="sources-grid">

          ${items.map(source => `

            <a
              class="source-card"
              href="${escapeHtml(source.url)}"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="${escapeHtml(source.name)}"
            >

              <div class="source-card-icon">⚽</div>

              <div class="source-card-info">

                <strong>${escapeHtml(source.name)}</strong>

                <span>
                  ${escapeHtml(source.description || source.country || "")}
                </span>

              </div>

              <span class="source-external">↗</span>

            </a>

          `).join("")}

        </div>

      </div>

    `;

  }).join("");

  container.innerHTML = `

    <div class="sources-heading">

      <span class="sources-eyebrow">ARENA LIVE • DIRECTORY</span>

      <h2>${t("sourcesTitle")}</h2>

      <p>${t("sourcesDescription")}</p>

    </div>

    ${sourceCards}

  `;

}


/* =========================================================
   COMPETITION OFFICIAL LINKS
========================================================= */

function getOfficialCompetitionUrl(match) {

  const league = String(match.league || "").toLowerCase();

  const country = String(match.country || "").toLowerCase();

  if (
    league.includes("caf") ||
    league.includes("africa") ||
    country.includes("africa")
  ) {

    return "https://www.cafonline.com/fr/ligue-des-champions/";

  }

  if (
    league.includes("saudi") ||
    country.includes("saudi arabia")
  ) {

    return "https://www.saff.com.sa/en/championship.php?id=73";

  }

  if (country.includes("tunisia")) {

    return "https://www.tunisiatv.tn/ar";

  }

  if (
    league.includes("uefa") ||
    league.includes("europa league") ||
    league.includes("champions league")
  ) {

    return "https://www.uefa.com/";

  }

  if (
    league.includes("world cup") ||
    league.includes("fifa")
  ) {

    return "https://www.fifa.com/";

  }

  if (league.includes("premier league")) {

    return "https://www.premierleague.com/en/watch-live";

  }

  if (
    league.includes("la liga") ||
    league.includes("primera division")
  ) {

    return "https://www.laliga.com/en-GB";

  }

  if (league.includes("serie a")) {

    return "https://www.legaseriea.it/";

  }

  if (league.includes("bundesliga")) {

    return "https://www.bundesliga.com/";

  }

  if (league.includes("ligue 1")) {

    return "https://www.ligue1.com/";

  }

  return "";

}


/* =========================================================
   MEDIA RESOLVER
========================================================= */

function resolveMedia(match) {

  if (!match) {

    return {
      url: "",
      label: "Stream",
      officialUrl: ""
    };

  }

  const finished =
    getStatusCategory(match.status) === "finished";

  const id = String(match.id ?? "");

  const pair =
    `${String(match.home || "").toLowerCase()} vs ${String(match.away || "").toLowerCase()}`;

  const officialUrl = getOfficialCompetitionUrl(match);

  const directUrl = finished
    ? match.replayUrl || match.embedUrl || ""
    : match.streamUrl || match.embedUrl || "";

  if (
    typeof directUrl === "string" &&
    isSafeMediaUrl(directUrl.trim())
  ) {

    return {
      url: directUrl.trim(),
      label: finished ? "Replay" : "Live Stream",
      officialUrl
    };

  }

  const streams = window.ARENA_STREAMS || {};

  const replays = window.ARENA_REPLAYS || {};

  const map = finished ? replays : streams;

  const mappedUrl = map[id] || map[pair] || "";

  if (
    typeof mappedUrl === "string" &&
    isSafeMediaUrl(mappedUrl.trim())
  ) {

    return {
      url: mappedUrl.trim(),
      label: finished ? "Replay" : "Live Stream",
      officialUrl
    };

  }

  const rules = Array.isArray(window.ARENA_SOURCE_RULES)
    ? window.ARENA_SOURCE_RULES
    : [];

  const text = [
    match.home,
    match.away,
    match.league,
    match.country
  ].join(" ").toLowerCase();

  for (const rule of rules) {

    if (!rule || !rule.match || !rule.url) continue;

    if (
      text.includes(String(rule.match).toLowerCase()) &&
      isSafeMediaUrl(String(rule.url))
    ) {

      return {
        url: String(rule.url).trim(),
        label: "Official Source",
        officialUrl
      };

    }

  }

  return {
    url: "",
    label: finished ? "Replay" : "Stream",
    officialUrl
  };

}


/* =========================================================
   LOADING STATES
========================================================= */

function renderState(type, title, description, retry = false) {

  if (!els.stateContainer || !els.matchesList) return;

  els.stateContainer.classList.remove("hidden");

  els.matchesList.innerHTML = "";

  const retryButton = retry
    ? `<button class="retry-button" id="retryFetchBtn">${t("retry")}</button>`
    : "";

  els.stateContainer.innerHTML = `

    <div class="state-card ${type}">

      ${
        type === "loading"
          ? `<div class="loading-spinner"></div>`
          : `<div class="state-icon">${type === "error" ? "!" : "⚽"}</div>`
      }

      <h3>${escapeHtml(title)}</h3>

      <p>${escapeHtml(description)}</p>

      ${retryButton}

    </div>

  `;

  const retryBtn = $("retryFetchBtn");

  if (retryBtn) {

    retryBtn.addEventListener("click", () => {
      fetchMatches(state.selectedDate);
    });

  }

}


/* =========================================================
   TEAM LOGO
========================================================= */

function teamLogo(url, name) {

  if (!url || !isSafeMediaUrl(url)) {

    return `
      <div class="team-logo-placeholder">
        ⚽
      </div>
    `;

  }

  return `

    <img
      class="team-logo"
      src="${escapeHtml(url)}"
      alt="${escapeHtml(name)}"
      loading="lazy"
      onerror="this.outerHTML='<div class=&quot;team-logo-placeholder&quot;>⚽</div>'"
    >

  `;

}


/* =========================================================
   MATCH CARD
========================================================= */

function createMatchCard(match) {

  const category = getStatusCategory(match.status);

  const status = getStatusLabel(match);

  const hasScore =
    match.homeGoals !== null &&
    match.homeGoals !== undefined &&
    match.awayGoals !== null &&
    match.awayGoals !== undefined;

  const homeScore = hasScore ? match.homeGoals : "-";

  const awayScore = hasScore ? match.awayGoals : "-";

  const time = category === "upcoming"
    ? formatMatchTime(match)
    : status;

  const liveClass = category === "live" ? "is-live" : "";

  const finishedClass = category === "finished" ? "is-finished" : "";

  const row = document.createElement("article");

  row.className = `match-card ${category}`;

  row.tabIndex = 0;

  row.setAttribute("role", "button");

  row.innerHTML = `

    <div class="match-card-top">

      <div class="match-time">
        ${category === "upcoming" ? "◷" : "●"}
        <span>${escapeHtml(time)}</span>
      </div>

      <span class="match-status ${liveClass} ${finishedClass}">
        ${escapeHtml(status)}
      </span>

    </div>


    <div class="match-card-body">

      <div class="match-team home-team">

        ${teamLogo(match.homeLogo, match.home)}

        <span class="team-name">
          ${escapeHtml(match.home)}
        </span>

      </div>


      <div class="match-result">

        <span class="team-score">
          ${escapeHtml(homeScore)}
        </span>

        <span class="score-divider">:</span>

        <span class="team-score">
          ${escapeHtml(awayScore)}
        </span>

      </div>


      <div class="match-team away-team">

        <span class="team-name">
          ${escapeHtml(match.away)}
        </span>

        ${teamLogo(match.awayLogo, match.away)}

      </div>

    </div>


    <div class="match-card-bottom">

      <span class="match-id">
        MATCH #${escapeHtml(match.id ?? "--")}
      </span>

      <span class="match-open">
        DETAILS ↗
      </span>

    </div>

  `;

  row.addEventListener("click", () => {
    openMatch(match);
  });

  row.addEventListener("keydown", event => {

    if (event.key === "Enter" || event.key === " ") {

      event.preventDefault();

      openMatch(match);

    }

  });

  return row;

}


/* =========================================================
   RENDER MATCHES
========================================================= */

function renderMatches() {

  if (!els.matchesList) return;

  if (els.datePicker) {
    els.datePicker.value = state.selectedDate;
  }

  if (els.dateDisplay) {
    els.dateDisplay.textContent = formatDate(state.selectedDate);
  }

  if (els.quotaBadge) {

    els.quotaBadge.textContent =
      `${t("quota")}: ${state.quota ?? "--"}`;

  }

  if (els.updatedTime) {

    els.updatedTime.textContent =
      state.lastUpdated
        ? `${t("updated")} ${state.lastUpdated}`
        : `${t("updated")} --:--`;

  }

  if (state.isLoading) {

    if (els.matchesCount) {
      els.matchesCount.textContent = t("loading");
    }

    renderState(
      "loading",
      t("loading"),
      t("loadingDescription")
    );

    return;

  }

  if (state.errorMessage) {

    if (els.matchesCount) {
      els.matchesCount.textContent = "0";
    }

    renderState(
      "error",
      t("error"),
      state.errorMessage,
      true
    );

    return;

  }

  updateCompetitionSelect();

  const matches = getFilteredMatches();

  if (els.matchesCount) {

    const label = matches.length === 1
      ? t("match")
      : t("matchesPlural");

    els.matchesCount.textContent =
      `${matches.length} ${label}`;

  }

  if (matches.length === 0) {

    renderState(
      "empty",
      t("noMatches"),
      t("noMatchesDescription")
    );

    return;

  }

  if (els.stateContainer) {

    els.stateContainer.classList.add("hidden");

    els.stateContainer.innerHTML = "";

  }

  const groups = new Map();

  matches.forEach(match => {

    const key = getCompetitionKey(match);

    if (!groups.has(key)) {

      groups.set(key, {

        league: match.league || t("unknown"),

        country: match.country || "",

        leagueLogo: match.leagueLogo || "",

        matches: []

      });

    }

    groups.get(key).matches.push(match);

  });

  const fragment = document.createDocumentFragment();

  groups.forEach(group => {

    const section = document.createElement("section");

    section.className = "league-group";

    const logo = group.leagueLogo &&
      isSafeMediaUrl(group.leagueLogo)
      ? `
        <img
          class="league-logo"
          src="${escapeHtml(group.leagueLogo)}"
          alt=""
          loading="lazy"
        >
      `
      : `<div class="league-logo-placeholder">🏆</div>`;

    section.innerHTML = `

      <div class="league-header">

        <div class="league-header-left">

          ${logo}

          <div class="league-title-content">

            <h3>${escapeHtml(group.league)}</h3>

            <span>${escapeHtml(group.country)}</span>

          </div>

        </div>

        <div class="league-header-right">

          <span>${group.matches.length} ${t("match")}</span>

          <span class="league-arrow">⌄</span>

        </div>

      </div>


      <div class="league-match-list"></div>

    `;

    const list = section.querySelector(".league-match-list");

    group.matches.forEach(match => {

      list.appendChild(createMatchCard(match));

    });

    fragment.appendChild(section);

  });

  els.matchesList.innerHTML = "";

  els.matchesList.appendChild(fragment);

}


/* =========================================================
   OPEN MATCH PLAYER
========================================================= */

function openMatch(match) {

  if (!els.watchModal) return;

  state.activeMatch = match;

  const category = getStatusCategory(match.status);

  const finished = category === "finished";

  const hasScore =
    match.homeGoals !== null &&
    match.homeGoals !== undefined &&
    match.awayGoals !== null &&
    match.awayGoals !== undefined;

  els.modalMatchTitle.textContent =
    `${match.home} vs ${match.away}`;

  els.modalMatchMeta.textContent = [
    match.country,
    match.league,
    match.round
  ].filter(Boolean).join(" • ");

  els.modalHomeName.textContent = match.home;

  els.modalAwayName.textContent = match.away;

  els.modalHomeLogo.src = match.homeLogo || "";

  els.modalAwayLogo.src = match.awayLogo || "";

  els.modalHomeLogo.classList.toggle("hidden", !match.homeLogo);

  els.modalAwayLogo.classList.toggle("hidden", !match.awayLogo);

  els.modalScore.textContent = hasScore
    ? `${match.homeGoals} : ${match.awayGoals}`
    : "- : -";

  els.modalStatusBadge.textContent = getStatusLabel(match);

  els.modalStatusBadge.className =
    `status-badge ${category === "live" ? "is-live" : category === "finished" ? "is-finished" : "is-upcoming"}`;

  els.playerModeBadge.textContent =
    finished ? t("replay") : t("stream");

  if (match.leagueLogo) {

    els.modalLeagueLogo.src = match.leagueLogo;

    els.modalLeagueLogo.classList.remove("hidden");

  } else {

    els.modalLeagueLogo.classList.add("hidden");

  }

  const media = resolveMedia(match);

  const targetUrl = media.url || media.officialUrl;

  els.toggleSourceBtn.classList.toggle(
    "hidden",
    !targetUrl
  );

  els.toggleSourceBtn.textContent =
    media.url ? t("openSource") : t("openChannel");

  els.toggleSourceBtn.onclick = () => {

    if (targetUrl && isSafeMediaUrl(targetUrl)) {

      window.open(
        targetUrl,
        "_blank",
        "noopener,noreferrer"
      );

    }

  };

  playMedia(media.url, media.label);

  els.watchModal.classList.remove("hidden");

  document.body.classList.add("modal-open");

}


/* =========================================================
   PLAYER ENGINE
========================================================= */

function playMedia(url, label) {

  state.activeMediaUrl = url || "";

  const video = els.matchReplayVideo;

  els.matchStreamFrame.classList.add("hidden");

  els.matchStreamFrame.src = "";

  video.pause();

  video.removeAttribute("src");

  video.classList.add("hidden");

  if (!url || !isSafeMediaUrl(url)) {

    els.playerPlaceholder.classList.remove("hidden");

    els.playerPlaceholderTitle.textContent = t("noStream");

    els.playerPlaceholderDesc.textContent =
      `${t("noStreamDescription")} ${t("sourceHelp")}`;

    els.modalExtraInfo.textContent =
      `Match ID: ${state.activeMatch?.id ?? "--"}`;

    return;

  }

  els.playerPlaceholder.classList.add("hidden");

  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {

    video.src = url;

    video.classList.remove("hidden");

    video.load();

    video.play().catch(() => {});

  } else {

    els.matchStreamFrame.src = url;

    els.matchStreamFrame.classList.remove("hidden");

  }

  els.modalExtraInfo.textContent =
    `${label} • Match ID: ${state.activeMatch?.id ?? "--"}`;

}


/* =========================================================
   CLOSE PLAYER
========================================================= */

function closePlayer() {

  state.activeMatch = null;

  state.activeMediaUrl = "";

  els.matchStreamFrame.src = "";

  els.matchStreamFrame.classList.add("hidden");

  els.matchReplayVideo.pause();

  els.matchReplayVideo.removeAttribute("src");

  els.matchReplayVideo.classList.add("hidden");

  els.watchModal.classList.add("hidden");

  document.body.classList.remove("modal-open");

}


/* =========================================================
   SEARCH AND FILTER ENGINE
========================================================= */

function getFilteredMatches(ignoreCompetition = false) {

  const query = state.searchQuery.trim().toLowerCase();

  return state.matches.filter(match => {

    const category = getStatusCategory(match.status);

    if (
      state.route === "live" &&
      category !== "live"
    ) {
      return false;
    }

    if (
      state.statusFilter !== "all" &&
      category !== state.statusFilter
    ) {
      return false;
    }

    if (!matchesFeaturedFilter(match, state.featuredFilter)) {
      return false;
    }

    if (
      !ignoreCompetition &&
      state.competitionFilter !== "__ALL__" &&
      getCompetitionKey(match) !== state.competitionFilter
    ) {
      return false;
    }

    if (query) {

      const haystack = [
        match.home,
        match.away,
        match.league,
        match.country
      ].join(" ").toLowerCase();

      if (!haystack.includes(query)) {
        return false;
      }

    }

    return true;

  });

}


/* =========================================================
   COMPETITION SELECT
========================================================= */

function updateCompetitionSelect() {

  if (!els.competitionSelect) return;

  const pool = getFilteredMatches(true);

  const counts = new Map();

  pool.forEach(match => {

    const key = getCompetitionKey(match);

    counts.set(key, (counts.get(key) || 0) + 1);

  });

  const entries = [...counts.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  );

  const previous = state.competitionFilter;

  els.competitionSelect.innerHTML = "";

  const allOption = document.createElement("option");

  allOption.value = "__ALL__";

  allOption.textContent =
    `${t("allCompetitions")} (${entries.length})`;

  els.competitionSelect.appendChild(allOption);

  entries.forEach(([key, count]) => {

    const option = document.createElement("option");

    option.value = key;

    option.textContent = `${key} (${count})`;

    els.competitionSelect.appendChild(option);

  });

  if (counts.has(previous)) {

    els.competitionSelect.value = previous;

  } else {

    state.competitionFilter = "__ALL__";

    els.competitionSelect.value = "__ALL__";

  }

}


/* =========================================================
   API FETCH
========================================================= */

async function fetchMatches(date) {

  const requestId = ++state.requestId;

  state.isLoading = true;

  state.errorMessage = "";

  renderMatches();

  try {

    const endpoint =
      `${ARENA_CONFIG.workerUrl}/?date=${encodeURIComponent(date)}`;

    const response = await fetch(endpoint, {

      method: "GET",

      headers: {
        Accept: "application/json"
      },

      cache: "no-store"

    });

    if (!response.ok) {

      throw new Error(`HTTP ${response.status}`);

    }

    const data = await response.json();

    if (!Array.isArray(data.matches)) {

      throw new Error(t("dataError"));

    }

    if (requestId !== state.requestId) return;

    state.matches = data.matches.map(match => ({

      ...match,

      id: match.id ?? null,

      status: String(match.status || "NS").toUpperCase(),

      home: match.home || t("home"),

      away: match.away || t("away"),

      league: match.league || t("unknown"),

      country: match.country || "",

      homeGoals: match.homeGoals ?? null,

      awayGoals: match.awayGoals ?? null,

      elapsed: match.elapsed ?? null

    }));

    state.quota = data.quota ?? null;

    state.lastUpdated = new Intl.DateTimeFormat(
      state.language === "ar" ? "ar-TN" : state.language === "fr" ? "fr-FR" : "en-GB",
      {
        timeZone: ARENA_CONFIG.timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }
    ).format(new Date());

    state.isLoading = false;

    state.errorMessage = "";

    renderMatches();

  } catch (error) {

    if (requestId !== state.requestId) return;

    console.error("ARENA LIVE ERROR:", error);

    state.isLoading = false;

    state.matches = [];

    state.errorMessage =
      error.message || t("connectionError");

    renderMatches();

  }

}


/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

  window.addEventListener("hashchange", () => {

    updateRoute();

    renderMatches();

  });


  if (els.themeBtn) {

    els.themeBtn.addEventListener("click", toggleTheme);

  }


  if (els.language) {

    els.language.addEventListener("change", event => {

      state.language = event.target.value;

      applyLanguage();

    });

  }


  if (els.prevDayBtn) {

    els.prevDayBtn.addEventListener("click", () => {

      state.selectedDate = shiftDate(state.selectedDate, -1);

      fetchMatches(state.selectedDate);

    });

  }


  if (els.nextDayBtn) {

    els.nextDayBtn.addEventListener("click", () => {

      state.selectedDate = shiftDate(state.selectedDate, 1);

      fetchMatches(state.selectedDate);

    });

  }


  if (els.todayBtn) {

    els.todayBtn.addEventListener("click", () => {

      state.selectedDate = getTodayDate();

      fetchMatches(state.selectedDate);

    });

  }


  if (els.datePicker) {

    els.datePicker.addEventListener("change", event => {

      if (!event.target.value) return;

      state.selectedDate = event.target.value;

      fetchMatches(state.selectedDate);

    });

  }


  if (els.searchInput) {

    els.searchInput.addEventListener("input", event => {

      state.searchQuery = event.target.value;

      els.clearSearchBtn.classList.toggle(
        "hidden",
        !state.searchQuery.trim()
      );

      renderMatches();

    });

  }


  if (els.clearSearchBtn) {

    els.clearSearchBtn.addEventListener("click", () => {

      state.searchQuery = "";

      els.searchInput.value = "";

      els.clearSearchBtn.classList.add("hidden");

      renderMatches();

    });

  }


  if (els.statusChips) {

    els.statusChips.addEventListener("click", event => {

      const chip = event.target.closest(".chip[data-status]");

      if (!chip) return;

      state.statusFilter = chip.dataset.status;

      updateStatusChips();

      renderMatches();

    });

  }


  if (els.featuredLeagueChips) {

    els.featuredLeagueChips.addEventListener("click", event => {

      const chip = event.target.closest(".chip[data-featured]");

      if (!chip) return;

      state.featuredFilter = chip.dataset.featured;

      els.featuredLeagueChips
        .querySelectorAll(".chip")
        .forEach(item => {

          item.classList.toggle("active", item === chip);

        });

      renderMatches();

    });

  }


  if (els.competitionSelect) {

    els.competitionSelect.addEventListener("change", event => {

      state.competitionFilter = event.target.value;

      renderMatches();

    });

  }


  if (els.closeModalBtn) {

    els.closeModalBtn.addEventListener("click", closePlayer);

  }


  if (els.watchModal) {

    els.watchModal.addEventListener("click", event => {

      if (event.target === els.watchModal) {

        closePlayer();

      }

    });

  }


  document.addEventListener("keydown", event => {

    if (
      event.key === "Escape" &&
      els.watchModal &&
      !els.watchModal.classList.contains("hidden")
    ) {

      closePlayer();

    }

  });

}


/* =========================================================
   AUTO REFRESH
========================================================= */

function startAutoRefresh() {

  setInterval(() => {

    if (document.hidden) return;

    if (state.isLoading) return;

    fetchMatches(state.selectedDate);

  }, ARENA_CONFIG.refreshInterval);

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeArena() {

  applyTheme();

  applyLanguage();

  updateRoute();

  bindEvents();

  renderOfficialSources();

  fetchMatches(state.selectedDate);

  startAutoRefresh();

  console.log(
    "%c ARENA LIVE 4.0 ",
    "background:#7054f7;color:white;padding:10px;font-weight:bold;"
  );

  console.log("ARENA LIVE initialized.");

}


initializeArena();
```
