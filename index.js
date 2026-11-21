```javascript
const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers
    });
}

export default {
    async fetch(request, env) {

        if (request.method === "OPTIONS") {
            return new Response(null, { headers });
        }

        if (request.method !== "GET") {
            return json({ error: "Method not allowed" }, 405);
        }

        if (!env.APISPORTS_FOOTBALL_KEY) {
            return json({
                error: "API Key missing in Cloudflare Secrets"
            }, 500);
        }

        const incoming = new URL(request.url);
        const date = incoming.searchParams.get("date");

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return json({
                error: "Date invalide. Format: YYYY-MM-DD"
            }, 400);
        }

        const apiURL = new URL(
            "https://v3.football.api-sports.io/fixtures"
        );

        apiURL.searchParams.set("date", date);

        try {

            const response = await fetch(apiURL, {
                headers: {
                    "x-apisports-key":
                        env.APISPORTS_FOOTBALL_KEY
                }
            });

            const raw = await response.json();

            if (!response.ok ||
                (raw.errors && Object.keys(raw.errors).length > 0)) {

                return json({
                    error: "API-Sports request failed",
                    details: raw.errors || raw.message
                }, 502);
            }

            const matches = (raw.response || []).map(item => {

                const fixture = item.fixture || {};
                const league = item.league || {};
                const teams = item.teams || {};
                const goals = item.goals || {};

                return {
                    id: fixture.id,
                    date: fixture.date,

                    status: fixture.status?.short || "NS",
                    statusText: fixture.status?.long || "",
                    elapsed: fixture.status?.elapsed,

                    time: fixture.date
                        ? new Date(fixture.date).toLocaleTimeString(
                            "fr-FR",
                            {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Africa/Tunis"
                            }
                        )
                        : "",

                    league: league.name || "Competition",
                    country: league.country || "",
                    leagueLogo: league.logo || "",
                    round: league.round || "",

                    home: teams.home?.name || "Home",
                    homeLogo: teams.home?.logo || "",

                    away: teams.away?.name || "Away",
                    awayLogo: teams.away?.logo || "",

                    homeGoals: goals.home,
                    awayGoals: goals.away
                };
            });

            return json({
                date,
                total: raw.results || matches.length,
                matches
            });

        } catch (error) {

            return json({
                error: "Impossible de contacter API-Sports",
                details: String(error)
            }, 502);

        }
    }
};
```