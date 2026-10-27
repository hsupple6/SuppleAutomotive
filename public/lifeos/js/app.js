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
    chatTab: "talk",
    flash: {
      decks: [],
      loaded: false,
      loading: false,
      query: "",
      deckId: "",
      mode: "ask",
      chat: [],
      face: "read",
      filter: "all",
      queue: [],
      pos: 0,
      flipped: false,
      revealed: false,
      wrongNow: {},
      sessionRight: 0,
      sessionWrong: 0,
      error: "",
    },
    model: "",
    models: [],
    ollamaLive: null,
    warming: false,
    warmAt: 0,
    warmError: "",
    ollamaTimer: 0,
    readyClock: 0,
    busy: false,
    review: {
      running: false,
      status: "",
      error: "",
      index: 0,
      proposals: [],
      seen: 0,
      total: 0,
      currentQuery: "",
    },
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
    weightBusy: false,
    weightErr: "",
    macrosEntered: false,
    weightDrawKey: "",
    macroPane: "macros",
    macroFocus: "",
    macroFocusDate: "",
    macroClock: 0,
    macroClockDirty: false,
    gateComposer: false,
    gatePhaseId: "",
    gateDate: "",
    gateLines: [],
    gateQuery: "",
    gateErr: "",
    gateBusy: false,
    gateTicker: 0,
    gateDrafts: {},
    lockLines: null,
    lockLinesLoading: false,
    lockTaunt: "",
    lockTauntPhase: "",
    freeLog: false,
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

  function isWeekend(iso) {
    const d = new Date(`${iso}T12:00:00`);
    const day = d.getDay();
    return day === 0 || day === 6;
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

  const DAY_PARTS = [
    { id: "breakfast", name: "Breakfast", when: "From 4:00 AM" },
    { id: "lunch", name: "Lunch", when: "From 11:00 AM" },
    { id: "dinner", name: "Dinner", when: "From 6:30 PM" },
  ];
  const PHASES = [
    { id: "breakfast", meal: "breakfast", name: "Breakfast", kind: "meal", opens: 4 * 60, opensLabel: "4:00 AM" },
    { id: "lunch", meal: "lunch", name: "Lunch", kind: "meal", opens: 11 * 60, opensLabel: "11:00 AM" },
    { id: "dinner", meal: "dinner", name: "Dinner", kind: "meal", opens: 18 * 60 + 30, opensLabel: "6:30 PM" },
  ];
  const SNACK = { id: "snack", meal: "snack", name: "Snack", kind: "snack", opens: 4 * 60, opensLabel: "4:00 AM" };
  const BREAKFAST_KCAL = 200;
  const LUNCH_KCAL = 550;
  const DINNER_KCAL = 550;
  const SNACK_KCAL = 600;
  const GATE_CUTS = [4 * 60, 11 * 60, 18 * 60 + 30];

  function macroRingHTML(day, settings, readout, partMeta) {
    const shares = [
      { key: "p", name: "Protein", band: day.protein, share: Number(settings.protein_pct || 0), color: "#c8ff00" },
      { key: "c", name: "Carbs", band: day.carb, share: Number(settings.carb_pct || 0), color: "#64d2ff" },
      { key: "f", name: "Fat", band: day.fat, share: Number(settings.fat_pct || 0), color: "#ff9f0a" },
    ];
    const totalShare = shares.reduce((sum, row) => sum + Math.max(0, row.share), 0) || 100;
    const gap = 18;
    const usable = 360 - gap * shares.length;
    const cx = 110;
    const cy = 110;
    const radius = 86;
    let cursor = 0;
    const segs = shares.map((row) => {
      const sweep = usable * (Math.max(0, row.share) / totalShare);
      const start = cursor + gap / 2;
      cursor += sweep + gap;
      const target = Number(row.band?.target || 0);
      const actual = Number(row.band?.actual || 0);
      const pct = target > 0 ? Math.round((actual / target) * 100) : Math.round(Number(row.band?.pct || 0));
      return {
        ...row,
        start,
        sweep,
        fill: sweep * clamp01(pct / 100),
        pct,
        actual,
        target,
      };
    });
    const track = segs.map((seg) => {
      const d = arcD(cx, cy, radius, seg.start, seg.sweep);
      return d ? `<path d="${d}" stroke="${seg.color}" stroke-opacity="0.18" fill="none" stroke-width="16" stroke-linecap="round"/>` : "";
    }).join("");
    const fills = segs.map((seg) => {
      const d = arcD(cx, cy, radius, seg.start, seg.fill);
      return d ? `<path class="ring-fill ${seg.key}" d="${d}" stroke="${seg.color}" fill="none" stroke-width="16" stroke-linecap="round" stroke-dasharray="0 1"/>` : "";
    }).join("");
    const summary = segs.map((seg) => `${seg.name} ${seg.pct}%`).join(", ");
    return `
      <div class="day-hero-body">
        <div class="day-orb">
          <svg viewBox="0 0 220 220" role="img" aria-label="Daily macros, ${esc(summary)}">
            <defs>
              <radialGradient id="dayDisc" cx="50%" cy="38%" r="68%">
                <stop offset="0" stop-color="#1c1c1c"/>
                <stop offset="1" stop-color="#070707"/>
              </radialGradient>
            </defs>
            ${track}
            ${fills}
            <circle cx="${cx}" cy="${cy}" r="70" fill="url(#dayDisc)" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
          </svg>
          <div class="day-core${readout.tone === "over" ? " is-over" : ""}${readout.tone === "roll" ? " is-roll" : ""}">
            <p class="day-kicker">kcal ${esc(readout.word)}</p>
            <p class="day-num">${num(readout.n, 0)}</p>
            <p class="day-sub">${esc(partMeta.name)}</p>
            ${partMeta.when ? `<p class="day-when">${esc(partMeta.when)}</p>` : ""}
          </div>
        </div>
        <div class="day-legs">
          ${segs.map((seg) => `
            <div class="day-leg ${seg.key}">
              <i style="background:${seg.color}"></i>
              <div>
                <strong>${seg.name}</strong>
                <span>${num(seg.actual, 0)} / ${num(seg.target, 0)}g</span>
              </div>
              <b style="color:${seg.color}">${num(seg.pct, 0)}%</b>
            </div>`).join("")}
        </div>
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
    const route = hashRoute().route;
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.route === route);
    });
  }

  function chips(services) {
    const loaded = ((state.status && state.status.ollama && state.status.ollama.loaded) || []).length > 0;
    const rows = [
      ["PC", "on"],
      ["Ollama", services?.ollama ? (loaded ? "on" : "wait") : ""],
      ["Life", services?.life_calculator ? "on" : ""],
      ["DB", services?.finance_db ? "on" : ""],
    ];
    return `<div class="status-line">${rows.map(([label, tone]) => (
      `<span class="chip ${tone}"><i></i>${esc(label)}</span>`
    )).join("")}</div>`;
  }

  function glyph(kind) {
    if (kind === "macros") {
      return '<svg class="ico ico-macro" width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.6" stroke="currentColor" stroke-width="1.7"/><path class="hand" d="M12 8.1V12.2l2.7 1.7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (kind === "food-calculator") {
      return '<svg class="ico ico-food" width="20" height="20" viewBox="0 0 24 24" fill="none"><path class="fork" d="M8 3.4v5.6M6.2 3.4V7M9.8 3.4V7M8 8.6V20.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="knife" d="M15.6 3.6c1.7 1.7 1.7 4 0 5.8V20.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
    }
    if (kind === "ollama") {
      return '<svg class="ico ico-chat" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5.4 16.8 4.6 20l2.9-1.2A7.8 7.8 0 1 0 5.4 16.8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle class="d1" cx="8.6" cy="11.2" r="0.9" fill="currentColor"/><circle class="d2" cx="12" cy="11.2" r="0.9" fill="currentColor"/><circle class="d3" cx="15.4" cy="11.2" r="0.9" fill="currentColor"/></svg>';
    }
    return '<svg class="ico ico-life" width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 19.2h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="b1" d="M7.2 19.2V13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="b2" d="M12 19.2V8.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path class="b3" d="M16.8 19.2V11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
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

  function homeRing(pct) {
    const r = 26;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    const dash = (clamped / 100) * c;
    const tone = clamped > 100 ? "var(--red)" : "var(--lime)";
    return `<svg class="home-ring" viewBox="0 0 68 68" aria-hidden="true">
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="4.5"/>
      <circle cx="34" cy="34" r="${r}" fill="none" stroke="${tone}" stroke-width="4.5" stroke-linecap="round"
        stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 34 34)"/>
    </svg>`;
  }

  function homeApps(apps) {
    const order = ["life-calculator", "food-calculator", "macros", "ollama"];
    const primary = order
      .map((kind) => apps.find((app) => app.kind === kind))
      .filter(Boolean);
    const extra = apps.filter((app) => !order.includes(app.kind));
    return { primary, extra };
  }

  function renderHome() {
    setChrome("", "LifeOS");
    const s = state.status || {};
    const services = s.services || {};
    const { primary, extra } = homeApps(s.apps || []);
    const life = state.life && state.life.summary;
    const stats = (state.food && state.food.pantry_stats) || null;
    const soon = (stats && stats.soonest) || {};
    const day = (state.macros && state.macros.day) || null;
    const settings = (state.macros && state.macros.settings) || null;
    const eaten = Number(day && day.totals && day.totals.calories) || 0;
    const goal = Number(settings && settings.calories) || 0;
    const pct = goal > 0 ? Math.round((eaten / goal) * 100) : 0;
    const dateLabel = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    let calNote = "Today’s log loads here";
    if (state.macros && goal > 0) {
      const left = goal - eaten;
      calNote = left > 0
        ? `${num(left, 0)} kcal left`
        : left < 0
          ? `${num(Math.abs(left), 0)} kcal over`
          : "Right on target";
    } else if (state.macros) {
      calNote = eaten ? `${num(eaten, 0)} kcal logged` : "Nothing logged yet";
    }
    const worth = life ? money(life.net_worth, 0) : "—";
    const worthSub = life
      ? `${money(life.liquid_worth, 0)} liquid · ${life.burn_months == null ? "—" : Number(life.burn_months).toFixed(0) + " mo runway"}`
      : "Cash, credit, and runway";
    const pantryCount = stats ? String(stats.in_house || 0) : "—";
    const pantrySub = stats
      ? `${stats.low || 0} running low${soon.name && Number(stats.low) > 0 ? " · " + soon.name + " next" : ""}`
      : "Stock in the house";
    const ollama = s.ollama || {};
    const gpu = (ollama.loaded || []).length ? "on" : services.ollama ? "wait" : "";
    const pulse = [
      ["Life", services.life_calculator ? "on" : ""],
      ["Kitchen", services.finance_db ? "on" : ""],
      [gpu === "on" ? "Ready" : gpu === "wait" ? "Cold" : "Models", gpu],
    ];
    const macroBits = [
      ["Protein", day && day.protein],
      ["Carbs", day && day.carb],
      ["Fat", day && day.fat],
    ];

    $("screen").innerHTML = `
      <div class="home-page">
        <header class="home-intro">
          <div>
            <p class="home-date">${esc(dateLabel)}</p>
            <h2 class="home-greet">${esc(greet())}</h2>
          </div>
          <div class="home-pulse" aria-label="Systems">
            ${pulse.map(([label, tone]) => (
              `<span class="${tone}"><i></i>${esc(label)}</span>`
            )).join("")}
          </div>
        </header>

        <section class="home-bento" aria-label="Today">
          <button type="button" class="home-card home-today" data-go="macros">
            <div class="home-card-top">
              <span class="home-kicker">Today</span>
              <span class="home-link">Macros</span>
            </div>
            <div class="home-today-main">
              ${homeRing(pct)}
              <div>
                <p class="home-figure">${state.macros ? num(eaten, 0) : "—"}</p>
                <p class="home-note">${esc(calNote)}</p>
              </div>
            </div>
            <div class="home-splits">
              ${macroBits.map(([label, band]) => `
                <div>
                  <b>${band ? num(band.actual || 0, 0) : "—"}<small>g</small></b>
                  <span>${label}</span>
                </div>`).join("")}
            </div>
          </button>

          <button type="button" class="home-card home-stat" data-go="life">
            <div class="home-card-top">
              <span class="home-kicker">Net worth</span>
              <span class="home-link">Life</span>
            </div>
            <p class="home-figure">${esc(worth)}</p>
            <p class="home-note">${esc(worthSub)}</p>
          </button>

          <button type="button" class="home-card home-stat" data-go="food">
            <div class="home-card-top">
              <span class="home-kicker">Pantry</span>
              <span class="home-link">Food</span>
            </div>
            <p class="home-figure">${esc(pantryCount)}</p>
            <p class="home-note">${esc(pantrySub)}</p>
          </button>
        </section>

        <section class="home-open" aria-label="Apps">
          <p class="home-kicker">Open</p>
          <div class="home-apps">
            ${primary.map((app) => `
              <button type="button" class="home-app ${esc(app.accent || "white")}" data-go="${esc(app.route)}">
                <span class="home-glyph">${glyph(app.kind)}</span>
                <span class="home-app-copy">
                  <strong>${esc(app.name)}</strong>
                  <em>${esc(app.blurb || "")}</em>
                </span>
                <span class="live ${app.running ? "" : "off"}"></span>
              </button>`).join("")}
          </div>
          ${extra.length ? `
            <div class="home-extra">
              ${extra.map((app) => `
                <button type="button" class="home-extra-row" data-go="${esc(app.route)}">
                  <strong>${esc(app.name)}</strong>
                  <span>${esc(app.blurb || "Project")}</span>
                </button>`).join("")}
            </div>` : ""}
        </section>
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
      const liquid = Math.max(0, Number(sum.liquid_worth || 0));
      const retire = Math.max(0, Number(sum.retirement_worth || 0));
      const pile = liquid + retire || 1;
      body = `
        <section class="viz-card viz-cal">
          <p class="home-kicker">Net worth</p>
          <p class="home-figure">${money(sum.net_worth, 0)}</p>
          <p class="home-note">${money(sum.liquid_worth, 0)} liquid · ${money(sum.retirement_worth, 0)} retirement</p>
          <div class="ombre-split" aria-hidden="true">
            <i class="liquid" style="width:${(liquid / pile) * 100}%"></i>
            <i class="retire" style="width:${(retire / pile) * 100}%"></i>
          </div>
          <div class="viz-split-key"><span>Liquid</span><span>Retirement</span></div>
        </section>
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
              <div class="name"><strong>${esc(i.name)}</strong><span>${i.days_to_empty == null ? "Not eaten yet" : Number(i.days_to_empty).toFixed(0) + " days left"}</span></div>
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

  function weightPoints() {
    const rows = (state.macros && state.macros.weights) || [];
    return rows
      .map((row) => ({
        id: String(row.id || ""),
        date: String(row.date || "").slice(0, 10),
        lbs: Number(row.lbs),
      }))
      .filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.lbs))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function weightTrend(points) {
    const n = points.length;
    if (n < 2) return null;
    const t0 = Date.parse(`${points[0].date}T12:00:00`);
    const xs = points.map((p) => (Date.parse(`${p.date}T12:00:00`) - t0) / 86400000);
    let sx = 0;
    let sy = 0;
    let sxx = 0;
    let sxy = 0;
    points.forEach((p, i) => {
      sx += xs[i];
      sy += p.lbs;
      sxx += xs[i] * xs[i];
      sxy += xs[i] * p.lbs;
    });
    const den = n * sxx - sx * sx;
    const slope = Math.abs(den) < 1e-9 ? 0 : (n * sxy - sx * sy) / den;
    const intercept = (sy - slope * sx) / n;
    return { slope, intercept, perWeek: slope * 7, xs };
  }

  function signedLb(n, digits) {
    if (!Number.isFinite(n) || Math.abs(n) < 0.005) return (0).toFixed(digits);
    const abs = Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return `${n > 0 ? "+" : "−"}${abs}`;
  }

  function weightDateLabel(iso, withYear) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", withYear
      ? { month: "short", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric" });
  }

  function weightCopy(points, trend) {
    const latest = points[points.length - 1];
    if (!latest) {
      return {
        figure: "—",
        meta: "Log a weigh-in. The line draws in after the second day.",
        slope: "",
        slopeClass: "",
      };
    }
    if (!trend) {
      return {
        figure: num(latest.lbs, 1),
        meta: "One more day and the slope shows up.",
        slope: "",
        slopeClass: "",
      };
    }
    const delta = latest.lbs - points[0].lbs;
    const digits = Math.abs(trend.perWeek) >= 10 ? 1 : 2;
    return {
      figure: num(latest.lbs, 1),
      meta: `${signedLb(delta, 1)} lb since ${weightDateLabel(points[0].date, false)}`,
      slope: `${signedLb(trend.perWeek, digits)} lb/wk`,
      slopeClass: trend.perWeek < -0.01 ? "down" : trend.perWeek > 0.01 ? "up" : "flat",
    };
  }

  function smoothLine(pts) {
    if (pts.length < 2) return "";
    const n = (v) => Number(v).toFixed(2);
    if (pts.length === 2) return `M ${n(pts[0].x)} ${n(pts[0].y)} L ${n(pts[1].x)} ${n(pts[1].y)}`;
    let d = `M ${n(pts[0].x)} ${n(pts[0].y)}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      let c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      let c2y = p2.y - (p3.y - p1.y) / 6;
      const top = Math.min(p1.y, p2.y) - 18;
      const bot = Math.max(p1.y, p2.y) + 18;
      c1y = Math.max(top, Math.min(bot, c1y));
      c2y = Math.max(top, Math.min(bot, c2y));
      d += ` C ${n(c1x)} ${n(c1y)}, ${n(c2x)} ${n(c2y)}, ${n(p2.x)} ${n(p2.y)}`;
    }
    return d;
  }

  function paintWeightChart(draw) {
    const host = $("wtStage");
    if (!host) return;
    if (host._raf) cancelAnimationFrame(host._raf);
    if (host._rafTrend) cancelAnimationFrame(host._rafTrend);
    host._raf = 0;
    host._rafTrend = 0;
    const points = weightPoints();
    const trend = weightTrend(points);
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = Boolean(draw) && !reduced && points.length > 0;
    const W = 720;
    const H = 228;
    const plotL = 18;
    const plotR = 702;
    const plotT = 18;
    const plotB = 184;
    const grids = [0.28, 0.52, 0.76].map((p) => {
      const y = plotT + (plotB - plotT) * p;
      return `<line class="wt-grid" x1="${plotL}" y1="${y.toFixed(1)}" x2="${plotR}" y2="${y.toFixed(1)}" />`;
    }).join("");

    let body = "";
    if (!points.length) {
      const y = (plotT + plotB) / 2;
      body = `
        ${grids}
        <line class="wt-trend" x1="${plotL}" y1="${y}" x2="${plotR}" y2="${y}" />
        <text class="wt-empty" x="${W / 2}" y="${y - 16}" text-anchor="middle">The chart draws itself once you log a weight.</text>`;
    } else {
      const t0 = Date.parse(`${points[0].date}T12:00:00`);
      const t1 = Date.parse(`${points[points.length - 1].date}T12:00:00`);
      const span = Math.max(1, t1 - t0);
      const ys = points.map((p) => p.lbs);
      let lo = Math.min(...ys);
      let hi = Math.max(...ys);
      let trendEnds = null;
      if (trend) {
        const y0 = trend.intercept;
        const y1 = trend.intercept + trend.slope * ((t1 - t0) / 86400000);
        lo = Math.min(lo, y0, y1);
        hi = Math.max(hi, y0, y1);
        trendEnds = [y0, y1];
      }
      const pad = Math.max(0.6, (hi - lo) * 0.22);
      lo -= pad;
      hi += pad;
      if (hi - lo < 1) {
        lo -= 0.5;
        hi += 0.5;
      }
      const xOf = (iso) => {
        if (points.length === 1) return (plotL + plotR) / 2;
        const t = Date.parse(`${iso}T12:00:00`);
        return plotL + ((t - t0) / span) * (plotR - plotL);
      };
      const yOf = (lbs) => plotT + (1 - (lbs - lo) / (hi - lo)) * (plotB - plotT);
      const plotted = points.map((p) => ({ ...p, x: xOf(p.date), y: yOf(p.lbs) }));
      const d = smoothLine(plotted);
      const area = plotted.length > 1
        ? `${d} L ${plotted[plotted.length - 1].x.toFixed(2)} ${plotB} L ${plotted[0].x.toFixed(2)} ${plotB} Z`
        : "";
      const withYear = points[points.length - 1].date.slice(0, 4) !== points[0].date.slice(0, 4);
      const labelAt = (p, anchor) => (
        `<text class="wt-xlab" x="${p.x.toFixed(1)}" y="212" text-anchor="${anchor}">${esc(weightDateLabel(p.date, withYear))}</text>`
      );
      const labels = [labelAt(plotted[0], plotted.length === 1 ? "middle" : "start")];
      if (plotted.length > 2 && (t1 - t0) / 86400000 > 20) {
        const mid = plotted[Math.floor(plotted.length / 2)];
        labels.push(labelAt(mid, "middle"));
      }
      if (plotted.length > 1) labels.push(labelAt(plotted[plotted.length - 1], "end"));
      const hiY = yOf(Math.max(...ys));
      const loY = yOf(Math.min(...ys));
      const ylabs = Math.abs(hiY - loY) > 36
        ? `<text class="wt-ylab" x="${plotL}" y="${(hiY - 8).toFixed(1)}">${esc(num(Math.max(...ys), 1))}</text>
           <text class="wt-ylab" x="${plotL}" y="${(loY + 14).toFixed(1)}">${esc(num(Math.min(...ys), 1))}</text>`
        : "";
      let trendLine = "";
      if (trendEnds) {
        const x1 = xOf(points[0].date);
        const y1 = yOf(trendEnds[0]);
        const x2 = xOf(points[points.length - 1].date);
        const y2 = yOf(trendEnds[1]);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const spanPx = Math.hypot(dx, dy) || 1;
        const shift = 9;
        const ox = (-dy / spanPx) * shift;
        const oy = (dx / spanPx) * shift;
        const down = oy >= 0 ? 1 : -1;
        trendLine = `<path class="wt-trend" clip-path="url(#wtTrendClip)" d="M ${(x1 + ox * down).toFixed(2)} ${(y1 + oy * down).toFixed(2)} L ${(x2 + ox * down).toFixed(2)} ${(y2 + oy * down).toFixed(2)}" />`;
      }
      const dots = plotted.map((p, i) => {
        const last = i === plotted.length - 1;
        return `<g class="wt-dot${last ? " last" : ""}">
          <circle class="wt-hit" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="16"><title>${esc(weightDateLabel(p.date, true))} · ${esc(num(p.lbs, 1))} lb</title></circle>
          ${last ? `<circle class="wt-ring" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="10" />` : ""}
          <circle class="wt-mark" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${last ? 4.6 : 3.3}" />
        </g>`;
      }).join("");
      body = `
        ${grids}
        ${ylabs}
        ${area ? `<path class="wt-area" fill="url(#wtFill)" d="${area}" />` : ""}
        ${trendLine}
        ${d ? `<path class="wt-glow" d="${d}" />` : ""}
        ${d ? `<path class="wt-line" stroke="url(#wtStroke)" d="${d}" />` : ""}
        ${dots}
        ${d ? `<g class="wt-comet" opacity="0"><circle r="12" fill="#c8ff00" opacity="0.22"/><circle r="3.2" fill="#ffffff"/></g>` : ""}
        ${labels.join("")}`;
    }

    host.classList.toggle("is-pending", animate);
    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over time">
        <defs>
          <linearGradient id="wtStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#f4ff9a"/>
            <stop offset="0.48" stop-color="#c8ff00"/>
            <stop offset="1" stop-color="#7dffb3"/>
          </linearGradient>
          <linearGradient id="wtFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c8ff00" stop-opacity="0.34"/>
            <stop offset="1" stop-color="#c8ff00" stop-opacity="0"/>
          </linearGradient>
          <clipPath id="wtTrendClip">
            <rect id="wtTrendRect" x="0" y="0" width="${animate ? 0 : W}" height="${H}"></rect>
          </clipPath>
        </defs>
        ${body}
      </svg>`;
    if (!animate) return;
    const line = host.querySelector(".wt-line");
    const glow = host.querySelector(".wt-glow");
    const area = host.querySelector(".wt-area");
    const comet = host.querySelector(".wt-comet");
    const rect = host.querySelector("#wtTrendRect");
    const len = line ? line.getTotalLength() : 0;
    const delay = 280;
    const dur = 1150;
    if (line && len) {
      line.style.strokeDasharray = `${len}`;
      line.style.strokeDashoffset = `${len}`;
      if (glow) {
        glow.style.strokeDasharray = `${len}`;
        glow.style.strokeDashoffset = `${len}`;
      }
      window.setTimeout(() => {
        if (!line.isConnected) return;
        const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
        line.style.transition = `stroke-dashoffset ${dur}ms ${ease}`;
        line.style.strokeDashoffset = "0";
        if (glow) {
          glow.style.transition = `stroke-dashoffset ${dur}ms ${ease}`;
          glow.style.strokeDashoffset = "0";
        }
        if (area) {
          area.style.transition = "opacity 0.9s ease 0.12s";
          area.style.opacity = "1";
        }
      }, delay);
    } else if (area) {
      area.style.opacity = "1";
    }
    host.querySelectorAll(".wt-dot").forEach((g, i) => {
      const bits = [g.querySelector(".wt-mark"), g.querySelector(".wt-ring")].filter(Boolean);
      bits.forEach((el) => {
        el.style.transformBox = "fill-box";
        el.style.transformOrigin = "center";
        el.style.transform = "scale(0)";
      });
      const at = delay + (points.length < 2 ? 80 : (i / (points.length - 1)) * dur);
      window.setTimeout(() => {
        bits.forEach((el) => {
          if (!el.isConnected) return;
          el.style.transition = "transform 0.48s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.28s ease";
          el.style.transform = "scale(1)";
          el.style.opacity = "1";
        });
      }, at);
    });
    if (comet && line && len) {
      const t0 = performance.now();
      const step = (now) => {
        if (!line.isConnected) return;
        const t = Math.min(1, Math.max(0, (now - t0 - delay) / dur));
        const ease = 1 - Math.pow(1 - t, 3);
        const pt = line.getPointAtLength(Math.max(0, Math.min(len, ease * len)));
        comet.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);
        comet.setAttribute("opacity", t > 0.01 && t < 0.995 ? "1" : "0");
        if (t < 1) host._raf = requestAnimationFrame(step);
      };
      host._raf = requestAnimationFrame(step);
    }
    if (rect) {
      const start = performance.now();
      const grow = (now) => {
        if (!rect.isConnected) return;
        const t = Math.min(1, Math.max(0, (now - start - 520) / 880));
        const ease = 1 - Math.pow(1 - t, 3);
        rect.setAttribute("width", String(W * ease));
        if (t < 1) host._rafTrend = requestAnimationFrame(grow);
      };
      host._rafTrend = requestAnimationFrame(grow);
    }
  }

  function playMacroFills() {
    document.querySelectorAll(".macros-page .ombre-fill").forEach((el, i) => {
      const target = el.style.width || "0%";
      el.style.transition = "none";
      el.style.width = "0%";
      requestAnimationFrame(() => {
        el.style.transition = `width 0.95s cubic-bezier(0.16, 1, 0.3, 1) ${120 + i * 80}ms`;
        el.style.width = target;
      });
    });
  }

  function applyWeightPayload(data) {
    const view = state.macroDate;
    state.macros = data;
    state.macroDate = view || (data && data.date) || state.macroDate;
    state.weightErr = "";
  }

  async function saveWeight(event) {
    event.preventDefault();
    if (state.weightBusy) return;
    const lbs = Number(String($("wtLbs")?.value || "").trim());
    const day = ($("wtDate")?.value || state.macroDate || todayISO()).slice(0, 10);
    if (!Number.isFinite(lbs) || lbs <= 0) {
      state.weightErr = "Enter a weight.";
      renderMacros();
      return;
    }
    state.weightBusy = true;
    state.weightErr = "";
    const btn = $("wtSave");
    if (btn) btn.disabled = true;
    try {
      const data = await LifeAPI.weightLog({
        lbs,
        date: day,
        view: state.macroDate || todayISO(),
      });
      applyWeightPayload(data);
    } catch (err) {
      state.weightErr = err.status === 404
        ? "Restart LifeOS on the PC, then log again."
        : (err.message || "Could not save that weigh-in.");
    }
    state.weightBusy = false;
    renderMacros();
  }

  async function deleteWeight(id) {
    if (!id || state.weightBusy) return;
    vibrate();
    state.weightBusy = true;
    state.weightErr = "";
    try {
      const data = await LifeAPI.weightDelete({
        id,
        view: state.macroDate || todayISO(),
      });
      applyWeightPayload(data);
    } catch (err) {
      state.weightErr = err.status === 404
        ? "Restart LifeOS on the PC, then try again."
        : (err.message || "Could not remove that weigh-in.");
    }
    state.weightBusy = false;
    renderMacros();
  }

  function snackBook() {
    try {
      const raw = JSON.parse(localStorage.getItem("lifeos-snack-rows") || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (err) {
      return {};
    }
  }

  function snackIds(date, phaseId) {
    const day = snackBook()[date] || {};
    const keys = !phaseId
      ? Object.keys(day)
      : (phaseId === "snack" ? ["snack", "snack-am", "snack-mid", "snack-pm"] : [phaseId]);
    return keys.flatMap((key) => day[key] || []).map((id) => String(id));
  }

  function rememberSnackIds(date, phaseId, ids) {
    const next = ids.map((id) => String(id)).filter(Boolean);
    if (!next.length) return;
    const book = snackBook();
    const day = book[date] && typeof book[date] === "object" ? book[date] : {};
    const have = new Set((day[phaseId] || []).map((id) => String(id)));
    next.forEach((id) => have.add(id));
    day[phaseId] = [...have];
    book[date] = day;
    try { localStorage.setItem("lifeos-snack-rows", JSON.stringify(book)); } catch (err) {}
  }

  function allDayRows(day) {
    const meals = (day && day.meals) || {};
    return Object.values(meals).flat().filter(Boolean);
  }

  function mealRows(day, id) {
    const date = (state.macros && state.macros.date) || state.macroDate || todayISO();
    if (String(id).indexOf("snack") === 0) {
      const ids = new Set(snackIds(date, id));
      return allDayRows(day).filter((row) => ids.has(String(row.id)));
    }
    const hidden = new Set(snackIds(date));
    return ((day && day.meals && day.meals[id]) || []).filter((row) => !hidden.has(String(row.id)));
  }

  function mealEaten(day, id) {
    return Math.round(mealRows(day, id).reduce((sum, row) => sum + Number(row.calories || 0), 0));
  }

  function clockMins(now = new Date()) {
    return now.getHours() * 60 + now.getMinutes();
  }

  function eatenAll(day) {
    return PHASES.reduce((sum, phase) => sum + mealEaten(day, phase.meal), 0) + mealEaten(day, "snack");
  }

  function macroPlan(goal, day, progress) {
    const done = new Set((progress && progress.done) || []);
    const target = Math.round(Number(goal) || 0);
    const scale = target && target !== 1900 ? target / 1900 : 1;
    const cut = (n) => Math.round(n * scale);
    const breakfast = cut(BREAKFAST_KCAL);
    const lunchBase = cut(LUNCH_KCAL);
    const snackBudget = cut(SNACK_KCAL);
    const dinnerBase = target
      ? Math.max(0, target - breakfast - lunchBase - snackBudget)
      : cut(DINNER_KCAL);
    const breakfastEaten = mealEaten(day, "breakfast");
    const lunchEaten = mealEaten(day, "lunch");
    const dinnerEaten = mealEaten(day, "dinner");
    const snackEaten = mealEaten(day, "snack");
    const breakfastLeft = breakfast - breakfastEaten;
    const lunchRoll = done.has("breakfast") ? breakfastLeft : 0;
    const lunchBudget = lunchBase + lunchRoll;
    const dinnerRoll = done.has("lunch") ? (lunchBudget - lunchEaten) : 0;
    const dinnerBudget = dinnerBase + dinnerRoll;
    return {
      done,
      goal: target,
      snacks: { snack: snackBudget },
      parts: {
        breakfast: { budget: breakfast, eaten: breakfastEaten, roll: 0 },
        lunch: { budget: lunchBudget, eaten: lunchEaten, roll: lunchRoll },
        dinner: { budget: dinnerBudget, eaten: dinnerEaten, roll: dinnerRoll },
        snack: { budget: snackBudget, eaten: snackEaten, roll: 0 },
      },
    };
  }

  function partMeta(id) {
    if (id === "snack") return { name: "Snack", when: "From 4:00 AM" };
    return DAY_PARTS.find((part) => part.id === id) || DAY_PARTS[0];
  }

  function focusedPart(date, gate) {
    if (state.macroFocus === "snack" || DAY_PARTS.some((part) => part.id === state.macroFocus)) return state.macroFocus;
    const readyMeal = (gate?.ready || []).find((item) => item.kind === "meal");
    if (readyMeal) return readyMeal.id;
    const phaseId = (gate?.locked && gate.locked.id) || "";
    if (DAY_PARTS.some((part) => part.id === phaseId)) return phaseId;
    if ((gate?.ready || []).some((item) => item.id === "snack")) return "snack";
    if (date < todayISO()) return "dinner";
    return "breakfast";
  }

  function partReadout(id, part, done) {
    const left = Math.round(part.budget) - Math.round(part.eaten);
    const closed = done && done.has && done.has(id);
    if (left < 0) return { n: Math.abs(left), word: "over", tone: "over" };
    if (closed && left > 0) return { n: left, word: "rolled", tone: "roll" };
    return { n: Math.max(0, left), word: "left", tone: "" };
  }

  function slotNote(id, plan) {
    const part = plan.parts[id];
    const roll = Math.round(part.roll || 0);
    if (!roll) return "";
    const from = id === "lunch" ? "breakfast" : "lunch";
    return roll > 0 ? `+${num(roll, 0)} from ${from}` : `−${num(Math.abs(roll), 0)} from ${from}`;
  }

  function paneSwitch(active) {
    const tab = (id, label) => (
      `<button type="button" role="tab" data-pane="${id}" aria-selected="${active === id}" class="${active === id ? "on" : ""}">${label}</button>`
    );
    return `<div class="macro-switch" role="tablist" aria-label="Macros">${tab("macros", "Macros")}${tab("weight", "Weight")}</div>`;
  }

  function bindPaneSwitch() {
    $("screen").querySelectorAll("[data-pane]").forEach((btn) => {
      btn.onclick = () => {
        if (state.macroPane === btn.dataset.pane) return;
        vibrate();
        state.macroPane = btn.dataset.pane;
        renderMacros();
      };
    });
  }

  function macroSnapshot() {
    const data = state.macros;
    const date = state.macroDate || todayISO();
    if (!data || data.date !== date) return null;
    const ctx = macroContext(data, date);
    const id = focusedPart(date, ctx.gate);
    const meta = partMeta(id);
    return { plan: ctx.plan, id, meta, readout: partReadout(id, ctx.plan.parts[id], ctx.plan.done), date, data };
  }

  function paintMacroFocus() {
    const snap = macroSnapshot();
    const core = document.querySelector("#screen .day-core");
    if (!snap || !core) return false;
    core.classList.toggle("is-over", snap.readout.tone === "over");
    core.classList.toggle("is-roll", snap.readout.tone === "roll");
    const kicker = core.querySelector(".day-kicker");
    const figure = core.querySelector(".day-num");
    const sub = core.querySelector(".day-sub");
    const when = core.querySelector(".day-when");
    if (kicker) kicker.textContent = `kcal ${snap.readout.word}`;
    if (figure) figure.textContent = num(snap.readout.n, 0);
    if (sub) sub.textContent = snap.meta.name;
    if (when) when.textContent = snap.meta.when;
    document.querySelectorAll("#screen .slot-card").forEach((card) => {
      card.classList.toggle("is-on", card.dataset.slot === snap.id);
    });
    return true;
  }

  function playDayMotion() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll("#screen .ring-fill").forEach((path, i) => {
      const len = path.getTotalLength();
      if (!len) return;
      if (reduce) {
        path.style.strokeDasharray = `${len} ${len}`;
        return;
      }
      path.style.strokeDasharray = `0 ${len}`;
      path.style.strokeDashoffset = "0";
      window.setTimeout(() => {
        if (!path.isConnected) return;
        path.style.transition = "stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)";
        path.style.strokeDasharray = `${len} ${len}`;
      }, 90 + i * 80);
    });
    if (reduce) return;
    document.querySelectorAll("#screen .slot-fill").forEach((el, i) => {
      const target = el.style.width || "0%";
      el.style.transition = "none";
      el.style.width = "0%";
      requestAnimationFrame(() => {
        if (!el.isConnected) return;
        el.style.transition = `width 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms`;
        el.style.width = target;
      });
    });
  }

  function armMacroClock() {
    window.clearTimeout(state.macroClock);
    state.macroClock = 0;
    const date = state.macroDate || todayISO();
    if (hashRoute().route !== "macros" || date !== todayISO()) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const next = GATE_CUTS.find((cut) => cut > mins);
    if (next == null) return;
    const target = new Date(now);
    target.setHours(0, 0, 0, 0);
    target.setMinutes(next);
    target.setSeconds(1);
    state.macroClock = window.setTimeout(() => {
      state.macroClock = 0;
      if (hashRoute().route !== "macros") return;
      if (state.macroSheet || state.macroPane === "weight") state.macroClockDirty = true;
      else renderMacros();
      armMacroClock();
    }, Math.max(1000, target.getTime() - now.getTime()));
  }

  function dayBalance(plan, day) {
    const used = eatenAll(day);
    if (!plan.goal) return `<span>${num(used, 0)} used</span>`;
    const left = plan.goal - used;
    const remain = left < 0
      ? `<b class="over">${num(Math.abs(left), 0)} over</b>`
      : `<b>${num(left, 0)} left</b>`;
    return `<span>${num(used, 0)} used</span>${remain}`;
  }

  function slotBar(part) {
    const budget = Number(part.budget);
    const eaten = Number(part.eaten);
    if (budget > 0) return Math.max(0, Math.min(100, Math.round((eaten / budget) * 100)));
    return eaten > 0 ? 100 : 0;
  }

  function gateStore() {
    try {
      const raw = JSON.parse(localStorage.getItem("lifeos-gates") || "{}");
      return raw && typeof raw === "object" ? raw : {};
    } catch (err) {
      return {};
    }
  }

  function saveGates(store) {
    try { localStorage.setItem("lifeos-gates", JSON.stringify(store)); } catch (err) {}
  }

  function seedToday(day) {
    const now = clockMins();
    const breakfast = mealEaten(day, "breakfast");
    const lunch = mealEaten(day, "lunch");
    const done = [];
    if (breakfast > 0 && (now >= 11 * 60 || lunch > 0)) done.push("breakfast");
    if (lunch > 0 && done.includes("breakfast")) done.push("lunch");
    return done;
  }

  function gateProgress(date, day) {
    const today = todayISO();
    if (date > today) return { done: [] };
    const store = gateStore();
    if (store[date] && Array.isArray(store[date].done)) {
      let saved = store[date].done.slice();
      if (date === today && saved.includes("snack")) {
        saved = saved.filter((id) => id !== "snack");
        store[date] = { done: saved };
        saveGates(store);
      }
      return { done: saved };
    }
    const done = date < today ? PHASES.map((phase) => phase.id).concat("snack") : seedToday(day);
    store[date] = { done };
    saveGates(store);
    return { done: done.slice() };
  }

  function markGate(date, id) {
    const store = gateStore();
    const done = Array.isArray(store[date]?.done) ? store[date].done.slice() : [];
    if (!done.includes(id)) done.push(id);
    store[date] = { done };
    saveGates(store);
    return done;
  }

  function absorbGate(date, id, done, progress) {
    done.add(id);
    progress.done = [...done];
    markGate(date, id);
  }

  function resolveGate(date, day, progress, goal) {
    const today = todayISO();
    const done = new Set(progress.done || []);
    const empty = { ready: [], locked: null, phase: null, done, wait: 0, cap: 0 };
    if (date > today) return { ...empty, mode: "future", phase: PHASES[0] };
    if (date < today) return { ...empty, mode: "review" };
    const nowDate = new Date();
    const secs = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
    const now = Math.floor(secs / 60);
    const ready = [];
    let locked = null;
    let wait = 0;
    for (const phase of PHASES) {
      if (done.has(phase.id)) continue;
      if (phase.opens != null && now < phase.opens) {
        locked = phase;
        wait = Math.max(0, phase.opens * 60 - secs);
        break;
      }
      const drafting = state.gateComposer && state.gatePhaseId === phase.id;
      if (mealEaten(day, phase.meal) > 0 && !drafting) {
        absorbGate(date, phase.id, done, progress);
        continue;
      }
      if (phase.kind === "snack") {
        ready.push({ ...phase, cap: Number(phase.cap) || 0 });
        continue;
      }
      ready.push({ ...phase, cap: 0 });
      break;
    }
    if (now >= SNACK.opens) ready.push({ ...SNACK, cap: 0 });
    let mode = "complete";
    if (ready.length && locked) mode = "mixed";
    else if (ready.length) mode = "open";
    else if (locked) mode = "locked";
    return {
      mode,
      ready,
      locked,
      phase: locked || ready[0] || null,
      done,
      wait,
      cap: ready[0]?.cap || 0,
    };
  }

  function macroContext(data, date) {
    const day = (data && data.day) || {};
    const goal = Number(data?.settings?.calories || 0);
    const progress = gateProgress(date, day);
    const gate = resolveGate(date, day, progress, Math.round(goal) || 0);
    const plan = macroPlan(goal, day, progress);
    return { day, progress, gate, plan };
  }

  function pad2(n) {
    return String(Math.max(0, n | 0)).padStart(2, "0");
  }

  function splitWait(sec) {
    const s = Math.max(0, sec | 0);
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }

  function lockSpan(phase) {
    if (!phase || phase.opens == null) return 0;
    if (phase.id === "breakfast") return phase.opens * 60;
    if (phase.id === "lunch") return (11 * 60 - 4 * 60) * 60;
    if (phase.id === "dinner") return ((18 * 60 + 30) - 11 * 60) * 60;
    return 0;
  }

  function clockRing(pct) {
    const c = 2 * Math.PI * 54;
    const dash = Math.max(0, Math.min(1, pct)) * c;
    return `<svg viewBox="0 0 140 140" class="gate-ring" aria-hidden="true"><circle cx="70" cy="70" r="54"></circle><circle class="gate-ring-fill" cx="70" cy="70" r="54" data-gate-c="${c.toFixed(2)}" style="stroke-dasharray:${dash.toFixed(2)} ${c.toFixed(2)}"></circle></svg>`;
  }

  function phaseHint(phase) {
    if (phase.kind === "snack") return "From 4:00 AM";
    return phase.opensLabel || "";
  }

  function dayPhases() {
    const breakfast = PHASES.find((phase) => phase.id === "breakfast");
    const lunch = PHASES.find((phase) => phase.id === "lunch");
    const dinner = PHASES.find((phase) => phase.id === "dinner");
    return [breakfast, SNACK, lunch, dinner];
  }

  function loadLockLines() {
    if (state.lockLines || state.lockLinesLoading) return;
    state.lockLinesLoading = true;
    fetch("data/lock-lines.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((lines) => {
        state.lockLines = Array.isArray(lines) ? lines.map((line) => String(line || "").trim()).filter(Boolean) : [];
      })
      .catch(() => { state.lockLines = []; })
      .finally(() => {
        state.lockLinesLoading = false;
        if (state.lockLines && state.lockLines.length && hashRoute().route === "macros" && state.macroPane !== "weight" && !state.gateComposer) {
          state.lockTaunt = "";
          renderMacros();
        }
      });
  }

  function lockTaunt(phaseId, fresh) {
    const lines = state.lockLines || [];
    if (!lines.length || !phaseId) return "";
    if (fresh || state.lockTauntPhase !== phaseId || !state.lockTaunt) {
      state.lockTauntPhase = phaseId;
      state.lockTaunt = lines[Math.floor(Math.random() * lines.length)];
    }
    return state.lockTaunt;
  }

  function lockClockHTML(gate, slim) {
    const t = splitWait(gate.wait);
    const span = lockSpan(gate.locked || gate.phase);
    const pct = span > 0 ? 1 - gate.wait / span : 0;
    return `
      <div class="gate-clock${slim ? " is-slim" : ""}" data-gate-wait="${Date.now() + gate.wait * 1000}" data-gate-span="${span}">
        <div class="gate-ring-box">${clockRing(pct)}</div>
        <div class="gate-digits" aria-label="${pad2(t.h)} hours ${pad2(t.m)} minutes ${pad2(t.s)} seconds">
          <b data-gate-h>${pad2(t.h)}</b><span>h</span>
          <b data-gate-m>${pad2(t.m)}</b><span>m</span>
          <b data-gate-s>${pad2(t.s)}</b><span>s</span>
        </div>
      </div>`;
  }

  function queueCardHTML(item, plan, day) {
    const snack = item.kind === "snack";
    const budget = snack ? Math.round(plan.snacks?.snack || 0) : Math.round(plan.parts[item.id]?.budget || 0);
    const eaten = snack ? mealEaten(day, "snack") : 0;
    const hint = snack ? "From 4:00 · add anytime" : "One submit";
    const figure = snack ? `${num(eaten, 0)} / ${num(budget, 0)}` : num(budget, 0);
    return `
      <article class="q-card${snack ? " is-snack" : ""}">
        <button type="button" class="q-main" data-queue="${esc(item.id)}">
          <span class="q-kicker">${snack ? "Snack" : "Meal"}</span>
          <strong>${esc(item.name)}</strong>
          <em>${esc(hint)}</em>
          <b class="q-kcal">${figure}<small>kcal</small></b>
        </button>
        ${snack ? "" : `<button type="button" class="q-skip" data-skip="${esc(item.id)}">Skip</button>`}
      </article>`;
  }

  function gateSideHTML(gate, plan, day, fresh) {
    if (gate.mode === "future") {
      return `<section class="gate-stage is-locked"><p class="home-kicker">Ahead</p><h2>Breakfast opens at 4:00 AM</h2><p>This day is still closed.</p></section>`;
    }
    if (gate.mode === "review") {
      return `<section class="gate-stage is-done"><p class="home-kicker">Review</p><h2>Logged day</h2><p>Past days stay read only.</p></section>`;
    }
    if (gate.mode === "complete") {
      const left = plan.goal - eatenAll(day);
      const closed = left <= 0;
      return `<section class="gate-stage is-done"><p class="home-kicker">Finished</p><h2>${closed ? "Out of calories" : `${num(Math.max(0, left), 0)} still on the table`}</h2><p>${closed ? "The day is closed." : "Dinner is in. The day is closed."}</p></section>`;
    }
    const cards = (gate.ready || []).map((item) => queueCardHTML(item, plan, day)).join("");
    const locked = gate.locked;
    const taunt = locked ? lockTaunt(locked.id, fresh) : "";
    const slim = (gate.ready || []).length > 0;
    const lock = locked ? `
      <section class="gate-stage is-locked${slim ? " is-slim" : ""}">
        ${lockClockHTML(gate, slim)}
        <p class="home-kicker">Locked · ${esc(locked.name)} ${esc(locked.opensLabel || "")}</p>
        ${taunt ? `<p class="gate-taunt">${esc(taunt)}</p>` : ""}
      </section>` : "";
    if (!cards) return lock;
    return `
      <div class="gate-queue">
        <div class="q-head"><p class="home-kicker">Queue</p><b>${gate.ready.length}</b></div>
        ${cards}
        ${lock}
      </div>`;
  }

  function gateTimeline(day, plan, gate, focusId) {
    const readyIds = new Set((gate.ready || []).map((item) => item.id));
    return `<ol class="gate-rail">${dayPhases().map((phase) => {
      const closed = gate.mode === "review" || (phase.kind !== "snack" && gate.done.has(phase.id));
      let status = closed
        ? "done"
        : (readyIds.has(phase.id) ? "open" : (gate.locked && gate.locked.id === phase.id ? "locked" : "wait"));
      if (phase.kind === "snack" && status === "wait" && gate.locked && gate.locked.id === "breakfast") status = "locked";
      const rows = mealRows(day, phase.meal);
      const eaten = mealEaten(day, phase.meal);
      const hint = phaseHint(phase);
      let meta = "";
      if (phase.kind === "meal") {
        const slot = plan.parts[phase.id];
        meta = `${num(eaten, 0)} / ${num(Math.round(slot?.budget || 0), 0)}`;
      } else if (status === "done" && !eaten) {
        meta = "Skipped";
      } else {
        meta = `${num(eaten, 0)} / ${num(Math.round(plan.snacks?.snack || 0), 0)}`;
      }
      const note = phase.kind === "meal" ? slotNote(phase.id, plan) : "";
      const name = `<button type="button" class="gate-name" data-focus="${phase.id}">${esc(phase.name)}</button>`;
      const foods = rows.map((row) => `<li><span>${esc(row.item_name)}</span><b>${num(row.calories, 0)}</b></li>`).join("");
      const badge = status === "open"
        ? `<em class="slot-now"><i></i>${phase.kind === "snack" ? "Open" : "Now"}</em>`
        : "";
      return `
        <li class="gate-step is-${status}${focusId === phase.id ? " is-on" : ""}">
          <span class="gate-mark"></span>
          <div>
            <div class="gate-step-top">${name}<em>${esc(meta)}</em></div>
            <span class="gate-when">${esc(hint)}${badge}</span>
            ${note ? `<em class="slot-note">${esc(note)}</em>` : ""}
            ${foods ? `<ul class="gate-foods">${foods}</ul>` : ""}
          </div>
        </li>`;
    }).join("")}</ol>`;
  }

  function composerFigures() {
    const lines = state.gateLines || [];
    const totals = mealTotals(lines);
    const empty = !lines.some((line) => Number(line.qty) > 0);
    if (state.freeLog) {
      const day = state.macros?.day || {};
      const goal = Number(state.macros?.settings?.calories || 0);
      const left = Math.max(0, goal - eatenAll(day));
      const over = goal > 0 && eatenAll(day) + totals.calories > goal + 0.49;
      return { phase: { name: "Log", kind: "day" }, totals, guide: left, over, empty };
    }
    const phase = PHASES.find((item) => item.id === state.gatePhaseId) || (state.gatePhaseId === "snack" ? SNACK : null);
    const day = state.macros?.day || {};
    const date = state.macroDate || todayISO();
    const goal = Number(state.macros?.settings?.calories || 0);
    const progress = gateProgress(date, day);
    const plan = macroPlan(goal, day, progress);
    const snack = phase && phase.kind === "snack";
    const shown = snack ? snackRunning(day, lines) : totals;
    const guide = !phase ? 0 : (snack
      ? Math.round(plan.snacks?.snack || 0)
      : Math.round(plan.parts[phase.id]?.budget || 0));
    const over = guide > 0 && shown.calories > guide + 0.49;
    return { phase, totals: shown, guide, over, empty };
  }

  function snackRunning(day, lines) {
    const base = mealRows(day, "snack").reduce((sum, row) => {
      sum.calories += Number(row.calories || 0);
      sum.protein_g += Number(row.protein_g || 0);
      sum.carb_g += Number(row.carb_g || 0);
      sum.fat_g += Number(row.fat_g || 0);
      return sum;
    }, { calories: 0, protein_g: 0, carb_g: 0, fat_g: 0 });
    const add = mealTotals(lines || []);
    return {
      calories: base.calories + add.calories,
      protein_g: base.protein_g + add.protein_g,
      carb_g: base.carb_g + add.carb_g,
      fat_g: base.fat_g + add.fat_g,
    };
  }

  function composerRing(kcal, guide) {
    const c = 2 * Math.PI * 62;
    const pct = guide > 0 ? Math.max(0, Math.min(1, kcal / guide)) : 0;
    return { c, dash: pct * c };
  }

  function gateBasketHTML(lines) {
    if (!lines.length) return `<p class="comp-empty">Nothing in this log yet.</p>`;
    return lines.map((line, i) => {
      const food = mealFood(line.item_id);
      const live = scaledFood(food, line.qty);
      const unit = food?.unit === "ea" || food?.each ? "ea" : "g";
      return `
        <div class="comp-line" data-line="${i}">
          <div class="comp-line-name">
            <strong>${esc(food?.name || "Item")}</strong>
            <span data-line-kcal>${num(live.calories, 0)} kcal</span>
          </div>
          <label class="comp-qty">
            <input data-gate-qty="${i}" inputmode="decimal" value="${esc(line.qty)}" aria-label="Amount of ${esc(food?.name || "item")}">
            <em>${unit}</em>
          </label>
          <button type="button" class="kill" data-gate-drop="${i}" aria-label="Remove ${esc(food?.name || "item")}">×</button>
        </div>`;
    }).join("");
  }

  function composerHTML() {
    const fig = composerFigures();
    const phase = fig.phase;
    const name = phase ? phase.name : "Log";
    const ring = composerRing(fig.totals.calories, fig.guide);
    const free = state.freeLog;
    const snack = phase && phase.kind === "snack";
    const kicker = free ? "Add food" : (snack ? "Add to snack" : "One submit");
    const action = state.gateBusy ? "Saving…" : (free ? "Log" : (snack ? "Add" : `Submit ${esc(name.toLowerCase())}`));
    return `
      <div class="stack macros-page comp-page is-enter">
        ${paneSwitch("macros")}
        <section class="comp">
          <div class="comp-top">
            <button type="button" class="comp-back" id="gateBack" aria-label="Back">‹</button>
            <div>
              <p class="home-kicker">${kicker}</p>
              <h2>${esc(name)}</h2>
            </div>
          </div>
          <div class="comp-meter${fig.over ? " is-over" : ""}" id="compMeter">
            <svg viewBox="0 0 160 160" class="comp-ring" aria-hidden="true">
              <circle cx="80" cy="80" r="62"></circle>
              <circle class="comp-ring-fill" cx="80" cy="80" r="62" data-comp-c="${ring.c.toFixed(2)}" style="stroke-dasharray:${ring.dash.toFixed(2)} ${ring.c.toFixed(2)}"></circle>
            </svg>
            <div class="comp-read">
              <b data-comp-kcal>${num(fig.totals.calories, 0)}</b>
              <span data-comp-cap>${free ? `${num(fig.guide, 0)} left` : `of ${num(fig.guide, 0)}`}</span>
            </div>
          </div>
          <p class="comp-split" data-comp-split>P${num(fig.totals.protein_g, 0)} · C${num(fig.totals.carb_g, 0)} · F${num(fig.totals.fat_g, 0)}</p>
          <p class="comp-err" id="gateErr">${esc(state.gateErr || "")}</p>
          <div class="comp-basket" id="gateBasket">${gateBasketHTML(state.gateLines || [])}</div>
          <label class="comp-search">
            <input id="gateSearch" placeholder="Search foods or meals" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" value="${esc(state.gateQuery || "")}" aria-label="Search foods">
          </label>
          <div class="comp-hits" id="gateHits"></div>
          <button type="button" class="comp-new" id="gateNew">New food</button>
          <button type="button" class="comp-submit" id="gateSubmit"${(fig.empty || state.gateBusy) ? " disabled" : ""}>${action}</button>
          ${free || snack ? "" : `<button type="button" class="gate-skip" id="skipGate">Skip ${esc(name.toLowerCase())}</button>`}
        </section>
      </div>`;
  }

  function paintComposerMeter() {
    const fig = composerFigures();
    const meter = $("compMeter");
    if (meter) meter.classList.toggle("is-over", fig.over);
    const kcal = document.querySelector("[data-comp-kcal]");
    const cap = document.querySelector("[data-comp-cap]");
    const split = document.querySelector("[data-comp-split]");
    if (kcal) kcal.textContent = num(fig.totals.calories, 0);
    if (cap) cap.textContent = state.freeLog ? `${num(fig.guide, 0)} left` : `of ${num(fig.guide, 0)}`;
    if (split) split.textContent = `P${num(fig.totals.protein_g, 0)} · C${num(fig.totals.carb_g, 0)} · F${num(fig.totals.fat_g, 0)}`;
    const ring = document.querySelector(".comp-ring-fill");
    if (ring) {
      const c = Number(ring.dataset.compC) || (2 * Math.PI * 62);
      const drawn = composerRing(fig.totals.calories, fig.guide);
      ring.style.strokeDasharray = `${drawn.dash.toFixed(2)} ${c.toFixed(2)}`;
    }
    const err = $("gateErr");
    if (err) err.textContent = state.gateErr || "";
    const submit = $("gateSubmit");
    if (submit) {
      submit.disabled = fig.empty || state.gateBusy;
      if (!state.gateBusy) {
        const snack = fig.phase?.kind === "snack";
        submit.textContent = state.freeLog ? "Log" : (snack ? "Add" : `Submit ${(fig.phase?.name || "log").toLowerCase()}`);
      }
    }
  }

  function paintGateBasket() {
    const box = $("gateBasket");
    if (!box) return;
    box.innerHTML = gateBasketHTML(state.gateLines || []);
    bindGateLines();
    paintComposerMeter();
  }

  function bindGateLines() {
    const box = $("gateBasket");
    if (!box) return;
    box.querySelectorAll("[data-gate-qty]").forEach((input) => {
      input.oninput = () => {
        const i = Number(input.dataset.gateQty);
        if (!state.gateLines[i]) return;
        state.gateLines[i].qty = input.value;
        const food = mealFood(state.gateLines[i].item_id);
        const live = scaledFood(food, input.value);
        const label = input.closest(".comp-line")?.querySelector("[data-line-kcal]");
        if (label) label.textContent = `${num(live.calories, 0)} kcal`;
        state.gateErr = "";
        paintComposerMeter();
      };
    });
    box.querySelectorAll("[data-gate-drop]").forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.gateDrop);
        state.gateLines.splice(i, 1);
        vibrate();
        paintGateBasket();
      };
    });
  }

  function paintGateHits() {
    const box = $("gateHits");
    if (!box) return;
    const q = (state.gateQuery || "").trim().toLowerCase();
    const foods = state.macros?.foods || mealFoods();
    const recipes = savedMeals();
    if (!q) {
      box.innerHTML = "";
      return;
    }
    const foodHits = foods.filter((food) => (food.name || "").toLowerCase().includes(q)).slice(0, 8);
    const mealHits = recipes.filter((meal) => (meal.name || "").toLowerCase().includes(q)).slice(0, 4);
    const rows = [
      ...mealHits.map((meal) => {
        const tot = mealTotalsOf(meal);
        return `<button type="button" class="comp-hit" data-gate-recipe="${esc(meal.id)}"><strong>${esc(meal.name)}</strong><span>${(meal.lines || []).length} items · ${num(tot.calories, 0)} kcal</span></button>`;
      }),
      ...foodHits.map((food) => `<button type="button" class="comp-hit" data-gate-food="${esc(food.id)}"><strong>${esc(food.name)}</strong><span>usual ${esc(qtyLabel(food.usual_qty, food.unit))} · ${num(food.calories, 0)} kcal</span></button>`),
    ].join("");
    box.innerHTML = rows || `<p class="comp-empty">No match.</p>`;
    box.querySelectorAll("[data-gate-food]").forEach((btn) => {
      btn.onclick = () => {
        const food = foods.find((item) => item.id === btn.dataset.gateFood);
        if (!food) return;
        vibrate();
        state.gateLines = state.gateLines || [];
        state.gateLines.push({ item_id: food.id, qty: food.usual_qty });
        state.gateQuery = "";
        state.gateErr = "";
        const search = $("gateSearch");
        if (search) search.value = "";
        paintGateBasket();
        paintGateHits();
        if (search) search.focus();
      };
    });
    box.querySelectorAll("[data-gate-recipe]").forEach((btn) => {
      btn.onclick = () => {
        const meal = recipes.find((item) => item.id === btn.dataset.gateRecipe);
        if (!meal) return;
        vibrate();
        state.gateLines = (state.gateLines || []).concat(cloneMealLines(meal));
        state.gateQuery = "";
        state.gateErr = "";
        const search = $("gateSearch");
        if (search) search.value = "";
        paintGateBasket();
        paintGateHits();
        if (search) search.focus();
      };
    });
  }

  function bindComposer() {
    const back = $("gateBack");
    if (back) back.onclick = () => {
      vibrate();
      if (!state.freeLog) rememberDraft();
      state.freeLog = false;
      state.gateComposer = false;
      state.gateErr = "";
      renderMacros();
    };
    const search = $("gateSearch");
    if (search) {
      search.oninput = () => {
        state.gateQuery = search.value;
        paintGateHits();
      };
    }
    const newer = $("gateNew");
    if (newer) newer.onclick = () => openGateNew();
    const submit = $("gateSubmit");
    if (submit) submit.onclick = () => submitGate();
    const skip = $("skipGate");
    if (skip) skip.onclick = () => skipPhase();
    bindGateLines();
    paintGateHits();
  }

  function rememberDraft() {
    if (!state.gatePhaseId) return;
    state.gateDrafts[state.gatePhaseId] = {
      lines: (state.gateLines || []).slice(),
      query: state.gateQuery || "",
    };
  }

  function openFreeLog() {
    vibrate();
    state.freeLog = true;
    state.gateComposer = false;
    state.gatePhaseId = "";
    state.gateLines = [];
    state.gateQuery = "";
    state.gateErr = "";
    renderMacros();
  }

  function openComposer(id) {
    const date = state.macroDate || todayISO();
    const ctx = macroContext(state.macros, date);
    const hit = (ctx.gate.ready || []).find((item) => item.id === id);
    if (!hit) return;
    vibrate();
    if (state.gateComposer && state.gatePhaseId && state.gatePhaseId !== id) rememberDraft();
    const saved = state.gateDrafts[id];
    state.gateLines = saved ? saved.lines.slice() : [];
    state.gateQuery = saved ? saved.query : "";
    state.gateComposer = true;
    state.gatePhaseId = id;
    state.gateDate = date;
    state.gateErr = "";
    renderMacros();
  }

  function openGateNew() {
    const phase = PHASES.find((item) => item.id === state.gatePhaseId);
    state.macroSheet = "log";
    state.macroMeal = phase && phase.kind !== "snack" ? phase.meal : "breakfast";
    state.macroQuery = state.gateQuery || "";
    openNewItem();
  }

  function skipPhase(id) {
    const date = state.macroDate || todayISO();
    if (!state.macros || date !== todayISO() || state.gateBusy) return;
    const target = id || state.gatePhaseId;
    if (target === "snack") return;
    const ctx = macroContext(state.macros, date);
    const hit = (ctx.gate.ready || []).find((item) => item.id === target);
    if (!hit) return;
    vibrate();
    markGate(date, target);
    delete state.gateDrafts[target];
    if (state.gatePhaseId === target) {
      state.gateComposer = false;
      state.gatePhaseId = "";
      state.gateLines = [];
      state.gateQuery = "";
      state.gateErr = "";
    }
    renderMacros();
  }

  async function submitGate() {
    if (state.gateBusy) return;
    const free = state.freeLog;
    const phase = free
      ? { id: "day", kind: "day", meal: "breakfast" }
      : (PHASES.find((item) => item.id === state.gatePhaseId) || (state.gatePhaseId === "snack" ? SNACK : null));
    const date = state.macroDate || todayISO();
    if (!phase || (!free && date !== todayISO())) return;
    const lines = (state.gateLines || []).filter((line) => line.item_id && Number(line.qty) > 0);
    if (!lines.length) {
      state.gateErr = "Add at least one food.";
      paintComposerMeter();
      return;
    }
    state.gateBusy = true;
    state.gateErr = "";
    paintComposerMeter();
    const submit = $("gateSubmit");
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Saving…";
    }
    let posted = 0;
    const host = free || phase.kind === "snack" ? "breakfast" : phase.meal;
    const known = new Set(allDayRows(state.macros && state.macros.day).map((row) => String(row.id)));
    const fresh = [];
    try {
      let data = state.macros;
      for (const line of lines) {
        data = await LifeAPI.macroLog({
          item_id: line.item_id,
          qty: Number(line.qty),
          meal: host,
          date,
        });
        allDayRows(data && data.day).forEach((row) => {
          const id = String(row.id);
          if (!known.has(id)) {
            known.add(id);
            fresh.push(id);
          }
        });
        posted += 1;
        state.macros = data;
      }
      if (!free && phase.kind === "snack") rememberSnackIds(date, phase.id, fresh);
      if (!free && phase.kind !== "snack") {
        markGate(date, phase.id);
        delete state.gateDrafts[phase.id];
      }
      state.gateBusy = false;
      state.freeLog = false;
      state.gateComposer = false;
      state.gatePhaseId = "";
      state.gateLines = [];
      state.gateQuery = "";
      state.gateErr = "";
      renderMacros();
    } catch (err) {
      state.gateLines = lines.slice(posted);
      if (!free && phase.kind === "snack" && fresh.length) rememberSnackIds(date, phase.id, fresh);
      state.gateBusy = false;
      state.gateErr = err.message || "Could not save that log";
      try { state.macros = await LifeAPI.macros(date); } catch (e) {}
      renderMacros();
    }
  }

  function armGateTicker() {
    if (state.gateTicker) {
      window.clearInterval(state.gateTicker);
      state.gateTicker = 0;
    }
    const node = document.querySelector("#screen [data-gate-wait]");
    if (!node || hashRoute().route !== "macros") return;
    state.gateTicker = window.setInterval(() => {
      if (!node.isConnected || hashRoute().route !== "macros") {
        window.clearInterval(state.gateTicker);
        state.gateTicker = 0;
        return;
      }
      const left = Math.max(0, Math.ceil((Number(node.dataset.gateWait) - Date.now()) / 1000));
      const parts = splitWait(left);
      const h = node.querySelector("[data-gate-h]");
      const m = node.querySelector("[data-gate-m]");
      const s = node.querySelector("[data-gate-s]");
      if (h) h.textContent = pad2(parts.h);
      if (m) m.textContent = pad2(parts.m);
      if (s) s.textContent = pad2(parts.s);
      const ring = node.querySelector(".gate-ring-fill");
      const span = Number(node.dataset.gateSpan || 0);
      const circ = Number(ring?.dataset.gateC || 0);
      if (ring && span > 0 && circ > 0) {
        const pct = Math.max(0, Math.min(1, 1 - left / span));
        ring.style.strokeDasharray = `${(pct * circ).toFixed(2)} ${circ.toFixed(2)}`;
      }
      if (left <= 0) {
        window.clearInterval(state.gateTicker);
        state.gateTicker = 0;
        if (state.macroSheet || state.macroPane === "weight") state.macroClockDirty = true;
        else renderMacros();
      }
    }, 1000);
  }

  function weekendLogHTML(day) {
    const rows = allDayRows(day).slice().sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
    const foods = rows.map((row) => `
      <div class="wk-row">
        <div>
          <strong>${esc(row.item_name)}</strong>
          <span>${esc(qtyLabel(row.qty, row.unit))}</span>
        </div>
        <b>${num(row.calories, 0)}</b>
        <button type="button" class="kill" data-del="${esc(row.id)}" aria-label="Remove ${esc(row.item_name)}">×</button>
      </div>`).join("");
    return `
      <section class="wk-log">
        <div class="q-head"><p class="home-kicker">Log</p><b>${rows.length}</b></div>
        ${foods || `<p class="comp-empty">Nothing logged yet.</p>`}
        <button type="button" class="gate-go" id="openFreeLog">Add food</button>
      </section>`;
  }

  function renderMacros() {
    const data = state.macros;
    const date = state.macroDate || todayISO();
    const pane = state.macroPane === "weight" ? "weight" : "macros";
    setChrome(pane === "weight" ? "Weight" : prettyDay(date), "Macros");
    if (!data || data.date !== date) {
      $("screen").innerHTML = `<div class="empty">Loading…</div>`;
      return;
    }
    if (state.macroFocusDate !== date) {
      state.macroFocus = "";
      state.macroFocusDate = date;
    }
    const week = data.week || {};
    const settings = data.settings || {};
    const today = data.today || todayISO();
    const days = week.days || [];
    if (state.gateDate !== date) {
      state.gateComposer = false;
      state.gatePhaseId = "";
      state.gateLines = [];
      state.gateQuery = "";
      state.gateErr = "";
      state.gateDrafts = {};
      state.freeLog = false;
      state.gateDate = date;
    }
    const weekend = isWeekend(date);
    if (weekend) state.gateComposer = false;
    else state.freeLog = false;
    const ctx = macroContext(data, date);
    const day = ctx.day;
    const plan = ctx.plan;
    const gate = ctx.gate;
    if (!weekend && state.gateComposer && !(gate.ready || []).some((item) => item.id === state.gatePhaseId)) {
      state.gateComposer = false;
    }
    if (!weekend) loadLockLines();
    const focusId = focusedPart(date, gate);
    const focusMeta = weekend
      ? { name: "Day", when: "" }
      : partMeta(focusId);
    const usedNow = eatenAll(day);
    const dayLeft = plan.goal - usedNow;
    const focusRead = weekend
      ? (dayLeft < 0
        ? { n: Math.abs(Math.round(dayLeft)), word: "over", tone: "over" }
        : { n: Math.max(0, Math.round(dayLeft)), word: "left", tone: "" })
      : partReadout(focusId, plan.parts[focusId], plan.done);
    const weights = weightPoints();
    const trend = weightTrend(weights);
    const copy = weightCopy(weights, trend);
    const weightKey = weights.map((row) => `${row.date}:${row.lbs}`).join("|");
    const enterPage = !state.macrosEntered || state.macroPaneDrawn !== pane;
    const drawLine = pane === "weight" && (enterPage || weightKey !== state.weightDrawKey);
    state.macrosEntered = true;
    state.macroPaneDrawn = pane;
    if (pane === "weight") state.weightDrawKey = weightKey;
    state.macroClockDirty = false;
    const chips = [...weights].reverse();
    const weekHTML = `
      <div class="viz-week">
        <button type="button" class="dow-shift" id="prevWeek" aria-label="Previous week">‹</button>
        <div class="viz-days">
          ${days.map((d) => {
            const kcal = Number(d.totals?.calories || 0);
            const h = plan.goal > 0 && kcal ? Math.max(12, Math.min(100, Math.round((kcal / plan.goal) * 100))) : (kcal ? 40 : 8);
            const on = d.date === date ? "on" : "";
            const future = d.date > today ? "future" : "";
            const hit = d.hit && d.hit.all ? "hit" : "";
            return `<button type="button" class="viz-day ${on} ${future} ${hit}" data-day="${esc(d.date)}">
              <span class="viz-bar"><i style="height:${h}%"></i></span>
              <b>${esc(d.label)}</b>
            </button>`;
          }).join("")}
        </div>
        <button type="button" class="dow-shift" id="nextWeek" aria-label="Next week">›</button>
      </div>`;
    const macroHTML = `
      <div class="stack macros-page${enterPage ? " is-enter" : ""}">
        ${paneSwitch("macros")}
        ${weekHTML}
        <section class="day-hero">
          <div class="day-hero-top">
            <div>
              <p class="home-kicker">Daily target</p>
              <p class="day-target">${plan.goal ? `${num(plan.goal, 0)}<small>kcal</small>` : "Set a target"}</p>
              <p class="day-balance">${dayBalance(plan, day)}</p>
            </div>
            <div class="day-hero-actions">
              <button type="button" class="viz-chip" id="targetsBtn">${num(settings.protein_pct || 0, 0)} / ${num(settings.carb_pct || 0, 0)} / ${num(settings.fat_pct || 0, 0)}</button>
            </div>
          </div>
          ${macroRingHTML(day, settings, focusRead, focusMeta)}
        </section>
        ${weekend ? weekendLogHTML(day) : `<div class="gate-board">
          ${gateSideHTML(gate, plan, day, enterPage)}
          ${gateTimeline(day, plan, gate, focusId)}
        </div>`}
      </div>`;
    const weightHTML = `
      <div class="stack macros-page weight-page${enterPage ? " is-enter" : ""}">
        ${paneSwitch("weight")}
        <section class="wt-card">
          <div class="wt-head">
            <div>
              <p class="home-kicker">Weight</p>
              <p class="wt-figure">${esc(copy.figure)}${copy.figure === "—" ? "" : "<small>lb</small>"}</p>
              <p class="wt-meta">${esc(copy.meta)}</p>
            </div>
            ${copy.slope ? `<div class="wt-slope ${copy.slopeClass}"><span>Avg slope</span><b>${esc(copy.slope)}</b></div>` : ""}
          </div>
          <div class="wt-stage" id="wtStage"></div>
          <div class="wt-key" ${weights.length < 2 ? "hidden" : ""}>
            <span><i class="solid"></i>Weigh-ins</span>
            <span><i class="dotted"></i>Avg slope</span>
          </div>
          ${state.weightErr ? `<p class="err">${esc(state.weightErr)}</p>` : ""}
          <form class="wt-log" id="wtForm">
            <label class="wt-field">
              <span>Date</span>
              <input class="field" id="wtDate" type="date" value="${esc(date)}" required aria-label="Weigh-in date">
            </label>
            <label class="wt-field">
              <span>Pounds</span>
              <input class="field" id="wtLbs" inputmode="decimal" placeholder="0.0" autocomplete="off" aria-label="Weight in pounds" ${state.weightBusy ? "disabled" : ""}>
            </label>
            <button class="wt-save" id="wtSave" type="submit" ${state.weightBusy ? "disabled" : ""}>Log</button>
          </form>
          ${chips.length ? `<div class="wt-history">${chips.map((row) => `
            <div class="wt-row">
              <span>${esc(weightDateLabel(row.date, false))}</span>
              <b>${esc(num(row.lbs, 1))}<small>lb</small></b>
              <button type="button" data-wdel="${esc(row.id)}" aria-label="Remove ${esc(weightDateLabel(row.date, true))}">×</button>
            </div>`).join("")}</div>` : ""}
        </section>
      </div>`;
    const showComposer = pane !== "weight" && (state.freeLog || (!weekend && state.gateComposer));
    $("screen").innerHTML = pane === "weight" ? weightHTML : (showComposer ? composerHTML() : macroHTML);
    bindPaneSwitch();
    if (pane === "weight") {
      const wtForm = $("wtForm");
      if (wtForm) wtForm.onsubmit = saveWeight;
      $("screen").querySelectorAll("[data-wdel]").forEach((btn) => {
        btn.onclick = () => deleteWeight(btn.dataset.wdel);
      });
      paintWeightChart(drawLine);
    } else if (showComposer) {
      bindComposer();
    } else {
      $("screen").querySelectorAll("[data-day]").forEach((btn) => {
        btn.onclick = () => { vibrate(); go("macros", btn.dataset.day); };
      });
      const prev = $("prevWeek");
      const next = $("nextWeek");
      if (prev) prev.onclick = () => { vibrate(); go("macros", shiftDate(date, -7)); };
      if (next) next.onclick = () => { vibrate(); go("macros", shiftDate(date, 7)); };
      $("screen").querySelectorAll("[data-focus]").forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.focus;
          vibrate();
          state.macroFocus = state.macroFocus === id ? "" : id;
          if (!paintMacroFocus()) renderMacros();
        };
      });
      const targets = $("targetsBtn");
      if (targets) targets.onclick = () => openTargetsSheet();
      const free = $("openFreeLog");
      if (free) free.onclick = () => openFreeLog();
      $("screen").querySelectorAll("[data-del]").forEach((btn) => {
        btn.onclick = () => deleteMacroLog(btn.dataset.del);
      });
      $("screen").querySelectorAll("[data-queue]").forEach((btn) => {
        btn.onclick = () => openComposer(btn.dataset.queue);
      });
      $("screen").querySelectorAll("[data-skip]").forEach((btn) => {
        btn.onclick = () => skipPhase(btn.dataset.skip);
      });
      playDayMotion();
    }
    armMacroClock();
    armGateTicker();
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
    const refresh = state.macroClockDirty && hashRoute().route === "macros";
    state.macroClockDirty = false;
    if (refresh) renderMacros();
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

  function paintLogHits() {
    const box = $("logHits");
    if (!box) return;
    const foods = state.macros?.foods || mealFoods();
    const recipes = savedMeals();
    const recipe = state.macroPickedRecipe;
    const q = (state.macroQuery || "").trim().toLowerCase();
    const foodHits = q ? foods.filter((f) => (f.name || "").toLowerCase().includes(q)).slice(0, 16) : [];
    const mealHits = (!recipe && q) ? recipes.filter((m) => (m.name || "").toLowerCase().includes(q)).slice(0, 12) : [];
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
    if (!q) {
      box.innerHTML = `<div class="empty">${recipe ? "Search to add an ingredient." : "Search a food or meal."}${recipe ? "" : ` <button type="button" class="text-link" id="newMealBtn">New meal</button>`}</div>`;
    } else {
      box.innerHTML = hitRows || `<div class="empty">No match.</div>`;
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
    box.querySelectorAll("[data-recipe]").forEach((btn) => {
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
    box.querySelectorAll("[data-food]").forEach((btn) => {
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
  }

  function drawLogSheet() {
    document.getElementById("sheet")?.remove();
    const mealLabel = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" }[state.macroMeal] || "Meal";
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
    el.className = "sheet sheet-log";
    el.innerHTML = `
      <div class="sheet-top">
        <h2>Log ${esc(mealLabel)}</h2>
        <button type="button" class="ghost" id="sheetClose">Close</button>
      </div>
      <div class="sheet-body">
        ${state.macroErr ? `<p class="err">${esc(state.macroErr)}</p>` : ""}
        <input class="field search-field" id="foodSearch" type="search" placeholder="${recipe ? "Search to add an ingredient" : "Search foods or meals"}" value="${esc(state.macroQuery)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
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
        <div class="group log-hits" id="logHits"></div>
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
        paintLogHits();
      };
    }
    paintLogHits();
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
        <button class="ghost" id="saveNew" type="button"${state.macroBusy ? " disabled" : ""}>${(state.gateComposer || state.freeLog) ? "Add to log" : (state.macroPickedRecipe ? "Add to this log" : `Log ${esc(mealLabel)}`)}</button>
      </div>`;
    $("phone").appendChild(el);
    $("sheetBack").onclick = () => {
      state.macroMode = "pick";
      state.macroErr = "";
      if (state.gateComposer || state.freeLog) {
        document.getElementById("sheet")?.remove();
        state.macroSheet = "";
        renderMacros();
        return;
      }
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
    if (state.gateComposer || state.freeLog) {
      document.getElementById("sheet")?.remove();
      state.macroSheet = "";
      renderMacros();
      return;
    }
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
      if (state.gateComposer || state.freeLog) {
        state.gateLines = state.gateLines || [];
        state.gateLines.push({ item_id: food.id, qty });
        closeNewItemSheet(food, qty);
        return;
      }
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

  function shuffleIds(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const swap = out[i];
      out[i] = out[j];
      out[j] = swap;
    }
    return out;
  }

  function flashDeck() {
    return state.flash.decks.find((deck) => deck.id === state.flash.deckId) || null;
  }

  function studyFace(deck) {
    if (deck && deck.subject === "chinese") return state.flash.face || "read";
    return "flip";
  }

  function isChineseCard(card, deck) {
    return Boolean(card && (card.hanzi || (deck && deck.subject === "chinese")));
  }

  function cardsInPlay(deck) {
    const cards = (deck && deck.cards) || [];
    if (!deck || deck.subject !== "chinese") return cards;
    if (state.flash.filter === "hanzi") return cards.filter((card) => card.kind === "hanzi");
    if (state.flash.filter === "phrase") return cards.filter((card) => card.kind === "phrase");
    return cards;
  }

  function dueCount(deck) {
    const face = studyFace(deck);
    return ((deck && deck.cards) || []).filter((card) => card.faces && card.faces[face] && card.faces[face].due).length;
  }

  function cardView(card, deck) {
    const face = studyFace(deck);
    const chinese = isChineseCard(card, deck);
    if (chinese && face === "recall") {
      return {
        prompt: card.gloss || card.back || card.front,
        answer: card.hanzi || card.front,
        pinyin: card.pinyin || "",
        speak: card.hanzi || "",
        hanziAnswer: true,
      };
    }
    if (chinese && face === "pinyin") {
      return {
        prompt: card.pinyin || card.hanzi || card.front,
        answer: card.hanzi || card.front,
        pinyin: "",
        gloss: card.gloss || card.back || "",
        speak: card.hanzi || "",
        hanziAnswer: true,
        pinyinPrompt: true,
      };
    }
    if (chinese) {
      return {
        prompt: card.hanzi || card.front,
        answer: card.gloss || card.back,
        pinyin: card.pinyin || "",
        speak: card.hanzi || card.front,
        hanziPrompt: true,
      };
    }
    return {
      prompt: card.front,
      answer: card.back,
      pinyin: "",
      speak: "",
    };
  }

  function linkTerms(text, defs) {
    const raw = String(text || "");
    const items = (Array.isArray(defs) ? defs : [])
      .filter((row) => row && row.term && row.def)
      .slice()
      .sort((a, b) => String(b.term).length - String(a.term).length);
    if (!raw || !items.length) return esc(raw);
    const parts = items.map((row) => {
      const term = String(row.term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return /^[\u0000-\u007f]+$/.test(row.term) ? `\\b${term}\\b` : term;
    });
    const re = new RegExp(parts.join("|"), "gi");
    const byTerm = new Map(items.map((row) => [String(row.term).toLowerCase(), row]));
    let html = "";
    let last = 0;
    for (const match of raw.matchAll(re)) {
      const term = match[0];
      const row = byTerm.get(term.toLowerCase());
      html += esc(raw.slice(last, match.index));
      if (row) {
        html += `<button type="button" class="fc-term" data-term="${esc(row.term)}" data-def="${esc(row.def)}">${esc(term)}</button>`;
      } else {
        html += esc(term);
      }
      last = match.index + term.length;
    }
    html += esc(raw.slice(last));
    return html;
  }

  function speakHanzi(text) {
    const line = String(text || "").trim();
    if (!line || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(line);
    utter.lang = "zh-CN";
    utter.rate = 0.82;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  function paintLatex(root) {
    if (!root || !window.katex) return;
    root.querySelectorAll("[data-latex]").forEach((node) => {
      const src = node.getAttribute("data-latex") || "";
      if (!src) return;
      try {
        window.katex.render(src, node, { throwOnError: false, displayMode: true });
      } catch (_) {}
    });
  }

  function flashLibraryInner() {
    const q = state.flash.query.trim().toLowerCase();
    const decks = state.flash.decks.filter((deck) => {
      if (!q) return true;
      const blob = [
        deck.title,
        deck.subject,
        ...((deck.cards || []).map((card) => [card.hanzi, card.pinyin, card.gloss, card.front, card.back].join(" "))),
      ].join(" ").toLowerCase();
      return blob.includes(q);
    });
    if (!state.flash.loaded) {
      return `<div class="deck-wait"><span class="think" aria-hidden="true"><i></i></span><p>Loading decks</p></div>`;
    }
    if (!decks.length) {
      return `<p class="hero-sub">${q ? "No deck matches that." : "No decks yet. Ask below."}</p>`;
    }
    return `<div class="group">${decks.map((deck) => {
      const due = dueCount(deck);
      const on = deck.id === state.flash.deckId && state.flash.mode === "study" ? " on" : "";
      return `
        <div class="row fc-deck${on}" data-deck="${esc(deck.id)}">
          <div class="name">
            <strong>${esc(deck.title)}</strong>
            <span>${esc(deck.subject)} · ${(deck.cards || []).length} cards${due ? ` · ${due} to redo` : ""}</span>
          </div>
          <button type="button" class="fc-drop" data-drop="${esc(deck.id)}" aria-label="Delete deck">×</button>
        </div>`;
    }).join("")}</div>`;
  }

  function wireFlashLibrary() {
    const box = $("flash-library");
    if (!box) return;
    box.querySelectorAll("[data-deck]").forEach((row) => {
      row.onclick = (event) => {
        if (event.target.closest("[data-drop]")) return;
        vibrate();
        state.flash.deckId = row.dataset.deck;
        startStudy(false);
      };
    });
    box.querySelectorAll("[data-drop]").forEach((btn) => {
      btn.onclick = (event) => {
        event.stopPropagation();
        vibrate();
        deleteDeck(btn.dataset.drop);
      };
    });
  }

  async function refreshDecks(selectId) {
    const data = await LifeAPI.flash();
    state.flash.decks = data.decks || [];
    state.flash.loaded = true;
    state.flash.loading = false;
    if (selectId) state.flash.deckId = selectId;
    const lib = $("flash-library");
    if (lib) {
      lib.innerHTML = flashLibraryInner();
      wireFlashLibrary();
    }
  }

  function startStudy(onlyDue) {
    const deck = flashDeck();
    if (!deck) return;
    const face = studyFace(deck);
    let cards = cardsInPlay(deck);
    if (onlyDue) cards = cards.filter((card) => card.faces && card.faces[face] && card.faces[face].due);
    state.flash.queue = shuffleIds(cards.map((card) => card.id));
    state.flash.pos = 0;
    state.flash.flipped = false;
    state.flash.revealed = false;
    state.flash.wrongNow = {};
    state.flash.sessionRight = 0;
    state.flash.sessionWrong = 0;
    state.flash.mode = "study";
    renderFlash();
  }

  async function deleteDeck(id) {
    if (!window.confirm("Delete this deck? It will not come back.")) return;
    try {
      await LifeAPI.flashDelete({ deck_id: id });
      if (state.flash.deckId === id) {
        state.flash.deckId = "";
        state.flash.mode = "ask";
      }
      await refreshDecks();
      if (state.flash.mode !== "study") renderFlash();
    } catch (err) {
      state.flash.error = err.message || "Could not delete that deck.";
      renderFlash();
    }
  }

  function currentStudyCard(deck) {
    const id = state.flash.queue[state.flash.pos];
    return ((deck && deck.cards) || []).find((card) => card.id === id) || null;
  }

  function flashStageHTML() {
    if (state.flash.mode === "study") return "";
    return `
      <div class="flash-ask">
        <div class="messages" id="flash-messages"></div>
        <form class="composer" id="flash-composer">
          <textarea id="flash-prompt" rows="1" placeholder="A deck on tones, the femur, torque…"></textarea>
          <button class="send" type="submit" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>`;
  }

  function studyStageHTML() {
    const deck = flashDeck();
    if (!deck) return '<div class="empty">Pick a deck.</div>';
    const total = state.flash.queue.length;
    const card = currentStudyCard(deck);
    const face = studyFace(deck);
    const missed = Object.keys(state.flash.wrongNow).length;
    const chinese = deck.subject === "chinese";
    const filters = chinese ? `
      <div class="fc-chips">
        ${[["all", "All"], ["hanzi", "字"], ["phrase", "短语"]].map(([id, label]) => (
          `<button type="button" class="pill ${state.flash.filter === id ? "on" : ""}" data-filter="${id}">${label}</button>`
        )).join("")}
        ${[["read", "字 → 义"], ["recall", "义 → 字"], ["pinyin", "拼音 → 字"]].map(([id, label]) => (
          `<button type="button" class="pill ${face === id ? "on" : ""}" data-face="${id}">${label}</button>`
        )).join("")}
      </div>` : "";
    const head = `
      <div class="fc-study-bar">
        <button type="button" class="review-btn" id="fc-ask">Ask</button>
        <div class="fc-progress">${card ? `${state.flash.pos + 1} / ${total}` : "Done"}</div>
        <button type="button" class="review-btn" id="fc-redo-due">Redo missed</button>
      </div>
      ${filters}`;
    if (!card) {
      const empty = !total;
      return `
        ${head}
        <div class="fc-done">
          <p class="fc-score">${empty ? "Nothing in this pile." : `${state.flash.sessionRight} right · ${missed} still missed`}</p>
          <div class="fc-grade">
            <button type="button" class="fc-wrong" id="fc-redo-miss">Redo missed</button>
            <button type="button" class="fc-right" id="fc-redo-all">Redo all</button>
          </div>
        </div>`;
    }
    const view = cardView(card, deck);
    const defs = card.defs || [];
    const phrase = card.kind === "phrase" || String(view.prompt || "").length > 8;
    const promptClass = view.hanziPrompt ? (phrase ? "fc-phrase" : "fc-hanzi") : (view.pinyinPrompt ? "fc-pinyin" : "fc-plain");
    const answerClass = view.hanziAnswer ? (phrase ? "fc-phrase" : "fc-hanzi") : "fc-plain";
    const front = `
      <div class="fc-face fc-front">
        <p class="${promptClass}">${linkTerms(view.prompt, defs)}</p>
        <p class="fc-tap">Tap to flip</p>
      </div>`;
    const back = `
      <div class="fc-face fc-back">
        ${view.pinyin ? `<p class="fc-pinyin">${linkTerms(view.pinyin, defs)}</p>` : ""}
        <p class="${answerClass}">${linkTerms(view.answer, defs)}</p>
        ${view.gloss ? `<p class="fc-gloss">${linkTerms(view.gloss, defs)}</p>` : ""}
        ${card.extra ? `<p class="fc-extra">${linkTerms(card.extra, defs)}</p>` : ""}
        ${card.latex ? `<div class="fc-latex" data-latex="${esc(card.latex)}"></div>` : ""}
        ${view.speak ? `<button type="button" class="review-btn" id="fc-speak">Hear it</button>` : ""}
      </div>`;
    return `
      ${head}
      <div class="fc-card fc-flipper ${state.flash.flipped ? "is-back" : ""}" id="fc-flip" role="button" tabindex="0">
        <div class="fc-flip-inner">${front}${back}</div>
      </div>
      <p class="fc-def" id="fc-def" hidden></p>
      <div class="fc-grade" id="fc-grade" ${state.flash.revealed ? "" : "hidden"}>
        <button type="button" class="fc-wrong" id="fc-wrong">Wrong</button>
        <button type="button" class="fc-right" id="fc-right">Right</button>
      </div>`;
  }

  function wireFlashStage() {
    const ask = $("fc-ask");
    if (ask) ask.onclick = () => { vibrate(); state.flash.mode = "ask"; renderFlash(); };
    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.onclick = () => {
        vibrate();
        state.flash.filter = btn.dataset.filter;
        startStudy(false);
      };
    });
    document.querySelectorAll("[data-face]").forEach((btn) => {
      btn.onclick = () => {
        vibrate();
        state.flash.face = btn.dataset.face;
        startStudy(false);
      };
    });
    const due = $("fc-redo-due");
    if (due) due.onclick = () => { vibrate(); startStudy(true); };
    const redoMiss = $("fc-redo-miss");
    if (redoMiss) redoMiss.onclick = () => {
      vibrate();
      const ids = Object.keys(state.flash.wrongNow);
      state.flash.queue = shuffleIds(ids);
      state.flash.pos = 0;
      state.flash.flipped = false;
      state.flash.revealed = false;
      state.flash.wrongNow = {};
      state.flash.sessionRight = 0;
      state.flash.sessionWrong = 0;
      renderFlash();
    };
    const redoAll = $("fc-redo-all");
    if (redoAll) redoAll.onclick = () => { vibrate(); startStudy(false); };
    const flip = $("fc-flip");
    if (flip) {
      flip.onclick = (event) => {
        if (event.target.closest("#fc-speak") || event.target.closest(".fc-term")) return;
        vibrate();
        state.flash.flipped = !state.flash.flipped;
        if (state.flash.flipped) state.flash.revealed = true;
        flip.classList.toggle("is-back", state.flash.flipped);
        const grade = $("fc-grade");
        if (grade) grade.hidden = !state.flash.revealed;
      };
      flip.querySelectorAll(".fc-term").forEach((btn) => {
        btn.onclick = (event) => {
          event.stopPropagation();
          vibrate();
          const slot = $("fc-def");
          if (!slot) return;
          const same = !slot.hidden && slot.dataset.term === btn.dataset.term;
          flip.querySelectorAll(".fc-term.on").forEach((node) => node.classList.remove("on"));
          if (same) {
            slot.hidden = true;
            slot.textContent = "";
            return;
          }
          btn.classList.add("on");
          slot.dataset.term = btn.dataset.term || "";
          slot.textContent = btn.dataset.def || "";
          slot.hidden = false;
        };
      });
    }
    const speak = $("fc-speak");
    if (speak) speak.onclick = (event) => {
      event.stopPropagation();
      vibrate();
      const deck = flashDeck();
      const card = currentStudyCard(deck);
      if (card) speakHanzi(card.hanzi || card.front);
    };
    const wrong = $("fc-wrong");
    if (wrong) wrong.onclick = () => gradeStudy(false);
    const right = $("fc-right");
    if (right) right.onclick = () => gradeStudy(true);
    paintLatex($("flash-stage"));
  }

  async function gradeStudy(correct) {
    const deck = flashDeck();
    const card = currentStudyCard(deck);
    if (!deck || !card) return;
    vibrate();
    const face = studyFace(deck);
    if (correct) {
      state.flash.sessionRight += 1;
      delete state.flash.wrongNow[card.id];
    } else {
      state.flash.sessionWrong += 1;
      state.flash.wrongNow[card.id] = true;
      const later = state.flash.queue.indexOf(card.id, state.flash.pos + 1);
      if (later < 0) {
        const at = Math.min(state.flash.queue.length, state.flash.pos + 3);
        state.flash.queue.splice(at, 0, card.id);
      }
    }
    const bucket = card.faces && card.faces[face];
    if (bucket) {
      if (correct) {
        bucket.right = Number(bucket.right || 0) + 1;
        bucket.due = false;
      } else {
        bucket.wrong = Number(bucket.wrong || 0) + 1;
        bucket.due = true;
      }
    }
    state.flash.pos += 1;
    state.flash.flipped = false;
    state.flash.revealed = false;
    renderFlash();
    try {
      await LifeAPI.flashGrade({
        deck_id: deck.id,
        card_id: card.id,
        face,
        correct,
      });
    } catch (err) {
      state.flash.error = err.message || "Could not save that mark.";
    }
  }

  function renderFlash() {
    setChrome("Cards", "Chat");
    const flash = state.flash;
    if (!flash.loaded && !flash.loading) {
      flash.loading = true;
      LifeAPI.flash().then((data) => {
        flash.decks = data.decks || [];
        flash.loaded = true;
        flash.loading = false;
        if (hashRoute().route === "chat" && state.chatTab === "cards") renderFlash();
      }).catch((err) => {
        flash.loading = false;
        flash.loaded = true;
        flash.error = err.message || "Could not load decks.";
        if (hashRoute().route === "chat" && state.chatTab === "cards") renderFlash();
      });
    }
    $("screen").innerHTML = `
      <div class="flash">
        <div class="chat-head">
          ${pills([["talk", "Chat"], ["cards", "Cards"]], "cards", "chat")}
          <button class="model-ready" id="modelReady" type="button"></button>
          <span class="tok-rate" id="tokRate" hidden>0 tok/s</span>
        </div>
        ${flash.error ? `<p class="err">${esc(flash.error)}</p>` : ""}
        <div class="flash-layout ${flash.mode === "study" ? "studying" : ""}">
          <aside class="flash-library">
            <input class="fc-search" id="fc-search" type="search" placeholder="Search decks" value="${esc(flash.query)}">
            <div id="flash-library">${flashLibraryInner()}</div>
          </aside>
          <section class="flash-stage" id="flash-stage">
            ${flash.mode === "study" ? studyStageHTML() : flashStageHTML()}
          </section>
        </div>
      </div>`;
    wirePills();
    mountReady();
    wireFlashLibrary();
    const search = $("fc-search");
    if (search) {
      search.oninput = () => {
        flash.query = search.value;
        const lib = $("flash-library");
        if (lib) {
          lib.innerHTML = flashLibraryInner();
          wireFlashLibrary();
        }
      };
    }
    if (flash.mode === "study") {
      wireFlashStage();
      return;
    }
    const box = $("flash-messages");
    if (box) {
      if (!flash.chat.length) {
        box.innerHTML = `
          <div class="chat-empty">
            <p class="home-kicker">Decks</p>
            <h2>Ask for a deck.</h2>
            <p>Chinese cards keep hanzi, tone-mark pinyin, and a definition. Other decks define only the hard terms.</p>
          </div>`;
      } else {
        flash.chat.forEach((m) => box.appendChild(buildChatBubble(m)));
        box.scrollTop = box.scrollHeight;
      }
    }
    const form = $("flash-composer");
    if (form) form.onsubmit = (e) => { e.preventDefault(); sendFlashChat(); };
    const prompt = $("flash-prompt");
    if (prompt) {
      prompt.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendFlashChat();
        }
      });
    }
  }

  async function sendFlashChat() {
    const input = $("flash-prompt");
    const text = (input?.value || "").trim();
    if (!text || state.busy) return;
    state.busy = true;
    beginModelUse();
    const flash = state.flash;
    flash.chat.push({ role: "user", content: text });
    const bot = { role: "assistant", content: "", tools: [] };
    flash.chat.push(bot);
    input.value = "";
    renderFlash();
    const wrap = document.querySelector("#flash-messages .bubble.bot:last-child");
    const box = $("flash-messages");
    try {
      const history = flash.chat.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
      const res = await LifeAPI.chatStream({
        model: state.model || ($("flash-model") && $("flash-model").value),
        stream: true,
        mode: "flash",
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
          followBottom(box);
        } else if (ev.type === "tool_done") {
          const last = [...bot.tools].reverse().find((t) => t.name === ev.name && t.status === "running");
          if (last) Object.assign(last, ev, { status: ev.ok === false ? "fail" : "ok" });
          else bot.tools.push(Object.assign({ status: ev.ok === false ? "fail" : "ok" }, ev));
          chatToolDone(wrap, ev);
          if (ev.deck && ev.deck.id) refreshDecks(ev.deck.id);
          followBottom(box);
        } else if (ev.type === "reset") {
          bot.content = "";
          if (wrap && wrap._body) {
            if (wrap._body._mdTimer) {
              clearTimeout(wrap._body._mdTimer);
              wrap._body._mdTimer = null;
            }
            wrap._body.textContent = "";
          }
          setThinking(wrap, "wait");
        } else if (ev.type === "token") {
          const piece = ev.text || "";
          if (!piece) return;
          setThinking(wrap, "stream");
          bot.content += piece;
          noteToken();
          paintStream(wrap && wrap._body, bot.content);
          followBottom(box);
        } else if (ev.type === "done") {
          setThinking(wrap, false);
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
      if (wrap && wrap._body) renderMarkdown(wrap._body, bot.content);
    } catch (err) {
      bot.content = err.message || "Could not reach Ollama.";
      renderFlash();
    } finally {
      state.busy = false;
      if (!residentModel()) state.warming = false;
      paintReady();
    }
  }

  function renderChat() {
    setChrome("Ollama", "Local");
    const reviewing = state.review.running;
    $("screen").innerHTML = `
      <div class="chat">
        <div class="chat-head">
          ${pills([["talk", "Chat"], ["cards", "Cards"]], "talk", "chat")}
          <button class="model-ready" id="modelReady" type="button"></button>
          <span class="tok-rate" id="tokRate" hidden>0 tok/s</span>
          <button class="review-btn" id="review-notes" type="button" ${reviewing ? "disabled" : ""}>${reviewing ? "Reviewing" : "Review"}</button>
        </div>
        <div class="messages" id="messages"></div>
        <form class="composer" id="composer">
          <textarea id="prompt" rows="1" placeholder="Message this PC"></textarea>
          <button class="send" type="submit" aria-label="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </form>
      </div>`;
    const box = $("messages");
    if (!state.chat.length) {
      box.innerHTML = `
        <div class="chat-empty">
          <p class="home-kicker">On this PC</p>
          <h2>Ask the model.</h2>
          <p id="readyHint">It can search the web, pull pictures, and answer from the machine running LifeOS.</p>
        </div>`;
    } else {
      state.chat.forEach((m) => box.appendChild(buildChatBubble(m)));
      box.scrollTop = box.scrollHeight;
    }
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
    const reviewBtn = $("review-notes");
    if (reviewBtn) reviewBtn.onclick = () => { vibrate(); startReview(); };
    wirePills();
    mountReady();
    mountReview();
    if (hashRoute().tab === "preview") mountStreamPreview();
  }

  function mountStreamPreview() {
    const box = $("messages");
    if (!box) return;
    const empty = box.querySelector(".empty");
    if (empty) empty.remove();
    const fake = {
      role: "assistant",
      content: "Streaming preview.\n\nThe black bar matches the spinner height and sits directly under it.\n\nThis last line runs underneath that bar.",
    };
    const wrap = buildChatBubble(fake);
    box.appendChild(wrap);
    setThinking(wrap, "stream");
    box.scrollTop = box.scrollHeight;
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
      recall_hayden: "Your notes",
      save_flashcards: "Save deck",
    };
    return labels[name] || name || "Tool";
  }

  function hintFromArgs(args) {
    if (!args || typeof args !== "object") return "";
    const cats = args.categories;
    if (Array.isArray(cats) && cats.length) return cats.join(", ");
    if (typeof cats === "string" && cats.trim()) return cats.trim();
    return String(args.about || args.query || args.q || args.url || "").trim();
  }

  function liftMath(raw) {
    const slots = [];
    let s = raw;
    if (s.split("$$").length % 2 === 0) s += "$$";
    const take = (tex, display) => {
      const id = slots.length;
      slots.push({ tex: String(tex || "").trim(), display });
      return display ? `\n\nMATHSLOT${id}END\n\n` : `MATHSLOT${id}END`;
    };
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => take(tex, true));
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => take(tex, true));
    s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => take(tex, false));
    s = s.replace(/(^|[^\\$])\$(?!\$)([^$\n]+?)\$(?!\$)/g, (m, pre, tex) => pre + take(tex, false));
    s = s.replace(/\$([^$\n]+)$/g, (_, tex) => take(tex, false));
    return { text: s, slots };
  }

  function paintMath(html, slots) {
    if (!slots.length || !window.katex) return html;
    return html.replace(/MATHSLOT(\d+)END/g, (_, n) => {
      const slot = slots[Number(n)];
      if (!slot || !slot.tex) return "";
      try {
        return window.katex.renderToString(slot.tex, {
          throwOnError: false,
          displayMode: slot.display,
        });
      } catch (_) {
        return slot.tex;
      }
    });
  }

  function renderMarkdown(el, text) {
    let raw = String(text || "");
    if (!el) return;
    const fences = raw.match(/```/g);
    if (fences && fences.length % 2 === 1) raw += "\n```";
    if (!raw.trim()) {
      el.textContent = "";
      return;
    }
    if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
      el.textContent = raw;
      return;
    }
    try {
      const lifted = liftMath(raw);
      marked.setOptions({ gfm: true, breaks: true });
      const html = DOMPurify.sanitize(marked.parse(lifted.text), {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"],
      });
      el.innerHTML = paintMath(html, lifted.slots);
      el.querySelectorAll('a[href^="http"]').forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    } catch (_) {
      el.textContent = raw;
    }
  }

  const streamRate = { t0: 0, n: 0 };

  function resetRate() {
    streamRate.t0 = 0;
    streamRate.n = 0;
    const el = $("tokRate");
    if (el) el.hidden = true;
    paintReady();
  }

  function noteToken() {
    const now = performance.now();
    if (!streamRate.t0) streamRate.t0 = now;
    streamRate.n += 1;
    const el = $("tokRate");
    if (!el) return;
    const sec = Math.max(0.05, (now - streamRate.t0) / 1000);
    const rate = streamRate.n / sec;
    el.hidden = false;
    el.textContent = `${rate >= 100 ? Math.round(rate) : rate.toFixed(1)} tok/s`;
    if (state.warming) {
      state.warming = false;
      state.warmError = "";
      if (!residentModel()) {
        const name = state.model || ((installedModel() || {}).name || "");
        if (name) rememberLoaded([{ name }]);
      }
    }
    const ready = $("modelReady");
    if (ready) ready.hidden = true;
  }

  function modelKey(name) {
    return String(name || "").trim().toLowerCase().replace(/:latest$/, "");
  }

  function installedModel() {
    const models = state.models || [];
    const want = modelKey(state.model);
    return models.find((row) => modelKey(row.name) === want) || models[0] || null;
  }

  function loadedRows() {
    const live = state.ollamaLive;
    if (live && Array.isArray(live.loaded)) return live.loaded;
    return (state.status && state.status.ollama && state.status.ollama.loaded) || [];
  }

  function residentModel() {
    const want = modelKey((installedModel() || {}).name || state.model);
    const rows = loadedRows();
    if (!want) return rows[0] || null;
    return rows.find((row) => modelKey(row.name) === want) || null;
  }

  function ollamaUp() {
    if (state.ollamaLive && typeof state.ollamaLive.up === "boolean") return state.ollamaLive.up;
    return !!(state.status && state.status.services && state.status.services.ollama);
  }

  function bytesLabel(n) {
    const v = Number(n) || 0;
    if (v < 1024 * 1024) return "";
    const gb = v / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB`;
    return `${Math.max(1, Math.round(v / (1024 * 1024)))} MB`;
  }

  function stayLabel(iso) {
    const at = Date.parse(iso || "");
    if (!Number.isFinite(at) || at < Date.UTC(2000, 0, 1)) return "";
    const min = Math.round((at - Date.now()) / 60000);
    if (min <= 0) return "";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  function readyInfo() {
    if (!ollamaUp()) {
      return { tone: "off", label: "Offline", hint: "Ollama isn’t running on this PC." };
    }
    const resident = residentModel();
    const installed = installedModel();
    const disk = bytesLabel(installed && installed.size);
    if (state.warming || (state.busy && !resident)) {
      const sec = Math.max(0, Math.round((Date.now() - (state.warmAt || Date.now())) / 1000));
      return {
        tone: "load",
        label: sec ? `Loading ${sec}s` : "Loading",
        hint: "Weights are moving into GPU memory. Usage stays low until that copy finishes.",
      };
    }
    if (resident) {
      const left = stayLabel(resident.expires_at);
      const mem = bytesLabel(resident.size_vram || resident.size);
      return {
        tone: "ready",
        label: left ? `Ready ${left}` : "Ready",
        hint: mem
          ? `${mem} in GPU memory${left ? `. Stays loaded for ${left}` : ""}.`
          : "In GPU memory. The next reply can start immediately.",
      };
    }
    return {
      tone: "cold",
      label: disk ? `Cold ${disk}` : "Cold",
      hint: state.warmError || "Still on disk. Tap to load it into the GPU before the first message.",
    };
  }

  function rememberLoaded(loaded) {
    const rows = Array.isArray(loaded) ? loaded : [];
    state.ollamaLive = Object.assign({}, state.ollamaLive || {}, { up: true, loaded: rows });
    if (!state.status) state.status = {};
    state.status.ollama = Object.assign({}, state.status.ollama || {}, { up: true, loaded: rows });
    if (state.status.services) state.status.services.ollama = true;
  }

  function paintReady() {
    const info = readyInfo();
    const hint = $("readyHint");
    if (hint && !state.chat.length) {
      hint.textContent = info.tone === "cold" || info.tone === "load" || info.tone === "off"
        ? info.hint
        : "It can search the web, pull pictures, and answer from the machine running LifeOS.";
    }
    const el = $("modelReady");
    if (!el) return;
    const tok = $("tokRate");
    el.hidden = !!(tok && !tok.hidden);
    el.className = `model-ready ${info.tone}`;
    el.textContent = info.label;
    el.title = info.hint;
    el.disabled = info.tone !== "cold";
  }

  function armReadyClock() {
    if (state.readyClock) return;
    state.readyClock = setInterval(() => {
      if (!state.warming) {
        clearInterval(state.readyClock);
        state.readyClock = 0;
        return;
      }
      paintReady();
    }, 1000);
  }

  function beginModelUse() {
    resetRate();
    if (!residentModel()) {
      if (!state.warming) state.warmAt = Date.now();
      state.warming = true;
      state.warmError = "";
      armReadyClock();
      paintReady();
    }
  }

  async function refreshOllama() {
    if (hashRoute().route !== "chat") return;
    try {
      const data = await LifeAPI.models();
      state.ollamaLive = data;
      if (state.status) {
        state.status.ollama = Object.assign({}, state.status.ollama || {}, {
          up: !!data.up,
          loaded: data.loaded || [],
          models: data.models || (state.status.ollama && state.status.ollama.models) || [],
        });
        if (state.status.services) state.status.services.ollama = !!data.up;
      }
      if (Array.isArray(data.models) && data.models.length) {
        state.models = data.models;
        if (!state.model && data.models[0]) state.model = data.models[0].name;
      }
      if (residentModel()) {
        state.warming = false;
        state.warmError = "";
      }
    } catch (_) {}
    paintReady();
  }

  function watchOllama() {
    if (state.ollamaTimer) return;
    refreshOllama();
    state.ollamaTimer = setInterval(refreshOllama, 2500);
  }

  function stopOllamaWatch() {
    if (!state.ollamaTimer) return;
    clearInterval(state.ollamaTimer);
    state.ollamaTimer = 0;
  }

  async function warmModel() {
    if (state.warming || state.busy || readyInfo().tone !== "cold") return;
    const model = (installedModel() || {}).name || state.model;
    if (!model) return;
    state.warming = true;
    state.warmError = "";
    state.warmAt = Date.now();
    armReadyClock();
    paintReady();
    try {
      const data = await LifeAPI.warm({ model });
      if (data && Array.isArray(data.loaded)) rememberLoaded(data.loaded);
      state.warmError = "";
    } catch (err) {
      state.warmError = err.message || "Could not load the model.";
    } finally {
      if (!state.busy) state.warming = false;
      paintReady();
    }
  }

  function mountReady() {
    paintReady();
    const el = $("modelReady");
    if (el) el.onclick = () => { vibrate(); warmModel(); };
    watchOllama();
  }

  function wireFollow(box) {
    if (!box || box._followWired) return;
    box._followWired = true;
    box._follow = true;
    const check = () => {
      box._follow = box.scrollHeight - box.scrollTop - box.clientHeight < 32;
    };
    box.addEventListener("scroll", () => { if (!box._touching) check(); }, { passive: true });
    box.addEventListener("wheel", (e) => { if (e.deltaY < 0) box._follow = false; }, { passive: true });
    box.addEventListener("touchstart", () => { box._touching = true; box._follow = false; }, { passive: true });
    box.addEventListener("touchend", () => { box._touching = false; check(); }, { passive: true });
    box.addEventListener("touchcancel", () => { box._touching = false; check(); }, { passive: true });
    box.addEventListener("pointerdown", (e) => { if (e.target === box) box._follow = false; });
  }

  function followBottom(box) {
    if (!box) return;
    wireFollow(box);
    if (box._follow) box.scrollTop = box.scrollHeight;
  }

  function paintStream(el, text) {
    if (!el) return;
    el._streamText = text;
    scheduleMarkdown(el, () => el._streamText || "");
  }

  function scheduleMarkdown(el, getText) {
    if (!el) return;
    if (el._mdTimer) return;
    el._mdTimer = setTimeout(() => {
      el._mdTimer = null;
      renderMarkdown(el, typeof getText === "function" ? getText() : getText);
      followBottom(el.closest(".messages"));
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
    const liveChat = state.chat[state.chat.length - 1] === msg;
    const liveFlash = state.flash.chat[state.flash.chat.length - 1] === msg;
    if (msg.content) renderMarkdown(body, msg.content);
    else if (state.busy && (liveChat || liveFlash)) setThinking(wrap, "wait");
    return wrap;
  }

  function setThinking(wrap, mode) {
    if (!wrap) return;
    wrap.classList.remove("waiting", "streaming");
    const spinner = wrap.querySelector(":scope > .think");
    if (!mode) {
      if (spinner) spinner.remove();
      if (wrap._body) {
        wrap._body.classList.remove("waiting");
        delete wrap._body.dataset.stream;
      }
      return;
    }
    wrap.classList.add(mode === "stream" ? "streaming" : "waiting");
    if (wrap._body) {
      wrap._body.classList.toggle("waiting", mode === "wait" && !wrap._body.textContent);
      if (mode === "stream") delete wrap._body.dataset.stream;
    }
    if (mode === "stream") {
      if (spinner) spinner.remove();
      return;
    }
    if (!spinner) {
      const el = document.createElement("div");
      el.className = "think";
      el.setAttribute("aria-label", "Thinking");
      el.innerHTML = "<i></i>";
      wrap.appendChild(el);
    }
  }

  function chatToolStart(msg, row) {
    if (!msg || !msg._tools) return;
    msg._tools.hidden = false;
    const name = row.name || "tool";
    const hint = hintFromArgs(row.arguments);
    const el = document.createElement("div");
    el.className = "tool-chip running";
    el.innerHTML = '<button type="button" class="tool-chip-hit"><span class="tool-name"></span><em class="tool-hint"></em></button><div class="tool-more" hidden></div>';
    el.querySelector(".tool-name").textContent = toolLabel(name);
    const hintEl = el.querySelector(".tool-hint");
    if (hint) hintEl.textContent = hint;
    else hintEl.remove();
    el.dataset.arg = hint || "";
    const more = el.querySelector(".tool-more");
    el.querySelector(".tool-chip-hit").onclick = () => {
      const sources = el.querySelector(".tool-sources");
      const hasMore = !!more.textContent;
      const hasSources = !!(sources && sources.childElementCount);
      if (!hasMore && !hasSources) return;
      const open = !el.classList.contains("open");
      el.classList.toggle("open", open);
      more.hidden = !open || !hasMore;
      if (sources) sources.hidden = !open;
    };
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
    if (!ok) el.classList.add("fail");
    if (name === "save_flashcards" && row.deck) {
      const hintEl = el.querySelector(".tool-hint") || document.createElement("em");
      hintEl.className = "tool-hint";
      const count = row.deck.count;
      hintEl.textContent = count ? `${row.deck.title || "Deck"} · ${count}` : (row.deck.title || "Deck");
      if (!hintEl.parentElement) el.querySelector(".tool-chip-hit").appendChild(hintEl);
    }
    const summary = String(row.summary || "").trim();
    const arg = el.dataset.arg || "";
    const extra = summary && summary !== arg ? summary : "";
    const more = el.querySelector(".tool-more");
    if (more && extra) {
      more.textContent = extra;
      el.classList.add("can-open");
    }
    if (ok && name === "web_search" && Array.isArray(row.articles) && row.articles.length) {
      let sources = el.querySelector(".tool-sources");
      if (!sources) {
        sources = document.createElement("div");
        sources.className = "tool-sources";
        el.appendChild(sources);
      }
      sources.replaceChildren();
      renderArticleCards(sources, row.articles);
      el.classList.add("can-open");
      const show = row.show_sources === true;
      sources.hidden = !show;
      if (show) {
        el.classList.add("open");
        const extra = el.querySelector(".tool-more");
        if (extra && extra.textContent) extra.hidden = false;
      }
    }
    if (ok && Array.isArray(row.images) && row.images.length) {
      renderImageGallery(msg._tools, row.images);
    }
  }

  function reviewVisible() {
    const review = state.review;
    return review.running || review.proposals.length > 0 || review.error || review.status;
  }

  function iconButton(className, label, path, disabled) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = className;
    btn.setAttribute("aria-label", label);
    if (disabled) btn.disabled = true;
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">${path}</svg>`;
    return btn;
  }

  function mountReview() {
    const box = $("messages");
    if (!box) return;
    const review = state.review;
    let deck = $("note-deck");
    if (!reviewVisible()) {
      if (deck) deck.remove();
      return;
    }
    const empty = box.querySelector(".empty");
    if (empty) empty.remove();
    if (!deck) {
      deck = document.createElement("div");
      deck.id = "note-deck";
      deck.className = "note-deck";
      box.appendChild(deck);
    }
    deck.replaceChildren();
    if (review.status && (review.running || review.proposals.length)) {
      const status = document.createElement("div");
      status.className = "note-status";
      status.textContent = review.status;
      deck.appendChild(status);
    }
    const cards = review.proposals;
    if (!cards.length) {
      const card = document.createElement("div");
      card.className = "note-card";
      const line = document.createElement("div");
      line.className = "note-query";
      line.textContent = review.running
        ? (review.currentQuery || "Going through the changelog.")
        : (review.error || review.status || "Nothing in the log needs a note change.");
      card.appendChild(line);
      deck.appendChild(card);
    } else {
      if (review.index >= cards.length) review.index = cards.length - 1;
      if (review.index < 0) review.index = 0;
      const cardData = cards[review.index];
      const card = document.createElement("div");
      card.className = "note-card";
      const kicker = document.createElement("div");
      kicker.className = "note-kicker";
      const name = document.createElement("b");
      name.textContent = cardData.label || cardData.category || "Note";
      const count = document.createElement("span");
      count.textContent = `${review.index + 1} / ${cards.length}`;
      kicker.append(name, count);
      card.appendChild(kicker);
      if (cardData.query) {
        const query = document.createElement("div");
        query.className = "note-query";
        query.textContent = cardData.query;
        card.appendChild(query);
      }
      const currentLabel = document.createElement("div");
      currentLabel.className = "note-label";
      currentLabel.textContent = "CURRENT";
      const current = document.createElement("div");
      current.className = "note-body";
      current.textContent = cardData.current || "Nothing written yet";
      if (!cardData.current) current.classList.add("note-empty");
      const changeLabel = document.createElement("div");
      changeLabel.className = "note-label";
      changeLabel.textContent = "CHANGE";
      const proposed = document.createElement("div");
      proposed.className = "note-body";
      proposed.textContent = cardData.proposed || "";
      card.append(currentLabel, current, changeLabel, proposed);
      if (cardData.reason) {
        const reason = document.createElement("div");
        reason.className = "note-reason";
        reason.textContent = cardData.reason;
        card.appendChild(reason);
      }
      const actions = document.createElement("div");
      actions.className = "note-actions";
      const prev = iconButton(
        "note-nav",
        "Previous",
        '<path d="M15 6 9 12l6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
        review.index === 0
      );
      const next = iconButton(
        "note-nav",
        "Next",
        '<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
        review.index >= cards.length - 1
      );
      const no = iconButton(
        "note-no" + (cardData.decision === "no" ? " on" : ""),
        "Reject change",
        '<path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
        cardData.saving
      );
      const yes = iconButton(
        "note-yes" + (cardData.decision === "yes" ? " on" : ""),
        "Accept change",
        '<path d="M5 12.5 9.2 17 19 7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
        cardData.saving
      );
      prev.onclick = () => {
        vibrate();
        review.index = Math.max(0, review.index - 1);
        mountReview();
      };
      next.onclick = () => {
        vibrate();
        review.index = Math.min(cards.length - 1, review.index + 1);
        mountReview();
      };
      no.onclick = () => decideReview(false);
      yes.onclick = () => decideReview(true);
      const choice = document.createElement("div");
      choice.className = "note-choice";
      choice.append(no, yes);
      actions.append(prev, choice, next);
      card.appendChild(actions);
      deck.appendChild(card);
    }
    if (review.error && cards.length) {
      const err = document.createElement("div");
      err.className = "note-reason";
      err.textContent = review.error;
      deck.appendChild(err);
    }
  }

  async function decideReview(accept) {
    const review = state.review;
    const card = review.proposals[review.index];
    if (!card || card.saving) return;
    if (card.decision === (accept ? "yes" : "no")) return;
    card.saving = true;
    review.error = "";
    mountReview();
    try {
      await LifeAPI.noteDecision({
        changelog_id: card.changelog_id,
        proposal_id: card.id,
        accept,
      });
      card.decision = accept ? "yes" : "no";
    } catch (err) {
      review.error = err.message || "Could not save that choice.";
    } finally {
      card.saving = false;
      mountReview();
    }
  }

  async function readSSE(res, handleEvent) {
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
        try { handleEvent(JSON.parse(line)); } catch (_) {}
      }
    }
    if (buf.trim()) {
      const line = buf.replace(/^data:\s*/, "").trim();
      if (line) {
        try { handleEvent(JSON.parse(line)); } catch (_) {}
      }
    }
  }

  async function startReview() {
    const review = state.review;
    if (review.running) return;
    review.running = true;
    review.error = "";
    review.proposals = [];
    review.index = 0;
    review.seen = 0;
    review.total = 0;
    review.currentQuery = "";
    review.status = "Starting…";
    const btn = $("review-notes");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Reviewing";
    }
    mountReview();
    try {
      const res = await LifeAPI.reviewStream({
        model: state.model || ($("model") && $("model").value) || "",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Review failed");
      }
      await readSSE(res, (ev) => {
        if (!ev || typeof ev !== "object") return;
        if (ev.type === "progress") {
          review.seen = ev.index || review.seen;
          review.total = ev.total || review.total;
          review.currentQuery = ev.query || "";
          review.status = review.total
            ? `Reading ${review.seen} of ${review.total}`
            : "Reading changelog";
          const statusEl = document.querySelector("#note-deck .note-status");
          const waiting = document.querySelector("#note-deck .note-card .note-query");
          if (statusEl && review.proposals.length) {
            statusEl.textContent = review.status;
          } else if (statusEl && waiting && !review.proposals.length) {
            statusEl.textContent = review.status;
            waiting.textContent = review.currentQuery || "Going through the changelog.";
          } else {
            mountReview();
          }
        } else if (ev.type === "proposal" && ev.proposal) {
          const row = ev.proposal;
          if (!review.proposals.some((item) => item.id === row.id)) {
            review.proposals.push(row);
          }
          mountReview();
        } else if (ev.type === "done") {
          review.status = review.proposals.length
            ? ""
            : "Nothing in the log needs a note change.";
        } else if (ev.type === "error") {
          review.error = ev.error || "Review failed";
          review.status = "";
        }
      });
    } catch (err) {
      review.error = err.message || "Review failed";
      review.status = "";
    } finally {
      review.running = false;
      if (!review.proposals.length && !review.error && !review.status) {
        review.status = "Nothing in the log needs a note change.";
      }
      const button = $("review-notes");
      if (button) {
        button.disabled = false;
        button.textContent = "Review";
      }
      mountReview();
    }
  }

  function wantsSources(text) {
    return /\b(sources?|citations?|references?|urls?)\b|\b(show|see|give|list).{0,32}\blinks?\b|\bwhere did you\b/i.test(String(text || ""));
  }

  function revealSources() {
    const nodes = document.querySelectorAll("#messages .tool-sources");
    const sources = nodes[nodes.length - 1];
    if (!sources) return;
    sources.hidden = false;
    const chip = sources.closest(".tool-chip");
    if (!chip) return;
    chip.classList.add("open", "can-open");
    const more = chip.querySelector(".tool-more");
    if (more && more.textContent) more.hidden = false;
  }

  async function sendChat() {
    const input = $("prompt");
    const text = (input?.value || "").trim();
    if (!text || state.busy) return;
    if (wantsSources(text)) revealSources();
    state.busy = true;
    beginModelUse();
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
          followBottom(box);
        } else if (ev.type === "tool_done") {
          const last = [...bot.tools].reverse().find((t) => t.name === ev.name && t.status === "running");
          if (last) Object.assign(last, ev, { status: ev.ok === false ? "fail" : "ok" });
          else bot.tools.push(Object.assign({ status: ev.ok === false ? "fail" : "ok" }, ev));
          chatToolDone(wrap, ev);
          followBottom(box);
        } else if (ev.type === "reset") {
          bot.content = "";
          if (wrap && wrap._body) {
            if (wrap._body._mdTimer) {
              clearTimeout(wrap._body._mdTimer);
              wrap._body._mdTimer = null;
            }
            wrap._body.textContent = "";
          }
          setThinking(wrap, "wait");
        } else if (ev.type === "token") {
          const piece = ev.text || "";
          if (!piece) return;
          setThinking(wrap, "stream");
          bot.content += piece;
          noteToken();
          paintStream(wrap && wrap._body, bot.content);
          followBottom(box);
        } else if (ev.type === "done") {
          setThinking(wrap, false);
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
            setThinking(wrap, "stream");
            bot.content += piece;
            noteToken();
            paintStream(wrap && wrap._body, bot.content);
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
      if (!residentModel()) state.warming = false;
      paintReady();
    }
  }

  function wirePills() {
    $("screen").querySelectorAll("[data-tab]").forEach((btn) => {
      btn.onclick = () => { vibrate(); go(btn.dataset.tab); };
    });
  }

  const chatAscii = { drawing: false, started: false };

  function syncChatAscii(on) {
    const layer = $("chatAscii");
    const video = $("chatAsciiVideo");
    const canvas = $("chatAsciiCanvas");
    if (!layer || !video || !canvas) return;
    layer.hidden = !on;
    if (!on) {
      chatAscii.drawing = false;
      video.pause();
      return;
    }
    const ctx = canvas.getContext("2d");
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.controls = false;

    function sizeCanvas() {
      const w = layer.clientWidth || window.innerWidth;
      const h = layer.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
    }

    function drawCover() {
      if (!ctx || video.readyState < 2) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      ctx.drawImage(video, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    }

    function loop() {
      if (!chatAscii.drawing) return;
      drawCover();
      requestAnimationFrame(loop);
    }

    function startDraw() {
      if (chatAscii.drawing) return;
      chatAscii.drawing = true;
      sizeCanvas();
      loop();
    }

    if (!chatAscii.started) {
      chatAscii.started = true;
      video.addEventListener("playing", startDraw);
      window.addEventListener("resize", () => {
        if (!layer.hidden) sizeCanvas();
      });
    }

    sizeCanvas();
    if (reduced) {
      video.pause();
      const paint = () => { sizeCanvas(); drawCover(); };
      if (video.readyState >= 2) paint();
      else video.addEventListener("loadeddata", paint, { once: true });
      return;
    }
    const play = video.play();
    if (play && play.then) play.then(startDraw).catch(() => {});
    else startDraw();
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
    if (route === "chat") {
      if (tab === "cards" || tab === "talk") state.chatTab = tab;
      else if (!tab) state.chatTab = "talk";
    }
    if (route === "life" && tab) state.lifeTab = tab;
    if (route === "food" && tab) state.foodTab = tab === "meals" ? "pantry" : tab;
    if (route !== "macros") {
      closeSheet();
      state.macrosEntered = false;
      state.weightDrawKey = "";
      state.macroPaneDrawn = "";
      if (state.macroClock) {
        window.clearTimeout(state.macroClock);
        state.macroClock = 0;
      }
    }
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
    $("app").classList.toggle("is-home", route === "home");
    $("app").classList.toggle("is-chat", route === "chat");
    syncChatAscii(route === "chat");

    if (route !== "chat") stopOllamaWatch();

    if (route === "settings") renderSettings();
    else if (route === "life") renderLife();
    else if (route === "food") renderFood();
    else if (route === "macros") renderMacros();
    else if (route === "chat") {
      if (state.chatTab === "cards") renderFlash();
      else renderChat();
    }
    else renderHome();

    if (tabChanged && route !== "chat") {
      $("screen").scrollTop = 0;
    }
    document.querySelectorAll(".tab").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.route === route);
    });
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
      $("tabbar").hidden = false;
      if (hashRoute().route === "chat" && hashRoute().tab === "preview") {
        renderChat();
        return;
      }
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
