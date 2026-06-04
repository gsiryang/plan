const $ = (selector) => document.querySelector(selector);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getPlan() {
  const response = await fetch("/api/plan");
  return response.json();
}

async function getCheckin(date) {
  const response = await fetch(`/api/checkin?date=${encodeURIComponent(date)}`);
  return response.json();
}

async function saveCheckin(payload) {
  const response = await fetch("/api/checkin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

function readForm() {
  return {
    entry_date: $("#entryDate").value,
    week_focus: $("#weekFocus").value,
    top_one: $("#topOne").value,
    work_done: $("#workDone").checked,
    skill_done: $("#skillDone").checked,
    career_done: $("#careerDone").checked,
    wellbeing_done: $("#wellbeingDone").checked,
    reflection: $("#reflection").value,
  };
}

function fillForm(data) {
  $("#entryDate").value = data.entry_date;
  $("#weekFocus").value = data.week_focus || "";
  $("#topOne").value = data.top_one || "";
  $("#workDone").checked = Boolean(data.work_done);
  $("#skillDone").checked = Boolean(data.skill_done);
  $("#careerDone").checked = Boolean(data.career_done);
  $("#wellbeingDone").checked = Boolean(data.wellbeing_done);
  $("#reflection").value = data.reflection || "";
}

async function loadCurrentCheckin() {
  const entryDate = $("#entryDate");
  entryDate.value = entryDate.value || todayIso();
  fillForm(await getCheckin(entryDate.value));
}

function attachCheckinForm(formSelector) {
  const form = $(formSelector);
  const state = $("#saveState");
  $("#entryDate").addEventListener("change", loadCurrentCheckin);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.textContent = "保存中...";
    fillForm(await saveCheckin(readForm()));
    state.textContent = "已保存";
    setTimeout(() => {
      state.textContent = "";
    }, 1800);
  });
}
