(() => {
  const $ = (id) => document.getElementById(id);
  const state = {
    route: "home",
    lifeTab: "overview",
    foodTab: "pantry",
    status: null,
    life: null,
    food: null,
    error: "",
    chat: [],
    model: "",
    models: [],
    busy: false,
    foodFilter: "all",
    receiptBusy: false,
    occasion: "grocery",
  };

  const CAT_COLOR = {
    "Housing / Rent": "#0A84FF",
    Groceries: "#32D74B",
    Dining: "#FF9F0A",
    "Amazon / Online": "#BF5AF2",
    Insurance: "#64D2FF",
    Gas: "#FFD60A",
    "Target / Big-box": "#FF375F",
    "Subscriptions / Software": "#AC8E68",
    Shopping: "#FF9F0A",
    Education: "#5E5CE6",
    "Travel / Transport": "#30D158",
    "Health / Fitness": "#FF6482",
    Other: "#8E8E93",
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function money(n, digits = 0) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(v);
  }

  function greet() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  function vibrate() {
    try { navigator.vibrate?.(10); } catch (_) {}
  }

  function accessToken() {
    return (window.LIFEOS_CONFIG && window.LIFEOS_CONFIG.accessToken) || "";
  }

  function pathToken() {
    const parts = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] === "lifeos" && parts[1] && parts[1].indexOf(".") === -1) {
      return parts[1];
    }
    return new URLSearchParams(location.search).get("t") || "";
  }

  function hasAccess() {
    const expected = accessToken();
    const got = pathToken();
    return Boolean(expected) && got === expected;
  }

  function deny() {
    document.title = "";
    $("splash").hidden = true;
    $("topbar").hidden = true;
    $("screen").hidden = true;
    $("tabbar").hidden = true;
    $("app").classList.add("locked");
  }

  function hashRoute() {
    const raw = (location.hash || "#home").replace("#", "");
    const [route, tab] = raw.split("/");
    return { route: route || "home", tab: tab || "" };
  }

  function go(route, tab) {
    location.hash = tab ? `#${route}/${tab}` : `#${route}`;
  }

  function setChrome(title, eyebrow) {
    $("title").textContent = title;
    $("eyebrow").textContent = eyebrow || "LifeOS";
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.route === state.route);
    });
  }

  function chips(services) {
    const rows = [
      ["PC", true],
      ["Ollama", services?.ollama],
      ["Life", services?.life_calculator],
      ["DB", services?.finance_db],
    ];
    return `<div class="status-line">${rows.map(([label, on]) => (
      `<span class="chip ${on ? "on" : ""}"><i></i>${esc(label)}</span>`
    )).join("")}</div>`;
  }

  function glyph(kind) {
    if (kind === "food-calculator") {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 3v8a3 3 0 1 0 6 0V3M12 11v10M5 21h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    }
    if (kind === "ollama") {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
    }
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 18V6m0 12h16M8 14v4m4-8v8m4-5v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  }

  function renderOffline() {
    setChrome("LifeOS", "Offline");
    $("tabbar").hidden = true;
    $("app").classList.add("locked");
    $("screen").innerHTML = `
      <div class="stack unlock">
        <div class="hero">
          <p class="hero-kicker">This PC</p>
          <p class="hero-value">Offline</p>
          <p class="hero-sub">${esc(state.error || "Could not reach the PC.")}</p>
        </div>
        <input class="field" id="apiInput" type="url" value="${esc(LifeAPI.apiBase())}" placeholder="https://….trycloudflare.com">
        <button class="primary" id="retryBtn" type="button">Connect</button>
      </div>`;
    $("retryBtn").onclick = async () => {
      LifeAPI.setCreds({ api: $("apiInput").value.trim() });
      await connect();
    };
  }

  function renderSettings() {
    setChrome("Settings", "LifeOS");
    const s = state.status || {};
    $("screen").innerHTML = `
      <div class="stack">
        ${chips(s.services)}
        <p class="section-label">Tunnel</p>
        <input class="field" id="apiInput" type="url" value="${esc(LifeAPI.apiBase())}" placeholder="API URL">
        <button class="primary" id="saveBtn" type="button">Save and reconnect</button>
        <p class="empty">Keep this link private. The token sits in the URL after /lifeos/.</p>
      </div>`;
    $("saveBtn").onclick = async () => {
      LifeAPI.setCreds({ api: $("apiInput").value.trim() });
      await connect();
      go("home");
    };
  }

  function renderHome() {
    setChrome(greet(), "LifeOS");
    const s = state.status || {};
    const apps = s.apps || [];
    $("screen").innerHTML = `
      <div class="stack">
        ${chips(s.services)}
        <div class="apps">
          ${apps.map((app) => `
            <button type="button" class="app-tile ${esc(app.accent || "white")}" data-go="${esc(app.route)}">
              <span class="live ${app.running ? "" : "off"}"></span>
              <span class="glyph">${glyph(app.kind)}</span>
              <h2>${esc(app.name)}</h2>
              <p>${esc(app.blurb || "")}</p>
            </button>
          `).join("")}
        </div>
      </div>`;
    $("screen").querySelectorAll("[data-go]").forEach((btn) => {
      btn.onclick = () => { vibrate(); go(btn.dataset.go); };
    });
  }

  function pills(items, current, prefix) {
    return `<div class="pills">${items.map(([id, label]) => (
      `<button type="button" class="pill ${current === id ? "on" : ""}" data-tab="${prefix}/${id}">${label}</button>`
    )).join("")}</div>`;
  }

  function renderLife() {
    const data = state.life;
    if (!data) {
      setChrome("Life", "Calculator");
      $("screen").innerHTML = `<div class="empty">Waiting for Life Calculator data.</div>`;
      return;
    }
    const sum = data.summary || {};
    const tab = state.lifeTab;
    setChrome("Life", "Calculator");
    const nav = pills(
      [["overview", "Overview"], ["banks", "Banks"], ["spend", "Spend"], ["bills", "Bills"]],
      tab,
      "life"
    );

    let body = "";
    if (tab === "banks") {
      body = `<div class="group">${(data.accounts || []).map((a) => `
        <div class="row">
          <span class="dot" style="background:${a.kind === "credit" ? "var(--red)" : a.is_liquid ? "var(--lime)" : "var(--violet)"}"></span>
          <div class="name"><strong>${esc(a.name)}</strong><span>${esc(a.institution || a.kind)}</span></div>
          <div class="amt">${money(a.balance, 0)}</div>
        </div>`).join("")}</div>`;
    } else if (tab === "spend") {
      const cats = (data.charts?.by_category || []).slice(0, 8);
      const max = Math.max(...cats.map((c) => c.spend), 1);
      const months = data.charts?.by_month || [];
      const week = data.week?.days || [];
      const wmax = Math.max(...week.map((d) => d.spend), 1);
      body = `
        <div class="group" style="padding:14px 16px 18px">
          <p class="section-label" style="padding:0 0 10px">This week</p>
          <div class="week">${week.map((d, i) => {
            const h = Math.max(6, Math.round((d.spend / wmax) * 88));
            const label = ["M", "T", "W", "T", "F", "S", "S"][i] || "";
            return `<div class="week-col"><i style="height:${h}px"></i><b>${label}</b></div>`;
          }).join("")}</div>
        </div>
        <div class="bars">${cats.map((c) => `
          <div class="bar-row">
            <span>${esc(c.name)}<b class="muted">${money(c.spend, 0)}</b></span>
            <div class="track"><div class="fill" data-w="${(c.spend / max) * 100}" style="background:${CAT_COLOR[c.name] || "#fff"}"></div></div>
          </div>`).join("")}</div>
        <p class="section-label">Recent</p>
        <div class="group">${(data.charts?.recent || []).slice(0, 18).map((t) => `
          <div class="row">
            <div class="name"><strong>${esc(t.merchant || t.name || "—")}</strong><span>${esc(t.date)} · ${esc(t.our_category || "")}</span></div>
            <div class="amt">${money(t.spend, 2)}</div>
          </div>`).join("") || '<div class="empty">No spend yet.</div>'}</div>
        ${months.length ? `<p class="section-label">By month</p><div class="group">${months.map((m) => `
          <div class="row"><div class="name"><strong>${esc(m.month)}</strong></div><div class="amt">${money(m.spend, 0)}</div></div>
        `).join("")}</div>` : ""}`;
    } else if (tab === "bills") {
      const groups = Object.fromEntries((data.groups || []).map((g) => [g.id, g.name]));
      body = `
        <div class="hero">
          <p class="hero-kicker">Monthly bills</p>
          <p class="hero-value">${money(sum.expense_monthly, 0)}</p>
          <p class="hero-sub">Left after bills ${money(sum.after_expense_monthly, 0)}</p>
        </div>
        <div class="group">${(data.expenses || []).map((e) => `
          <div class="row">
            <div class="name"><strong>${esc(e.name)}</strong><span>${esc(groups[e.group_id] || "")} · ${esc(e.frequency)}</span></div>
            <div class="amt">${money(e.amount, 0)}</div>
          </div>`).join("")}</div>
        <p class="section-label">Recurring</p>
        <div class="group">${(data.recurring || []).slice(0, 16).map((r) => `
          <div class="row">
            <div class="name"><strong>${esc(r.display_name)}</strong><span>${esc(r.cadence_label || "")} · ${esc(r.our_category || "")}</span></div>
            <div class="amt">${money(r.typical_amount, 0)}</div>
          </div>`).join("") || '<div class="empty">No recurring patterns yet.</div>'}</div>`;
    } else {
      body = `
        <div class="hero blue">
          <p class="hero-kicker">Net worth</p>
          <p class="hero-value">${money(sum.net_worth, 0)}</p>
          <p class="hero-sub">${money(sum.liquid_worth, 0)} liquid · ${money(sum.retirement_worth, 0)} retirement</p>
        </div>
        <div class="metrics">
          <div class="metric"><span class="label">Bills / mo</span><span class="value">${money(sum.expense_monthly, 0)}</span></div>
          <div class="metric"><span class="label">Runway</span><span class="value">${sum.burn_months == null ? "—" : Number(sum.burn_months).toFixed(0) + " mo"}</span></div>
          <div class="metric"><span class="label">Credit</span><span class="value">${money(sum.credit_owed, 0)}</span></div>
          <div class="metric"><span class="label">Left over</span><span class="value">${money(sum.after_expense_monthly, 0)}</span></div>
        </div>`;
    }

    $("screen").innerHTML = `<div class="stack">${nav}${body}</div>`;
    requestAnimationFrame(() => {
      $("screen").querySelectorAll(".fill").forEach((el) => {
        el.style.width = el.dataset.w + "%";
      });
    });
    wirePills();
  }

  function renderFood() {
    const data = state.food;
    setChrome("Food", "Calculator");
    if (!data) {
      $("screen").innerHTML = `<div class="empty">Waiting for pantry data.</div>`;
      return;
    }
    const sum = data.summary || {};
    const stats = data.pantry_stats || {};
    const tab = state.foodTab;
    const reviewN = data.review_count || 0;
    const nav = pills(
      [
        ["pantry", "Pantry"],
        ["receipts", "Receipts"],
        ["items", "Items"],
        ["stats", "Stats"],
      ].concat(reviewN ? [["review", `Review ${reviewN}`]] : []),
      tab,
      "food"
    );
    let body = "";
    if (tab === "receipts") {
      body = `
        <button type="button" class="capture" id="captureBtn"${state.receiptBusy ? " disabled" : ""}>
          ${state.receiptBusy ? "Reading receipt…" : "Take a receipt photo"}
        </button>
        <input id="receiptFile" type="file" accept="image/*" capture="environment" hidden>
        <div class="pills">
          ${["grocery", "dining", "convenience", "other"].map((occ) => (
            `<button type="button" class="pill ${state.occasion === occ ? "on" : ""}" data-occ="${occ}">${occ}</button>`
          )).join("")}
        </div>
        <div class="group">${(data.receipts || []).map((r) => `
          <div class="row">
            <div class="name"><strong>${esc(r.store || r.source_name || "Receipt")}</strong><span>${esc(r.purchased_at || "")} · ${esc(r.status || "")} · ${esc(String(r.line_count || 0))} items</span></div>
            <div class="amt">${money(r.total, 2)}</div>
          </div>`).join("") || '<div class="empty">No receipts yet. Snap a grocery ticket.</div>'}</div>`;
    } else if (tab === "items") {
      body = `<div class="group">${(data.items || []).slice(0, 50).map((i) => `
        <div class="row">
          <div class="name"><strong>${esc(i.name)}</strong><span>${esc(i.last_store || i.stores || i.last_occasion || "")} · ${esc(String(Math.round(i.stock_pct || 0)))}%</span></div>
          <div class="amt">${money(i.total_spend, 0)}</div>
        </div>`).join("") || '<div class="empty">No items yet.</div>'}</div>`;
    } else if (tab === "stats") {
      const occ = Object.entries(sum.by_occasion || {});
      const soon = (data.habit && data.habit.soonest) || [];
      body = `
        <div class="hero orange">
          <p class="hero-kicker">Kitchen / month</p>
          <p class="hero-value">${money(sum.monthly_est, 0)}</p>
          <p class="hero-sub">${sum.receipt_count || 0} receipts · ${stats.in_house || 0} in the house</p>
        </div>
        <div class="metrics">
          <div class="metric"><span class="label">Low</span><span class="value">${stats.low || 0}</span></div>
          <div class="metric"><span class="label">Empty</span><span class="value">${stats.empty || 0}</span></div>
        </div>
        <p class="section-label">Running out</p>
        <div class="group">${soon.slice(0, 8).map((s) => `
          <div class="row">
            <div class="name"><strong>${esc(s.name)}</strong><span>${s.days_to_empty == null ? "—" : Number(s.days_to_empty).toFixed(0) + " days"} · ${esc(s.empty_on || "")}</span></div>
            <div class="amt">${esc(String(Math.round(s.stock_pct || 0)))}%</div>
          </div>`).join("") || '<div class="empty">Eat from pantry to start the clock.</div>'}</div>
        <p class="section-label">By occasion</p>
        <div class="group">${occ.map(([k, v]) => `
          <div class="row"><div class="name"><strong>${esc(k)}</strong></div><div class="amt">${money(v, 0)}</div></div>
        `).join("") || '<div class="empty">No food spend yet.</div>'}</div>`;
    } else if (tab === "review") {
      body = `<div class="group">${(data.review || []).map((r) => `
        <div class="row">
          <div class="name"><strong>${esc(r.raw_name || r.ocr_line || "Unknown")}</strong><span>${esc(r.store || "")} · ${esc(r.reason || "")}</span></div>
          <div class="amt">${money(r.line_total, 2)}</div>
        </div>`).join("") || '<div class="empty">Review queue is clear.</div>'}</div>`;
    } else {
      const soon = stats.soonest || {};
      const filter = state.foodFilter || "all";
      const rows = (data.pantry || []).filter((i) => {
        const stock = Number(i.stock_pct || 0);
        if (filter === "low") return stock > 0 && stock < 25;
        if (filter === "soon") {
          const days = i.days_to_empty;
          return stock < 25 || (days != null && Number(days) <= 10);
        }
        if (filter === "over") return stock > 100;
        if (filter === "out") return stock <= 0;
        return true;
      });
      body = `
        <div class="metrics">
          <div class="metric"><span class="label">In the house</span><span class="value">${stats.in_house || 0}</span></div>
          <div class="metric"><span class="label">Running low</span><span class="value">${stats.low || 0}</span></div>
          <div class="metric"><span class="label">Next out</span><span class="value">${soon.days == null ? "—" : Number(soon.days).toFixed(0) + "d"}</span></div>
          <div class="metric"><span class="label">${esc(soon.name || "Eat to start")}</span><span class="value" style="font-size:15px">${esc(soon.date || "")}</span></div>
        </div>
        <div class="pills">
          ${[["all", "All"], ["low", "Low"], ["soon", "Soon"], ["over", "Over"], ["out", "Out"]].map(([id, label]) => (
            `<button type="button" class="pill ${filter === id ? "on" : ""}" data-filter="${id}">${label}</button>`
          )).join("")}
        </div>
        ${rows.map((i) => {
          const stock = Number(i.stock_pct || 0);
          const tone = stock <= 0 ? "out" : stock < 25 ? "low" : stock > 100 ? "over" : "ok";
          const width = Math.min(100, stock);
          return `<div class="stock-card ${tone}">
            <div class="row" style="border:0;padding:0 0 8px">
              <div class="name"><strong>${esc(i.name)}</strong><span>${i.days_to_empty == null ? "eat to start days/%" : Number(i.days_to_empty).toFixed(0) + " days left"}</span></div>
              <div class="amt">${Math.round(stock)}%</div>
            </div>
            <div class="track"><div class="fill on" style="width:${width}%"></div></div>
            <div class="eat-row">
              <button type="button" data-eat="${esc(i.id)}" data-delta="-10">−10</button>
              <button type="button" data-eat="${esc(i.id)}" data-delta="-25">−25</button>
              <button type="button" data-eat="${esc(i.id)}" data-delta="-50">−50</button>
              <button type="button" data-eat="${esc(i.id)}" data-delta="100" class="plus">+100</button>
            </div>
          </div>`;
        }).join("") || '<div class="empty">Pantry is empty. Scan a receipt.</div>'}`;
    }

    $("screen").innerHTML = `<div class="stack">${nav}${body}</div>`;
    wirePills();
    $("screen").querySelectorAll("[data-filter]").forEach((btn) => {
      btn.onclick = () => {
        state.foodFilter = btn.dataset.filter;
        renderFood();
      };
    });
    $("screen").querySelectorAll("[data-occ]").forEach((btn) => {
      btn.onclick = () => {
        state.occasion = btn.dataset.occ;
        renderFood();
      };
    });
    $("screen").querySelectorAll("[data-eat]").forEach((btn) => {
      btn.onclick = () => eatItem(btn.dataset.eat, Number(btn.dataset.delta));
    });
    const capture = $("captureBtn");
    const file = $("receiptFile");
    if (capture && file) {
      capture.onclick = () => file.click();
      file.onchange = () => {
        const picked = file.files && file.files[0];
        if (picked) sendReceipt(picked);
      };
    }
  }

  async function eatItem(itemId, delta) {
    vibrate();
    try {
      await LifeAPI.stock({
        item_id: itemId,
        delta,
        reason: delta < 0 ? "eat" : "restock",
      });
      state.food = await LifeAPI.food();
      renderFood();
    } catch (err) {
      state.error = err.message || "Stock update failed";
      renderOffline();
    }
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1600;
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > max) {
          const scale = max / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that photo"));
      };
      img.src = url;
    });
  }

  async function sendReceipt(file) {
    if (state.receiptBusy) return;
    state.receiptBusy = true;
    renderFood();
    try {
      let image;
      try {
        image = await compressImage(file);
      } catch (_) {
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read that photo"));
          reader.readAsDataURL(file);
        });
      }
      const result = await LifeAPI.receipt({
        image,
        occasion: state.occasion || "grocery",
        name: file.name || "phone.jpg",
      });
      state.food = await LifeAPI.food();
      state.receiptBusy = false;
      state.foodTab = "receipts";
      renderFood();
      const note = document.createElement("p");
      if (result && result.ok === false) {
        note.className = "err";
        note.textContent = (result.receipt && result.receipt.error) || "Receipt did not parse.";
      } else {
        note.className = "hero-sub";
        note.textContent = "Receipt is in. Pantry and items should update in a second.";
      }
      $("screen").prepend(note);
    } catch (err) {
      state.receiptBusy = false;
      renderFood();
      const note = document.createElement("p");
      note.className = "err";
      note.textContent = err.message || "Receipt upload failed.";
      $("screen").prepend(note);
    }
  }

  function renderChat() {
    setChrome("Ollama", "Local");
    const models = state.models;
    $("screen").innerHTML = `
      <div class="chat">
        <select class="select" id="model">${models.map((m) => (
          `<option value="${esc(m.name)}" ${m.name === state.model ? "selected" : ""}>${esc(m.name)}</option>`
        )).join("")}</select>
        <div class="messages" id="messages">${state.chat.map((m) => (
          `<div class="bubble ${m.role === "user" ? "me" : "bot"}">${esc(m.content)}</div>`
        )).join("") || '<div class="empty">Ask the model running on this PC.</div>'}</div>
        <form class="composer" id="composer">
          <textarea id="prompt" rows="1" placeholder="Message"></textarea>
          <button class="send" type="submit" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>`;
    const modelEl = $("model");
    if (modelEl) modelEl.onchange = () => { state.model = modelEl.value; };
    const box = $("messages");
    if (box) box.scrollTop = box.scrollHeight;
    $("composer").onsubmit = (e) => {
      e.preventDefault();
      sendChat();
    };
    $("prompt").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  async function sendChat() {
    const input = $("prompt");
    const text = (input?.value || "").trim();
    if (!text || state.busy) return;
    state.busy = true;
    state.chat.push({ role: "user", content: text });
    state.chat.push({ role: "assistant", content: "" });
    input.value = "";
    renderChat();
    const bot = state.chat[state.chat.length - 1];
    try {
      const res = await LifeAPI.chatStream({
        model: state.model || ($("model") && $("model").value),
        stream: true,
        messages: state.chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
      });
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const json = JSON.parse(line);
            const piece = json.message?.content || json.response || "";
            if (piece) {
              bot.content += piece;
              const last = document.querySelector(".bubble.bot:last-child");
              if (last) last.textContent = bot.content;
              const box = $("messages");
              if (box) box.scrollTop = box.scrollHeight;
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      bot.content = err.message || "Could not reach Ollama.";
      renderChat();
    } finally {
      state.busy = false;
    }
  }

  function wirePills() {
    $("screen").querySelectorAll("[data-tab]").forEach((btn) => {
      btn.onclick = () => { vibrate(); go(btn.dataset.tab); };
    });
  }

  function render() {
    if (!hasAccess()) {
      deny();
      return;
    }
    const { route, tab } = hashRoute();
    state.route = route;
    if (route === "life" && tab) state.lifeTab = tab;
    if (route === "food" && tab) state.foodTab = tab;

    $("splash").hidden = true;
    $("topbar").hidden = false;
    $("screen").hidden = false;
    $("tabbar").hidden = false;
    $("app").classList.remove("locked");

    if (route === "settings") return renderSettings();
    if (route === "life") return renderLife();
    if (route === "food") return renderFood();
    if (route === "chat") return renderChat();
    renderHome();
  }

  async function connect() {
    if (!hasAccess()) {
      deny();
      return;
    }
    state.error = "";
    $("splash").hidden = true;
    $("topbar").hidden = false;
    $("screen").hidden = false;
    try {
      await LifeAPI.health();
      state.status = await LifeAPI.status();
      const models = state.status?.ollama?.models || [];
      state.models = models;
      if (!state.model && models[0]) state.model = models[0].name;
      const [life, food] = await Promise.all([LifeAPI.life(), LifeAPI.food()]);
      state.life = life;
      state.food = food;
      if ((location.hash || "") === "" || location.hash === "#unlock") go("home");
      else render();
    } catch (err) {
      state.error = err.message || "Could not reach the PC.";
      $("splash").hidden = true;
      $("topbar").hidden = false;
      $("screen").hidden = false;
      renderOffline();
    }
  }

  function boot() {
    if (!hasAccess()) {
      deny();
      return;
    }
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.onclick = () => { vibrate(); go(btn.dataset.route); };
    });
    $("gear").onclick = () => { vibrate(); go("settings"); };
    window.addEventListener("hashchange", render);
    setTimeout(() => connect(), 900);
  }

  boot();
})();
