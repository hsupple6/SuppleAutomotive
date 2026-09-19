const LifeAPI = (() => {
  const KEYS = {
    token: "lifeos.token",
    apiBase: "lifeos.apiBase",
  };

  function config() {
    return window.LIFEOS_CONFIG || {};
  }

  function apiBase() {
    const stored = localStorage.getItem(KEYS.apiBase) || "";
    return (stored || config().apiBase || "").replace(/\/+$/, "");
  }

  function token() {
    return (config().accessToken || localStorage.getItem(KEYS.token) || "").trim();
  }

  function setCreds({ api, secret }) {
    if (typeof api === "string") localStorage.setItem(KEYS.apiBase, api.replace(/\/+$/, ""));
    if (typeof secret === "string") localStorage.setItem(KEYS.token, secret.trim());
  }

  function clear() {
    localStorage.removeItem(KEYS.token);
    localStorage.removeItem(KEYS.apiBase);
  }

  async function request(path, options = {}) {
    const base = apiBase();
    if (!base) {
      const err = new Error("Set the tunnel URL first");
      err.code = "noconfig";
      throw err;
    }
    const headers = Object.assign(
      { Accept: "application/json" },
      options.headers || {}
    );
    const secret = token();
    if (secret) {
      headers.Authorization = "Bearer " + secret;
      headers["X-LifeOS-Token"] = secret;
    }
    const res = await fetch(base + path, Object.assign({}, options, { headers }));
    if (options.stream) return res;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText || "Request failed");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  return {
    KEYS,
    apiBase,
    token,
    setCreds,
    clear,
    health: () => request("/health"),
    status: () => request("/v1/status"),
    life: () => request("/v1/life"),
    food: () => request("/v1/food"),
    models: () => request("/v1/ollama/models"),
    chatStream(body) {
      return request("/v1/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        stream: true,
      });
    },
  };
})();
