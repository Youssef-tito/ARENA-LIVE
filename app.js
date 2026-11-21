const dateInput = document.getElementById("matchDate");
const filterInput = document.getElementById("matchFilter");
const refreshButton = document.getElementById("refreshButton");
const matchesContainer = document.getElementById("matchesContainer");
const message = document.getElementById("message");
const matchCount = document.getElementById("matchCount");
const resultsTitle = document.getElementById("resultsTitle");
const lastUpdated = document.getElementById("lastUpdated");

let allMatches = [];

const liveStatuses = [
  "1H", "2H", "HT", "ET", "P",
  "LIVE", "BT", "INT", "SUSP", "INTR"
];

const finishedStatuses = [
  "FT", "AET", "PEN"
];

function localDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return parts;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function safeImage(url) {
  try {
    const parsed = new URL(url);
    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : "";
  } catch {
    return "";
  }
}

function teamLogo(url, name) {
  const safeURL = safeImage(url);

  if (!safeURL) {
    return `<span class="team-fallback">${escapeHTML(name.slice(0,1))}</span>`;
  }

  return `<img src="${escapeHTML(safeURL)}" alt="" loading="lazy"
    onerror="this.style.display='none'">`;
}

function getStatus(match) {
  const status = String(match.status || "NS").toUpperCase();

  if (liveStatuses.includes(status)) return "live";
  if (finishedStatuses.includes(status)) return "finished";

  return "upcoming";
}

function statusLabel(match) {
  const status = String(match.status || "NS").toUpperCase();

  if (getStatus(match) === "live") {
    return match.elapsed != null
      ? `${match.elapsed}'`
      : "LIVE";
  }

  if (getStatus(match) === "finished") {
    return status === "AET" ? "AFTER EXTRA TIME" :
      status === "PEN" ? "PENALTIES" : "FULL TIME";
  }

  return status === "PST" ? "POSTPONED" :
    status === "CANC" ? "CANCELLED" :
    status === "TBD" ? "TIME TBC" :
    "UPCOMING";
}

function renderMatch(match) {
  const home = escapeHTML(match.home || "Home");
  const away = escapeHTML(match.away || "Away");

  const hasScore =
    match.homeGoals !== null &&
    match.homeGoals !== undefined &&
    match.awayGoals !== null &&
    match.awayGoals !== undefined;

  const score = hasScore
    ? `${match.homeGoals} - ${match.awayGoals}`
    : "VS";

  const category = getStatus(match);

  const time = escapeHTML(match.time || "--:--");
  const round = escapeHTML(match.round || "");

  return `
    <article class="match-card">

      <div class="match-meta">
        <span class="match-time">${time}</span>
        <span class="match-status ${category}">
          ${escapeHTML(statusLabel(match))}
        </span>
      </div>

      <div class="match-teams">

        <div class="team">
          ${teamLogo(match.homeLogo, home)}
          <span>${home}</span>
        </div>

        <div class="score ${hasScore ? "" : "pending"}">
          ${escapeHTML(score)}
        </div>

        <div class="team">
          ${teamLogo(match.awayLogo, away)}
          <span>${away}</span>
        </div>

      </div>

      <div class="match-extra">
        ${round || "WORLD FOOTBALL"}
      </div>

    </article>
  `;
}

function renderMatches() {
  const filter = filterInput.value;

  let filtered = allMatches.filter(match => {
    if (filter === "all") return true;
    return getStatus(match) === filter;
  });

  matchCount.textContent =
    `${filtered.length} MATCH${filtered.length === 1 ? "" : "ES"}`;

  resultsTitle.textContent =
    filter === "all" ? "ALL FIXTURES" :
    filter === "live" ? "LIVE MATCHES" :
    filter === "finished" ? "FINISHED MATCHES" :
    "UPCOMING MATCHES";

  if (!filtered.length) {
    matchesContainer.innerHTML = `
      <div class="empty-state">
        No matches found for this selection.
      </div>
    `;
    return;
  }

  const groups = new Map();

  filtered.forEach(match => {
    const key = `${match.league || "Other competitions"}|${match.country || ""}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(match);
  });

  matchesContainer.innerHTML = [...groups.entries()].map(([key, matches]) => {
    const [league, country] = key.split("|");

    const logo = safeImage(matches[0].leagueLogo);

    return `
      <section class="league-group">

        <div class="league-heading">
          ${logo ? `<img src="${escapeHTML(logo)}" alt="" loading="lazy">` : ""}
          <div>
            <strong>${escapeHTML(league)}</strong>
            <small>${escapeHTML(country || "International")}</small>
          </div>
        </div>

        <div class="league-matches">
          ${matches.map(renderMatch).join("")}
        </div>

      </section>
    `;
  }).join("");
}

async function loadMatches() {
  const date = dateInput.value;

  if (!date) return;

  refreshButton.disabled = true;
  message.hidden = false;
  message.innerHTML = `
    <div class="loader"></div>
    <span>Loading football fixtures...</span>
  `;

  matchesContainer.innerHTML = "";

  try {
    const url = new URL(window.ARENA_API_URL);

    url.searchParams.set("date", date);

    const response = await fetch(url.toString());

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load matches");
    }

    if (!Array.isArray(data.matches)) {
      throw new Error("Invalid API response");
    }

    allMatches = data.matches;

    renderMatches();

    message.hidden = true;

    lastUpdated.textContent =
      `UPDATED ${new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;

  } catch (error) {
    allMatches = [];

    matchCount.textContent = "0 MATCHES";

    message.hidden = false;
    message.textContent =
      `Unable to load fixtures: ${error.message}`;

    matchesContainer.innerHTML = "";
  } finally {
    refreshButton.disabled = false;
  }
}

dateInput.value = localDate();

refreshButton.addEventListener("click", loadMatches);

dateInput.addEventListener("change", loadMatches);

filterInput.addEventListener("change", renderMatches);

loadMatches();
