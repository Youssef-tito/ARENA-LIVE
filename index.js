const ALLOWED_ORIGINS = [
  "https://footime.dpdns.org",
  "https://www.footime.dpdns.org",
  "https://youssef-tito.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

function cors(request, env) {
  const origin = request.headers.get("Origin") || "";

  const allowed = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map(x => x.trim())
    : ALLOWED_ORIGINS;

  const valid = allowed.includes("*") || allowed.includes(origin);

  return {
    "Access-Control-Allow-Origin": valid ? (origin || "*") : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return false;

  const parsed = new Date(`${date}T00:00:00Z`);

  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, headers);
    }

    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map(x => x.trim())
      : ALLOWED_ORIGINS;

    if (origin && !allowed.includes("*") && !allowed.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403, headers);
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!validDate(date)) {
      return json({ error: "Invalid date. Use YYYY-MM-DD" }, 400, headers);
    }

    if (!env.APISPORTS_FOOTBALL_KEY) {
      return json({ error: "Missing API key secret" }, 500, headers);
    }

    try {
      const apiUrl =
        `https://v3.football.api-sports.io/fixtures?date=${date}&timezone=Africa%2FTunis`;

      const response = await fetch(apiUrl, {
        headers: {
          "x-apisports-key": env.APISPORTS_FOOTBALL_KEY
        }
      });

      const data = await response.json();

      if (!response.ok || (data.errors && Object.keys(data.errors).length)) {
        return json({
          error: "API-Sports request failed",
          details: data.errors || data.message || response.status
        }, 502, headers);
      }

      const matches = (data.response || []).map(item => ({
        id: item.fixture?.id,
        time: item.fixture?.date,
        status: item.fixture?.status?.short || "NS",
        statusText: item.fixture?.status?.long || "",
        elapsed: item.fixture?.status?.elapsed,
        league: item.league?.name || "",
        country: item.league?.country || "",
        leagueLogo: item.league?.logo || "",
        home: item.teams?.home?.name || "",
        homeLogo: item.teams?.home?.logo || "",
        away: item.teams?.away?.name || "",
        awayLogo: item.teams?.away?.logo || "",
        homeGoals: item.goals?.home,
        awayGoals: item.goals?.away
      }));

      return json({
        date,
        total: matches.length,
        matches
      }, 200, headers);

    } catch (error) {
      return json({
        error: "Unable to fetch fixtures",
        details: String(error)
      }, 502, headers);
    }
  }
};
