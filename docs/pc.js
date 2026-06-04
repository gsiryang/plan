importScriptsFallback();

function iconFor(name) {
  const icons = {
    target: "◎",
    "book-open": "□",
    search: "⌕",
    star: "★",
    rocket: "▲",
    flag: "⚑",
  };
  return icons[name] || "•";
}

function renderMonths(months) {
  $("#months").innerHTML = months.map((month) => `
    <article class="month-card">
      <header>
        <small>Month ${month.month}</small>
        <h3>${iconFor(month.icon)} ${month.title}</h3>
      </header>
      <ul>${month.items.map((item) => `<li>${item}</li>`).join("")}</ul>
      <p class="month-focus">${month.focus}</p>
    </article>
  `).join("");
}

function renderList(selector, items) {
  $(selector).innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function renderWeek(plan) {
  const byCategory = new Map();
  for (const cell of plan.week_template) {
    if (!byCategory.has(cell.category)) byCategory.set(cell.category, []);
    byCategory.get(cell.category).push(cell);
  }

  let html = `<div class="week-cell week-head">Time / Focus</div>`;
  html += plan.days.map((day) => `<div class="week-cell week-head">${day}</div>`).join("");

  for (const [category, cells] of byCategory) {
    const color = cells[0].color;
    html += `<div class="week-cell category-cell ${color}">${category}</div>`;
    html += cells
      .sort((a, b) => a.day_index - b.day_index)
      .map((cell) => `
        <div class="week-cell ${cell.color}">
          <h3>${cell.title}</h3>
          <p>${cell.detail}</p>
        </div>
      `).join("");
  }
  $("#weekGrid").innerHTML = html;
}

async function init() {
  const plan = await getPlan();
  renderMonths(plan.months);
  renderList("#nonNegotiables", plan.lists.daily_non_negotiables);
  renderList("#weeklyCheckin", plan.lists.weekly_checkin);
  renderList("#reflectionPrompts", plan.lists.reflection_prompts);
  renderWeek(plan);
  await loadCurrentCheckin();
  attachCheckinForm("#checkinForm");
}

function importScriptsFallback() {
  const script = document.createElement("script");
  script.src = "/common.js";
  script.onload = init;
  document.head.appendChild(script);
}
