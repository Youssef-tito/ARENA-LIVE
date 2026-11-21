const dateInput = document.getElementById("matchDate");
const filterInput = document.getElementById("matchFilter");
const refreshButton = document.getElementById("refreshButton");

const matchesContainer = document.getElementById("matchesContainer");
const message = document.getElementById("message");

const matchCount = document.getElementById("matchCount");
const resultsTitle = document.getElementById("resultsTitle");
const lastUpdated = document.getElementById("lastUpdated");

const streamUrl = document.getElementById("streamUrl");
const loadStream = document.getElementById("loadStream");
const clearStream = document.getElementById("clearStream");
const livePlayer = document.getElementById("livePlayer");
const videoPlaceholder = document.getElementById("videoPlaceholder");

let allMatches = [];

const liveStatuses = [
  "1H", "2H", "HT", "ET", "P",
  "LIVE", "BT", "INT", "SUSP", "INTR"
];

const finishedStatuses = ["FT", "AET", "PEN"];

function localDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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
    return `<span class="team-fallback">${escapeHTML(name.slice(0, 1))}</span>`;
  }

  return `
    <img
      src="${escapeHTML(safeURL)}"
      alt=""
      loading="lazy"
      onerror="this.style.display='none'"
    >
  `;
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
    return match.elapsed != null ? `${match.elapsed}'` : "LIVE";
  }

  if (getStatus(match) === "finished") {
    if (status === "AET") return "AFTER EXTRA TIME";
    if (status === "PEN") return "PENALTIES";
    return "FULL TIME";
  }

  if (status === "PST") return "POSTPONED";
  if (status === "CANC") return "CANCELLED";
  if (status === "TBD") return "TIME TBC";

  return "UPCOMING";
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

  const filtered = allMatches.filter(match => {
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

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(match);
  });

  matchesContainer.innerHTML = [...groups.entries()]
    .map(([key, matches]) => {
      const [league, country] = key.split("|");
      const logo = safeImage(matches[0].leagueLogo);

      return `
        <section class="league-group">
          <div class="league-heading">
            ${
              logo
                ? `<img src="${escapeHTML(logo)}" alt="" loading="lazy">`
                : ""
            }
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

  if (!window.ARENA_API_URL) {
    message.hidden = false;
    message.textContent = "API configuration is missing. Check config.js.";
    return;
  }

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
    message.textContent = `Unable to load fixtures: ${error.message}`;
    matchesContainer.innerHTML = "";

  } finally {
    refreshButton.disabled = false;
  }
}

/* LIVE TV PLAYER */

function validEmbedURL(value) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:") return false;

    const allowedHosts = [
      "youtube.com",
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "player.twitch.tv",
      "twitch.tv",
      "www.twitch.tv"
    ];

    return allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
}

function loadVideo() {
  const value = streamUrl.value.trim();

  if (!validEmbedURL(value)) {
    alert("Please enter a valid HTTPS embed URL from an approved provider.");
    return;
  }

  livePlayer.src = value;
  livePlayer.hidden = false;
  videoPlaceholder.hidden = true;
}

function clearVideo() {
  livePlayer.src = "";
  livePlayer.hidden = true;
  videoPlaceholder.hidden = false;
  streamUrl.value = "";
}

loadStream.addEventListener("click", loadVideo);
clearStream.addEventListener("click", clearVideo);

streamUrl.addEventListener("keydown", event => {
  if (event.key === "Enter") loadVideo();
});

/* MATCH CENTER */

dateInput.value = localDate();

refreshButton.addEventListener("click", loadMatches);
dateInput.addEventListener("change", loadMatches);
filterInput.addEventListener("change", renderMatches);

loadMatches();

/* Refresh match data every 60 seconds */
setInterval(() => {
  if (!document.hidden) loadMatches();
}, 60000);
