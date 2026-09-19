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
    lastHash: "",
    foodFilter: "all",
    macros: null,
    receiptBusy: false,
    occasion: "grocery",
    meals: null,
    mealDraft: null,
    mealErr: "",
    mealNote: "",
    mealBusy: false,
    mealSheet: "",
    mealNew: null,
    macroLogLines: null,
    macroDate: "",
    macroSheet: "",
    macroMeal: "breakfast",
    macroQuery: "",
    macroPicked: null,
    macroQty: "",
    macroBusy: false,
    macroErr: "",
    targetsDraft: null,
    macroMode: "pick",
    macroNew: null,
    macroPickedRecipe: null,
    macroLogTab: "meals",
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

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function shiftDate(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function prettyDay(iso) {
    const today = todayISO();
    if (iso === today) return "Today";
    if (iso === shiftDate(today, -1)) return "Yesterday";
    if (iso === shiftDate(today, 1)) return "Tomorrow";
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  }

  function num(n, digits = 0) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "0";
    return v.toLocaleString("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
  }

  function qtyLabel(qty, unit) {
    const v = Number(qty);
    const nice = Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10);
    return unit === "ea" ? `${nice} ea` : `${nice}g`;
  }

  function scaledFood(food, qty) {
    const amount = Number(qty);
    if (!food || !Number.isFinite(amount) || amount <= 0) {
      return { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 };
    }
    const factor = food.each ? amount : amount / (Number(food.serving_grams) || 100);
    return {
      calories: Number(food.calories || 0) * factor,
      protein_g: Number(food.protein_g || 0) * factor,
      carb_g: Number(food.carb_g || 0) * factor,
      fat_g: Number(food.fat_g || 0) * factor,
    };
  }

  function clamp01(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.min(1, v));
  }

  function polar(cx, cy, r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arcD(cx, cy, r, start, sweep) {
    const span = Math.max(0, Math.min(359.9, Number(sweep) || 0));
    if (span < 0.4) return "";
    const [x1, y1] = polar(cx, cy, r, start);
    const [x2, y2] = polar(cx, cy, r, start + span);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }

  function macroRingHTML(day, settings) {
    const cal = day.calories || {};
    const calPct = clamp01(Number(cal.pct || 0) / 100);
    const calColor = cal.status === "over" ? "var(--red)" : "var(--lime)";
    const shares = [
      { key: "p", band: day.protein, share: Number(settings.protein_pct || 0), color: "var(--red)", label: "P" },
      { key: "c", band: day.carb, share: Number(settings.carb_pct || 0), color: "var(--blue)", label: "C" },
      { key: "f", band: day.fat, share: Number(settings.fat_pct || 0), color: "var(--yellow)", label: "F" },
    ];
    const totalShare = shares.reduce((s, x) => s + Math.max(0, x.share), 0) || 100;
    const gap = 8;
    const usable = 360 - gap * shares.length;
    let angle = 0;
    const cx = 100;
    const cy = 100;
    const outer = 88;
    const inner = 66;
    const segs = shares.map((x) => {
      const sweep = usable * (Math.max(0, x.share) / totalShare);
      const start = angle + gap / 2;
      angle += sweep + gap;
      return { ...x, start, sweep, fill: sweep * clamp01(Number(x.band?.pct || 0) / 100) };
    });
    const track = segs.map((s) => {
      const d = arcD(cx, cy, outer, s.start, s.sweep);
      return d ? `<path d="${d}" stroke="#2c2c2e" fill="none" stroke-width="12" stroke-linecap="butt"/>` : "";
    }).join("");
    const fills = segs.map((s) => {
      const d = arcD(cx, cy, outer, s.start, s.fill);
      return d ? `<path d="${d}" stroke="${s.color}" fill="none" stroke-width="12" stroke-linecap="butt"/>` : "";
    }).join("");
    const circ = 2 * Math.PI * inner;
    return `
      <div class="macro-ring">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          ${track}${fills}
          <circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="#2c2c2e" stroke-width="12"/>
          ${calPct > 0 ? `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="${calColor}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(circ * calPct).toFixed(2)} ${circ.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>` : ""}
        </svg>
        <div class="macro-ring-core">
          <p class="cal-eaten">${num(day.totals?.calories || 0, 0)}</p>
          <p class="cal-goal">of ${num(settings.calories || 0, 0)}</p>
        </div>
      </div>
      <div class="macro-legend">
        ${segs.map((s) => `
          <div class="macro-leg ${s.key}">
            <b>${s.label}</b>
            <span>${num(s.band?.actual || 0, 0)} / ${num(s.band?.target || 0, 0)}g</span>
          </div>`).join("")}
      </div>`;
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
    if (kind === "macros") {
      return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v4.6l3 1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
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
        <div class="pantry-grid">
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
        }).join("") || '<div class="empty">Pantry is empty. Scan a receipt.</div>'}
        </div>`;
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

  function ensureMealDraft() {
    if (!state.mealDraft) {
      state.mealDraft = { id: "", name: "", slot: "breakfast", query: "", lines: [] };
    }
    return state.mealDraft;
  }

  function ensureMealNew() {
    if (!state.mealNew) {
      state.mealNew = { name: "", basis: "100", calories: "", carb_g: "", fat_g: "", protein_g: "", usual_qty: "" };
    }
    return state.mealNew;
  }

  function itemsAsFoods(items) {
    return (items || []).map((i) => {
      const each = String(i.serving_size || "").toLowerCase().endsWith("ea") || !(Number(i.serving_grams) > 0);
      const usual = Number(i.usual_qty || 0) || (each ? 1 : 100);
      return {
        id: i.id,
        name: i.name,
        calories: Number(i.calories || 0),
        protein_g: Number(i.protein_g || 0),
        carb_g: Number(i.carb_g || 0),
        fat_g: Number(i.fat_g || 0),
        serving_size: i.serving_size || "",
        serving_grams: Number(i.serving_grams || 0),
        usual_qty: usual,
        unit: each ? "ea" : "g",
        each,
      };
    }).filter((f) => f.id);
  }

  function savedMeals() {
    const pools = [state.macros?.meals, state.meals?.meals, state.food?.meals];
    let best = [];
    for (const pool of pools) {
      if (Array.isArray(pool) && pool.length > best.length) best = pool;
    }
    return best;
  }

  function adoptMeals(...sources) {
    let meals = savedMeals();
    let foods = [];
    for (const src of sources) {
      if (!src) continue;
      if (Array.isArray(src.meals) && src.meals.length > meals.length) meals = src.meals;
      if (Array.isArray(src.foods) && src.foods.length > foods.length) foods = src.foods;
    }
    state.meals = { meals, foods: foods.length ? foods : mealFoods() };
  }

  function mealFoods() {
    if (state.meals?.foods?.length) return state.meals.foods;
    if (state.macros?.foods?.length) return state.macros.foods;
    return itemsAsFoods(state.food?.items || []);
  }

  function mealTotalsOf(meal) {
    if (meal?.totals) return meal.totals;
    return mealTotals(meal?.lines || []);
  }

  function mealFood(id) {
    return mealFoods().find((f) => f.id === id) || null;
  }

  function mealHits() {
    const q = (ensureMealDraft().query || "").trim().toLowerCase();
    const foods = mealFoods();
    if (!q) return [];
    return foods.filter((f) => (f.name || "").toLowerCase().includes(q)).slice(0, 24);
  }

  function mealTotals(lines) {
    return (lines || []).reduce((sum, line) => {
      const live = scaledFood(mealFood(line.item_id), line.qty);
      sum.calories += live.calories;
      sum.protein_g += live.protein_g;
      sum.carb_g += live.carb_g;
      sum.fat_g += live.fat_g;
      return sum;
    }, { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 });
  }

  function cloneMealLines(meal) {
    return (meal?.lines || []).map((line) => ({ item_id: line.item_id, qty: line.qty }));
  }

  function mealIngHTML(lines) {
    return (lines || []).map((line, i) => {
      const food = mealFood(line.item_id);
      const live = scaledFood(food, line.qty);
      return `
        <div class="meal-ing" data-line="${i}">
          <div class="name">
            <strong>${esc(food?.name || "Item")}</strong>
            <span>${num(live.calories, 0)} kcal · P${num(live.protein_g, 0)} C${num(live.carb_g, 0)} F${num(live.fat_g, 0)}</span>
          </div>
          <div class="qty-row">
            <input class="field" data-qty="${i}" inputmode="decimal" value="${esc(line.qty)}">
            <span class="unit-pill">${esc(food?.unit || "g")}</span>
          </div>
          <button type="button" class="kill" data-drop="${i}" aria-label="Remove">×</button>
        </div>`;
    }).join("") || `<div class="empty">No ingredients yet. Add from the list or create a new item.</div>`;
  }

  function paintMealLive(root, lines) {
    const scope = root || $("screen") || document;
    const list = lines || ensureMealDraft().lines;
    const totals = mealTotals(list);
    const line = scope.querySelector("#mealTotalLine");
    if (line) {
      line.textContent = `${num(totals.calories, 0)} kcal · P${num(totals.protein_g, 0)} C${num(totals.carb_g, 0)} F${num(totals.fat_g, 0)}`;
    }
    const count = scope.querySelector("#mealCountLine");
    if (count) count.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;
    scope.querySelectorAll(".meal-ing").forEach((row) => {
      const i = Number(row.dataset.line);
      const item = list[i];
      if (!item) return;
      const live = scaledFood(mealFood(item.item_id), item.qty);
      const span = row.querySelector(".name span");
      if (span) span.textContent = `${num(live.calories, 0)} kcal · P${num(live.protein_g, 0)} C${num(live.carb_g, 0)} F${num(live.fat_g, 0)}`;
    });
  }

  function pushMealLine(lines, id) {
    const food = mealFood(id) || (state.macros?.foods || []).find((f) => f.id === id);
    if (!food || !lines) return false;
    lines.push({ item_id: food.id, qty: food.usual_qty });
    return true;
  }

  function wireIngEditors(root, lines, redraw) {
    if (!root || !lines) return;
    root.querySelectorAll("[data-qty]").forEach((input) => {
      input.oninput = () => {
        const i = Number(input.dataset.qty);
        if (lines[i]) lines[i].qty = input.value;
        paintMealLive(root, lines);
      };
    });
    root.querySelectorAll("[data-drop]").forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.drop);
        lines.splice(i, 1);
        redraw();
      };
    });
  }

  function foodMealsBody() {
    const draft = ensureMealDraft();
    const saved = savedMeals();
    const hasCatalog = Boolean(state.meals || state.food || state.macros);
    if (!hasCatalog && !state.mealErr) {
      return `<div class="empty">Loading meals…</div>`;
    }
    const lines = draft.lines || [];
    const totals = mealTotals(lines);
    const hits = mealHits();
    const q = (draft.query || "").trim();
    const slot = draft.slot || "breakfast";
    const slotLabel = slot[0].toUpperCase() + slot.slice(1);
    const neu = ensureMealNew();
    return `
      <div class="meal-page">
        <div class="meal-saved">
          <button type="button" class="pill ${draft.id ? "" : "on"}" id="mealNew">New</button>
          ${saved.map((m) => `
            <button type="button" class="pill ${draft.id === m.id ? "on" : ""}" data-meal="${esc(m.id)}">${esc(m.name)}</button>
          `).join("")}
        </div>
        <div class="meal-composer">
          ${state.mealErr ? `<p class="err">${esc(state.mealErr)}</p>` : ""}
          ${state.mealNote ? `<p class="meal-note">${esc(state.mealNote)}</p>` : ""}
          <input class="field" id="mealName" placeholder="meal name  (burrito bowl, oats, …)" value="${esc(draft.name)}" autocomplete="off">
          <div class="meal-slot">
            ${[["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"]].map(([id, label]) => (
              `<button type="button" class="${slot === id ? "on" : ""}" data-slot="${id}">${label}</button>`
            )).join("")}
          </div>
          <p class="section-label">Add from items</p>
          <input class="field search-field" id="mealSearch" type="search" placeholder="search items" value="${esc(draft.query)}" autocomplete="off">
          ${q ? `<div class="group meal-hits" id="mealHits">
            ${hits.map((f) => `
              <button type="button" class="row" data-add-food="${esc(f.id)}" style="width:100%;text-align:left">
                <div class="name"><strong>${esc(f.name)}</strong><span>usual ${esc(qtyLabel(f.usual_qty, f.unit))} · ${num(f.calories, 0)} kcal</span></div>
                <div class="amt">Add</div>
              </button>`).join("") || `<div class="empty">No match. Use New item below.</div>`}
          </div>` : `<div id="mealHits"></div>`}
          <p class="section-label">New item</p>
          <div class="meal-new">
            <input class="field" id="mNewName" placeholder="new item" value="${esc(neu.name || "")}" autocomplete="off">
            <div class="meal-new-nums">
              <label><span>g or ea</span><input class="field" id="mNewBasis" inputmode="decimal" value="${esc(neu.basis || "100")}"></label>
              <label><span>kcal</span><input class="field" id="mNewKcal" inputmode="decimal" value="${esc(neu.calories || "")}" placeholder="kcal"></label>
              <label><span>C</span><input class="field" id="mNewC" inputmode="decimal" value="${esc(neu.carb_g || "")}" placeholder="C"></label>
              <label><span>F</span><input class="field" id="mNewF" inputmode="decimal" value="${esc(neu.fat_g || "")}" placeholder="F"></label>
              <label><span>P</span><input class="field" id="mNewP" inputmode="decimal" value="${esc(neu.protein_g || "")}" placeholder="P"></label>
              <label><span>usual qty</span><input class="field" id="mNewUsual" inputmode="decimal" value="${esc(neu.usual_qty || "")}" placeholder="qty"></label>
            </div>
            <button type="button" class="ghost" id="mealAddNew"${state.mealBusy ? " disabled" : ""}>Add new</button>
          </div>
          <p class="section-label">Ingredients</p>
          <div class="meal-lines" id="mealLines">
            ${mealIngHTML(lines)}
          </div>
          <div class="meal-totals">
            <p id="mealTotalLine">${num(totals.calories, 0)} kcal · P${num(totals.protein_g, 0)} C${num(totals.carb_g, 0)} F${num(totals.fat_g, 0)}</p>
            <span id="mealCountLine">${lines.length} item${lines.length === 1 ? "" : "s"}</span>
          </div>
          <div class="meal-actions">
            <button type="button" class="ghost" id="saveMeal"${state.mealBusy ? " disabled" : ""}>Save meal</button>
            <button type="button" class="primary" id="logMeal"${state.mealBusy ? " disabled" : ""}>Log ${esc(slotLabel)}</button>
          </div>
          ${draft.id ? `<button type="button" class="ghost" id="deleteMeal"${state.mealBusy ? " disabled" : ""}>Delete saved</button>` : ""}
        </div>
      </div>`;
  }

  function paintMealHits() {
    const box = $("mealHits");
    if (!box) return;
    const draft = ensureMealDraft();
    const q = (draft.query || "").trim();
    const hits = mealHits();
    if (!q) {
      box.className = "";
      box.innerHTML = "";
      return;
    }
    box.className = "group meal-hits";
    box.innerHTML = hits.map((f) => `
      <button type="button" class="row" data-add-food="${esc(f.id)}" style="width:100%;text-align:left">
        <div class="name"><strong>${esc(f.name)}</strong><span>usual ${esc(qtyLabel(f.usual_qty, f.unit))} · ${num(f.calories, 0)} kcal</span></div>
        <div class="amt">Add</div>
      </button>`).join("") || `<div class="empty">No match. Use New item below.</div>`;
    box.querySelectorAll("[data-add-food]").forEach((btn) => {
      btn.onclick = () => addMealFood(btn.dataset.addFood);
    });
  }

  function addMealFood(id) {
    vibrate();
    const draft = ensureMealDraft();
    if (!pushMealLine(draft.lines, id)) return;
    draft.query = "";
    state.mealNote = "";
    renderFood();
  }

  function loadSavedMeal(id) {
    const meal = savedMeals().find((m) => m.id === id);
    if (!meal) return;
    vibrate();
    state.mealDraft = {
      id: meal.id,
      name: meal.name || "",
      slot: ensureMealDraft().slot || "breakfast",
      query: "",
      lines: (meal.lines || []).map((line) => ({ item_id: line.item_id, qty: line.qty })),
    };
    state.mealErr = "";
    state.mealNote = "";
    renderFood();
  }

  function clearMealDraft() {
    vibrate();
    state.mealDraft = { id: "", name: "", slot: ensureMealDraft().slot || "breakfast", query: "", lines: [] };
    state.mealErr = "";
    state.mealNote = "";
    renderFood();
  }

  function wireFoodMeals() {
    const draft = ensureMealDraft();
    const name = $("mealName");
    if (name) {
      name.oninput = () => { draft.name = name.value; };
    }
    const search = $("mealSearch");
    if (search) {
      search.oninput = () => {
        draft.query = search.value;
        paintMealHits();
      };
    }
    $("mealNew") && ($("mealNew").onclick = () => clearMealDraft());
    $("screen").querySelectorAll("[data-meal]").forEach((btn) => {
      btn.onclick = () => loadSavedMeal(btn.dataset.meal);
    });
    $("screen").querySelectorAll("[data-slot]").forEach((btn) => {
      btn.onclick = () => {
        draft.slot = btn.dataset.slot;
        state.mealNote = "";
        renderFood();
      };
    });
    paintMealHits();
    wireIngEditors($("screen"), draft.lines, () => renderFood());
    const neu = ensureMealNew();
    const bindNew = (id, key) => {
      const input = $(id);
      if (!input) return;
      input.oninput = () => { neu[key] = input.value; };
    };
    bindNew("mNewName", "name");
    bindNew("mNewBasis", "basis");
    bindNew("mNewKcal", "calories");
    bindNew("mNewC", "carb_g");
    bindNew("mNewF", "fat_g");
    bindNew("mNewP", "protein_g");
    bindNew("mNewUsual", "usual_qty");
    const addNew = $("mealAddNew");
    if (addNew) addNew.onclick = () => addMealNewItem();
    const save = $("saveMeal");
    if (save) save.onclick = () => saveMealDraft();
    const log = $("logMeal");
    if (log) log.onclick = () => logMealDraft();
    const drop = $("deleteMeal");
    if (drop) drop.onclick = () => deleteMealDraft();
  }

  async function addMealNewItem() {
    const d = ensureMealNew();
    const name = String(d.name || "").trim();
    if (!name) {
      state.mealErr = "Name the item first.";
      renderFood();
      return;
    }
    if (state.mealBusy) return;
    state.mealBusy = true;
    state.mealErr = "";
    state.mealNote = "";
    try {
      const data = await LifeAPI.mealItem({
        name,
        basis: d.basis || "100",
        calories: d.calories,
        carb_g: d.carb_g,
        fat_g: d.fat_g,
        protein_g: d.protein_g,
        usual_qty: d.usual_qty || d.basis || "100",
      });
      state.meals = data;
      if (data.foods && state.macros) state.macros.foods = data.foods;
      const food = data.food;
      if (food?.id) {
        ensureMealDraft().lines.push({
          item_id: food.id,
          qty: Number(d.usual_qty || food.usual_qty || d.basis || 0),
        });
      }
      state.mealNew = { name: "", basis: "100", calories: "", carb_g: "", fat_g: "", protein_g: "", usual_qty: "" };
    } catch (err) {
      state.mealErr = err.message || "Could not add item";
    }
    state.mealBusy = false;
    renderFood();
  }

  async function saveMealDraft() {
    const draft = ensureMealDraft();
    state.mealBusy = true;
    state.mealErr = "";
    state.mealNote = "";
    try {
      const data = await LifeAPI.mealSave({
        id: draft.id,
        name: draft.name,
        lines: draft.lines,
      });
      state.meals = data;
      if (data.meal) {
        draft.id = data.meal.id;
        draft.name = data.meal.name || draft.name;
      }
      state.mealNote = "Saved";
    } catch (err) {
      state.mealErr = err.message || "Could not save meal";
    }
    state.mealBusy = false;
    renderFood();
  }

  async function logMealDraft() {
    const draft = ensureMealDraft();
    state.mealBusy = true;
    state.mealErr = "";
    state.mealNote = "";
    try {
      const data = await logSavedMeal({
        id: draft.id,
        name: draft.name,
        lines: draft.lines,
        meal: draft.slot,
        date: todayISO(),
      });
      if (data.meals) state.meals = data;
      if (data.macros) {
        state.macros = data.macros;
        if (data.macros.date) state.macroDate = data.macros.date;
      } else if (data.day) {
        state.macros = data;
        if (data.date) state.macroDate = data.date;
      }
      if (data.foods && state.meals) state.meals.foods = data.foods;
      state.mealNote = `Logged to ${draft.slot || "breakfast"}`;
    } catch (err) {
      state.mealErr = err.message || "Could not log meal";
    }
    state.mealBusy = false;
    renderFood();
  }

  async function logSavedMeal(recipe) {
    const body = {
      recipe_id: recipe.id || "",
      id: recipe.id || "",
      name: recipe.name || "",
      lines: recipe.lines || [],
      meal: recipe.meal,
      date: recipe.date || todayISO(),
      deduct: true,
    };
    try {
      return await LifeAPI.mealLog(body);
    } catch (err) {
      if (err.status === 404) return LifeAPI.macroLog(body);
      throw err;
    }
  }

  async function loadMeals() {
    const fromFood = state.food?.meals;
    const fromMacros = state.macros?.meals;
    if (fromFood || fromMacros) {
      state.meals = {
        meals: fromFood || fromMacros || [],
        foods: mealFoods(),
      };
      state.mealErr = "";
      return;
    }
    if (!state.food && !state.macros) return;
    if (state.mealBusy) return;
    state.mealBusy = true;
    try {
      state.meals = await LifeAPI.meals();
      state.mealErr = "";
    } catch (_) {
      state.meals = { meals: [], foods: mealFoods() };
      state.mealErr = "";
    } finally {
      state.mealBusy = false;
    }
    const { route, tab } = hashRoute();
    if (route === "food" && (tab || state.foodTab) === "meals") renderFood();
  }

  async function deleteMealDraft() {
    const draft = ensureMealDraft();
    if (!draft.id) return;
    state.mealBusy = true;
    state.mealErr = "";
    try {
      const data = await LifeAPI.mealDelete({ id: draft.id });
      state.meals = data;
      state.mealDraft = { id: "", name: "", slot: draft.slot || "breakfast", query: "", lines: [] };
      state.mealNote = "Deleted";
    } catch (err) {
      state.mealErr = err.message || "Could not delete meal";
    }
    state.mealBusy = false;
    renderFood();
  }

  function bandCopy(band, unit) {
    const status = band?.status || "empty";
    if (status === "empty") return "—";
    if (status === "hit") return "Hit";
    const delta = Math.abs(Number(band.delta || 0));
    const label = unit === "kcal" ? num(delta, 0) : num(delta, 0) + "g";
    return status === "over" ? `${label} over` : `${label} left`;
  }

  function renderMacros() {
    const data = state.macros;
    const date = state.macroDate || todayISO();
    setChrome(prettyDay(date), "Macros");
    if (!data || data.date !== date) {
      $("screen").innerHTML = `<div class="empty">Loading…</div>`;
      return;
    }
    const day = data.day || {};
    const week = data.week || {};
    const settings = data.settings || {};
    const today = data.today || todayISO();
    const days = week.days || [];
    const cal = day.calories || {};
    const calStatus = cal.status === "empty"
      ? "Nothing logged"
      : cal.status === "hit"
        ? "Calories hit"
        : cal.status === "over"
          ? `${num(Math.abs(cal.delta || 0), 0)} over`
          : `${num(Math.abs(cal.delta || 0), 0)} left`;
    const meals = [
      ["breakfast", "Breakfast"],
      ["lunch", "Lunch"],
      ["dinner", "Dinner"],
    ];

    $("screen").innerHTML = `
      <div class="stack macros-page">
        <div class="dow-wrap">
          <button type="button" class="dow-shift" id="prevWeek" aria-label="Previous week">‹</button>
          <div class="dow">
            ${days.map((d) => {
              const on = d.date === date ? "on" : "";
              const isToday = d.date === today ? "today" : "";
              const future = d.date > today ? "future" : "";
              const logged = (d.totals && d.totals.count) ? "logged" : "";
              const hit = d.hit && d.hit.all ? "hit" : "";
              const n = Number(String(d.date).slice(-2));
              return `<button type="button" class="dow-day ${on} ${isToday} ${future} ${logged} ${hit}" data-day="${esc(d.date)}"><b>${esc(d.label)}</b><i>${n}</i></button>`;
            }).join("")}
          </div>
          <button type="button" class="dow-shift" id="nextWeek" aria-label="Next week">›</button>
        </div>
        <div class="macros-board">
          <div class="macros-side">
            <div class="cal-hero">
              ${macroRingHTML(day, settings)}
              <p class="cal-status ${esc(cal.status || "empty")}">${esc(calStatus)}</p>
            </div>
            <button type="button" class="targets-btn" id="targetsBtn">
              <span>Daily targets</span>
              <b>${num(settings.calories || 0, 0)} kcal · ${num(settings.protein_pct || 0, 0)} / ${num(settings.carb_pct || 0, 0)} / ${num(settings.fat_pct || 0, 0)}</b>
            </button>
          </div>
          <div class="meals-row">
            ${meals.map(([id, label]) => {
              const rows = (day.meals && day.meals[id]) || [];
              const kcal = rows.reduce((s, r) => s + Number(r.calories || 0), 0);
              return `
                <div class="meal-block">
                  <div class="meal-head">
                    <h3>${label}${rows.length ? `<em>${num(kcal, 0)} kcal</em>` : ""}</h3>
                    <button type="button" class="add-mini" data-add="${id}" aria-label="Log ${label}">+</button>
                  </div>
                  <div class="meal-body">
                    ${rows.map((r) => `
                      <div class="row">
                        <div class="name"><strong>${esc(r.item_name)}</strong><span>${esc(qtyLabel(r.qty, r.unit))} · P${num(r.protein_g, 0)} C${num(r.carb_g, 0)} F${num(r.fat_g, 0)}</span></div>
                        <div class="amt">${num(r.calories, 0)}</div>
                        <button type="button" class="kill" data-del="${esc(r.id)}" aria-label="Remove">×</button>
                      </div>`).join("") || `<div class="empty" style="padding:8px 14px 18px">Nothing yet.</div>`}
                  </div>
                </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;
    $("screen").querySelectorAll("[data-day]").forEach((btn) => {
      btn.onclick = () => { vibrate(); go("macros", btn.dataset.day); };
    });
    const prev = $("prevWeek");
    const next = $("nextWeek");
    if (prev) prev.onclick = () => { vibrate(); go("macros", shiftDate(date, -7)); };
    if (next) next.onclick = () => { vibrate(); go("macros", shiftDate(date, 7)); };
    $("screen").querySelectorAll("[data-add]").forEach((btn) => {
      btn.onclick = () => openLogSheet(btn.dataset.add);
    });
    $("screen").querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = () => deleteMacroLog(btn.dataset.del);
    });
    const targets = $("targetsBtn");
    if (targets) targets.onclick = () => openTargetsSheet();
    if (state.macroSheet === "log") drawLogSheet();
    if (state.macroSheet === "targets") drawTargetsSheet();
  }

  function closeSheet() {
    document.getElementById("sheet")?.remove();
    state.macroSheet = "";
    state.mealSheet = "";
    state.macroPicked = null;
    state.macroQuery = "";
    state.macroQty = "";
    state.macroErr = "";
    state.targetsDraft = null;
    state.macroMode = "pick";
    state.macroNew = null;
    state.macroPickedRecipe = null;
    state.macroLogLines = null;
  }

  function openLogSheet(meal) {
    vibrate();
    state.macroSheet = "log";
    state.macroMeal = meal;
    state.macroPicked = null;
    state.macroQuery = "";
    state.macroQty = "";
    state.macroErr = "";
    state.macroMode = "pick";
    state.macroNew = null;
    state.macroPickedRecipe = null;
    state.macroLogLines = null;
    state.macroLogTab = savedMeals().length ? "meals" : "foods";
    drawLogSheet();
  }

  function blankNewItem(name) {
    return {
      name: name || "",
      unit: "g",
      basis: "100",
      calories: "",
      protein_g: "",
      carb_g: "",
      fat_g: "",
      usual_qty: "100",
      qty: "100",
    };
  }

  function openNewItem() {
    vibrate();
    state.macroMode = "new";
    state.macroNew = blankNewItem((state.macroQuery || "").trim());
    state.macroErr = "";
    drawLogSheet();
  }

  function openTargetsSheet() {
    vibrate();
    const s = state.macros?.settings || {};
    state.macroSheet = "targets";
    state.targetsDraft = {
      calories: Math.round(Number(s.calories || 2500)),
      protein_pct: Math.round(Number(s.protein_pct || 40) * 10) / 10,
      carb_pct: Math.round(Number(s.carb_pct || 30) * 10) / 10,
      fat_pct: Math.round(Number(s.fat_pct || 30) * 10) / 10,
    };
    state.macroErr = "";
    drawTargetsSheet();
  }

  function mealLinesPayload(lines) {
    return (lines || []).map((line) => ({
      item_id: line.item_id,
      qty: Number(line.qty),
    })).filter((line) => line.item_id && Number.isFinite(line.qty) && line.qty > 0);
  }

  function drawLogSheet() {
    document.getElementById("sheet")?.remove();
    const foods = state.macros?.foods || mealFoods();
    const recipes = savedMeals();
    const mealLabel = state.macroMeal[0].toUpperCase() + state.macroMeal.slice(1);
    const el = document.createElement("div");
    el.id = "sheet";
    if (state.macroMode === "new") {
      drawNewItemSheet(el, mealLabel);
      return;
    }
    const picked = state.macroPicked;
    const recipe = state.macroPickedRecipe;
    if (recipe && !state.macroLogLines) state.macroLogLines = cloneMealLines(recipe);
    const logLines = recipe ? (state.macroLogLines || []) : null;
    const qty = state.macroQty === "" && picked ? picked.usual_qty : state.macroQty;
    const live = picked ? scaledFood(picked, qty) : null;
    const logTot = logLines ? mealTotals(logLines) : null;
    const q = (state.macroQuery || "").trim().toLowerCase();
    const foodHits = q ? foods.filter((f) => (f.name || "").toLowerCase().includes(q)).slice(0, 16) : [];
    const mealHits = (!recipe && q) ? recipes.filter((m) => (m.name || "").toLowerCase().includes(q)).slice(0, 12) : [];
    el.className = "sheet sheet-log";
    const hitRows = [
      ...mealHits.map((m) => {
        const tot = mealTotalsOf(m);
        return `
          <button type="button" class="row" data-recipe="${esc(m.id)}" style="width:100%;text-align:left">
            <div class="name"><strong>${esc(m.name)}</strong><span>${(m.lines || []).length} items · ${num(tot.calories, 0)} kcal</span></div>
            <div class="amt">Meal</div>
          </button>`;
      }),
      ...foodHits.map((f) => `
        <button type="button" class="row" data-food="${esc(f.id)}" style="width:100%;text-align:left">
          <div class="name"><strong>${esc(f.name)}</strong><span>usual ${esc(qtyLabel(f.usual_qty, f.unit))} · ${num(f.calories, 0)} kcal</span></div>
          <div class="amt">${recipe ? "Add" : esc(f.unit)}</div>
        </button>`),
    ].join("");
    el.innerHTML = `
      <div class="sheet-top">
        <h2>Log ${esc(mealLabel)}</h2>
        <button type="button" class="ghost" id="sheetClose">Close</button>
      </div>
      <div class="sheet-body">
        ${state.macroErr ? `<p class="err">${esc(state.macroErr)}</p>` : ""}
        <input class="field search-field" id="foodSearch" type="search" placeholder="${recipe ? "Search to add an ingredient" : "Search foods or meals"}" value="${esc(state.macroQuery)}" autocomplete="off" enterkeyhint="search">
        ${recipe ? `
          <div class="preview">
            <input class="field" id="logMealName" placeholder="meal name" value="${esc(recipe.name || "")}" autocomplete="off">
            <p class="log-hint">This log only, unless you save the recipe.</p>
          </div>
          <div class="meal-lines" id="logLines">${mealIngHTML(logLines)}</div>
          <div class="meal-totals">
            <p id="mealTotalLine">${num(logTot?.calories || 0, 0)} kcal · P${num(logTot?.protein_g || 0, 0)} C${num(logTot?.carb_g || 0, 0)} F${num(logTot?.fat_g || 0, 0)}</p>
            <span id="mealCountLine">${(logLines || []).length} item${(logLines || []).length === 1 ? "" : "s"}</span>
          </div>
        ` : ""}
        ${picked && !recipe ? `
          <div class="preview">
            <strong>${esc(picked.name)}</strong>
            <p>${esc(picked.serving_size || picked.unit)} · ${num(picked.calories, 0)} kcal · P${num(picked.protein_g, 0)} C${num(picked.carb_g, 0)} F${num(picked.fat_g, 0)}</p>
          </div>
          <div class="qty-row">
            <input class="field" id="foodQty" inputmode="decimal" value="${esc(qty)}">
            <span class="unit-pill">${esc(picked.unit)}</span>
          </div>
          <p class="hero-sub">${num(live?.calories || 0, 0)} kcal · P${num(live?.protein_g || 0, 0)} C${num(live?.carb_g || 0, 0)} F${num(live?.fat_g || 0, 0)}</p>
        ` : ""}
        <div class="group log-hits" id="logHits">
          ${q ? (hitRows || `<div class="empty">No match.</div>`) : `<div class="empty">${recipe ? "Search to add an ingredient." : "Search a food or meal."}${recipe ? "" : ` <button type="button" class="text-link" id="newMealBtn">New meal</button>`}</div>`}
        </div>
      </div>
      <div class="sheet-foot log-actions">
        <button type="button" class="ghost" id="newItemBtn">New item</button>
        ${recipe ? `<button type="button" class="ghost" id="saveMealFromLog"${state.macroBusy ? " disabled" : ""}>Save recipe</button>` : ""}
        ${recipe ? `<button type="button" class="primary" id="saveRecipeLog"${state.macroBusy ? " disabled" : ""}>Log</button>` : ""}
        ${picked && !recipe ? `<button type="button" class="primary" id="saveLog"${state.macroBusy ? " disabled" : ""}>Log</button>` : ""}
      </div>`;
    $("phone").appendChild(el);
    $("sheetClose").onclick = () => { closeSheet(); };
    const search = $("foodSearch");
    if (search) {
      search.oninput = () => {
        state.macroQuery = search.value;
        drawLogSheet();
        const next = $("foodSearch");
        if (next) {
          next.focus();
          const n = next.value.length;
          next.setSelectionRange(n, n);
        }
      };
    }
    const newMeal = $("newMealBtn");
    if (newMeal) {
      newMeal.onclick = () => {
        vibrate();
        state.macroPickedRecipe = { id: "", name: "", lines: [] };
        state.macroPicked = null;
        state.macroLogLines = [];
        state.macroQuery = "";
        drawLogSheet();
      };
    }
    el.querySelectorAll("[data-recipe]").forEach((btn) => {
      btn.onclick = () => {
        const meal = recipes.find((m) => m.id === btn.dataset.recipe);
        if (!meal) return;
        vibrate();
        state.macroPickedRecipe = meal;
        state.macroPicked = null;
        state.macroLogLines = cloneMealLines(meal);
        state.macroQuery = "";
        drawLogSheet();
      };
    });
    el.querySelectorAll("[data-food]").forEach((btn) => {
      btn.onclick = () => {
        const food = foods.find((f) => f.id === btn.dataset.food);
        if (!food) return;
        vibrate();
        if (state.macroPickedRecipe) {
          state.macroLogLines = state.macroLogLines || [];
          pushMealLine(state.macroLogLines, food.id);
          state.macroQuery = "";
          drawLogSheet();
          return;
        }
        state.macroPicked = food;
        state.macroPickedRecipe = null;
        state.macroLogLines = null;
        state.macroQty = food.usual_qty;
        state.macroQuery = "";
        drawLogSheet();
      };
    });
    if (logLines) wireIngEditors(el, logLines, () => drawLogSheet());
    const nameEl = $("logMealName");
    if (nameEl && recipe) {
      nameEl.oninput = () => { recipe.name = nameEl.value; };
    }
    const qtyEl = $("foodQty");
    const liveEl = el.querySelector(".hero-sub");
    if (qtyEl) {
      qtyEl.oninput = () => {
        state.macroQty = qtyEl.value;
        const next = scaledFood(picked, qtyEl.value);
        if (liveEl) {
          liveEl.textContent = `${num(next.calories || 0, 0)} kcal · P${num(next.protein_g || 0, 0)} C${num(next.carb_g || 0, 0)} F${num(next.fat_g || 0, 0)}`;
        }
      };
    }
    const newItem = $("newItemBtn");
    if (newItem) newItem.onclick = () => openNewItem();
    const save = $("saveLog");
    if (save) save.onclick = () => saveMacroLog();
    const saveRecipe = $("saveRecipeLog");
    if (saveRecipe) saveRecipe.onclick = () => saveRecipeLog();
    const saveMealBtn = $("saveMealFromLog");
    if (saveMealBtn) saveMealBtn.onclick = () => saveMealFromLog();
  }

  function drawNewItemSheet(el, mealLabel) {
    const d = state.macroNew || blankNewItem();
    const unit = d.unit === "ea" ? "ea" : "g";
    const kcalIn = Number(d.calories);
    const derived = Number(d.carb_g || 0) * 4 + Number(d.fat_g || 0) * 9 + Number(d.protein_g || 0) * 4;
    const kcal = Number.isFinite(kcalIn) && kcalIn > 0 ? kcalIn : derived;
    el.className = "sheet sheet-new";
    el.innerHTML = `
      <div class="sheet-top">
        <h2>New item</h2>
        <button type="button" class="ghost" id="sheetBack">Back</button>
      </div>
      <div class="sheet-body">
        ${state.macroErr ? `<p class="err">${esc(state.macroErr)}</p>` : ""}
        <p class="section-label">Name</p>
        <input class="field" id="nName" placeholder="Food name" value="${esc(d.name)}">
        <p class="section-label">Serving</p>
        <div class="unit-toggle">
          <button type="button" class="${unit === "g" ? "on" : ""}" data-unit="g">Grams</button>
          <button type="button" class="${unit === "ea" ? "on" : ""}" data-unit="ea">Each</button>
        </div>
        <div class="qty-row">
          <input class="field" id="nBasis" inputmode="decimal" value="${esc(d.basis)}" aria-label="Serving size">
          <span class="unit-pill">${unit === "ea" ? "ea" : "g"}</span>
        </div>
        <p class="section-label">Per serving</p>
        <div class="grid-4">
          <input class="field" id="nKcal" inputmode="decimal" value="${esc(d.calories)}" placeholder="kcal">
          <input class="field" id="nP" inputmode="decimal" value="${esc(d.protein_g)}" placeholder="P">
          <input class="field" id="nC" inputmode="decimal" value="${esc(d.carb_g)}" placeholder="C">
          <input class="field" id="nF" inputmode="decimal" value="${esc(d.fat_g)}" placeholder="F">
        </div>
        <div class="grid-4" style="padding:0 4px">
          <span class="qty">kcal</span><span class="qty">P</span><span class="qty">C</span><span class="qty">F</span>
        </div>
        <p class="section-label">Usual amount</p>
        <div class="duo">
          <input class="field" id="nUsual" inputmode="decimal" value="${esc(d.usual_qty)}" aria-label="Usual amount">
          <input class="field" id="nQty" inputmode="decimal" value="${esc(d.qty)}" aria-label="Amount to log">
        </div>
        <div class="duo" style="padding:0 4px">
          <span class="qty">usual ${unit}</span><span class="qty">${state.macroPickedRecipe ? "add" : "log"} ${unit}</span>
        </div>
        <p class="target-grams" id="nPreview">${num(kcal, 0)} kcal / serving · saved to items${state.macroPickedRecipe ? "" : `, optional log to ${esc(mealLabel)}`}</p>
      </div>
      <div class="sheet-foot log-actions">
        <button class="primary" id="saveNewItem" type="button"${state.macroBusy ? " disabled" : ""}>Save item</button>
        <button class="ghost" id="saveNew" type="button"${state.macroBusy ? " disabled" : ""}>${state.macroPickedRecipe ? "Add to this log" : `Log ${esc(mealLabel)}`}</button>
      </div>`;
    $("phone").appendChild(el);
    $("sheetBack").onclick = () => {
      state.macroMode = "pick";
      state.macroErr = "";
      drawLogSheet();
    };
    const refresh = () => {
      const draft = state.macroNew;
      const kIn = Number(draft.calories);
      const next = Number(draft.carb_g || 0) * 4 + Number(draft.fat_g || 0) * 9 + Number(draft.protein_g || 0) * 4;
      const shown = Number.isFinite(kIn) && kIn > 0 ? kIn : next;
      const prev = $("nPreview");
      if (prev) prev.textContent = `${num(shown, 0)} kcal / serving · saved to items${state.macroPickedRecipe ? "" : `, optional log to ${mealLabel}`}`;
    };
    const bind = (id, key) => {
      const input = $(id);
      if (!input) return;
      input.oninput = () => {
        state.macroNew[key] = input.value;
        if (key === "usual_qty" && (state.macroNew.qty === "" || Number(state.macroNew.qty) === Number(state.macroNew.basis))) {
          state.macroNew.qty = input.value;
          const qtyEl = $("nQty");
          if (qtyEl) qtyEl.value = input.value;
        }
        refresh();
      };
    };
    bind("nName", "name");
    bind("nBasis", "basis");
    bind("nKcal", "calories");
    bind("nP", "protein_g");
    bind("nC", "carb_g");
    bind("nF", "fat_g");
    bind("nUsual", "usual_qty");
    bind("nQty", "qty");
    el.querySelectorAll("[data-unit]").forEach((btn) => {
      btn.onclick = () => {
        const next = btn.dataset.unit;
        state.macroNew.unit = next;
        if (next === "ea") {
          state.macroNew.basis = "1";
          if (!state.macroNew.usual_qty || Number(state.macroNew.usual_qty) === 100) state.macroNew.usual_qty = "1";
          if (!state.macroNew.qty || Number(state.macroNew.qty) === 100) state.macroNew.qty = state.macroNew.usual_qty || "1";
        } else {
          state.macroNew.basis = state.macroNew.basis === "1" ? "100" : (state.macroNew.basis || "100");
          if (!state.macroNew.usual_qty || Number(state.macroNew.usual_qty) === 1) state.macroNew.usual_qty = state.macroNew.basis || "100";
          if (!state.macroNew.qty || Number(state.macroNew.qty) === 1) state.macroNew.qty = state.macroNew.usual_qty || "100";
        }
        drawLogSheet();
      };
    });
    $("saveNewItem").onclick = () => saveNewItemOnly();
    $("saveNew").onclick = () => saveNewItemLog();
  }

  function drawTargetsSheet() {
    document.getElementById("sheet")?.remove();
    const d = state.targetsDraft || { calories: 2500, protein_pct: 40, carb_pct: 30, fat_pct: 30 };
    const total = Number(d.protein_pct || 0) + Number(d.carb_pct || 0) + Number(d.fat_pct || 0);
    const ok = Math.abs(total - 100) <= 0.51;
    const cal = Math.max(1, Number(d.calories || 0));
    const pG = cal * Number(d.protein_pct || 0) / 100 / 4;
    const cG = cal * Number(d.carb_pct || 0) / 100 / 4;
    const fG = cal * Number(d.fat_pct || 0) / 100 / 9;
    const el = document.createElement("div");
    el.id = "sheet";
    el.className = "sheet sheet-fit";
    el.innerHTML = `
      <div class="sheet-top">
        <h2>Daily targets</h2>
        <button type="button" class="ghost" id="sheetClose">Close</button>
      </div>
      <div class="sheet-body">
        ${state.macroErr ? `<p class="err">${esc(state.macroErr)}</p>` : ""}
        <label class="stack-field">
          <span class="section-label">Calories</span>
          <input class="field" id="tCal" inputmode="numeric" value="${esc(d.calories)}">
        </label>
        <p class="section-label">Split must add to 100%</p>
        <div class="split">
          <label class="stack-field">
            <span class="section-label">Protein %</span>
            <input class="field" id="tP" inputmode="decimal" value="${esc(d.protein_pct)}" aria-label="Protein percent">
          </label>
          <label class="stack-field">
            <span class="section-label">Carbs %</span>
            <input class="field" id="tC" inputmode="decimal" value="${esc(d.carb_pct)}" aria-label="Carb percent">
          </label>
          <label class="stack-field">
            <span class="section-label">Fat %</span>
            <input class="field" id="tF" inputmode="decimal" value="${esc(d.fat_pct)}" aria-label="Fat percent">
          </label>
        </div>
        <p class="total-line ${ok ? "ok" : "bad"}"><span>Total</span><span>${num(total, 1)}%</span></p>
        <p class="target-grams">${num(pG, 0)}g protein · ${num(cG, 0)}g carbs · ${num(fG, 0)}g fat</p>
      </div>
      <div class="sheet-foot">
        <button class="primary" id="saveTargets" type="button"${!ok || state.macroBusy ? " disabled" : ""}>Save targets</button>
      </div>`;
    $("phone").appendChild(el);
    $("sheetClose").onclick = () => { closeSheet(); };
    const refreshMath = () => {
      const d = state.targetsDraft;
      const total = Number(d.protein_pct || 0) + Number(d.carb_pct || 0) + Number(d.fat_pct || 0);
      const ok = Math.abs(total - 100) <= 0.51;
      const cal = Math.max(1, Number(d.calories || 0));
      const pG = cal * Number(d.protein_pct || 0) / 100 / 4;
      const cG = cal * Number(d.carb_pct || 0) / 100 / 4;
      const fG = cal * Number(d.fat_pct || 0) / 100 / 9;
      const line = el.querySelector(".total-line");
      if (line) {
        line.className = `total-line ${ok ? "ok" : "bad"}`;
        line.innerHTML = `<span>Total</span><span>${num(total, 1)}%</span>`;
      }
      const grams = el.querySelector(".target-grams");
      if (grams) grams.textContent = `${num(pG, 0)}g protein · ${num(cG, 0)}g carbs · ${num(fG, 0)}g fat`;
      const save = $("saveTargets");
      if (save) save.disabled = !ok || state.macroBusy;
    };
    const bind = (id, key) => {
      const input = $(id);
      if (!input) return;
      input.oninput = () => {
        state.targetsDraft[key] = input.value;
        refreshMath();
      };
    };
    bind("tCal", "calories");
    bind("tP", "protein_pct");
    bind("tC", "carb_pct");
    bind("tF", "fat_pct");
    const save = $("saveTargets");
    if (save) save.onclick = () => saveTargets();
  }

  async function addLogNewItem() {
    const d = ensureMealNew();
    const name = String(d.name || "").trim();
    if (!name) {
      state.macroErr = "Name the item first.";
      drawLogSheet();
      return;
    }
    if (state.macroBusy) return;
    state.macroBusy = true;
    state.macroErr = "";
    try {
      const data = await LifeAPI.mealItem({
        name,
        basis: d.basis || "100",
        calories: d.calories,
        carb_g: d.carb_g,
        fat_g: d.fat_g,
        protein_g: d.protein_g,
        usual_qty: d.usual_qty || d.basis || "100",
      });
      adoptMeals(data, state.macros, state.food);
      if (data.foods && state.macros) state.macros.foods = data.foods;
      const food = data.food;
      const qty = Number(d.usual_qty || food?.usual_qty || d.basis || 0);
      state.mealNew = { name: "", basis: "100", calories: "", carb_g: "", fat_g: "", protein_g: "", usual_qty: "" };
      if (food?.id && state.macroPickedRecipe) {
        state.macroLogLines = state.macroLogLines || [];
        state.macroLogLines.push({ item_id: food.id, qty });
      } else if (food?.id) {
        state.macroPicked = food;
        state.macroQty = qty;
        state.macroLogTab = "foods";
      }
    } catch (err) {
      state.macroErr = err.message || "Could not add item";
    }
    state.macroBusy = false;
    drawLogSheet();
  }

  async function saveMealFromLog() {
    const recipe = state.macroPickedRecipe;
    const lines = mealLinesPayload(state.macroLogLines || cloneMealLines(recipe));
    if (!recipe || state.macroBusy) return;
    const name = String(recipe.name || "").trim();
    if (!name) {
      state.macroErr = "Name the meal first.";
      drawLogSheet();
      return;
    }
    if (!lines.length) {
      state.macroErr = "Add at least one ingredient.";
      drawLogSheet();
      return;
    }
    state.macroBusy = true;
    state.macroErr = "";
    try {
      const data = await LifeAPI.mealSave({
        id: recipe.id || "",
        name,
        lines,
      });
      adoptMeals(data, state.macros, state.food);
      if (data.meal) {
        state.macroPickedRecipe = data.meal;
        state.macroLogLines = cloneMealLines(data.meal);
      }
      if (data.foods && state.macros) state.macros.foods = data.foods;
      if (Array.isArray(data.meals) && state.macros) state.macros.meals = data.meals;
      state.macroBusy = false;
      state.macroErr = "";
      drawLogSheet();
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not save meal";
      drawLogSheet();
    }
  }

  async function saveRecipeLog() {
    const recipe = state.macroPickedRecipe;
    const lines = mealLinesPayload(state.macroLogLines || cloneMealLines(recipe));
    if (!recipe || state.macroBusy) return;
    if (!lines.length) {
      state.macroErr = "Add at least one ingredient.";
      drawLogSheet();
      return;
    }
    state.macroBusy = true;
    state.macroErr = "";
    try {
      const data = await logSavedMeal({
        id: recipe.id || "",
        name: recipe.name || "",
        lines,
        meal: state.macroMeal,
        date: state.macroDate || todayISO(),
      });
      state.macros = data.macros || data;
      adoptMeals(state.macros, data, state.food);
      if (state.macros?.date) state.macroDate = state.macros.date;
      state.macroBusy = false;
      closeSheet();
      renderMacros();
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not log meal";
      drawLogSheet();
    }
  }

  async function saveMacroLog() {
    const food = state.macroPicked;
    const qty = Number(state.macroQty);
    if (!food || !Number.isFinite(qty) || qty <= 0 || state.macroBusy) return;
    state.macroBusy = true;
    try {
      const data = await LifeAPI.macroLog({
        item_id: food.id,
        qty,
        meal: state.macroMeal,
        date: state.macroDate || todayISO(),
      });
      state.macros = data;
      state.macroBusy = false;
      closeSheet();
      renderMacros();
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not save log";
      drawLogSheet();
    }
  }

  function rememberFood(food, data) {
    adoptMeals(data, state.macros, state.food);
    let foods = [];
    for (const list of [data?.macros?.foods, data?.foods, state.macros?.foods, state.meals?.foods]) {
      if (Array.isArray(list) && list.length > foods.length) foods = list.slice();
    }
    if (food?.id) {
      const i = foods.findIndex((row) => row.id === food.id);
      if (i >= 0) foods[i] = food;
      else foods.unshift(food);
    }
    if (!state.macros) state.macros = {};
    state.macros.foods = foods;
    if (state.meals) state.meals.foods = foods;
    else state.meals = { meals: savedMeals(), foods };
  }

  function newItemBody() {
    const d = state.macroNew || {};
    const name = String(d.name || "").trim();
    const unit = d.unit === "ea" ? "ea" : "g";
    const basis = Number(d.basis) || (unit === "ea" ? 1 : 100);
    const usual = Number(d.usual_qty) || basis;
    const qty = Number(d.qty || d.usual_qty || d.basis);
    return { d, name, unit, basis, usual, qty };
  }

  async function persistNewItem() {
    const p = newItemBody();
    if (!p.name) {
      throw new Error("Name the food first");
    }
    const data = await LifeAPI.mealItem({
      name: p.name,
      unit: p.unit,
      basis: p.basis,
      calories: Number(p.d.calories) || 0,
      protein_g: Number(p.d.protein_g) || 0,
      carb_g: Number(p.d.carb_g) || 0,
      fat_g: Number(p.d.fat_g) || 0,
      usual_qty: p.usual,
    });
    const food = data.food;
    rememberFood(food, data);
    LifeAPI.food().then((foodData) => { state.food = foodData; }).catch(() => {});
    return { food, data, qty: p.qty };
  }

  function closeNewItemSheet(food, qty) {
    state.macroBusy = false;
    state.macroMode = "pick";
    state.macroNew = null;
    state.macroErr = "";
    if (food?.id && state.macroPickedRecipe) {
      drawLogSheet();
      return;
    }
    if (food?.id) {
      state.macroPicked = food;
      state.macroPickedRecipe = null;
      state.macroLogLines = null;
      state.macroQty = Number.isFinite(qty) && qty > 0 ? qty : food.usual_qty;
      state.macroLogTab = "foods";
    }
    drawLogSheet();
  }

  async function saveNewItemOnly() {
    if (state.macroBusy) return;
    state.macroBusy = true;
    state.macroErr = "";
    try {
      const { food, qty } = await persistNewItem();
      if (!food?.id) throw new Error("Could not save item");
      closeNewItemSheet(food, qty);
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not save item";
      drawLogSheet();
    }
  }

  async function saveNewItemLog() {
    const p = newItemBody();
    if (!p.name) {
      state.macroErr = "Name the food first";
      drawLogSheet();
      return;
    }
    if (!Number.isFinite(p.qty) || p.qty <= 0) {
      state.macroErr = "Enter an amount to log.";
      drawLogSheet();
      return;
    }
    if (state.macroBusy) return;
    state.macroBusy = true;
    state.macroErr = "";
    try {
      const { food, data, qty } = await persistNewItem();
      if (!food?.id) throw new Error("Could not save item");
      if (state.macroPickedRecipe) {
        state.macroLogLines = state.macroLogLines || [];
        state.macroLogLines.push({ item_id: food.id, qty });
        closeNewItemSheet(food, qty);
        return;
      }
      const logged = await LifeAPI.macroLog({
        item_id: food.id,
        qty,
        meal: state.macroMeal,
        date: state.macroDate || todayISO(),
      });
      state.macros = logged;
      rememberFood(food, logged);
      state.macroBusy = false;
      closeSheet();
      renderMacros();
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not save item";
      drawLogSheet();
    }
  }

  async function saveTargets() {
    const d = state.targetsDraft || {};
    if (state.macroBusy) return;
    state.macroBusy = true;
    try {
      const data = await LifeAPI.macroSettings({
        calories: Number(d.calories),
        protein_pct: Number(d.protein_pct),
        carb_pct: Number(d.carb_pct),
        fat_pct: Number(d.fat_pct),
        date: state.macroDate || todayISO(),
      });
      state.macros = data;
      state.macroBusy = false;
      closeSheet();
      renderMacros();
    } catch (err) {
      state.macroBusy = false;
      state.macroErr = err.message || "Could not save targets";
      drawTargetsSheet();
    }
  }

  async function deleteMacroLog(id) {
    vibrate();
    try {
      state.macros = await LifeAPI.macroDelete({
        id,
        date: state.macroDate || todayISO(),
      });
      renderMacros();
    } catch (err) {
      state.error = err.message || "Could not delete log";
    }
  }

  async function loadMacros(date) {
    const day = date || state.macroDate || todayISO();
    state.macroDate = day;
    state.macros = await LifeAPI.macros(day);
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
        <div class="messages" id="messages"></div>
        <form class="composer" id="composer">
          <textarea id="prompt" rows="1" placeholder="Message"></textarea>
          <button class="send" type="submit" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>`;
    const box = $("messages");
    if (!state.chat.length) {
      box.innerHTML = '<div class="empty">Ask the model running on this PC. It can search the web and show pictures.</div>';
    } else {
      state.chat.forEach((m) => box.appendChild(buildChatBubble(m)));
      box.scrollTop = box.scrollHeight;
    }
    const modelEl = $("model");
    if (modelEl) modelEl.onchange = () => { state.model = modelEl.value; };
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

  function isHttpUrl(s) {
    try {
      const u = new URL(String(s || ""));
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function toolLabel(name) {
    const labels = {
      web_search: "Web search",
      web_fetch: "Open page",
      image_search: "Image search",
    };
    return labels[name] || name || "Tool";
  }

  function hintFromArgs(args) {
    if (!args || typeof args !== "object") return "";
    return String(args.about || args.query || args.q || args.url || "").trim();
  }

  function renderMarkdown(el, text) {
    const raw = String(text || "");
    if (!el) return;
    if (!raw.trim()) {
      el.textContent = "";
      return;
    }
    if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
      el.textContent = raw;
      return;
    }
    try {
      marked.setOptions({ gfm: true, breaks: true });
      el.innerHTML = DOMPurify.sanitize(marked.parse(raw), {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"],
      });
      el.querySelectorAll('a[href^="http"]').forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    } catch (_) {
      el.textContent = raw;
    }
  }

  function scheduleMarkdown(el, getText) {
    if (!el) return;
    if (el._mdTimer) return;
    el._mdTimer = setTimeout(() => {
      el._mdTimer = null;
      renderMarkdown(el, typeof getText === "function" ? getText() : getText);
    }, 40);
  }

  function renderImageGallery(parent, images) {
    if (!parent || !Array.isArray(images) || !images.length) return;
    const gal = document.createElement("div");
    gal.className = "img-gallery";
    for (const item of images.slice(0, 8)) {
      if (!item || typeof item !== "object") continue;
      const thumb = String(item.thumbnail || item.image_url || "").trim();
      const href = String(item.page_url || item.url || item.image_url || thumb).trim();
      if (!isHttpUrl(thumb)) continue;
      const a = document.createElement("a");
      a.className = "img-tile";
      a.href = isHttpUrl(href) ? href : thumb;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = item.title || item.source || "";
      const img = document.createElement("img");
      img.src = thumb;
      img.alt = item.title || "image";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      a.appendChild(img);
      const cap = document.createElement("span");
      cap.className = "img-cap";
      cap.textContent = item.source || item.title || "";
      a.appendChild(cap);
      gal.appendChild(a);
    }
    if (gal.childElementCount) parent.appendChild(gal);
  }

  function renderArticleCards(parent, articles) {
    if (!parent || !Array.isArray(articles) || !articles.length) return;
    const wrap = document.createElement("div");
    wrap.className = "article-cards";
    const rows = articles.slice(0, 3);
    const heroIdx = rows.findIndex((item) => isHttpUrl(item && (item.thumbnail || item.image_url)));
    rows.forEach((item, i) => {
      if (!item || typeof item !== "object") return;
      const href = String(item.url || item.page_url || "").trim();
      const thumb = String(item.thumbnail || item.image_url || "").trim();
      const card = document.createElement(isHttpUrl(href) ? "a" : "div");
      card.className = "article-card";
      if (i === (heroIdx >= 0 ? heroIdx : 0) && isHttpUrl(thumb)) card.classList.add("hero");
      if (!isHttpUrl(thumb)) card.classList.add("no-thumb");
      if (card.tagName === "A") {
        card.href = href;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
      }
      if (isHttpUrl(thumb)) {
        const media = document.createElement("div");
        media.className = "article-thumb";
        const img = document.createElement("img");
        img.src = thumb;
        img.alt = item.title || "Article";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("error", () => {
          media.remove();
          card.classList.remove("hero");
          card.classList.add("no-thumb");
        });
        media.appendChild(img);
        card.appendChild(media);
      }
      const body = document.createElement("div");
      body.className = "article-body";
      const kicker = document.createElement("div");
      kicker.className = "article-kicker";
      kicker.textContent = item.source || "Source";
      body.appendChild(kicker);
      const title = document.createElement("div");
      title.className = "article-title";
      title.textContent = item.title || href || "Article";
      body.appendChild(title);
      if (item.snippet) {
        const snip = document.createElement("div");
        snip.className = "article-snip";
        snip.textContent = item.snippet;
        body.appendChild(snip);
      }
      card.appendChild(body);
      wrap.appendChild(card);
    });
    if (wrap.childElementCount) parent.appendChild(wrap);
  }

  function buildChatBubble(msg) {
    const wrap = document.createElement("div");
    wrap.className = "bubble " + (msg.role === "user" ? "me" : "bot");
    if (msg.role === "user") {
      wrap.textContent = msg.content || "";
      return wrap;
    }
    const tools = document.createElement("div");
    tools.className = "tool-log";
    tools.hidden = true;
    wrap.appendChild(tools);
    wrap._tools = tools;
    wrap._pendingTools = new Map();
    (msg.tools || []).forEach((row) => {
      chatToolStart(wrap, row);
      if (row.status && row.status !== "running") chatToolDone(wrap, row);
    });
    const body = document.createElement("div");
    body.className = "md-body";
    wrap.appendChild(body);
    wrap._body = body;
    if (msg.content) renderMarkdown(body, msg.content);
    return wrap;
  }

  function chatToolStart(msg, row) {
    if (!msg || !msg._tools) return;
    msg._tools.hidden = false;
    const name = row.name || "tool";
    const el = document.createElement("div");
    el.className = "tool-row running";
    el.innerHTML =
      '<span class="tool-dot"></span>' +
      '<div class="tool-main"><div class="tool-name"></div><div class="tool-detail"></div></div>' +
      '<span class="tool-status">Working</span>';
    el.querySelector(".tool-name").textContent = toolLabel(name);
    const detailEl = el.querySelector(".tool-detail");
    let detail = hintFromArgs(row.arguments);
    if (!detail && name === "web_fetch") detail = "Reading page…";
    if (!detail && name === "web_search") detail = "Searching…";
    if (!detail && name === "image_search") detail = "Finding pictures…";
    if (detail) detailEl.textContent = detail;
    else detailEl.remove();
    el.dataset.arg = detail || "";
    msg._tools.appendChild(el);
    const stack = msg._pendingTools.get(name) || [];
    stack.push(el);
    msg._pendingTools.set(name, stack);
  }

  function chatToolDone(msg, row) {
    if (!msg || !msg._pendingTools) return;
    const name = row.name || "tool";
    const stack = msg._pendingTools.get(name) || [];
    let el = stack.pop();
    const ok = row.ok !== false;
    if (!el) {
      chatToolStart(msg, row);
      el = (msg._pendingTools.get(name) || []).pop();
    }
    if (!el) return;
    el.classList.remove("running");
    el.classList.add(ok ? "ok" : "fail");
    const status = el.querySelector(".tool-status");
    if (status) status.textContent = ok ? "Done" : "Failed";
    const detailEl = el.querySelector(".tool-detail") || (() => {
      const d = document.createElement("div");
      d.className = "tool-detail";
      el.querySelector(".tool-main").appendChild(d);
      return d;
    })();
    const arg = el.dataset.arg || hintFromArgs(row.arguments);
    detailEl.textContent = [arg, row.summary].filter(Boolean).join("\n");
    if (ok && Array.isArray(row.articles) && row.articles.length) {
      renderArticleCards(msg._tools, row.articles);
    }
    if (ok && Array.isArray(row.images) && row.images.length) {
      renderImageGallery(msg._tools, row.images);
    }
  }

  async function sendChat() {
    const input = $("prompt");
    const text = (input?.value || "").trim();
    if (!text || state.busy) return;
    state.busy = true;
    state.chat.push({ role: "user", content: text });
    const bot = { role: "assistant", content: "", tools: [] };
    state.chat.push(bot);
    input.value = "";
    renderChat();
    const wrap = document.querySelector(".bubble.bot:last-child");
    const box = $("messages");
    try {
      const history = state.chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const res = await LifeAPI.chatStream({
        model: state.model || ($("model") && $("model").value),
        stream: true,
        messages: history,
      });
      if (!res.ok) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const handleEvent = (ev) => {
        if (!ev || typeof ev !== "object") return;
        if (ev.type === "tool_start") {
          bot.tools.push({ name: ev.name, arguments: ev.arguments || {}, status: "running" });
          chatToolStart(wrap, ev);
          if (box) box.scrollTop = box.scrollHeight;
        } else if (ev.type === "tool_done") {
          const last = [...bot.tools].reverse().find((t) => t.name === ev.name && t.status === "running");
          if (last) Object.assign(last, ev, { status: ev.ok === false ? "fail" : "ok" });
          else bot.tools.push(Object.assign({ status: ev.ok === false ? "fail" : "ok" }, ev));
          chatToolDone(wrap, ev);
          if (box) box.scrollTop = box.scrollHeight;
        } else if (ev.type === "token") {
          const piece = ev.text || "";
          if (!piece) return;
          bot.content += piece;
          scheduleMarkdown(wrap && wrap._body, () => bot.content);
          if (box) box.scrollTop = box.scrollHeight;
        } else if (ev.type === "done") {
          if (ev.reply) bot.content = ev.reply;
          if (wrap && wrap._body) {
            if (wrap._body._mdTimer) {
              clearTimeout(wrap._body._mdTimer);
              wrap._body._mdTimer = null;
            }
            renderMarkdown(wrap._body, bot.content);
          }
        } else if (ev.type === "error") {
          throw new Error(ev.error || "Chat failed");
        } else {
          const piece = ev.message?.content || ev.response || "";
          if (piece) {
            bot.content += piece;
            scheduleMarkdown(wrap && wrap._body, () => bot.content);
          }
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try { handleEvent(JSON.parse(line)); } catch (_) {}
        }
      }
      if (buf.trim()) {
        const line = buf.replace(/^data:\s*/, "").trim();
        if (line) {
          try { handleEvent(JSON.parse(line)); } catch (_) {}
        }
      }
      if (wrap && wrap._body) renderMarkdown(wrap._body, bot.content);
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
    const nextHash = location.hash || "#home";
    const tabChanged = nextHash !== state.lastHash;
    state.route = route;
    if (route === "life" && tab) state.lifeTab = tab;
    if (route === "food" && tab) state.foodTab = tab === "meals" ? "pantry" : tab;
    if (route !== "macros") closeSheet();
    if (route === "macros") {
      const nextDate = /^\d{4}-\d{2}-\d{2}$/.test(tab) ? tab : (state.macroDate || todayISO());
      state.macroDate = nextDate;
      if (!state.macros || state.macros.date !== nextDate) {
        LifeAPI.macros(nextDate).then((data) => {
          state.macros = data;
          adoptMeals(data, state.food);
          if (hashRoute().route === "macros") renderMacros();
        }).catch((err) => {
          state.error = err.message || "Could not load macros";
          renderOffline();
        });
      }
    }

    $("splash").hidden = true;
    $("topbar").hidden = false;
    $("screen").hidden = false;
    $("tabbar").hidden = false;
    $("app").classList.remove("locked");

    if (route === "settings") renderSettings();
    else if (route === "life") renderLife();
    else if (route === "food") renderFood();
    else if (route === "macros") renderMacros();
    else if (route === "chat") renderChat();
    else renderHome();

    if (tabChanged && route !== "chat") {
      $("screen").scrollTop = 0;
    }
    state.lastHash = nextHash;
  }

  async function connect() {
    if (!hasAccess()) {
      deny();
      return;
    }
    state.error = "";
    try {
      const lifeP = LifeAPI.life();
      const foodP = LifeAPI.food();
      const macrosP = LifeAPI.macros(state.macroDate || todayISO()).catch(() => null);
      state.status = await LifeAPI.status();
      const models = state.status?.ollama?.models || [];
      state.models = models;
      if (!state.model && models[0]) state.model = models[0].name;
      $("splash").hidden = true;
      $("topbar").hidden = false;
      $("screen").hidden = false;
      $("tabbar").hidden = false;
      if ((location.hash || "") === "" || location.hash === "#unlock") go("home");
      else render();

      const [life, food, macros] = await Promise.all([lifeP, foodP, macrosP]);
      state.life = life;
      state.food = food;
      state.macros = macros;
      if (macros && macros.date) state.macroDate = macros.date;
      adoptMeals(macros, food);
      if (hashRoute().route !== "chat" || !state.busy) render();
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
    connect();
  }

  boot();
})();
