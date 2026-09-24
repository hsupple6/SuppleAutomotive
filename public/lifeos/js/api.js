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
    const ac = new AbortController();
    const wait = options.timeoutMs === 0 ? 0 : (options.timeoutMs || (options.stream ? 180000 : 12000));
    const timer = wait ? setTimeout(() => ac.abort(), wait) : null;
    try {
      const res = await fetch(base + path, Object.assign({}, options, { headers, signal: ac.signal }));
      if (options.stream) return res;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || res.statusText || "Request failed");
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      if (err && err.name === "AbortError") {
        throw new Error("PC did not answer. Is the tunnel up?");
      }
      if (String(err && err.message).includes("Failed to fetch") || String(err && err.message).includes("NetworkError")) {
        throw new Error("lifeos-api.suppleautomotive.com is not in DNS yet. Add the Vercel CNAME.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function post(path, body, timeoutMs) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
      timeoutMs,
    });
  }

  async function postFirst(paths, body, timeoutMs) {
    let last = null;
    for (const path of paths) {
      try {
        return await post(path, body, timeoutMs);
      } catch (err) {
        last = err;
        if (err.status !== 404 && err.status !== 405) throw err;
      }
    }
    throw last || new Error("Request failed");
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
    receipt(body) {
      return request("/v1/food/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: 180000,
      });
    },
    stock(body) {
      return post("/v1/food/stock", body);
    },
    macros(date) {
      const q = date ? `?date=${encodeURIComponent(date)}` : "";
      return request("/v1/macros" + q);
    },
    macroLog(body) {
      return post("/v1/macros/log", body);
    },
    macroSettings(body) {
      return post("/v1/macros/settings", body);
    },
    macroDelete(body) {
      return post("/v1/macros/delete", body);
    },
    async meals() {
      try {
        return await request("/v1/meals");
      } catch (err) {
        if (err.status !== 404) throw err;
        const macros = await request("/v1/macros");
        return { ok: true, meals: macros.meals || [], foods: macros.foods || [] };
      }
    },
    mealSave(body) {
      return postFirst(
        ["/v1/meals/save", "/v1/macros/meal", "/v1/macros/log"],
        Object.assign({}, body, { action: "save_meal" })
      );
    },
    mealLog(body) {
      return postFirst(
        ["/v1/meals/log", "/v1/macros/meal-log", "/v1/macros/log"],
        Object.assign({}, body, { action: "log_meal" })
      );
    },
    mealDelete(body) {
      return postFirst(
        ["/v1/meals/delete", "/v1/macros/meal-delete", "/v1/macros/log"],
        Object.assign({}, body, { action: "delete_meal" })
      );
    },
    mealItem(body) {
      return postFirst(
        ["/v1/meals/item", "/v1/macros/item", "/v1/food/item", "/v1/macros/log"],
        Object.assign({}, body, { save_only: true, action: "item" })
      );
    },
    flash() {
      return request("/v1/flash");
    },
    flashGrade(body) {
      return post("/v1/flash/grade", body, 20000);
    },
    flashDelete(body) {
      return post("/v1/flash/delete", body, 20000);
    },
    chatStream(body) {
      return request("/v1/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        stream: true,
        timeoutMs: 300000,
      });
    },
    reviewStream(body) {
      return request("/v1/personal/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
        stream: true,
        timeoutMs: 0,
      });
    },
    noteDecision(body) {
      return post("/v1/personal/decide", body, 20000);
    },
  };
})();
