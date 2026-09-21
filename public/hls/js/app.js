(() => {
  const expected = (window.HLS_CONFIG && window.HLS_CONFIG.accessToken) || "";
  const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  let got = "";
  if (parts[0] === "hls" && parts[1] && parts[1].indexOf(".") === -1) got = parts[1];
  if (!got) got = new URLSearchParams(location.search).get("t") || "";
  if (!expected || got !== expected) return;

  const app = document.getElementById("app");
  const status = document.getElementById("status");
  app.hidden = false;

  HlsAPI.status()
    .then((data) => {
      status.textContent = JSON.stringify(data, null, 2);
    })
    .catch((err) => {
      status.textContent = String((err && err.message) || err);
    });
})();
