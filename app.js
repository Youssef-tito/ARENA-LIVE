const WORKER_BASE_URL = "https://arena-live.youssefmehrzi666.workers.dev";
const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "P", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO", "ABD", "CANC", "PST"]);

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
  activeMatch: null
};

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
  playerPlaceholder: document.getElementById("playerPlaceholder"),
  playerPlaceholderTitle: document.getElementById("playerPlaceholderTitle"),
  playerPlaceholderDesc: document.getElementById("playerPlaceholderDesc"),
  modalActions: document.getElementById("modalActions"),
  matchStreamFrame: document.getElementById("matchStreamFrame"),
  modalExtraInfo: document.getElementById("modalExtraInfo"),
  toggleSourceBtn: document.getElementById("toggleSourceBtn")
};

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftIsoDate(isoDate, deltaDays) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

function getRouteFromHash() {
  const hash = (window.location.hash || "#matches").toLowerCase();
  if (hash.startsWith("#live")) return "live";
  if (hash.startsWith("#home")) return "home";
  return "matches";
}

function getStatusCategory(statusCode) {
  const code = String(statusCode || "").toUpperCase();
  if (LIVE_STATUSES.has(code)) return "live";
  if (FINISHED_STATUSES.has(code)) return "finished";
  return "upcoming";
}

function matchesFeaturedFilter(match, filterKey) {
  if (!filterKey || filterKey === "all") return true;

  const league = String(match.league || "").toLowerCase();
  const country = String(match.country || "").toLowerCase();
  const combined = `${league} ${country}`;

  switch (filterKey) {
    case "tunisia":
      return country.includes("tunisia") || league.includes("tunisia") || (league.includes("ligue 1") && country.includes("tunisia"));
    case "ucl":
      return league.includes("champions league") && !league.includes("afc") && !league.includes("concacaf");
    case "uel":
      return league.includes("europa league");
    case "epl":
      return league.includes("premier league") && (country.includes("england") || country.includes("uk"));
    case "laliga":
      return league.includes("la liga") || (league.includes("primera division") && country.includes("spain"));
    case "seriea":
      return league.includes("serie a") && country.includes("italy");
    case "bundesliga":
      return league.includes("bundesliga") && country.includes("germany");
    case "ligue1":
      return league.includes("ligue 1") && country.includes("france");
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
      return combined.includes(filterKey);
  }
}

function getCompetitionKey(match) {
  const league = String(match.league || "Unknown League").trim();
  const country = String(match.country || "").trim();
  return `${country} — ${league}`;
}

function resolveStreamUrl(match) {
  if (!match) return "";
  if (typeof match.streamUrl === "string" && match.streamUrl.trim()) {
    return match.streamUrl.trim();
  }
  if (typeof match.embedUrl === "string" && match.embedUrl.trim()) {
    return match.embedUrl.trim();
  }
  const customMap = window.ARENA_STREAMS || {};
  if (match.id !== undefined && customMap[String(match.id)]) {
    return String(customMap[String(match.id)]).trim();
  }
  const pairKey = `${String(match.home || "").toLowerCase()} vs ${String(match.away || "").toLowerCase()}`;
  if (customMap[pairKey]) {
    return String(customMap[pairKey]).trim();
  }
  return "";
}

function getFilteredMatches(excludeCompetition = false) {
  const q = state.searchQuery.trim().toLowerCase();

  return state.matches.filter((match) => {
    const category = getStatusCategory(match.status);

    if (state.route === "live" && category !== "live") {
      return false;
    }

    if (state.statusFilter !== "all" && category !== state.statusFilter) {
      return false;
    }

    if (!matchesFeaturedFilter(match, state.featuredFilter)) {
      return false;
    }

    if (!excludeCompetition && state.competitionFilter !== "__ALL__") {
      if (getCompetitionKey(match) !== state.competitionFilter) {
        return false;
      }
    }

    if (q) {
      const haystack = `${match.home || ""} ${match.away || ""} ${match.league || ""} ${match.country || ""}`.toLowerCase();
      if (!haystack.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

function syncRouteUi() {
  state.route = getRouteFromHash();
  els.navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === state.route);
  });

  if (state.route === "live") {
    els.viewTitle.textContent = "Live Matches";
    els.viewSubtitle.textContent = "Matches currently in play right now";
    state.statusFilter = "live";
  } else if (state.route === "home") {
    els.viewTitle.textContent = "ARENA LIVE Overview";
    els.viewSubtitle.textContent = "Today's featured fixtures across top leagues";
  } else {
    els.viewTitle.textContent = "Matches";
    els.viewSubtitle.textContent = "Real-time fixtures, live scores, and competition filters";
  }

  Array.from(els.statusChips.querySelectorAll(".chip")).forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.status === state.statusFilter);
  });
}

function syncCompetitionSelect() {
  const pool = getFilteredMatches(true);
  const counts = new Map();

  for (const m of pool) {
    const key = getCompetitionKey(m);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const sortedEntries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const totalOptions = sortedEntries.length;

  const previousSelection = state.competitionFilter;
  els.competitionSelect.innerHTML = `<option value="__ALL__">All competitions (${totalOptions})</option>`;

  for (const [compKey, count] of sortedEntries) {
    const opt = document.createElement("option");
    opt.value = compKey;
    opt.textContent = `${compKey} (${count})`;
    els.competitionSelect.appendChild(opt);
  }

  if (previousSelection !== "__ALL__" && counts.has(previousSelection)) {
    els.competitionSelect.value = previousSelection;
  } else {
    state.competitionFilter = "__ALL__";
    els.competitionSelect.value = "__ALL__";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openWatchModal(match) {
  state.activeMatch = match;

  const cat = getStatusCategory(match.status);
  const hasScore =
    match.homeGoals !== null &&
    match.homeGoals !== undefined &&
    match.awayGoals !== null &&
    match.awayGoals !== undefined;

  els.modalMatchTitle.textContent = `${match.home || "Home"} vs ${match.away || "Away"}`;
  els.modalMatchMeta.textContent = [match.country, match.league, match.round].filter(Boolean).join(" • ");

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

  els.modalScore.textContent = hasScore ? `${match.homeGoals} : ${match.awayGoals}` : "- : -";
  els.modalStatusBadge.className = `status-badge ${
    cat === "live" ? "is-live" : cat === "finished" ? "is-finished" : "is-upcoming"
  }`;
  els.modalStatusBadge.textContent =
    cat === "live" && match.elapsed ? `${match.status} • ${match.elapsed}'` : (match.statusText || match.status || "NS");

  const searchQuery = encodeURIComponent(`${match.home || ""} vs ${match.away || ""} ${match.league || ""}`);
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${searchQuery}+highlights`;
  const webSearchUrl = `https://www.google.com/search?q=${searchQuery}+watch+live+broadcast`;

  els.toggleSourceBtn.onclick = () => {
    window.open(webSearchUrl, "_blank", "noopener,noreferrer");
  };

  const streamUrl = resolveStreamUrl(match);
  els.modalActions.innerHTML = `
    <a class="btn-secondary" href="${youtubeSearchUrl}" target="_blank" rel="noopener noreferrer">YouTube Highlights</a>
    <a class="btn-secondary" href="${webSearchUrl}" target="_blank" rel="noopener noreferrer">Official Coverage</a>
  `;

  if (streamUrl) {
    els.playerPlaceholder.classList.add("hidden");
    els.matchStreamFrame.classList.remove("hidden");
    els.matchStreamFrame.src = streamUrl;
    els.modalExtraInfo.textContent = `Stream source connected • Match ID: ${match.id ?? "-"}`;
  } else {
    els.matchStreamFrame.classList.add("hidden");
    els.matchStreamFrame.src = "";
    els.playerPlaceholder.classList.remove("hidden");
    els.playerPlaceholderTitle.textContent = "No video stream attached for this match";
    els.playerPlaceholderDesc.textContent =
      "Your current API returns match scores and fixtures. Add a stream URL in config.js (window.ARENA_STREAMS) to embed a player here, or use official links below.";
    els.modalExtraInfo.textContent = `Match ID: ${match.id ?? "-"} • Date: ${state.selectedDate}`;
  }

  els.watchModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeWatchModal() {
  state.activeMatch = null;
  els.matchStreamFrame.src = "";
  els.matchStreamFrame.classList.add("hidden");
  els.watchModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function renderStateBox(type, title, description, showRetry = false) {
  els.stateContainer.classList.remove("hidden");
  els.matchesList.innerHTML = "";

  if (type === "loading") {
    els.stateContainer.innerHTML = `
      <div class="spinner" aria-hidden="true"></div>
      <div class="state-title">${escapeHtml(title)}</div>
      <div class="state-desc">${escapeHtml(description)}</div>
    `;
    return;
  }

  els.stateContainer.innerHTML = `
    <div class="state-title">${escapeHtml(title)}</div>
    <div class="state-desc">${escapeHtml(description)}</div>
    ${showRetry ? `<button type="button" class="btn-secondary" id="retryFetchBtn">Retry</button>` : ""}
  `;

  const retryBtn = document.getElementById("retryFetchBtn");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => fetchMatchesForDate(state.selectedDate));
  }
}

function renderMatches() {
  els.datePicker.value = state.selectedDate;
  els.dateDisplay.textContent = formatDisplayDate(state.selectedDate);
  els.quotaBadge.textContent = state.quota !== null ? `Quota: ${state.quota}` : "Quota: --";
  els.updatedTime.textContent = state.lastUpdated ? `Updated ${state.lastUpdated}` : "Updated --:--";

  if (state.isLoading) {
    els.matchesCount.textContent = "Loading...";
    renderStateBox("loading", "Loading matches...", `Fetching fixtures for ${state.selectedDate}`);
    return;
  }

  if (state.errorMessage) {
    els.matchesCount.textContent = "0 matches";
    els.competitionSelect.innerHTML = `<option value="__ALL__">All competitions (0)</option>`;
    renderStateBox("error", "Unable to load matches", state.errorMessage, true);
    return;
  }

  syncCompetitionSelect();
  const visibleMatches = getFilteredMatches(false);
  els.matchesCount.textContent = `${visibleMatches.length} ${visibleMatches.length === 1 ? "match" : "matches"}`;

  if (visibleMatches.length === 0) {
    renderStateBox(
      "empty",
      "No match found. Try another day or another filter.",
      "No fixtures matched your current date, status, league, or search query."
    );
    return;
  }

  els.stateContainer.classList.add("hidden");
  els.stateContainer.innerHTML = "";

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
      ? `<img class="league-logo" src="${escapeHtml(group.leagueLogo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
      : "";

    const metaParts = [group.country, group.round].filter(Boolean).join(" • ");

    section.innerHTML = `
      <div class="league-header">
        <div class="league-info">
          ${leagueLogoHtml}
          <div class="league-text">
            <span class="league-name">${escapeHtml(group.league)}</span>
            ${metaParts ? `<span class="league-meta">${escapeHtml(metaParts)}</span>` : ""}
          </div>
        </div>
        <span class="league-count">${group.items.length}</span>
      </div>
      <div class="league-matches"></div>
    `;

    const listContainer = section.querySelector(".league-matches");

    for (const m of group.items) {
      const cat = getStatusCategory(m.status);
      const badgeClass =
        cat === "live" ? "status-badge is-live" : cat === "finished" ? "status-badge is-finished" : "status-badge is-upcoming";

      const badgeText = cat === "live"
        ? (m.status || "LIVE")
        : cat === "finished"
          ? (m.status || "FT")
          : (m.time || m.status || "NS");

      const elapsedText =
        cat === "live" && m.elapsed !== null && m.elapsed !== undefined
          ? `${m.elapsed}'`
          : (m.statusText || "");

      const hasScore = m.homeGoals !== null && m.homeGoals !== undefined && m.awayGoals !== null && m.awayGoals !== undefined;
      const homeScoreDisplay = hasScore ? String(m.homeGoals) : "-";
      const awayScoreDisplay = hasScore ? String(m.awayGoals) : "-";

      const homeLogoHtml = m.homeLogo
        ? `<img class="team-logo" src="${escapeHtml(m.homeLogo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
        : "";
      const awayLogoHtml = m.awayLogo
        ? `<img class="team-logo" src="${escapeHtml(m.awayLogo)}" alt="" loading="lazy" onerror="this.style.display='none'" />`
        : "";

      const row = document.createElement("div");
      row.className = "match-row";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.innerHTML = `
        <div class="match-status-box">
          <span class="${badgeClass}">${escapeHtml(badgeText)}</span>
          ${elapsedText ? `<span class="match-elapsed">${escapeHtml(elapsedText)}</span>` : ""}
        </div>

        <div class="team-cell home">
          <span class="team-name" title="${escapeHtml(m.home)}">${escapeHtml(m.home || "Home")}</span>
          ${homeLogoHtml}
        </div>

        <div class="score-box ${cat === "live" ? "is-live" : ""}">
          <span>${escapeHtml(homeScoreDisplay)}</span>
          <span class="score-sep">:</span>
          <span>${escapeHtml(awayScoreDisplay)}</span>
        </div>

        <div class="team-cell away">
          ${awayLogoHtml}
          <span class="team-name" title="${escapeHtml(m.away)}">${escapeHtml(m.away || "Away")}</span>
        </div>

        <span class="match-open-hint" aria-hidden="true">▶</span>
      `;

      row.addEventListener("click", () => openWatchModal(m));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openWatchModal(m);
        }
      });

      listContainer.appendChild(row);
    }

    fragment.appendChild(section);
  }

  els.matchesList.innerHTML = "";
  els.matchesList.appendChild(fragment);
}

async function fetchMatchesForDate(isoDate) {
  state.isLoading = true;
  state.errorMessage = "";
  renderMatches();

  try {
    const endpoint = `${WORKER_BASE_URL}/?date=${encodeURIComponent(isoDate)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    state.matches = Array.isArray(data.matches) ? data.matches : [];
    state.quota = data.quota ?? null;

    const now = new Date();
    state.lastUpdated = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    state.isLoading = false;
    renderMatches();
  } catch (err) {
    state.matches = [];
    state.isLoading = false;
    state.errorMessage = err?.message || "Network or CORS error while contacting Worker.";
    renderMatches();
  }
}

function bindEvents() {
  window.addEventListener("hashchange", () => {
    syncRouteUi();
    renderMatches();
  });

  els.prevDayBtn.addEventListener("click", () => {
    state.selectedDate = shiftIsoDate(state.selectedDate, -1);
    fetchMatchesForDate(state.selectedDate);
  });

  els.nextDayBtn.addEventListener("click", () => {
    state.selectedDate = shiftIsoDate(state.selectedDate, 1);
    fetchMatchesForDate(state.selectedDate);
  });

  els.todayBtn.addEventListener("click", () => {
    state.selectedDate = getTodayIsoDate();
    fetchMatchesForDate(state.selectedDate);
  });

  els.datePicker.addEventListener("change", (e) => {
    if (e.target.value) {
      state.selectedDate = e.target.value;
      fetchMatchesForDate(state.selectedDate);
    }
  });

  els.searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    els.clearSearchBtn.classList.toggle("hidden", !state.searchQuery.trim());
    renderMatches();
  });

  els.clearSearchBtn.addEventListener("click", () => {
    state.searchQuery = "";
    els.searchInput.value = "";
    els.clearSearchBtn.classList.add("hidden");
    renderMatches();
  });

  els.statusChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-status]");
    if (!chip) return;
    state.statusFilter = chip.dataset.status;
    Array.from(els.statusChips.querySelectorAll(".chip")).forEach((c) => {
      c.classList.toggle("active", c === chip);
    });
    renderMatches();
  });

  els.featuredLeagueChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip[data-featured]");
    if (!chip) return;
    state.featuredFilter = chip.dataset.featured;
    Array.from(els.featuredLeagueChips.querySelectorAll(".chip")).forEach((c) => {
      c.classList.toggle("active", c === chip);
    });
    renderMatches();
  });

  els.competitionSelect.addEventListener("change", (e) => {
    state.competitionFilter = e.target.value;
    renderMatches();
  });

  els.closeModalBtn.addEventListener("click", closeWatchModal);
  els.watchModal.addEventListener("click", (e) => {
    if (e.target === els.watchModal) {
      closeWatchModal();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.watchModal.classList.contains("hidden")) {
      closeWatchModal();
    }
  });
}

syncRouteUi();
bindEvents();
fetchMatchesForDate(state.selectedDate);
