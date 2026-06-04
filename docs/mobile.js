importScriptsFallback();

function weekdayIndex() {
  const day = new Date($("#entryDate").value || todayIso()).getDay();
  return day === 0 ? 6 : day - 1;
}

function renderSuggestions(plan) {
  const index = weekdayIndex();
  const picks = plan.week_template
    .filter((cell) => cell.day_index === index)
    .filter((cell) => ["Skills & Growth", "Career & Transition", "Well-being & Energy"].includes(cell.category));
  $("#todaySuggestions").innerHTML = picks.map((cell) => `
    <div class="suggestion">
      <strong>${cell.category}</strong>
      <span>${cell.title}${cell.detail ? ` · ${cell.detail}` : ""}</span>
    </div>
  `).join("");
}

async function init() {
  const plan = await getPlan();
  await loadCurrentCheckin();
  renderSuggestions(plan);
  $("#entryDate").addEventListener("change", () => renderSuggestions(plan));
  attachCheckinForm("#mobileForm");
}

function importScriptsFallback() {
  const script = document.createElement("script");
  script.src = "/common.js";
  script.onload = init;
  document.head.appendChild(script);
}
