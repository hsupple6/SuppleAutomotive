const fs = require("fs");
const cfg = fs.readFileSync("public/lifeos/config.js", "utf8");
const base = cfg.match(/apiBase:\s*"([^"]+)"/)[1];
const token = cfg.match(/accessToken:\s*"([^"]+)"/)[1];
fetch(base + "/v1/macros?date=2026-10-14", {
  headers: { Authorization: "Bearer " + token, "X-LifeOS-Token": token },
}).then(async (r) => {
  const d = await r.json();
  const meals = (d.day && d.day.meals) || {};
  const first = Object.values(meals).flat()[0];
  console.log(JSON.stringify({
    status: r.status,
    mealKeys: Object.keys(meals),
    rowKeys: first ? Object.keys(first) : [],
    error: d.error || "",
  }));
}).catch((e) => {
  console.error(String(e));
  process.exit(1);
});
