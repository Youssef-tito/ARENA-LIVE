const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    if (request.method !== "GET") {
      return jsonResponse(
        { error: "Method not allowed" },
        405
      );
    }

    const apiKey = env.APISPORTS_FOOTBALL_KEY;

    if (!apiKey) {
      return jsonResponse(
        { error: "API Key missing in Cloudflare Secrets" },
        500
      );
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonResponse(
        { error: "Invalid date. Use YYYY-MM-DD" },
        400
      );
    }

    try {
      const apiURL = new URL(
        "https://v3.football.api-sports.io/fixtures"
      );

      apiURL.searchParams.set("date", date);

      const apiResponse = await fetch(apiURL.toString(), {
        method: "GET",
        headers: {
          "x-apisports-key": apiKey
        }
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok || (data.errors && Object.keys(data.errors).length > 0)) {
        return jsonResponse(
          {
            error: "API-Sports request failed",
            details: data.errors || data.message || "Unknown API error"
          },
          502
        );
      }

      const matches = (data.response || []).map((item) => {
        const fixture = item.fixture || {};
        const league = item.league || {};
        const teams = item.teams || {};
        const goals = item.goals || {};

        return {
          id: fixture.id,
          date: fixture.date || "",
          timestamp: fixture.timestamp || null,
          status: fixture.status?.short || "NS",
          statusText: fixture.status?.long || "",
          elapsed: fixture.status?.elapsed ?? null,

          time: fixture.date
            ? new Date(fixture.date).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Tunis"
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

      return jsonResponse({
        date: date,
        total: matches.length,
        matches: matches
      });

    } catch (error) {
      return jsonResponse(
        {
          error: "Unable to contact API-Sports",
          details: String(error)
        },
        502
      );
    }
  }
};
