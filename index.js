/* ============================================================
   ARENA LIVE — Cloudflare Worker (proxy vers API-Sports)
   Secret requis :  APISPORTS_FOOTBALL_KEY
   ============================================================ */

// 1) Seuls ces sites ont le droit d'appeler ton Worker.
//    Remplace par ton vrai domaine DigitalPlat quand il est prêt.
const ALLOWED_ORIGINS = [
  "https://youssef-tito.github.io",
  "https://TON-DOMAINE.dpdns.org",
  "http://localhost:8000",
  "http://127.0.0.1:5500"
];

// 2) Durée de cache (secondes). Plus c'est long, moins tu consommes de requêtes API.
//    Le plan gratuit d'API-Sports est limité par jour : adapte selon ton plan.
const TTL_TODAY = 120;      // aujourd'hui : scores plutôt frais
const TTL_FUTURE = 1800;    // jours à venir : 30 min
const TTL_PAST = 3600;      // jours passés : 1 h

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin) });
}

function tunisToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

function ttlFor(date) {
  const today = tunisToday();
  if (date === today) return TTL_TODAY;
  return date > today ? TTL_FUTURE : TTL_PAST;   // "YYYY-MM-DD" se compare comme du texte
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    // Les navigateurs envoient Origin ; on bloque les autres sites.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origin not allowed" }, 403, origin);
    }

    const apiKey = env.APISPORTS_FOOTBALL_KEY;
    if (!apiKey) {
      return json({ error: "API key missing in Cloudflare secrets" }, 500, origin);
    }

    const date = new URL(request.url).searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "Invalid date. Use YYYY-MM-DD" }, 400, origin);
    }

    try {
      const apiURL = new URL("https://v3.football.api-sports.io/fixtures");
      apiURL.searchParams.set("date", date);
      apiURL.searchParams.set("timezone", "Africa/Tunis");

      const ttl = ttlFor(date);

      const apiResponse = await fetch(apiURL.toString(), {
        headers: { "x-apisports-key": apiKey },
        // Cache Cloudflare : plusieurs visiteurs = une seule requête API
        cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": ttl, "400-599": 0 } }
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok || (data.errors && Object.keys(data.errors).length > 0)) {
        return json({
          error: "API-Sports request failed",
          details: data.errors || data.message || "Unknown API error"
        }, 502, origin);
      }

      const matches = (data.response || []).map(item => {
        const fixture = item.fixture || {};
        const league = item.league || {};
        const teams = item.teams || {};
        const goals = item.goals || {};

        return {
          id: fixture.id,
          timestamp: fixture.timestamp || null,
          status: fixture.status?.short || "NS",
          statusText: fixture.status?.long || "",
          elapsed: fixture.status?.elapsed ?? null,
          time: fixture.date
            ? new Date(fixture.date).toLocaleTimeString("fr-FR", {
                hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis"
              })
            : "",
          league: league.name || "Competition",
          country: league.country || "",
          leagueLogo: league.logo || "",
          round: league.round || "",
          home: teams.home?.name || "Home",
          homeLogo: teams.home?.logo || "",
          away: teams.away?.name || "Away",
          awayLogo: teams.away?.logo || "",
          homeGoals: goals.home ?? null,
          awayGoals: goals.away ?? null
        };
      });

      return json({
        date,
        total: matches.length,
        quota: apiResponse.headers.get("x-ratelimit-requests-remaining"),
        matches
      }, 200, origin);

    } catch (error) {
      return json({ error: "Unable to contact API-Sports", details: String(error) }, 502, origin);
    }
  }
};
