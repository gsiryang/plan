const PLAN_KEY = "personal-plan-checkins-v3";
const LEGACY_KEYS = ["personal-plan-checkins-v2", "personal-plan-checkins-v1"];

const MOODS = [
  "1 崩溃/很低落",
  "2 难受/焦虑",
  "3 疲惫/低能量",
  "4 平平/能撑住",
  "5 稳定/还可以",
  "6 轻松/有动力",
  "7 开心/顺利",
  "8 很好/高能量",
];

const MONTHS = [
  ["Month 1 Foundation & Clarity", "Understand myself and my options.", ["Stabilize at current job", "Set boundaries and manage energy", "Strengths assessment", "List values and non-negotiables", "Start a career exploration journal", "Explore 3-5 career paths of interest"]],
  ["Month 2 Skill Building & Exploration", "Build skills and learn from others.", ["Choose 1-2 core skills to build", "Take an online course", "Do 1 project related to interest area", "Interview 2 people informally", "Continue reflection journal"]],
  ["Month 3 Experiment & Validate", "Test, learn and validate.", ["Take on small projects at work", "Volunteer or freelance if possible", "Shadow someone in a role you are interested in", "Review what you enjoyed and what drains you", "Narrow down top 2-3 career paths"]],
  ["Month 4 Direction & Branding", "Build my presence and direction.", ["Define top 1-2 career paths", "Build or update LinkedIn profile", "Create a resume and portfolio if needed", "Start networking more consistently", "Take an advanced course or certification"]],
  ["Month 5 Prepare & Position", "Get ready and get noticed.", ["Tailor resume and cover letter for target roles", "Practice interview questions", "Apply to 5-10 roles per week", "Ask for referrals and introductions", "Stay consistent with skill building"]],
  ["Month 6 Transition & Next Level", "Make the move with confidence.", ["Apply consistently", "Follow up and track applications", "Prepare for interviews", "Evaluate offers wisely", "Plan transition: notice period, finances, mindset", "Celebrate progress"]],
];

const WEEK_TEMPLATE = [
  ["Work & Survive", ["Work tasks", "Work tasks", "Work tasks", "Work tasks", "Work tasks", "Optional light work / catch-up", "Rest / no work"]],
  ["Skills & Growth", ["Code / tech practice", "Study / learn new concept", "Build project / practice", "Read code / deep dive", "Note / summarize what I learned", "Build / improve side project", "Learn / explore something new"]],
  ["Deep Work", ["Deep work block", "Deep work block", "Deep work block", "Deep work block", "Review progress / adjust plan", "Deep work block", "Plan next week"]],
  ["Career & Transition", ["Job market research", "Update notes / resume points", "LinkedIn / networking", "Apply / reach out", "Track applications", "Prepare for interviews", "Reflect and plan career next steps"]],
  ["Well-being & Energy", ["Exercise / walk", "Meditation / mindfulness", "Hobby / do something you enjoy", "Exercise / walk", "Connect with friends / family", "Outdoor time / no screen time", "Plan and prepare mindset"]],
];

const PROMPTS = [
  "What went well?",
  "What did I learn?",
  "What can I improve?",
  "What's next?",
  "What energizes me?",
  "What problems do I enjoy solving?",
  "What kind of impact do I want to make?",
  "What would my ideal day look like?",
  "What's one step I can take this week?",
];

const DEFAULT_PLAN_ID = "default-career-transition";
const DEFAULT_PLAN = {
  id: DEFAULT_PLAN_ID,
  name: "6-Month Career Transition Plan",
  start_date: "",
  end_date: "",
  why: "I'm building my future intentionally so I can have a career I love and a life I'm proud of.",
  months: MONTHS.map(([title, focus, items]) => ({ title, focus, items })),
  week_template: WEEK_TEMPLATE.map(([category, days]) => ({ category, days })),
  prompts: PROMPTS,
};

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function nowTimeValue() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function monthIso(value = todayIso()) {
  return value.slice(0, 7);
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(value, days) {
  const next = parseDate(value);
  next.setDate(next.getDate() + days);
  return toIso(next);
}

function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

function weekdayIndex(value) {
  const day = parseDate(value || todayIso()).getDay();
  return day === 0 ? 6 : day - 1;
}

function blankCheckin(entryDate) {
  return {
    entry_date: entryDate,
    created_at: "",
    updated_at: "",
    week_focus: "",
    top_one: "",
    work_done: false,
    skill_done: false,
    career_done: false,
    wellbeing_done: false,
    reflection: "",
    mood_score: "",
    mood_note: "",
    mood_entries: [],
    period_start: false,
    period_end: false,
    cycle_length: "",
    period_length: "",
    weight_kg: "",
    waist_cm: "",
    body_fat: "",
    exercise_minutes: "",
    exercise_type: "",
    binge_eating: false,
  };
}

function normalizeStore(raw) {
  if (!raw) {
    return { version: 4, entries: {}, custom_tasks: [], errands: [], plans: [DEFAULT_PLAN], active_plan_id: DEFAULT_PLAN_ID };
  }
  const entries = raw.entries || raw.checkins || raw;
  const plans = Array.isArray(raw.plans) && raw.plans.length ? raw.plans : [DEFAULT_PLAN];
  const activePlanId = raw.active_plan_id || plans[0].id || DEFAULT_PLAN_ID;
  Object.keys(entries || {}).forEach((dateKey) => {
    const source = entries[dateKey] || {};
    entries[dateKey] = normalizeMoodEntry({
      ...blankCheckin(dateKey),
      ...source,
      _has_mood_entries: Object.prototype.hasOwnProperty.call(source, "mood_entries"),
    });
  });
  return {
    version: 4,
    entries: entries || {},
    custom_tasks: raw.custom_tasks || [],
    errands: raw.errands || [],
    plans,
    active_plan_id: activePlanId,
  };
}

function normalizeMoodEntry(entry) {
  const moodEntries = Array.isArray(entry.mood_entries) ? entry.mood_entries : [];
  const hasMoodEntries = Boolean(entry._has_mood_entries);
  const cleaned = moodEntries
    .map((item) => ({
      id: item.id || `${entry.entry_date}-${item.time || "12:00"}-${Math.random().toString(16).slice(2)}`,
      date: item.date || entry.entry_date,
      time: item.time || "12:00",
      score: Number(item.score),
      note: item.note || "",
      created_at: item.created_at || entry.updated_at || entry.created_at || "",
    }))
    .filter((item) => Number.isFinite(item.score))
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!cleaned.length && !hasMoodEntries && entry.mood_score) {
    cleaned.push({
      id: `${entry.entry_date}-legacy`,
      date: entry.entry_date,
      time: "12:00",
      score: Number(entry.mood_score),
      note: entry.mood_note || "",
      created_at: entry.updated_at || entry.created_at || "",
    });
  }
  const avg = moodAverage({ ...entry, mood_entries: cleaned });
  const normalized = {
    ...entry,
    mood_entries: cleaned,
    mood_score: Number.isFinite(avg) ? avg.toFixed(2) : "",
    mood_note: cleaned.length ? cleaned[cleaned.length - 1].note : "",
  };
  delete normalized._has_mood_entries;
  return normalized;
}

function readStore() {
  try {
    const currentRaw = JSON.parse(localStorage.getItem(PLAN_KEY));
    if (currentRaw) return normalizeStore(currentRaw);
    for (const key of LEGACY_KEYS) {
      const legacyRaw = JSON.parse(localStorage.getItem(key));
      if (legacyRaw) {
        const migrated = normalizeStore(legacyRaw);
        writeStore(migrated);
        return migrated;
      }
    }
  } catch {
    return normalizeStore(null);
  }
  return normalizeStore(null);
}

function writeStore(store) {
  if (!store.custom_tasks) store.custom_tasks = [];
  if (!store.errands) store.errands = [];
  if (!store.plans || !store.plans.length) store.plans = [DEFAULT_PLAN];
  if (!store.active_plan_id) store.active_plan_id = store.plans[0].id || DEFAULT_PLAN_ID;
  store.version = 4;
  localStorage.setItem(PLAN_KEY, JSON.stringify(store));
}

function entryFor(date) {
  const store = readStore();
  const source = store.entries[date] || {};
  return normalizeMoodEntry({
    ...blankCheckin(date),
    ...source,
    _has_mood_entries: Object.prototype.hasOwnProperty.call(source, "mood_entries"),
  });
}

function moodAverage(entry) {
  const records = Array.isArray(entry.mood_entries) ? entry.mood_entries : [];
  const scores = records.map((item) => Number(item.score)).filter(Number.isFinite);
  if (!scores.length) return entry.mood_score ? Number(entry.mood_score) : NaN;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function moodHour(record) {
  const [hour, minute] = String(record.time || "00:00").split(":").map(Number);
  return Math.max(0, Math.min(24, (hour || 0) + ((minute || 0) / 60)));
}

function fillForm(data) {
  $("#entryDate").value = data.entry_date;
  $("#moodEntryDate").value = data.entry_date;
  $("#recordedAt").textContent = data.updated_at ? `上次保存：${data.updated_at}` : "尚未保存，保存时会自动记录系统时间";
  $("#weekFocus").value = data.week_focus || "";
  $("#topOne").value = data.top_one || "";
  $("#workDone").checked = Boolean(data.work_done);
  $("#skillDone").checked = Boolean(data.skill_done);
  $("#careerDone").checked = Boolean(data.career_done);
  $("#wellbeingDone").checked = Boolean(data.wellbeing_done);
  $("#reflection").value = data.reflection || "";
  $("#moodScore").value = data.mood_score || "";
  $("#moodNote").value = data.mood_note || "";
  $("#periodStart").checked = Boolean(data.period_start);
  $("#periodEnd").checked = Boolean(data.period_end);
  $("#cycleLength").value = data.cycle_length || "";
  $("#periodLength").value = data.period_length || "";
  $("#weightKg").value = data.weight_kg || "";
  $("#waistCm").value = data.waist_cm || "";
  $("#bodyFat").value = data.body_fat || "";
  $("#exerciseMinutes").value = data.exercise_minutes || "";
  $("#exerciseType").value = data.exercise_type || "";
  $("#bingeEating").checked = Boolean(data.binge_eating);
}

function fillMoodForm(data) {
  $("#moodEntryDate").value = data.entry_date;
  $("#moodTime").value = nowTimeValue();
  $("#moodScore").value = "";
  $("#moodNote").value = "";
  renderMoodLog(data.entry_date);
}

function renderMoodLog(entryDate) {
  const node = $("#moodLog");
  if (!node) return;
  const records = entryFor(entryDate).mood_entries || [];
  if (!records.length) {
    node.innerHTML = `<p class="meta-line">这一天还没有心情记录。</p>`;
    return;
  }
  node.innerHTML = records.map((item) => `
    <article class="mood-log-item">
      <div>
        <strong>${item.time} · ${Number(item.score).toFixed(0)}分</strong>
        <button type="button" data-delete-mood="${item.id}">删除</button>
      </div>
      <p>${item.note || "没有文字记录"}</p>
    </article>
  `).join("");
  $$("[data-delete-mood]").forEach((button) => {
    button.addEventListener("click", () => deleteMoodRecord(entryDate, button.dataset.deleteMood));
  });
}

function deleteMoodRecord(entryDate, recordId) {
  const store = readStore();
  const existing = entryFor(entryDate);
  const records = (existing.mood_entries || []).filter((item) => item.id !== recordId);
  const scores = records.map((item) => Number(item.score)).filter(Number.isFinite);
  const next = normalizeMoodEntry({
    ...existing,
    _has_mood_entries: true,
    mood_entries: records,
    mood_score: scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : "",
    mood_note: records.length ? records[records.length - 1].note : "",
    updated_at: nowText(),
  });
  store.entries[entryDate] = next;
  writeStore(store);
  fillMoodForm(next);
  if ($("#entryDate").value === entryDate) fillForm(next);
  drawTrendChart();
  renderDayMoodOptions();
  drawDayMoodChart();
}

function readForm() {
  const activeDate = $("#entryDate").value || $("#moodEntryDate").value || todayIso();
  return {
    ...entryFor(activeDate),
    entry_date: activeDate,
    week_focus: $("#weekFocus").value,
    top_one: $("#topOne").value,
    work_done: $("#workDone").checked,
    skill_done: $("#skillDone").checked,
    career_done: $("#careerDone").checked,
    wellbeing_done: $("#wellbeingDone").checked,
    reflection: $("#reflection").value,
    mood_score: $("#moodScore").value,
    mood_note: $("#moodNote").value,
    period_start: $("#periodStart").checked,
    period_end: $("#periodEnd").checked,
    cycle_length: $("#cycleLength").value,
    period_length: $("#periodLength").value,
    weight_kg: $("#weightKg").value,
    waist_cm: $("#waistCm").value,
    body_fat: $("#bodyFat").value,
    exercise_minutes: $("#exerciseMinutes").value,
    exercise_type: $("#exerciseType").value,
    binge_eating: $("#bingeEating").checked,
  };
}

function completionPercent(entry) {
  return [entry.work_done, entry.skill_done, entry.career_done, entry.wellbeing_done].filter(Boolean).length * 25;
}

function periodStarts(entries) {
  return Object.values(entries).filter((entry) => entry.period_start).map((entry) => entry.entry_date).sort();
}

function periodEnds(entries) {
  return Object.values(entries).filter((entry) => entry.period_end).map((entry) => entry.entry_date).sort();
}

function latestNumber(entries, field, fallback) {
  const values = Object.values(entries)
    .filter((entry) => entry[field] !== "" && entry[field] != null)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const last = values[values.length - 1];
  return last ? Number(last[field]) : fallback;
}

function averageCycleLength(starts, fallback) {
  const gaps = [];
  for (let i = 1; i < starts.length; i += 1) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap >= 18 && gap <= 45) gaps.push(gap);
  }
  if (!gaps.length) return fallback;
  return Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
}

function activePeriodWindow(entryDate, entries) {
  const starts = periodStarts(entries);
  const ends = periodEnds(entries);
  const lastStart = starts.filter((date) => date <= entryDate).pop();
  if (!lastStart) return null;
  const nextStart = starts.find((date) => date > lastStart);
  if (nextStart && entryDate >= nextStart) return null;
  const explicitEnd = ends.find((date) => date >= lastStart && (!nextStart || date < nextStart));
  const autoEnd = addDays(lastStart, 6);
  const end = explicitEnd || autoEnd;
  if (entryDate >= lastStart && entryDate <= end) {
    return { start: lastStart, end, explicitEnd: Boolean(explicitEnd), autoEnd: !explicitEnd };
  }
  return null;
}

function cycleInfo(entryDate, entries) {
  const starts = periodStarts(entries);
  const selected = entries[entryDate] || {};
  const cycleFallback = Number(selected.cycle_length) || latestNumber(entries, "cycle_length", 28);
  const periodLength = Number(selected.period_length) || latestNumber(entries, "period_length", 7);
  const cycleLength = averageCycleLength(starts, cycleFallback);
  const lastStart = starts.filter((date) => date <= entryDate).pop();
  const window = activePeriodWindow(entryDate, entries);

  if (!lastStart) {
    return { cycleLength, periodLength, lastStart: "", nextStart: "", day: 0, phase: "未记录周期", isPeriod: false, periodEnd: "" };
  }

  const day = daysBetween(lastStart, entryDate) + 1;
  const nextStart = addDays(lastStart, cycleLength);
  let phase = "黄体期";
  if (window) phase = "月经期";
  else if (day <= Math.max(periodLength + 1, cycleLength - 16)) phase = "卵泡期";
  else if (day >= cycleLength - 15 && day <= cycleLength - 12) phase = "排卵期附近";

  return {
    cycleLength,
    periodLength,
    lastStart,
    nextStart,
    day,
    phase,
    isPeriod: Boolean(window),
    periodEnd: window ? window.end : "",
    periodAutoEnd: window ? window.autoEnd : false,
  };
}

function phaseAdvice(phase) {
  return {
    "月经期": "今天以轻量活动、拉伸、散步为主；饮食保证蛋白质和铁，不建议硬扛高强度训练。",
    "卵泡期": "状态通常更适合建立训练节奏，可以安排力量训练、技术练习和略高强度有氧。",
    "排卵期附近": "可以训练，但注意关节稳定和热身；如果感觉精力好，适合做关键训练。",
    "黄体期": "优先稳住睡眠和食欲，力量训练可保留但降低冲刺感；体重波动可能来自水分。",
  }[phase] || "先记录 2 次以上月经开始日，预测会更准。";
}

function renderCycleSummary(entryDate) {
  const store = readStore();
  const info = cycleInfo(entryDate, store.entries);
  const endText = info.isPeriod
    ? `经期状态持续到 ${info.periodEnd}${info.periodAutoEnd ? "（未勾选结束时默认第 7 天结束）" : ""}`
    : "当前不在已记录经期内";
  $("#cycleSummary").innerHTML = `
    <strong>${info.phase}</strong>
    <span>当前约第 ${info.day || "-"} 天；预测下次开始：${info.nextStart || "待记录"}；估算周期：${info.cycleLength} 天。</span>
    <span>${endText}</span>
  `;
}

function renderFitnessAdvice(entryDate) {
  const store = readStore();
  const entry = entryFor(entryDate);
  const info = cycleInfo(entryDate, store.entries);
  const planText = completionPercent(entry) < 50
    ? "计划完成度偏低时，把运动目标降到 10-20 分钟，先保住连续性。"
    : "今天执行感不错，训练可以按计划推进，但不要用额外强度惩罚自己。";
  $("#fitnessAdvice").innerHTML = `<strong>减肥/健身建议</strong><p>${phaseAdvice(info.phase)}</p><p>${planText}</p>`;
}

function setupMoodOptions() {
  $("#moodScore").innerHTML = `<option value="">未选择</option>` + MOODS.map((label, index) => `<option value="${index + 1}">${label}</option>`).join("");
}

function setupPlanSelect() {
  renderActivePlanSelect();
  setupMonthPlanSelect();
}

function currentPlan() {
  const store = readStore();
  return store.plans.find((plan) => plan.id === store.active_plan_id) || store.plans[0] || DEFAULT_PLAN;
}

function currentPlanMonthIndex(plan) {
  if (!plan.start_date) return 0;
  const today = parseDate($("#entryDate").value || todayIso());
  const start = parseDate(plan.start_date);
  const diff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
  return Math.max(0, Math.min((plan.months || []).length - 1, diff));
}

function renderActivePlanSelect() {
  const store = readStore();
  $("#activePlanSelect").innerHTML = store.plans
    .map((plan) => `<option value="${plan.id}">${plan.name || plan.id}</option>`)
    .join("");
  $("#activePlanSelect").value = store.active_plan_id;
}

function setupMonthPlanSelect() {
  const plan = currentPlan();
  const months = plan.months && plan.months.length ? plan.months : DEFAULT_PLAN.months;
  $("#monthPlanSelect").innerHTML = months
    .map((month, index) => `<option value="${index}">${month.title || `Month ${index + 1}`}</option>`)
    .join("");
  $("#monthPlanSelect").value = String(currentPlanMonthIndex(plan));
}

function renderPlanViews(entryDate) {
  const weekday = weekdayIndex(entryDate);
  const plan = currentPlan();
  const months = plan.months && plan.months.length ? plan.months : DEFAULT_PLAN.months;
  const weekTemplate = plan.week_template && plan.week_template.length ? plan.week_template : DEFAULT_PLAN.week_template;
  const prompts = plan.prompts && plan.prompts.length ? plan.prompts : DEFAULT_PLAN.prompts;
  const month = months[Number($("#monthPlanSelect").value || 0)] || months[0];
  $("#monthPlan").innerHTML = `<article class="mini-plan"><h3>${month.title}</h3><p>${month.focus || ""}</p><ul>${(month.items || []).map((item) => `<li>${item}</li>`).join("")}</ul></article>`;
  $("#weekPlan").innerHTML = weekTemplate.map(({ category, days }) => `
    <article class="mini-plan ${days[weekday] ? "current" : ""}">
      <h3>${category}</h3>
      <p><strong>${DAY_NAMES[weekday]}：</strong>${days[weekday]}</p>
      <details><summary>查看整周</summary><ul>${days.map((day, index) => `<li>${DAY_NAMES[index]}：${day}</li>`).join("")}</ul></details>
    </article>
  `).join("");
  $("#todayPlan").innerHTML = weekTemplate.map(({ category, days }) => `<div class="suggestion"><strong>${category}</strong><span>${days[weekday]}</span></div>`).join("");
  $("#promptList").innerHTML = prompts.map((prompt) => `<div class="prompt-item">${prompt}</div>`).join("");
  renderCustomTasks();
  renderErrands(entryDate);
}

function renderErrands(entryDate) {
  const store = readStore();
  const visible = (store.errands || []).filter((item) => !item.done && item.created_date <= entryDate);
  $("#todayErrands").innerHTML = visible.length
    ? visible.map((item) => `
      <article class="mini-plan custom-task">
        <p>${item.text}</p>
        <small>来自：${item.created_date}${item.created_date < entryDate ? "，已顺延" : ""}</small>
        <button type="button" data-complete-errand="${item.id}">完成</button>
      </article>
    `).join("")
    : `<p class="meta-line">今天没有未完成杂事。</p>`;
  $$("[data-complete-errand]").forEach((button) => {
    button.addEventListener("click", () => completeErrand(button.dataset.completeErrand));
  });
}

function addErrand() {
  const text = $("#errandText").value.trim();
  if (!text) return;
  const entryDate = $("#entryDate").value || todayIso();
  const store = readStore();
  store.errands = store.errands || [];
  store.errands.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    created_date: entryDate,
    created_at: nowText(),
    done: false,
    done_date: "",
    done_at: "",
  });
  writeStore(store);
  $("#errandText").value = "";
  renderErrands(entryDate);
}

function completeErrand(id) {
  const entryDate = $("#entryDate").value || todayIso();
  const store = readStore();
  store.errands = (store.errands || []).map((item) =>
    item.id === id ? { ...item, done: true, done_date: entryDate, done_at: nowText() } : item
  );
  writeStore(store);
  renderErrands(entryDate);
}

function renderCustomTasks() {
  const store = readStore();
  const activeTasks = (store.custom_tasks || []).filter((task) => !task.done);
  $("#customTasks").innerHTML = activeTasks.length
    ? activeTasks.map((task) => `
      <article class="mini-plan custom-task">
        <p>${task.text}</p>
        <button type="button" data-complete-task="${task.id}">标注完成</button>
      </article>
    `).join("")
    : `<p class="meta-line">暂无未完成的自定义任务提示。</p>`;
  $$("[data-complete-task]").forEach((button) => {
    button.addEventListener("click", () => completeCustomTask(button.dataset.completeTask));
  });
}

function addCustomTask() {
  const text = $("#customTaskText").value.trim();
  if (!text) return;
  const store = readStore();
  store.custom_tasks = store.custom_tasks || [];
  store.custom_tasks.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    created_at: nowText(),
    done: false,
    done_at: "",
  });
  writeStore(store);
  $("#customTaskText").value = "";
  renderCustomTasks();
}

function completeCustomTask(id) {
  const store = readStore();
  store.custom_tasks = (store.custom_tasks || []).map((task) =>
    task.id === id ? { ...task, done: true, done_at: nowText() } : task
  );
  writeStore(store);
  renderCustomTasks();
}

function normalizeImportedPlan(rawPlan) {
  const source = rawPlan.plan || rawPlan;
  if (!source || !Array.isArray(source.months) || !Array.isArray(source.week_template)) {
    throw new Error("计划周期 JSON 需要包含 months 和 week_template");
  }
  const id = source.id || `plan-${Date.now()}`;
  return {
    id,
    name: source.name || "Untitled Plan Cycle",
    start_date: source.start_date || "",
    end_date: source.end_date || "",
    why: source.why || "",
    months: source.months.map((month, index) => ({
      title: month.title || `Month ${index + 1}`,
      focus: month.focus || "",
      items: Array.isArray(month.items) ? month.items : [],
    })),
    week_template: source.week_template.map((row) => ({
      category: row.category || "General",
      days: Array.isArray(row.days) ? row.days.slice(0, 7) : [],
    })).filter((row) => row.days.length),
    prompts: Array.isArray(source.prompts) ? source.prompts : DEFAULT_PLAN.prompts,
  };
}

function importPlanCycle(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || "{}"));
      const plan = normalizeImportedPlan(payload);
      const store = readStore();
      store.plans = (store.plans || []).filter((item) => item.id !== plan.id);
      store.plans.push(plan);
      store.active_plan_id = plan.id;
      writeStore(store);
      renderActivePlanSelect();
      setupMonthPlanSelect();
      renderPlanViews($("#entryDate").value || todayIso());
      showStatus("计划周期已导入");
      $("#planState").textContent = "计划周期已导入";
      setTimeout(() => { $("#planState").textContent = ""; }, 1800);
    } catch (error) {
      $("#planState").textContent = error.message || "导入失败";
    }
  };
  reader.readAsText(file);
}

function switchActivePlan(planId) {
  const store = readStore();
  store.active_plan_id = planId;
  writeStore(store);
  setupMonthPlanSelect();
  renderPlanViews($("#entryDate").value || todayIso());
}

function saveHealthFields(fields, message) {
  const data = readForm();
  const store = readStore();
  const existing = entryFor(data.entry_date);
  const stamp = nowText();
  const next = { ...existing, entry_date: data.entry_date, updated_at: stamp };
  fields.forEach((field) => {
    next[field] = data[field];
  });
  next.created_at = next.created_at || stamp;
  store.entries[data.entry_date] = next;
  writeStore(store);
  fillForm(next);
  renderCycleSummary(data.entry_date);
  renderFitnessAdvice(data.entry_date);
  drawTrendChart();
  drawDayMoodChart();
  showStatus(message);
}

function loadDate(entryDate) {
  fillForm(entryFor(entryDate));
  if ($("#moodEntryDate")) $("#moodEntryDate").value = entryDate;
  renderMoodLog(entryDate);
  renderPlanViews(entryDate);
  renderCycleSummary(entryDate);
  renderFitnessAdvice(entryDate);
  drawTrendChart();
  renderDayMoodOptions();
  drawDayMoodChart();
}

function loadMoodDate(entryDate) {
  fillMoodForm(entryFor(entryDate));
}

function saveEntryFields(fields, message) {
  const data = readForm();
  const store = readStore();
  const existing = entryFor(data.entry_date);
  const stamp = nowText();
  const next = { ...existing, entry_date: data.entry_date, updated_at: stamp };
  fields.forEach((field) => {
    next[field] = data[field];
  });
  next.created_at = next.created_at || stamp;
  store.entries[data.entry_date] = next;
  writeStore(store);
  fillForm(next);
  renderCycleSummary(next.entry_date);
  renderFitnessAdvice(next.entry_date);
  drawTrendChart();
  drawDayMoodChart();
  showStatus(message);
}

function savePlanOnly() {
  saveEntryFields([
    "week_focus",
    "top_one",
    "work_done",
    "skill_done",
    "career_done",
    "wellbeing_done",
    "reflection",
  ], "今日计划已保存");
}

function saveMoodOnly() {
  const previousDate = $("#entryDate").value;
  $("#entryDate").value = $("#moodEntryDate").value || previousDate || todayIso();
  saveEntryFields(["mood_score", "mood_note"], "心情记录已保存");
  $("#entryDate").value = previousDate || $("#moodEntryDate").value;
}

function showStatus(message) {
  ["#saveState", "#healthState", "#moodState"].forEach((selector) => {
    const node = $(selector);
    if (node) node.textContent = message;
  });
  setTimeout(() => {
    ["#saveState", "#healthState", "#moodState"].forEach((selector) => {
      const node = $(selector);
      if (node) node.textContent = "";
    });
  }, 1600);
}

function saveMoodOnly() {
  const entryDate = $("#moodEntryDate").value || $("#entryDate").value || todayIso();
  const score = Number($("#moodScore").value);
  if (!Number.isFinite(score)) {
    $("#moodState").textContent = "请先选择心情分数";
    return;
  }
  const store = readStore();
  const existing = entryFor(entryDate);
  const stamp = nowText();
  const records = [...(existing.mood_entries || []), {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: entryDate,
    time: $("#moodTime").value || nowTimeValue(),
    score,
    note: $("#moodNote").value,
    created_at: stamp,
  }].sort((a, b) => a.time.localeCompare(b.time));
  const next = normalizeMoodEntry({
    ...existing,
    entry_date: entryDate,
    mood_entries: records,
    updated_at: stamp,
    created_at: existing.created_at || stamp,
  });
  store.entries[entryDate] = next;
  writeStore(store);
  if ($("#entryDate").value === entryDate) fillForm(next);
  fillMoodForm(next);
  drawTrendChart();
  renderDayMoodOptions();
  drawDayMoodChart();
  showStatus("心情记录已保存");
}

function entriesForMonth(month) {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = new Date(year, monthIndex, 0).getDate();
  return Array.from({ length: days }, (_, index) => entryFor(`${month}-${String(index + 1).padStart(2, "0")}`));
}

function moodDatesForMonth(month) {
  return entriesForMonth(month)
    .filter((entry) => (entry.mood_entries || []).length)
    .map((entry) => entry.entry_date);
}

function renderDayMoodOptions() {
  const node = $("#dayMoodDays");
  if (!node) return;
  const month = $("#chartMonth").value || monthIso();
  const dates = moodDatesForMonth(month);
  const selected = new Set($$("[data-day-mood]").filter((item) => item.checked).map((item) => item.value));
  const fallback = $("#moodEntryDate").value || $("#entryDate").value || todayIso();
  if (!selected.size && dates.includes(fallback)) selected.add(fallback);
  node.innerHTML = dates.length
    ? dates.map((dateValue) => `
      <label><input data-day-mood type="checkbox" value="${dateValue}" ${selected.has(dateValue) ? "checked" : ""}> ${dateValue.slice(5)}</label>
    `).join("")
    : `<p class="meta-line">这个月还没有可画的心情记录。</p>`;
  $$("[data-day-mood]").forEach((input) => input.addEventListener("change", drawDayMoodChart));
}

function selectedMoodDates() {
  const checked = $$("[data-day-mood]").filter((item) => item.checked).map((item) => item.value);
  if (checked.length) return checked;
  const fallback = $("#moodEntryDate").value || $("#entryDate").value || todayIso();
  return (entryFor(fallback).mood_entries || []).length ? [fallback] : [];
}

function drawDayMoodChart() {
  const canvas = $("#dayMoodChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const pad = { left: 44, right: 18, top: 24, bottom: 42 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const xFor = (hour) => pad.left + (hour / 24) * innerW;
  const yMood = (value) => pad.top + innerH - ((value - 1) / 7) * innerH;
  const colors = ["#8b5cf6", "#0f9f8f", "#d18b00", "#2166c2", "#e11d48", "#4f7f36"];

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#dbe3ef";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (i / 4) * innerH;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
  }
  for (let hour = 0; hour <= 24; hour += 6) {
    const x = xFor(hour);
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + innerH);
  }
  ctx.stroke();

  selectedMoodDates().forEach((dateValue, index) => {
    const records = (entryFor(dateValue).mood_entries || []).filter((item) => Number.isFinite(Number(item.score)));
    if (!records.length) return;
    const color = colors[index % colors.length];
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    records.forEach((record, recordIndex) => {
      const x = xFor(moodHour(record));
      const y = yMood(Number(record.score));
      if (recordIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    records.forEach((record) => {
      const x = xFor(moodHour(record));
      const y = yMood(Number(record.score));
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = "18px Segoe UI, sans-serif";
    ctx.fillText(dateValue.slice(5), pad.left + 8 + (index % 3) * 72, pad.top + 18 + Math.floor(index / 3) * 22);
  });

  ctx.fillStyle = "#647087";
  ctx.font = "20px Segoe UI, sans-serif";
  ctx.fillText("1", 18, pad.top + innerH);
  ctx.fillText("8", 18, pad.top + 8);
  [0, 6, 12, 18, 24].forEach((hour) => ctx.fillText(String(hour), xFor(hour) - 8, h - 14));
}

function valueRange(values) {
  const nums = values.filter((value) => Number.isFinite(value));
  if (!nums.length) return [0, 1];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return min === max ? [min - 1, max + 1] : [min, max];
}

function drawTrendChart() {
  const canvas = $("#trendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const month = $("#chartMonth").value || monthIso();
  const entries = entriesForMonth(month);
  const store = readStore();
  const w = canvas.width;
  const h = canvas.height;
  const pad = { left: 42, right: 28, top: 26, bottom: 42 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const xFor = (i) => pad.left + (entries.length === 1 ? 0 : (i / (entries.length - 1)) * innerW);
  const completion = entries.map(completionPercent);
  const moods = entries.map((entry) => moodAverage(entry));
  const weights = entries.map((entry) => entry.weight_kg ? Number(entry.weight_kg) : NaN);
  const exercises = entries.map((entry) => entry.exercise_minutes ? Number(entry.exercise_minutes) : NaN);
  const [weightMin, weightMax] = valueRange(weights);
  const exerciseMax = Math.max(30, ...exercises.filter(Number.isFinite));

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  if ($("#showCycle").checked) {
    entries.forEach((entry, index) => {
      const info = cycleInfo(entry.entry_date, store.entries);
      const phaseColor = {
        "月经期": "rgba(255, 120, 150, .16)",
        "卵泡期": "rgba(72, 185, 130, .10)",
        "排卵期附近": "rgba(255, 199, 84, .16)",
        "黄体期": "rgba(126, 108, 208, .12)",
      }[info.phase];
      if (phaseColor) {
        const cellW = innerW / entries.length;
        ctx.fillStyle = phaseColor;
        ctx.fillRect(xFor(index) - cellW / 2, pad.top, cellW + 1, innerH);
      }
    });
  }

  ctx.strokeStyle = "#dbe3ef";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 4; i += 1) {
    const y = pad.top + (i / 4) * innerH;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
  }
  ctx.stroke();

  const yPercent = (value) => pad.top + innerH - (value / 100) * innerH;
  const yMood = (value) => pad.top + innerH - ((value - 1) / 7) * innerH;
  const yWeight = (value) => pad.top + innerH - ((value - weightMin) / (weightMax - weightMin)) * innerH;
  const yExercise = (value) => pad.top + innerH - (value / exerciseMax) * innerH;

  function drawPoint(x, y, color, shape = "circle", size = 5) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (shape === "square") ctx.fillRect(x - size, y - size, size * 2, size * 2);
    else if (shape === "diamond") {
      ctx.moveTo(x, y - size); ctx.lineTo(x - size, y); ctx.lineTo(x, y + size); ctx.lineTo(x + size, y); ctx.closePath(); ctx.fill();
    } else if (shape === "ring") {
      ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawLine(values, yFn, color, pointFor) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    let started = false;
    values.forEach((value, index) => {
      if (!Number.isFinite(value)) { started = false; return; }
      const x = xFor(index);
      const y = yFn(value);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
    values.forEach((value, index) => {
      if (!Number.isFinite(value)) return;
      drawPoint(xFor(index), yFn(value), color, pointFor ? pointFor(entries[index]) : "circle", 4);
    });
  }

  if ($("#showCompletion").checked) drawLine(completion, yPercent, "#2166c2");
  if ($("#showMood").checked) drawLine(moods, yMood, "#8b5cf6");
  if ($("#showWeight").checked) drawLine(weights, yWeight, "#d18b00");
  if ($("#showExercise").checked) {
    drawLine(exercises, yExercise, "#0f9f8f", (entry) => ({ cardio: "circle", class: "diamond", strength: "square" }[entry.exercise_type] || "circle"));
  }
  if ($("#showBinge").checked) {
    entries.forEach((entry, index) => {
      if (!entry.binge_eating) return;
      const weight = weights[index];
      drawPoint(xFor(index), Number.isFinite(weight) ? yWeight(weight) : pad.top + innerH - 12, "#e11d48", "ring", 8);
    });
  }

  ctx.fillStyle = "#647087";
  ctx.font = "22px Segoe UI, sans-serif";
  ctx.fillText("100%", 4, pad.top + 8);
  ctx.fillText("0%", 14, pad.top + innerH);
  ctx.fillText("1", w - 18, pad.top + innerH);
  ctx.fillText("8", w - 18, pad.top + 8);
  if (weights.some(Number.isFinite)) {
    ctx.fillText(`${weightMax.toFixed(1)}kg`, w - 96, pad.top + 26);
    ctx.fillText(`${weightMin.toFixed(1)}kg`, w - 96, pad.top + innerH - 8);
  }
  if (exercises.some(Number.isFinite)) ctx.fillText(`${exerciseMax}min`, w - 108, pad.top + 52);

  ctx.fillStyle = "#31405b";
  ctx.font = "20px Segoe UI, sans-serif";
  entries.forEach((entry, index) => {
    const day = Number(entry.entry_date.slice(-2));
    if (day === 1 || day % 5 === 0 || day === entries.length) ctx.fillText(String(day), xFor(index) - 6, h - 14);
  });
}

function exportBackup() {
  const payload = { app: "personal-plan-pwa", version: 4, exported_at: new Date().toISOString(), data: readStore() };
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = $("#downloadBackup");
  $("#backupText").value = text;
  link.href = url;
  link.download = `personal-plan-backup-${todayIso()}.json`;
  link.setAttribute("aria-disabled", "false");
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const payload = JSON.parse(String(reader.result || "{}"));
    writeStore(normalizeStore(payload.data || payload));
    loadDate($("#entryDate").value || todayIso());
    showStatus("备份已导入");
  };
  reader.readAsText(file);
}

function switchView(target) {
  $$(".app-view").forEach((view) => view.classList.toggle("active", view.dataset.view === target));
  $$(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.target === target));
  if (target === "trend") requestAnimationFrame(() => {
    renderDayMoodOptions();
    drawTrendChart();
    drawDayMoodChart();
  });
}

function switchPlanTab(target) {
  $$("[data-plan-tab]").forEach((button) => button.classList.toggle("active", button.dataset.planTab === target));
  $$(".plan-pane").forEach((pane) => pane.classList.toggle("active", pane.dataset.planPane === target));
}

function switchTodayTab(target) {
  $$("[data-today-tab]").forEach((button) => button.classList.toggle("active", button.dataset.todayTab === target));
  $$(".today-pane").forEach((pane) => pane.classList.toggle("active", pane.dataset.todayPane === target));
}

function tickSystemTime() {
  $("#systemTime").textContent = `系统时间：${nowText()}`;
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); } catch {}
  }
}

function init() {
  setupMoodOptions();
  setupPlanSelect();
  $("#entryDate").value = todayIso();
  $("#moodEntryDate").value = todayIso();
  $("#moodTime").value = nowTimeValue();
  $("#chartMonth").value = monthIso();
  tickSystemTime();
  setInterval(tickSystemTime, 30000);
  loadDate($("#entryDate").value);
  $("#entryDate").addEventListener("change", (event) => loadDate(event.target.value));
  $("#moodEntryDate").addEventListener("change", (event) => loadMoodDate(event.target.value));
  $("#activePlanSelect").addEventListener("change", (event) => switchActivePlan(event.target.value));
  $("#importPlanFile").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importPlanCycle(file);
  });
  $("#monthPlanSelect").addEventListener("change", () => renderPlanViews($("#entryDate").value || todayIso()));
  $$("[data-plan-tab]").forEach((button) => {
    button.addEventListener("click", () => switchPlanTab(button.dataset.planTab));
  });
  $$("[data-today-tab]").forEach((button) => {
    button.addEventListener("click", () => switchTodayTab(button.dataset.todayTab));
  });
  $("#addCustomTask").addEventListener("click", addCustomTask);
  $("#addErrand").addEventListener("click", addErrand);
  $("#chartMonth").addEventListener("change", () => {
    drawTrendChart();
    renderDayMoodOptions();
    drawDayMoodChart();
  });
  ["showCompletion", "showMood", "showWeight", "showExercise", "showCycle", "showBinge"].forEach((id) => {
    $(`#${id}`).addEventListener("change", drawTrendChart);
  });
  $("#pwaForm").addEventListener("submit", (event) => { event.preventDefault(); });
  $("#savePlan").addEventListener("click", savePlanOnly);
  $("#saveMood").addEventListener("click", saveMoodOnly);
  $("#saveWeight").addEventListener("click", () => saveHealthFields(["weight_kg", "waist_cm", "body_fat", "binge_eating"], "体重记录已保存"));
  $("#saveExercise").addEventListener("click", () => saveHealthFields(["exercise_minutes", "exercise_type"], "运动记录已保存"));
  $("#saveCycle").addEventListener("click", () => saveHealthFields(["period_start", "period_end", "cycle_length", "period_length"], "周期记录已保存"));
  $("#exportButton").addEventListener("click", exportBackup);
  $("#importFile").addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) importBackup(file);
  });
  $$(".bottom-nav button").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.target)));
  ["periodStart", "periodEnd", "cycleLength", "periodLength", "exerciseMinutes", "exerciseType", "bingeEating", "weightKg", "waistCm", "bodyFat"].forEach((id) => {
    $(`#${id}`).addEventListener("change", () => {
      const data = readForm();
      renderCycleSummary(data.entry_date);
      renderFitnessAdvice(data.entry_date);
      drawTrendChart();
    });
  });
  registerServiceWorker();
}

init();
