/* NG Academy — shared shell logic */
(function () {
  const params = new URLSearchParams(location.search);
  const TOOL = params.get("tool") || "tool";
  const LOC = params.get("loc") || "office";

  const LOC_AR = {
    office: "مكتب المدير",
    reception: "الاستقبال",
    library: "المكتبة",
    lobby: "الردهة الرئيسية",
    courtyard: "الساحة",
    gate: "بوابة المدرسة",
    hall: "قاعة النجوم",
    club: "نادي المبدعين الصغار",
    chess: "فصل الشطرنج",
    math: "فصل الحساب الذهني",
    science: "فصل العلوم",
  };
  const TOOL_AR = {
    computer: "الحاسوب — نظام المدرسة",
    ledger: "دفتر الحضور",
    files: "خزانة الملفات",
    board: "لوحة الإعلانات",
    calendar: "التقويم",
    tables: "جداول الحصص",
    screen: "شاشة: نظرة على المدرسة",
    phone: "الهاتف — الإشعارات",
    meetings: "طاولة الاجتماعات",
    reception: "كاونتر الاستقبال",
    library: "رفوف المكتبة",
    welcome: "لافتة الترحيب",
    quote: "لوح الاقتباسات",
    notice: "لوح الإعلانات الخارجي",
    gate: "شعار البوابة",
    tree: "شجرة المعرفة",
    led: "شاشة العرض LED",
    tech: "طاولة الإخراج",
    curtains: "الستائر المسرحية",
    backdrop: "الخلفية المسرحية",
    sound: "النظام الصوتي",
    honors: "لوحة الشرف والتكريم",
    program: "برنامج الحفل",
    hall: "لافتة القاعة",
    about: "هوية النادي",
    board: "لوحة موضوع اليوم",
    questions: "لوحة الأسئلة",
    ideas: "جدار الأفكار",
    cards: "بطاقات الحوار",
    games: "ألعاب التفكير",
    mic: "ميكروفون دور المتحدث",
    title: "هوية الفصل",
    "digital-board": "الرقعة الرقمية",
    movements: "حركة القطع",
    puzzles: "الألغاز",
    tournament: "البطولات",
    challenges: "تحديات العقل",
    screen: "الشاشة الكبيرة",
    strategy: "الاستراتيجيات",
    levels: "المستويات",
    themes: "لوحة الوحدات",
    experiment: "التجربة الأمامية",
    discover: "ركن الاستكشاف",
    tool: "أداة",
  };

  function shell(title) {
    document.title = "NG Academy — " + title;
    const top = document.createElement("div");
    top.className = "topbar";
    top.innerHTML = `
      <div class="brand">
        <img src="../assets/logo.png" alt="NG Academy">
        <div><b>NG Academy</b><small>مدرسة النجوم</small></div>
      </div>
      <div class="title">${title}</div>
      <div class="loc-chip">📍 ${LOC_AR[LOC] || LOC} · ${TOOL_AR[TOOL] || TOOL}</div>
      <button class="btn-close" title="إغلاق والعودة للعالم">✕</button>`;
    document.body.querySelector(".shell").prepend(top);
    top.querySelector(".btn-close").addEventListener("click", closeTool);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTool(); });
  }

  function closeTool() {
    // If opened via WorkAdventure openWebsite + allowApi → close the co-website
    if (window.WA && WA.nav && WA.nav.closeCoWebSite) {
      WA.nav.closeCoWebSite();
      return;
    }
    if (history.length > 1) history.back();
    else document.body.insertAdjacentHTML("afterbegin",
      '<div class="hint">أغلق هذه النافذة للعودة إلى الغرفة (كنت واقفًا أمام الأداة).</div>');
  }

  // tiny demo store (per-tool, localStorage) — طابور البيانات التجريبي
  function store(key, seed) {
    const id = "nga:" + key;
    try {
      const raw = localStorage.getItem(id);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return seed;
  }
  function save(key, val) {
    try { localStorage.setItem("nga:" + key, JSON.stringify(val)); } catch (e) {}
  }

  window.NGA = { shell, closeTool, store, save, TOOL, LOC, TOOL_AR, LOC_AR };
})();
