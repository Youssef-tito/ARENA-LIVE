/* =========================================
   ARENA LIVE — APP.JS
   API-Sports + Cloudflare Worker
========================================= */

const WORKER_BASE_URL =
  "https://arena-live.youssefmehrzi666.workers.dev";

const REFRESH_INTERVAL = 60000;
const TIME_ZONE = "Africa/Tunis";

const LIVE_STATUSES = new Set([
  "1H", "2H", "HT", "ET", "P", "LIVE", "BT"
]);

const FINISHED_STATUSES = new Set([
  "FT", "AET", "PEN", "AWD", "WO", "ABD"
]);

const POSTPONED_STATUSES = new Set([
  "PST", "CANC", "SUSP", "INT", "TBD"
]);

/* =========================================
   STATE
========================================= */

const state = {
  route: getRouteFromHash(),
  selectedDate: getTodayIsoDate(),

  matches: [],
  quota: null,

  statusFilter: "all",
  featuredFilter: "all",
  competitionFilter: "__ALL__",
  searchQuery: "",

  isLoading: false,
  errorMessage: "",
  lastUpdated: "",

  activeMatch: null,
  activeMediaUrl: "",

  requestId: 0
};

/* =========================================
   DOM ELEMENTS
========================================= */

const els = {
  viewTitle: document.getElementById("viewTitle"),
  viewSubtitle: document.getElementById("viewSubtitle"),

  datePicker: document.getElementById("datePicker"),
  dateDisplay: document.getElementById("dateDisplay"),

  prevDayBtn: document.getElementById("prevDayBtn"),
  nextDayBtn: document.getElementById("nextDayBtn"),
  todayBtn: document.getElementById("todayBtn"),

  searchInput: document.getElementById("searchInput"),
  clearSearchBtn: document.getElementById("clearSearchBtn"),

  statusChips: document.getElementById("statusChips"),
  featuredLeagueChips: document.getElementById("featuredLeagueChips"),

  competitionSelect: document.getElementById("competitionSelect"),

  matchesCount: document.getElementById("matchesCount"),
  updatedTime: document.getElementById("updatedTime"),
  quotaBadge: document.getElementById("quotaBadge"),

  stateContainer: document.getElementById("stateContainer"),
  matchesList: document.getElementById("matchesList"),

  navLinks: Array.from(document.querySelectorAll(".nav-link")),

  watchModal: document.getElementById("watchModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),

  modalLeagueLogo: document.getElementById("modalLeagueLogo"),
  modalMatchTitle: document.getElementById("modalMatchTitle"),
  modalMatchMeta: document.getElementById("modalMatchMeta"),

  modalHomeLogo: document.getElementById("modalHomeLogo"),
  modalHomeName: document.getElementById("modalHomeName"),

  modalAwayLogo: document.getElementById("modalAwayLogo"),
  modalAwayName: document.getElementById("modalAwayName"),

  modalScore: document.getElementById("modalScore"),
  modalStatusBadge: document.getElementById("modalStatusBadge"),

  playerModeBadge: document.getElementById("playerModeBadge"),

  playerPlaceholder: document.getElementById("playerPlaceholder"),
  playerPlaceholderTitle: document.getElementById("playerPlaceholderTitle"),
  playerPlaceholderDesc: document.getElementById("playerPlaceholderDesc"),

  matchStreamFrame: document.getElementById("matchStreamFrame"),
  matchReplayVideo: document.getElementById("matchReplayVideo"),

  modalExtraInfo: document.getElementById("modalExtraInfo"),
  toggleSourceBtn: document.getElementById("toggleSourceBtn")
};

/* =========================================
   DATE FUNCTIONS
========================================= */

function getTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
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

function shiftIsoDate(isoDate, deltaDays) {
  const [year, month, day] = isoDate.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day + deltaDays)
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return "";

  const [year, month, day] = isoDate.split("-");

  return `${day}/${month}/${year}`;
}

function formatMatchTime(match) {
  if (
    typeof match.timestamp === "number" &&
    Number.isFinite(match.timestamp)
  ) {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(match.timestamp * 1000));
  }

  if (match.time && /^\d{2}:\d{2}$/.test(match.time)) {
    return match.time;
  }

  if (match.time) {
    const date = new Date(match.time);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("fr-FR", {
        timeZone: TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(date);
    }
  }

  return "--:--";
}

/* =========================================
   ROUTES
========================================= */

function getRouteFromHash() {
  const hash = (window.location.hash || "#matches").toLowerCase();

  if (hash.startsWith("#live")) return "live";
  if (hash.startsWith("#home")) return "home";

  return "matches";
}

function syncRouteUi() {
  state.route = getRouteFromHash();

  els.navLinks.forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.route === state.route
    );
  });

  if (state.route === "live") {
    els.viewTitle.textContent = "Live Matches";
    els.viewSubtitle.textContent =
      "Matches currently in play right now";

    state.statusFilter = "live";

  } else if (state.route === "home") {
    els.viewTitle.textContent = "ARENA LIVE Overview";
    els.viewSubtitle.textContent =
      "Today's featured fixtures across top leagues";

    state.statusFilter = "all";

  } else {
    els.viewTitle.textContent = "Matches";
    els.viewSubtitle.textContent =
      "Real-time fixtures, live scores, and competition filters";

    state.statusFilter = "all";
  }

  updateStatusChips();
}

function updateStatusChips() {
  if (!els.statusChips) return;

  els.statusChips.querySelectorAll(".chip").forEach(chip => {
    chip.classList.toggle(
      "active",
      chip.dataset.status === state.statusFilter
    );
  });
}

/* =========================================
   MATCH STATUS
========================================= */

function getStatusCategory(statusCode) {
  const code = String(statusCode || "").toUpperCase();

  if (LIVE_STATUSES.has(code)) {
    return "live";
  }

  if (FINISHED_STATUSES.has(code)) {
    return "finished";
  }

  if (POSTPONED_STATUSES.has(code)) {
    return "upcoming";
  }

  return "upcoming";
}

function getStatusLabel(match) {
  const code = String(match.status || "").toUpperCase();

  if (LIVE_STATUSES.has(code)) {
    return match.elapsed != null
      ? `${code} • ${match.elapsed}'`
      : code;
  }

  if (FINISHED_STATUSES.has(code)) {
    return code || "FT";
  }

  if (POSTPONED_STATUSES.has(code)) {
    return match.statusText || code;
  }

  return formatMatchTime(match);
}

/* =========================================
   LEAGUE FILTERS
========================================= */

function matchesFeaturedFilter(match, filterKey) {
  if (!filterKey || filterKey === "all") {
    return true;
  }

  const league = String(match.league || "").toLowerCase();
  const country = String(match.country || "").toLowerCase();

  switch (filterKey) {

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
        (league.includes("primera division") &&
        country.includes("spain"));

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
      return `${league} ${country}`.includes(filterKey);
  }
}

function getCompetitionKey(match) {
  const league = String(
    match.league || "Unknown League"
  ).trim();

  const country = String(
    match.country || ""
  ).trim();

  return `${country} — ${league}`;
}

/* =========================================
   MEDIA SOURCES
========================================= */

function pickChannelUrl(match) {
  const query = encodeURIComponent(
    `${match.home || ""} ${match.away || ""} ${match.league || ""}`.trim()
  );

  const league = String(match.league || "").toLowerCase();
  const country = String(match.country || "").toLowerCase();

  if (
    country.includes("england") ||
    country.includes("uk") ||
    country.includes("scotland")
  ) {
    return `https://www.bbc.co.uk/search?q=${query}`;
  }

  if (
    league.includes("champions league") ||
    league.includes("europa league") ||
    league.includes("uefa")
  ) {
    return `https://www.uefa.com/search/?q=${query}`;
  }

  if (
    league.includes("world cup") ||
    league.includes("fifa")
  ) {
    return `https://www.fifa.com/en/search?q=${query}`;
  }

  return `https://www.youtube.com/results?search_query=${query}`;
}

function isSafeMediaUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function resolveAutomaticMedia(match) {
  if (!match) {
    return {
      url: "",
      label: "Stream",
      channelUrl: ""
    };
  }

  const isFinished =
    getStatusCategory(match.status) === "finished";

  const idKey = String(match.id ?? "");

  const pairKey =
    `${String(match.home || "").toLowerCase()} vs ` +
    `${String(match.away || "").toLowerCase()}`;

  const channelUrl = pickChannelUrl(match);

  const directField = isFinished
    ? match.replayUrl || match.embedUrl || ""
    : match.streamUrl || match.embedUrl || "";

  if (
    typeof directField === "string" &&
    directField.trim() &&
    isSafeMediaUrl(directField.trim())
  ) {
    return {
      url: directField.trim(),
      label: isFinished ? "Replay" : "Live Stream",
      channelUrl
    };
  }

  const replayMap = window.ARENA_REPLAYS || {};
  const streamMap = window.ARENA_STREAMS || {};

  if (isFinished) {
    if (replayMap[idKey]) {
      return {
        url: replayMap[idKey],
        label: "Replay",
        channelUrl
      };
    }

    if (replayMap[pairKey]) {
      return {
        url: replayMap[pairKey],
        label: "Replay",
        channelUrl
      };
    }

  } else {

    if (streamMap[idKey]) {
      return {
        url: streamMap[idKey],
        label: "Live Stream",
        channelUrl
      };
    }

    if (streamMap[pairKey]) {
      return {
        url: streamMap[pairKey],
        label: "Live Stream",
        channelUrl
      };
    }
  }

  const rules = Array.isArray(window.ARENA_SOURCE_RULES)
    ? window.ARENA_SOURCE_RULES
    : [];

  const haystack = (
    `${match.home || ""} ${match.away || ""} ` +
    `${match.league || ""} ${match.country || ""}`
  ).toLowerCase();

  for (const rule of rules) {
    if (!rule || !rule.match || !rule.url) continue;

    if (
      haystack.includes(String(rule.match).toLowerCase()) &&
      isSafeMediaUrl(String(rule.url))
    ) {
      return {
        url: String(rule.url).trim(),
        label: "Official Source",
        channelUrl
      };
    }
  }

  return {
    url: "",
    label: isFinished ? "Replay" : "Stream",
    channelUrl
  };
}

/* =========================================
   FILTER MATCHES
========================================= */

function getFilteredMatches(excludeCompetition = false) {
  const q = state.searchQuery.trim().toLowerCase();

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

    if (
      !matchesFeaturedFilter(match, state.featuredFilter)
    ) {
      return false;
    }

    if (
      !excludeCompetition &&
      state.competitionFilter !== "__ALL__"
    ) {
      if (
        getCompetitionKey(match) !== state.competitionFilter
      ) {
        return false;
      }
    }

    if (q) {
      const haystack = (
        `${match.home || ""} ${match.away || ""} ` +
        `${match.league || ""} ${match.country || ""}`
      ).toLowerCase();

      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

/* =========================================
   COMPETITION SELECT
========================================= */

function syncCompetitionSelect() {
  const pool = getFilteredMatches(true);
  const counts = new Map();

  pool.forEach(match => {
    const key = getCompetitionKey(match);

    counts.set(
      key,
      (counts.get(key) || 0) + 1
    );
  });

  const sortedEntries = Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const previousSelection = state.competitionFilter;

  els.competitionSelect.innerHTML =
    `<option value="__ALL__">All competitions (${sortedEntries.length})</option>`;

  sortedEntries.forEach(([key, count]) => {
    const option = document.createElement("option");

    option.value = key;
    option.textContent = `${key} (${count})`;

    els.competitionSelect.appendChild(option);
  });

  if (counts.has(previousSelection)) {
    els.competitionSelect.value = previousSelection;
  } else {
    state.competitionFilter = "__ALL__";
    els.competitionSelect.value = "__ALL__";
  }
}

/* =========================================
   HTML SECURITY
========================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* =========================================
   PLAYER
========================================= */

function isDirectVideoFile(url) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function playMediaUrl(rawUrl, sourceLabel = "Stream") {
  const url = String(rawUrl || "").trim();

  const match = state.activeMatch;
  const video = els.matchReplayVideo;

  state.activeMediaUrl = url;

  els.matchStreamFrame.classList.add("hidden");
  els.matchStreamFrame.src = "";

  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.classList.add("hidden");
  }

  if (!url || !isSafeMediaUrl(url)) {
    els.playerPlaceholder.classList.remove("hidden");

    els.playerPlaceholderTitle.textContent =
      "No stream available for this match yet";

    els.playerPlaceholderDesc.textContent =
      "No authorized video source has been configured for this match. Use Open Channel to check official sources.";

    els.modalExtraInfo.textContent =
      `Match ID: ${match?.id ?? "-"} • Date: ${state.selectedDate}`;

    return;
  }

  els.playerPlaceholder.classList.add("hidden");

  if (isDirectVideoFile(url) && video) {
    video.classList.remove("hidden");

    video.src = url;
    video.autoplay = true;
    video.controls = true;

    video.load();

    video.play().catch(() => {
      video.controls = true;
    });

    els.modalExtraInfo.textContent =
      `${sourceLabel} • Match ID: ${match?.id ?? "-"}`;

  } else {
    els.matchStreamFrame.classList.remove("hidden");

    els.matchStreamFrame.src = url;

    els.matchExtraInfo &&
      (els.matchExtraInfo.textContent = sourceLabel);

    els.modalExtraInfo.textContent =
      `${sourceLabel} • Match ID: ${match?.id ?? "-"}`;
  }
}

/* =========================================
   OPEN MATCH
========================================= */

function openWatchModal(match) {
  state.activeMatch = match;

  const category = getStatusCategory(match.status);
  const isFinished = category === "finished";

  const hasScore =
    match.homeGoals !== null &&
    match.homeGoals !== undefined &&
    match.awayGoals !== null &&
    match.awayGoals !== undefined;

  els.modalMatchTitle.textContent =
    `${match.home || "Home"} vs ${match.away || "Away"}`;

  els.modalMatchMeta.textContent = [
    match.country,
    match.league,
    match.round
  ].filter(Boolean).join(" • ");

  if (match.leagueLogo) {
    els.modalLeagueLogo.src = match.leagueLogo;
    els.modalLeagueLogo.classList.remove("hidden");
  } else {
    els.modalLeagueLogo.classList.add("hidden");
  }

  els.modalHomeName.textContent = match.home || "Home";
  els.modalAwayName.textContent = match.away || "Away";

  if (match.homeLogo) {
    els.modalHomeLogo.src = match.homeLogo;
    els.modalHomeLogo.classList.remove("hidden");
  } else {
    els.modalHomeLogo.classList.add("hidden");
  }

  if (match.awayLogo) {
    els.modalAwayLogo.src = match.awayLogo;
    els.modalAwayLogo.classList.remove("hidden");
  } else {
    els.modalAwayLogo.classList.add("hidden");
  }

  els.modalScore.textContent = hasScore
    ? `${match.homeGoals} : ${match.awayGoals}`
    : "- : -";

  els.modalStatusBadge.className =
    "status-badge " +
    (
      category === "live"
        ? "is-live"
        : isFinished
          ? "is-finished"
          : "is-upcoming"
    );

  els.modalStatusBadge.textContent =
    getStatusLabel(match);

  els.playerModeBadge.textContent =
    isFinished ? "REPLAY" : "LIVE";

  const picked = resolveAutomaticMedia(match);

  const targetUrl = picked.url || picked.channelUrl;

  els.toggleSourceBtn.classList.toggle(
    "hidden",
    !targetUrl
  );

  els.toggleSourceBtn.textContent =
    picked.url ? "Open Source" : "Open Channel";

  els.toggleSourceBtn.onclick = () => {
    if (targetUrl && isSafeMediaUrl(targetUrl)) {
      window.open(
        targetUrl,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  playMediaUrl(picked.url, picked.label);

  els.watchModal.classList.remove("hidden");

  document.body.classList.add("modal-open");
}

/* =========================================
   CLOSE PLAYER
========================================= */

function closeWatchModal() {
  state.activeMatch = null;
  state.activeMediaUrl = "";

  els.matchStreamFrame.src = "";
  els.matchStreamFrame.classList.add("hidden");

  if (els.matchReplayVideo) {
    els.matchReplayVideo.pause();
    els.matchReplayVideo.removeAttribute("src");
    els.matchReplayVideo.classList.add("hidden");
  }

  els.watchModal.classList.add("hidden");

  document.body.classList.remove("modal-open");
}

/* =========================================
   LOADING / ERROR STATES
========================================= */

function renderStateBox(
  type,
  title,
  description,
  showRetry = false
) {
  els.stateContainer.classList.remove("hidden");
  els.matchesList.innerHTML = "";

  if (type === "loading") {
    els.stateContainer.innerHTML = `
      <div class="spinner" aria-hidden="true"></div>

      <div class="state-title">
        ${escapeHtml(title)}
      </div>

      <div class="state-desc">
        ${escapeHtml(description)}
      </div>
    `;

    return;
  }

  els.stateContainer.innerHTML = `
    <div class="state-title">
      ${escapeHtml(title)}
    </div>

    <div class="state-desc">
      ${escapeHtml(description)}
    </div>

    ${
      showRetry
        ? `<button type="button" class="btn-secondary" id="retryFetchBtn">Retry</button>`
        : ""
    }
  `;

  const retryBtn = document.getElementById("retryFetchBtn");

  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      fetchMatchesForDate(state.selectedDate);
    });
  }
}

/* =========================================
   RENDER MATCHES
========================================= */

function renderMatches() {
  els.datePicker.value = state.selectedDate;

  els.dateDisplay.textContent =
    formatDisplayDate(state.selectedDate);

  els.quotaBadge.textContent =
    state.quota !== null
      ? `Quota: ${state.quota}`
      : "Quota: --";

  els.updatedTime.textContent =
    state.lastUpdated
      ? `Updated ${state.lastUpdated}`
      : "Updated --:--";

  if (state.isLoading) {
    els.matchesCount.textContent = "Loading...";

    renderStateBox(
      "loading",
      "Loading matches...",
      `Fetching fixtures for ${state.selectedDate}`
    );

    return;
  }

  if (state.errorMessage) {
    els.matchesCount.textContent = "0 matches";

    els.competitionSelect.innerHTML =
      `<option value="__ALL__">All competitions (0)</option>`;

    renderStateBox(
      "error",
      "Unable to load matches",
      state.errorMessage,
      true
    );

    return;
  }

  syncCompetitionSelect();

  const visibleMatches = getFilteredMatches(false);

  els.matchesCount.textContent =
    `${visibleMatches.length} ${
      visibleMatches.length === 1 ? "match" : "matches"
    }`;

  if (visibleMatches.length === 0) {
    renderStateBox(
      "empty",
      "No match found",
      "Try another date or change your filters."
    );

    return;
  }

  els.stateContainer.classList.add("hidden");
  els.stateContainer.innerHTML = "";

  /* Group matches by competition */

  const grouped = new Map();

  for (const match of visibleMatches) {
    const key = getCompetitionKey(match);

    if (!grouped.has(key)) {
      grouped.set(key, {
        league: match.league || "Unknown League",
        country: match.country || "",
        leagueLogo: match.leagueLogo || "",
        round: match.round || "",
        items: []
      });
    }

    grouped.get(key).items.push(match);
  }

  const fragment = document.createDocumentFragment();

  for (const group of grouped.values()) {
    const section = document.createElement("article");

    section.className = "league-group";

    const leagueLogoHtml = group.leagueLogo
      ? `
        <img
          class="league-logo"
          src="${escapeHtml(group.leagueLogo)}"
          alt=""
          loading="lazy"
          onerror="this.style.display='none'"
        />
      `
      : "";

    const metaParts = [
      group.country,
      group.round
    ].filter(Boolean).join(" • ");

    section.innerHTML = `
      <div class="league-header">

        <div class="league-info">
          ${leagueLogoHtml}

          <div class="league-text">
            <span class="league-name">
              ${escapeHtml(group.league)}
            </span>

            ${
              metaParts
                ? `<span class="league-meta">${escapeHtml(metaParts)}</span>`
                : ""
            }
          </div>
        </div>

        <span class="league-count">
          ${group.items.length}
        </span>

      </div>

      <div class="league-matches"></div>
    `;

    const listContainer =
      section.querySelector(".league-matches");

    for (const match of group.items) {
      const category = getStatusCategory(match.status);

      const badgeClass =
        category === "live"
          ? "status-badge is-live"
          : category === "finished"
            ? "status-badge is-finished"
            : "status-badge is-upcoming";

      const badgeText = getStatusLabel(match);

      const elapsedText =
        category === "live" &&
        match.elapsed !== null &&
        match.elapsed !== undefined
          ? `${match.elapsed}'`
          : "";

      const hasScore =
        match.homeGoals !== null &&
        match.homeGoals !== undefined &&
        match.awayGoals !== null &&
        match.awayGoals !== undefined;

      const homeScore = hasScore
        ? String(match.homeGoals)
        : "-";

      const awayScore = hasScore
        ? String(match.awayGoals)
        : "-";

      const homeLogoHtml = match.homeLogo
        ? `
          <img
            class="team-logo"
            src="${escapeHtml(match.homeLogo)}"
            alt=""
            loading="lazy"
            onerror="this.style.display='none'"
          />
        `
        : "";

      const awayLogoHtml = match.awayLogo
        ? `
          <img
            class="team-logo"
            src="${escapeHtml(match.awayLogo)}"
            alt=""
            loading="lazy"
            onerror="this.style.display='none'"
          />
        `
        : "";

      const row = document.createElement("div");

      row.className = "match-row";

      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");

      row.innerHTML = `
        <div class="match-status-box">

          <span class="${badgeClass}">
            ${escapeHtml(badgeText)}
          </span>

          ${
            elapsedText
              ? `<span class="match-elapsed">${escapeHtml(elapsedText)}</span>`
              : ""
          }

        </div>

        <div class="team-cell home">

          <span
            class="team-name"
            title="${escapeHtml(match.home)}"
          >
            ${escapeHtml(match.home || "Home")}
          </span>

          ${homeLogoHtml}

        </div>

        <div class="score-box ${category === "live" ? "is-live" : ""}">

          <span>${escapeHtml(homeScore)}</span>

          <span class="score-sep">:</span>

          <span>${escapeHtml(awayScore)}</span>

        </div>

        <div class="team-cell away">

          ${awayLogoHtml}

          <span
            class="team-name"
            title="${escapeHtml(match.away)}"
          >
            ${escapeHtml(match.away || "Away")}
          </span>

        </div>

        <span class="match-open-hint" aria-hidden="true">
          ▶
        </span>
      `;

      row.addEventListener("click", () => {
        openWatchModal(match);
      });

      row.addEventListener("keydown", event => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          openWatchModal(match);
        }
      });

      listContainer.appendChild(row);
    }

    fragment.appendChild(section);
  }

  els.matchesList.innerHTML = "";

  els.matchesList.appendChild(fragment);
}

/* =========================================
   FETCH API
========================================= */

async function fetchMatchesForDate(isoDate) {
  const currentRequest = ++state.requestId;

  state.isLoading = true;
  state.errorMessage = "";

  renderMatches();

  try {
    const endpoint =
      `${WORKER_BASE_URL}/?date=${encodeURIComponent(isoDate)}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("Worker returned an invalid JSON response.");
    }

    if (!response.ok || data.error) {
      throw new Error(
        data.error || `HTTP Error ${response.status}`
      );
    }

    if (!Array.isArray(data.matches)) {
      throw new Error("Invalid API response: matches array not found.");
    }

    /* Ignore old requests */

    if (currentRequest !== state.requestId) {
      return;
    }

    state.matches = data.matches.map(match => ({
      ...match,

      id: match.id ?? null,

      status: String(match.status || "NS").toUpperCase(),

      home: match.home || "Home",
      away: match.away || "Away",

      league: match.league || "Unknown League",
      country: match.country || "",

      homeGoals: match.homeGoals ?? null,
      awayGoals: match.awayGoals ?? null,

      elapsed: match.elapsed ?? null
    }));

    state.quota = data.quota ?? null;

    const now = new Date();

    state.lastUpdated = new Intl.DateTimeFormat("fr-FR", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);

    state.isLoading = false;
    state.errorMessage = "";

    renderMatches();

  } catch (error) {

    if (currentRequest !== state.requestId) {
      return;
    }

    console.error("ARENA LIVE API ERROR:", error);

    state.matches = [];
    state.isLoading = false;

    state.errorMessage =
      error.message ||
      "Network or CORS error while contacting Worker.";

    renderMatches();
  }
}

/* =========================================
   EVENTS
========================================= */

function bindEvents() {

  /* Navigation */

  window.addEventListener("hashchange", () => {
    syncRouteUi();
    renderMatches();
  });

  /* Previous day */

  els.prevDayBtn.addEventListener("click", () => {
    state.selectedDate = shiftIsoDate(
      state.selectedDate,
      -1
    );

    fetchMatchesForDate(state.selectedDate);
  });

  /* Next day */

  els.nextDayBtn.addEventListener("click", () => {
    state.selectedDate = shiftIsoDate(
      state.selectedDate,
      1
    );

    fetchMatchesForDate(state.selectedDate);
  });

  /* Today */

  els.todayBtn.addEventListener("click", () => {
    state.selectedDate = getTodayIsoDate();

    fetchMatchesForDate(state.selectedDate);
  });

  /* Date picker */

  els.datePicker.addEventListener("change", event => {
    if (!event.target.value) return;

    state.selectedDate = event.target.value;

    fetchMatchesForDate(state.selectedDate);
  });

  /* Search */

  els.searchInput.addEventListener("input", event => {
    state.searchQuery = event.target.value;

    els.clearSearchBtn.classList.toggle(
      "hidden",
      !state.searchQuery.trim()
    );

    renderMatches();
  });

  /* Clear search */

  els.clearSearchBtn.addEventListener("click", () => {
    state.searchQuery = "";

    els.searchInput.value = "";

    els.clearSearchBtn.classList.add("hidden");

    renderMatches();
  });

  /* Status filters */

  els.statusChips.addEventListener("click", event => {
    const chip = event.target.closest(".chip[data-status]");

    if (!chip) return;

    state.statusFilter = chip.dataset.status;

    updateStatusChips();

    renderMatches();
  });

  /* Featured leagues */

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

  /* Competition select */

  els.competitionSelect.addEventListener("change", event => {
    state.competitionFilter = event.target.value;

    renderMatches();
  });

  /* Close modal */

  els.closeModalBtn.addEventListener("click", closeWatchModal);

  els.watchModal.addEventListener("click", event => {
    if (event.target === els.watchModal) {
      closeWatchModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (
      event.key === "Escape" &&
      !els.watchModal.classList.contains("hidden")
    ) {
      closeWatchModal();
    }
  });
}

/* =========================================
   AUTO REFRESH
========================================= */

function startAutoRefresh() {
  setInterval(() => {

    if (document.hidden) return;

    if (state.isLoading) return;

    fetchMatchesForDate(state.selectedDate);

  }, REFRESH_INTERVAL);
}

/* =========================================
   INITIALIZATION
========================================= */

function initializeArenaLive() {

  syncRouteUi();

  bindEvents();

  fetchMatchesForDate(state.selectedDate);

  startAutoRefresh();

  console.log(
    "%c ARENA LIVE ",
    "background:#7054f7;color:white;padding:8px;font-weight:bold;"
  );

  console.log("ARENA LIVE initialized successfully.");
}

initializeArenaLive();
