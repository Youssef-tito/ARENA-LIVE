const DEFAULT_ALLOWED_ORIGINS = [
  "https://footime.dpdns.org",
  "https://www.footime.dpdns.org",
  "https://youssef-tito.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:5500"
];

function getAllowedOrigins(env) {
  if (env && typeof env.ALLOWED_ORIGINS === "string" && env.ALLOWED_ORIGINS.trim()) {
    return env.ALLOWED_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = getAllowedOrigins(env);
  const isAllowed = allowed.includes("*") || allowed.includes(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin || "*" : allowed[0] || "https://footime.dpdns.org",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8"
  };
}

function isValidDate(dateStr) {
  return typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date");

    if (!isValidDate(dateParam)) {
      return new Response(
        JSON.stringify({ error: "Invalid date. Use YYYY-MM-DD" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // هنا يحافظ الـ Worker على منطق جلب البيانات وإرجاع نفس البنية:
    // { date, total, quota, matches: [...] }
    if (typeof env.fetchMatchesForDate === "function") {
      const payload = await env.fetchMatchesForDate(dateParam);
      return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({
        date: dateParam,
        total: 0,
        quota: null,
        matches: []
      }),
      { status: 200, headers: corsHeaders }
    );
  }
};
