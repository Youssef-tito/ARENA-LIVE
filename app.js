/* =========================================================
   ARENA LIVE — API ENGINE (PART 1: CONFIG, CACHE & NORMALIZER)
   Compatible with ARENA LIVE v4.1 (app.js + Cloudflare Worker)
========================================================= */

"use strict";

const API_PART1_CONFIG = {
  cacheTtlMs: 45000,
  maxCacheEntries: 40,
  defaultTimeoutMs: 20000
};

const BLOCKED_DEMO_MEDIA_TOKENS = [
  "big-buck-bunny",
  "big_buck_bunny",
  "big buck bunny",
  "commondatastorage.googleapis.com/gtv-videos-bucket",
  "blender.org"
];

const arenaMatchCache = new Map();

function isBlockedDemoUrl(url) {
  const value = String(url || "").trim().toLowerCase();
  if (!value) return false;
  return BLOCKED_DEMO_MEDIA_TOKENS.some(token => value.includes(token));
}

function isSafeHttpsUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || isBlockedDemoUrl(raw)) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function buildWorkerUrl(path = "/matches", queryParams = {}) {
  const base = String(ARENA_CONFIG?.workerUrl || "").trim().replace(/\/+$/, "");
  const cleanPath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
  const url = new URL(`${base}${cleanPath}`);

  Object.entries(queryParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      url.searchParams.set(key, String(val).trim());
    }
  });

  return url.toString();
}

function normalizeFixtureItem(raw, index = 0) {
  if (!raw || typeof raw !== "object") return null;

  const fixture = raw.fixture && typeof raw.fixture === "object" ? raw.fixture : {};
  const leagueObj = raw.league && typeof raw.league === "object" ? raw.league : {};
  const teamsObj = raw.teams && typeof raw.teams === "object" ? raw.teams : {};
  const goalsObj = raw.goals && typeof raw.goals === "object" ? raw.goals : {};
  const scoreFull = raw.score?.fulltime && typeof raw.score.fulltime === "object" ? raw.score.fulltime : {};

  const homeName = String(
    raw.home ?? raw.homeTeam ?? teamsObj.home?.name ?? "Home"
  ).trim();

  const awayName = String(
    raw.away ?? raw.awayTeam ?? teamsObj.away?.name ?? "Away"
  ).trim();

  const homeLogoRaw = String(raw.homeLogo ?? teamsObj.home?.logo ?? "").trim();
  const awayLogoRaw = String(raw.awayLogo ?? teamsObj.away?.logo ?? "").trim();
  const leagueLogoRaw = String(raw.leagueLogo ?? leagueObj.logo ?? "").trim();

  const rawHomeGoals = raw.homeGoals ?? goalsObj.home ?? scoreFull.home ?? null;
  const rawAwayGoals = raw.awayGoals ?? goalsObj.away ?? scoreFull.away ?? null;

  const streamCandidate = String(raw.streamUrl ?? "").trim();
  const replayCandidate = String(raw.replayUrl ?? "").trim();
  const embedCandidate = String(raw.embedUrl ?? "").trim();

  return {
    id: raw.id ?? fixture.id ?? `${homeName}-${awayName}-${index}`,
    date: String(raw.date ?? fixture.date ?? state?.selectedDate ?? "").slice(0, 10),
    time: String(raw.time ?? fixture.date ?? ""),
    timestamp:
      typeof raw.timestamp === "number"
        ? raw.timestamp
        : typeof fixture.timestamp === "number"
          ? fixture.timestamp
          : null,
    status: String(raw.status ?? fixture.status?.short ?? "NS").toUpperCase(),
    statusText: String(raw.statusText ?? fixture.status?.long ?? ""),
    elapsed:
      typeof raw.elapsed === "number"
        ? raw.elapsed
        : typeof fixture.status?.elapsed === "number"
          ? fixture.status.elapsed
          : null,
    home: homeName,
    away: awayName,
    homeLogo: isSafeHttpsUrl(homeLogoRaw) ? homeLogoRaw : "",
    awayLogo: isSafeHttpsUrl(awayLogoRaw) ? awayLogoRaw : "",
    league: String(raw.league ?? raw.competition ?? leagueObj.name ?? "League").trim(),
    leagueLogo: isSafeHttpsUrl(leagueLogoRaw) ? leagueLogoRaw : "",
    country: String(raw.country ?? leagueObj.country ?? "").trim(),
    homeGoals:
      rawHomeGoals === null || rawHomeGoals === undefined || rawHomeGoals === ""
        ? null
        : Number(rawHomeGoals),
    awayGoals:
      rawAwayGoals === null || rawAwayGoals === undefined || rawAwayGoals === ""
        ? null
        : Number(rawAwayGoals),
    streamUrl: isSafeHttpsUrl(streamCandidate) ? streamCandidate : "",
    replayUrl: isSafeHttpsUrl(replayCandidate) ? replayCandidate : "",
    embedUrl: isSafeHttpsUrl(embedCandidate) ? embedCandidate : ""
  };
}

function parseWorkerMatchesResponse(data) {
  if (!data || typeof data !== "object") {
    throw new Error("INVALID_API_RESPONSE");
  }

  const list = Array.isArray(data.matches)
    ? data.matches
    : Array.isArray(data.response)
      ? data.response
      : Array.isArray(data.fixtures)
        ? data.fixtures
        : null;

  if (!list) {
    throw new Error("MISSING_MATCHES_LIST");
  }

  const matches = list
    .map((item, idx) => normalizeFixtureItem(item, idx))
    .filter(Boolean);

  return {
    matches,
    total: typeof data.total === "number" ? data.total : matches.length,
    quota: data.quota ?? data.requestsRemaining ?? null
  };
}

function readCacheEntry(key) {
  const item = arenaMatchCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > API_PART1_CONFIG.cacheTtlMs) {
    arenaMatchCache.delete(key);
    return null;
  }
  return item.data;
}

function writeCacheEntry(key, data) {
  if (arenaMatchCache.size >= API_PART1_CONFIG.maxCacheEntries) {
    const oldestKey = arenaMatchCache.keys().next().value;
    if (oldestKey !== undefined) {
      arenaMatchCache.delete(oldestKey);
    }
  }
  arenaMatchCache.set(key, {
    timestamp: Date.now(),
    data
  });
}

function clearApiCache() {
  arenaMatchCache.clear();
}
/* =========================================================
   ARENA LIVE — API ENGINE (PART 2: FETCH, FILTERS & SYNC)
   Synchronizes Cloudflare Worker responses with app.js state
========================================================= */
let currentMatchesAbortController = null;
let autoRefreshTimerId = null;

function formatSyncClockNow() {
  const locale =
    state.language === "ar"
      ? "ar-TN"
      : state.language === "fr"
        ? "fr-FR"
        : "en-GB";

  return new Intl.DateTimeFormat(locale, {
    timeZone: ARENA_CONFIG.timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function applyParsedMatchesToState(parsed, targetDate) {
  state.selectedDate = targetDate;
  state.matches = parsed.matches;
  state.total = parsed.total;
  state.quota = parsed.quota;
  state.isLoading = false;
  state.errorMessage = "";
  state.lastUpdated = formatSyncClockNow();

  if (els.stateContainer) {
    els.stateContainer.classList.add("hidden");
  }

  populateCompetitionSelect();
  renderMatches();
}

async function fetchMatches(dateStr = state.selectedDate, options = {}) {
  const targetDate = String(dateStr || getTodayDate()).trim();
  const reqToken = ++state.requestId;
  const statusParam = state.statusFilter && state.statusFilter !== "all"
    ? state.statusFilter
    : "all";
  const cacheKey = `${targetDate}::${statusParam}`;

  if (currentMatchesAbortController) {
    currentMatchesAbortController.abort();
  }

  const controller = new AbortController();
  currentMatchesAbortController = controller;

  if (!options.silent) {
    state.isLoading = true;
    state.errorMessage = "";
    renderState("loading", t("loading"), t("loadingDescription"), false);
  }

  const cached = !options.forceRefresh ? readCacheEntry(cacheKey) : null;
  if (cached && reqToken === state.requestId) {
    applyParsedMatchesToState(cached, targetDate);
    return cached.matches;
  }

  const timeoutMs = Number(
    ARENA_CONFIG?.requestTimeout || API_PART1_CONFIG.defaultTimeoutMs
  );
  const timeoutHandle = setTimeout(() => {
    controller.abort("TIMEOUT");
  }, timeoutMs);

  try {
    const query = { date: targetDate };
    if (statusParam !== "all") {
      query.status = statusParam;
    }

    const endpoint = buildWorkerUrl("/matches", query);
    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP_STATUS_${res.status}`);
    }

    const rawJson = await res.json();
    const parsed = parseWorkerMatchesResponse(rawJson);

    if (reqToken !== state.requestId) {
      return state.matches;
    }

    writeCacheEntry(cacheKey, parsed);
    applyParsedMatchesToState(parsed, targetDate);
    return parsed.matches;
  } catch (error) {
    if (reqToken !== state.requestId) {
      return state.matches;
    }

    if (error?.name === "AbortError" && controller.signal.reason !== "TIMEOUT") {
      return state.matches;
    }

    state.isLoading = false;

    const isTimeout =
      controller.signal.reason === "TIMEOUT" ||
      String(error?.message || "").includes("TIMEOUT");
    const isPayloadIssue =
      String(error?.message || "").includes("INVALID_API_RESPONSE") ||
      String(error?.message || "").includes("MISSING_MATCHES_LIST");

    const message = isTimeout
      ? t("timeout")
      : isPayloadIssue
        ? t("dataError")
        : t("connectionError");

    state.errorMessage = message;

    if (!state.matches.length || !options.silent) {
      renderState("error", t("error"), message, true);
    }

    return [];
  } finally {
    clearTimeout(timeoutHandle);
    if (currentMatchesAbortController === controller) {
      currentMatchesAbortController = null;
    }
  }
}

function populateCompetitionSelect() {
  if (!els.competitionSelect) return;

  const previousSelection = state.competitionFilter || "__ALL__";
  const uniqueCompetitions = Array.from(
    new Set(
      (state.matches || [])
        .map(match => getCompetitionKey(match))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  els.competitionSelect.innerHTML = [
    `<option value="__ALL__">${escapeHtml(t("allCompetitions"))}</option>`,
    ...uniqueCompetitions.map(
      comp => `<option value="${escapeHtml(comp)}">${escapeHtml(comp)}</option>`
    )
  ].join("");

  if (uniqueCompetitions.includes(previousSelection)) {
    els.competitionSelect.value = previousSelection;
    state.competitionFilter = previousSelection;
  } else {
    els.competitionSelect.value = "__ALL__";
    state.competitionFilter = "__ALL__";
  }
}

function startAutoRefresh() {
  if (autoRefreshTimerId) {
    clearInterval(autoRefreshTimerId);
    autoRefreshTimerId = null;
  }

  const intervalMs = Number(ARENA_CONFIG?.refreshInterval || 60000);
  if (intervalMs < 10000) return;

  autoRefreshTimerId = setInterval(() => {
    if (document.hidden || state.isLoading) return;
    if (state.selectedDate === getTodayDate()) {
      fetchMatches(state.selectedDate, { silent: true, forceRefresh: true });
    }
  }, intervalMs);
}
/* =========================================================
   ARENA LIVE — API ENGINE (PART 3: DETAILS, EVENTS & STATS)
   Fetches fixture details, events, stats & helper lookups
========================================================= */

const matchDetailsCache = new Map();
const DETAILS_CACHE_TTL_MS = 60000;

function readDetailsCache(key) {
  const entry = matchDetailsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > DETAILS_CACHE_TTL_MS) {
    matchDetailsCache.delete(key);
    return null;
  }
  return entry.payload;
}

function writeDetailsCache(key, payload) {
  if (matchDetailsCache.size >= 50) {
    const firstKey = matchDetailsCache.keys().next().value;
    if (firstKey !== undefined) {
      matchDetailsCache.delete(firstKey);
    }
  }
  matchDetailsCache.set(key, {
    savedAt: Date.now(),
    payload
  });
}

function normalizeMatchEventItem(rawEvent = {}) {
  return {
    minute:
      typeof rawEvent.time?.elapsed === "number"
        ? rawEvent.time.elapsed
        : typeof rawEvent.minute === "number"
          ? rawEvent.minute
          : null,
    extraMinute:
      typeof rawEvent.time?.extra === "number"
        ? rawEvent.time.extra
        : typeof rawEvent.extraMinute === "number"
          ? rawEvent.extraMinute
          : null,
    teamName: String(rawEvent.team?.name ?? rawEvent.teamName ?? "").trim(),
    playerName: String(rawEvent.player?.name ?? rawEvent.playerName ?? "").trim(),
    assistName: String(rawEvent.assist?.name ?? rawEvent.assistName ?? "").trim(),
    type: String(rawEvent.type ?? "").trim(),
    detail: String(rawEvent.detail ?? "").trim()
  };
}

function normalizeMatchStatItem(rawStat = {}) {
  return {
    type: String(rawStat.type ?? rawStat.label ?? "").trim(),
    homeValue: rawStat.home ?? rawStat.homeValue ?? "-",
    awayValue: rawStat.away ?? rawStat.awayValue ?? "-"
  };
}

function normalizeMatchDetailsPayload(data = {}, fallbackMatch = null) {
  const rawEvents = Array.isArray(data.events) ? data.events : [];
  const rawStats = Array.isArray(data.statistics) ? data.statistics : [];

  const streamCandidate = String(
    data.streamUrl ?? fallbackMatch?.streamUrl ?? ""
  ).trim();
  const replayCandidate = String(
    data.replayUrl ?? fallbackMatch?.replayUrl ?? ""
  ).trim();
  const embedCandidate = String(
    data.embedUrl ?? fallbackMatch?.embedUrl ?? ""
  ).trim();

  return {
    fixtureId: data.fixtureId ?? data.id ?? fallbackMatch?.id ?? null,
    venue: String(data.venue ?? data.fixture?.venue?.name ?? "").trim(),
    referee: String(data.referee ?? data.fixture?.referee ?? "").trim(),
    round: String(data.round ?? data.league?.round ?? "").trim(),
    streamUrl: isSafeHttpsUrl(streamCandidate) ? streamCandidate : "",
    replayUrl: isSafeHttpsUrl(replayCandidate) ? replayCandidate : "",
    embedUrl: isSafeHttpsUrl(embedCandidate) ? embedCandidate : "",
    events: rawEvents.map(normalizeMatchEventItem),
    statistics: rawStats.map(normalizeMatchStatItem)
  };
}

async function fetchMatchDetails(match, options = {}) {
  if (!match || match.id === undefined || match.id === null) {
    return normalizeMatchDetailsPayload({}, match);
  }

  const fixtureId = String(match.id).trim();
  const cacheKey = `details::${fixtureId}`;

  if (!options.forceRefresh) {
    const cached = readDetailsCache(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeoutMs = Number(
    ARENA_CONFIG?.requestTimeout || API_PART1_CONFIG.defaultTimeoutMs
  );
  const timer = setTimeout(() => controller.abort("TIMEOUT"), timeoutMs);

  try {
    const url = buildWorkerUrl("/fixture", { id: fixtureId });
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`FIXTURE_HTTP_${res.status}`);
    }

    const json = await res.json();
    const normalized = normalizeMatchDetailsPayload(json, match);
    writeDetailsCache(cacheKey, normalized);
    return normalized;
  } catch {
    return normalizeMatchDetailsPayload({}, match);
  } finally {
    clearTimeout(timer);
  }
}

function findMatchById(matchId) {
  if (matchId === undefined || matchId === null) return null;
  const target = String(matchId);
  return (state.matches || []).find(item => String(item.id) === target) || null;
}

function forceRefreshCurrentMatches() {
  clearApiCache();
  matchDetailsCache.clear();
  return fetchMatches(state.selectedDate || getTodayDate(), {
    silent: false,
    forceRefresh: true
  });
}
