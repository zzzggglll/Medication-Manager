const STORAGE_KEY = "chronic_medication_guardian_v2";
const STATUS_DELAY_MINUTES = 30;

const medicationForm = document.getElementById("medicationForm");
const seedDemoBtn = document.getElementById("seedDemoBtn");
const sourceImageInput = document.getElementById("sourceImage");
const sourceImageNameEl = document.getElementById("sourceImageName");
const sourceTypeSelect = document.getElementById("sourceType");
const recognitionModeSelect = document.getElementById("recognitionMode");
const recognizeBtn = document.getElementById("recognizeBtn");
const clearRecognitionBtn = document.getElementById("clearRecognitionBtn");
const recognitionResultEl = document.getElementById("recognitionResult");
const feedbackBarEl = document.getElementById("feedbackBar");
const patientSelectEl = document.getElementById("patientSelect");
const newPatientNameEl = document.getElementById("newPatientName");
const conditionSelectEl = document.getElementById("conditionSelect");
const customConditionInputEl = document.getElementById("customCondition");
const NEW_PATIENT_VALUE = "__new_patient__";
const CUSTOM_CONDITION_VALUE = "其他";
const PRESET_CONDITIONS = Array.from(conditionSelectEl.options)
  .map((option) => option.value.trim())
  .filter((value) => value && value !== CUSTOM_CONDITION_VALUE);

const frequencyPerDayEl = document.getElementById("frequencyPerDay");
const scheduleTimeGroupEl = document.getElementById("scheduleTimeGroup");

const pendingTimelineEl = document.getElementById("pendingTimeline");
const completedTimelineEl = document.getElementById("completedTimeline");
const healthLogForm = document.getElementById("healthLogForm");
const healthLogSummaryEl = document.getElementById("healthLogSummary");
const healthLogDateLabelEl = document.getElementById("healthLogDateLabel");
const bpSystolicEl = document.getElementById("bpSystolic");
const bpDiastolicEl = document.getElementById("bpDiastolic");
const bloodSugarValueEl = document.getElementById("bloodSugarValue");
const bloodSugarUnitEl = document.getElementById("bloodSugarUnit");
const bloodSugarTimingEl = document.getElementById("bloodSugarTiming");
const relapseStatusEl = document.getElementById("relapseStatus");
const bodyConditionStatusEl = document.getElementById("bodyConditionStatus");
const healthConditionNoteEl = document.getElementById("healthConditionNote");
const stockBoardEl = document.getElementById("stockBoard");
const followupBoardEl = document.getElementById("followupBoard");
const medicationListEl = document.getElementById("medicationList");
const medicationPlanTitleEl = document.getElementById("medicationPlanTitle");
const todayDateLabelEl = document.getElementById("todayDateLabel");
const pendingCountLabelEl = document.getElementById("pendingCountLabel");
const completedCountLabelEl = document.getElementById("completedCountLabel");
const contentEyebrowEl = document.getElementById("contentEyebrow");
const contentTitleEl = document.getElementById("contentTitle");
const contentSubtitleEl = document.getElementById("contentSubtitle");
const activePatientNameEl = document.getElementById("activePatientName");

const statPendingCountEl = document.getElementById("statPendingCount");
const statLowStockEl = document.getElementById("statLowStock");
const statFollowupEl = document.getElementById("statFollowup");
const viewTriggers = Array.from(document.querySelectorAll("[data-view-target]"));
const viewNavButtons = Array.from(document.querySelectorAll(".page-nav [data-view-target]"));
const viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
const VIEW_META = {
  homeView: {
    eyebrow: "首页",
    title: "首页",
    subtitle: "集中了解网站用途、主要功能和使用路径，更像一个清晰正式的慢病管理网站入口。",
  },
  planView: {
    eyebrow: "创建计划",
    title: "创建患者用药计划",
    subtitle: "为当前患者录入慢病类型、药品、提醒时间、库存和复诊周期，建立完整档案。",
  },
  reminderView: {
    eyebrow: "提醒与记录",
    title: "提醒与记录",
    subtitle: "把今日总览、服药提醒和健康记录放在同一处，方便按患者完成日常管理。",
  },
  stockView: {
    eyebrow: "库存提醒",
    title: "药量余量与续购提醒",
    subtitle: "直接查看当前患者各药品的剩余天数和续购风险，不再按疾病拆分页面。",
  },
  followupView: {
    eyebrow: "复诊提醒",
    title: "复诊与续方提醒",
    subtitle: "查看近期复诊节点和续方节奏，帮助家庭照护者提前安排时间。",
  },
  medicationView: {
    eyebrow: "用药计划",
    title: "患者用药计划",
    subtitle: "集中查看当前患者的全部药品信息、提醒时间、库存和备注。",
  },
};

const timelineItemTemplate = document.getElementById("timelineItemTemplate");
const stockCardTemplate = document.getElementById("stockCardTemplate");
const followupCardTemplate = document.getElementById("followupCardTemplate");
const medicationCardTemplate = document.getElementById("medicationCardTemplate");

const state = loadState();
let lastSelectedCondition = PRESET_CONDITIONS[0] || "高血压";
let lastSelectedPatientId = "";
let currentViewId = document.querySelector(".app-view--active")?.id || "homeView";

bootstrap();

function bootstrap() {
  setDefaultDates();
  renderPatientOptions(state.activePatientId);
  syncPlannerContext();
  attachEvents();
  renderApp();
}

function attachEvents() {
  medicationForm.addEventListener("submit", handleAddMedication);
  medicationForm.addEventListener("reset", () => {
    window.setTimeout(() => {
      syncPlannerContext();
    }, 0);
  });
  seedDemoBtn.addEventListener("click", seedDemoData);
  patientSelectEl.addEventListener("change", handlePatientChange);
  newPatientNameEl.addEventListener("blur", confirmNewPatient);
  newPatientNameEl.addEventListener("keydown", handleNewPatientKeydown);
  frequencyPerDayEl.addEventListener("change", handleFrequencyChange);
  conditionSelectEl.addEventListener("change", handleConditionChange);
  customConditionInputEl.addEventListener("blur", confirmCustomCondition);
  customConditionInputEl.addEventListener("keydown", handleCustomConditionKeydown);
  healthLogForm.addEventListener("submit", handleHealthLogSubmit);
  healthLogForm.addEventListener("reset", handleHealthLogReset);
  [
    bpSystolicEl,
    bpDiastolicEl,
    bloodSugarValueEl,
    bloodSugarUnitEl,
    bloodSugarTimingEl,
    relapseStatusEl,
    bodyConditionStatusEl,
    healthConditionNoteEl,
  ].forEach((field) => {
    field.addEventListener("input", handleHealthLogPreview);
    field.addEventListener("change", handleHealthLogPreview);
  });
  sourceImageInput.addEventListener("change", handleImageChange);
  recognizeBtn.addEventListener("click", handleRecognizeImage);
  clearRecognitionBtn.addEventListener("click", clearRecognitionResult);
  viewTriggers.forEach((trigger) => {
    trigger.addEventListener("click", handleViewTriggerClick);
  });
}

function loadState() {
  const fallback = {
    activePatientId: "",
    patients: [],
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    const patients = Array.isArray(parsed.patients)
      ? parsed.patients.map((patient) => normalizePatient(patient))
      : migrateLegacyPatients(parsed);
    const activePatientId = patients.some((patient) => patient.id === parsed.activePatientId)
      ? parsed.activePatientId
      : (patients[0]?.id || "");

    return {
      ...fallback,
      patients,
      activePatientId,
    };
  } catch (error) {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateLegacyPatients(parsed = {}) {
  const medications = (parsed.medications || []).map((item) => normalizeMedication(item, parsed.condition || ""));
  const hasLegacyContent = Boolean(
    parsed.patientName ||
    parsed.condition ||
    (parsed.customConditions || []).length ||
    medications.length ||
    Object.keys(parsed.reminders || {}).length ||
    Object.keys(parsed.healthLogs || {}).length
  );

  if (!hasLegacyContent) {
    return [];
  }

  return [
    normalizePatient({
      id: crypto.randomUUID(),
      name: parsed.patientName || "默认患者",
      condition: parsed.condition || "",
      customConditions: parsed.customConditions || [],
      medications,
      reminders: parsed.reminders || {},
      healthLogs: parsed.healthLogs || {},
    }),
  ];
}

function normalizePatient(patient = {}) {
  const medications = (patient.medications || []).map((item) => normalizeMedication(item, patient.condition || ""));

  return {
    id: patient.id || crypto.randomUUID(),
    name: (patient.name || "").trim() || "未命名患者",
    condition: (patient.condition || "").trim(),
    customConditions: normalizeCustomConditions(patient.customConditions || [], medications),
    medications,
    reminders: normalizeReminders(patient.reminders || {}),
    healthLogs: normalizeHealthLogs(patient.healthLogs || {}),
  };
}

function normalizeReminders(reminders = {}) {
  return Object.fromEntries(
    Object.entries(reminders).map(([dateKey, values]) => [dateKey, { ...(values || {}) }])
  );
}

function getActivePatient() {
  if (!state.patients.length) {
    return null;
  }

  const matchedPatient = state.patients.find((patient) => patient.id === state.activePatientId);
  if (matchedPatient) {
    return matchedPatient;
  }

  state.activePatientId = state.patients[0].id;
  return state.patients[0];
}

function createPatientProfile(name) {
  return normalizePatient({
    id: crypto.randomUUID(),
    name,
    condition: "",
    customConditions: [],
    medications: [],
    reminders: {},
    healthLogs: {},
  });
}

function renderPatientOptions(selectedPatientId = state.activePatientId) {
  patientSelectEl.innerHTML = "";

  state.patients.forEach((patient) => {
    patientSelectEl.add(new Option(patient.name, patient.id));
  });
  patientSelectEl.add(new Option("新建患者", NEW_PATIENT_VALUE));

  if (selectedPatientId && state.patients.some((patient) => patient.id === selectedPatientId)) {
    patientSelectEl.value = selectedPatientId;
    return;
  }

  patientSelectEl.value = NEW_PATIENT_VALUE;
}

function enterNewPatientMode(seedValue = "") {
  patientSelectEl.hidden = true;
  patientSelectEl.disabled = true;
  newPatientNameEl.hidden = false;
  newPatientNameEl.disabled = false;
  newPatientNameEl.value = seedValue;
  window.setTimeout(() => {
    newPatientNameEl.focus();
    newPatientNameEl.select();
  }, 0);
}

function exitNewPatientMode() {
  patientSelectEl.hidden = false;
  patientSelectEl.disabled = false;
  newPatientNameEl.hidden = true;
  newPatientNameEl.disabled = true;
  newPatientNameEl.value = "";
}

function handlePatientChange() {
  const patientId = patientSelectEl.value;
  if (patientId === NEW_PATIENT_VALUE) {
    enterNewPatientMode();
    return;
  }

  setActivePatient(patientId);
}

function handleNewPatientKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmNewPatient();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    newPatientNameEl.value = "";
    renderPatientOptions(lastSelectedPatientId);
    if (lastSelectedPatientId) {
      exitNewPatientMode();
    }
  }
}

function confirmNewPatient() {
  if (newPatientNameEl.disabled) {
    return;
  }

  const nextName = (newPatientNameEl.value || "").trim();
  if (!nextName) {
    renderPatientOptions(lastSelectedPatientId);
    if (lastSelectedPatientId) {
      exitNewPatientMode();
    }
    return;
  }

  const existingPatient = state.patients.find(
    (patient) => patient.name.toLowerCase() === nextName.toLowerCase()
  );
  const targetPatient = existingPatient || createPatientProfile(nextName);

  if (!existingPatient) {
    state.patients.push(targetPatient);
  }

  state.activePatientId = targetPatient.id;
  lastSelectedPatientId = targetPatient.id;
  saveState();
  renderPatientOptions(targetPatient.id);
  exitNewPatientMode();
  renderConditionOptions(getSelectedCondition() || targetPatient.condition || PRESET_CONDITIONS[0]);
  setSelectedCondition(getSelectedCondition() || targetPatient.condition || PRESET_CONDITIONS[0]);
  renderApp();
  setFeedback(existingPatient ? `已切换到 ${targetPatient.name} 的档案。` : `已创建 ${targetPatient.name} 的档案。`);
}

function setActivePatient(patientId, { skipSave = false, resetForm = true } = {}) {
  const nextPatient = state.patients.find((patient) => patient.id === patientId);
  if (!nextPatient) {
    return;
  }

  state.activePatientId = nextPatient.id;
  lastSelectedPatientId = nextPatient.id;
  renderPatientOptions(nextPatient.id);
  exitNewPatientMode();

  if (!skipSave) {
    saveState();
  }

  if (resetForm) {
    resetMedicationPlannerForm();
  } else {
    syncPlannerContext();
  }

  renderApp();
}

function syncPlannerContext() {
  const activePatient = getActivePatient();

  renderPatientOptions(activePatient?.id || "");
  if (activePatient) {
    lastSelectedPatientId = activePatient.id;
    exitNewPatientMode();
  } else {
    enterNewPatientMode();
  }

  renderConditionOptions(activePatient?.condition || PRESET_CONDITIONS[0]);
  setSelectedCondition(activePatient?.condition || PRESET_CONDITIONS[0] || "高血压");
  setDefaultDates();
  renderScheduleInputs();
}

function resetMedicationPlannerForm() {
  medicationForm.reset();
  clearRecognitionResult();
  syncPlannerContext();
}

function handleViewTriggerClick(event) {
  const viewId = event.currentTarget.dataset.viewTarget;
  if (!viewId) {
    return;
  }

  switchView(viewId);
}

function switchView(viewId) {
  if (!viewPanels.some((panel) => panel.id === viewId)) {
    return;
  }

  currentViewId = viewId;
  renderShell();
  document.querySelector(".content-header")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function renderShell(activePatient = getActivePatient()) {
  if (!viewPanels.length) {
    return;
  }

  if (!viewPanels.some((panel) => panel.id === currentViewId)) {
    currentViewId = "homeView";
  }

  viewPanels.forEach((panel) => {
    panel.classList.toggle("app-view--active", panel.id === currentViewId);
  });

  viewNavButtons.forEach((button) => {
    button.classList.toggle("page-nav__link--active", button.dataset.viewTarget === currentViewId);
  });

  renderContentHeader(activePatient);
}

function renderContentHeader(activePatient) {
  const meta = getViewMeta(currentViewId, activePatient);
  contentEyebrowEl.textContent = meta.eyebrow;
  contentTitleEl.textContent = meta.title;
  contentSubtitleEl.textContent = meta.subtitle;
  activePatientNameEl.textContent = activePatient?.name || "未选择患者";
}

function getViewMeta(viewId, activePatient) {
  if (viewId === "medicationView") {
    return {
      ...VIEW_META.medicationView,
      title: activePatient ? `${activePatient.name}的用药计划` : VIEW_META.medicationView.title,
    };
  }

  return VIEW_META[viewId] || VIEW_META.homeView;
}

function normalizeCustomConditions(customConditions = [], medications = []) {
  const seen = new Set();

  return [...customConditions, ...medications.map((item) => item.condition)]
    .map((value) => (value || "").trim())
    .filter((value) => value && value !== CUSTOM_CONDITION_VALUE && !PRESET_CONDITIONS.includes(value))
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function normalizeHealthLogs(healthLogs = {}) {
  return Object.fromEntries(
    Object.entries(healthLogs).map(([dateKey, log]) => [dateKey, normalizeHealthLog(log)])
  );
}

function normalizeHealthLog(log = {}) {
  return {
    bloodPressureSystolic: toNumberOrBlank(log.bloodPressureSystolic),
    bloodPressureDiastolic: toNumberOrBlank(log.bloodPressureDiastolic),
    bloodSugarValue: toNumberOrBlank(log.bloodSugarValue),
    bloodSugarUnit: log.bloodSugarUnit === "mg" ? "mg" : "mmol",
    bloodSugarTiming: log.bloodSugarTiming === "postmeal" ? "postmeal" : "fasting",
    relapseStatus: (log.relapseStatus || "").trim(),
    bodyConditionStatus: (log.bodyConditionStatus || "").trim(),
    note: (log.note || "").trim(),
    updatedAt: log.updatedAt || "",
  };
}

function toNumberOrBlank(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return "";
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : "";
}

function normalizeMedication(item, fallbackCondition = "") {
  const frequency = Number(item.frequencyPerDay || (item.scheduleTimes || []).length || 2);
  const scheduleTimes = normalizeScheduleTimes(item.scheduleTimes || defaultScheduleTimes(frequency), frequency);
  return {
    ...item,
    condition: (item.condition || fallbackCondition || "未分类").trim(),
    frequencyPerDay: frequency,
    dosePerTake: Number(item.dosePerTake || 1),
    stockTotal: Number(item.stockTotal || 0),
    refillThresholdDays: Number(item.refillThresholdDays || 7),
    followupCycleDays: Number(item.followupCycleDays || 30),
    scheduleTimes,
  };
}

function setDefaultDates() {
  const today = formatDateInput(new Date());
  const thirtyDaysAgo = formatDateInput(addDays(new Date(), -30));

  if (!document.getElementById("startDate").value) {
    document.getElementById("startDate").value = today;
  }
  if (!document.getElementById("lastVisitDate").value) {
    document.getElementById("lastVisitDate").value = thirtyDaysAgo;
  }
}

function handleConditionChange() {
  const nextCondition = (conditionSelectEl.value || "").trim();
  if (nextCondition === CUSTOM_CONDITION_VALUE) {
    enterCustomConditionMode();
    return;
  }

  lastSelectedCondition = nextCondition || lastSelectedCondition;
}

function handleCustomConditionKeydown(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmCustomCondition();
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    customConditionInputEl.value = "";
    renderConditionOptions(lastSelectedCondition || PRESET_CONDITIONS[0]);
    exitCustomConditionMode();
  }
}

function enterCustomConditionMode(seedValue = "") {
  conditionSelectEl.hidden = true;
  conditionSelectEl.disabled = true;
  customConditionInputEl.hidden = false;
  customConditionInputEl.disabled = false;
  customConditionInputEl.value = seedValue;
  window.setTimeout(() => {
    customConditionInputEl.focus();
    customConditionInputEl.select();
  }, 0);
}

function exitCustomConditionMode() {
  conditionSelectEl.hidden = false;
  conditionSelectEl.disabled = false;
  customConditionInputEl.hidden = true;
  customConditionInputEl.disabled = true;
}

function renderConditionOptions(selectedCondition = "") {
  const activePatient = getActivePatient();
  const options = [...PRESET_CONDITIONS, ...(activePatient?.customConditions || [])];
  const nextSelected = options.includes(selectedCondition) ? selectedCondition : (PRESET_CONDITIONS[0] || "");

  conditionSelectEl.innerHTML = "";
  options.forEach((condition) => {
    conditionSelectEl.add(new Option(condition, condition));
  });
  conditionSelectEl.add(new Option(CUSTOM_CONDITION_VALUE, CUSTOM_CONDITION_VALUE));

  if (nextSelected) {
    conditionSelectEl.value = nextSelected;
  }
}

function ensureConditionOption(condition) {
  const nextCondition = (condition || "").trim();
  const activePatient = getActivePatient();
  if (!nextCondition || nextCondition === CUSTOM_CONDITION_VALUE) {
    return PRESET_CONDITIONS[0] || "未分类";
  }

  if (PRESET_CONDITIONS.includes(nextCondition)) {
    return nextCondition;
  }

  const existingCustom = (activePatient?.customConditions || []).find(
    (item) => item.toLowerCase() === nextCondition.toLowerCase()
  );

  if (existingCustom) {
    return existingCustom;
  }

  if (activePatient) {
    activePatient.customConditions.push(nextCondition);
  }
  return nextCondition;
}

function confirmCustomCondition() {
  if (customConditionInputEl.disabled) {
    return;
  }

  const nextCondition = (customConditionInputEl.value || "").trim();
  if (!nextCondition) {
    renderConditionOptions(lastSelectedCondition || PRESET_CONDITIONS[0]);
    exitCustomConditionMode();
    return;
  }

  const resolvedCondition = ensureConditionOption(nextCondition);
  renderConditionOptions(resolvedCondition);
  conditionSelectEl.value = resolvedCondition;
  lastSelectedCondition = resolvedCondition;
  customConditionInputEl.value = "";
  exitCustomConditionMode();
  saveState();
}

function setSelectedCondition(condition) {
  const nextCondition = (condition || "").trim();
  if (!nextCondition) {
    renderConditionOptions(PRESET_CONDITIONS[0]);
    conditionSelectEl.value = PRESET_CONDITIONS[0] || "未分类";
    lastSelectedCondition = conditionSelectEl.value;
    customConditionInputEl.value = "";
    exitCustomConditionMode();
    return;
  }

  if (nextCondition === CUSTOM_CONDITION_VALUE) {
    enterCustomConditionMode();
    return;
  }

  const resolvedCondition = ensureConditionOption(nextCondition);
  renderConditionOptions(resolvedCondition);
  conditionSelectEl.value = resolvedCondition;
  lastSelectedCondition = resolvedCondition;
  customConditionInputEl.value = "";
  exitCustomConditionMode();
}

function getSelectedCondition() {
  if (!customConditionInputEl.disabled) {
    return (customConditionInputEl.value || lastSelectedCondition || "未分类").trim();
  }

  return (conditionSelectEl.value || "未分类").trim();
}

function handleFrequencyChange() {
  const currentTimes = getCurrentScheduleTimes();
  renderScheduleInputs(currentTimes);
}

function renderScheduleInputs(existingTimes = []) {
  const frequency = Number(frequencyPerDayEl.value || 2);
  const times = normalizeScheduleTimes(existingTimes, frequency);
  scheduleTimeGroupEl.innerHTML = "";

  for (let i = 0; i < frequency; i += 1) {
    const wrapper = document.createElement("label");
    wrapper.className = "schedule-time-item";
    wrapper.innerHTML = `
      <span>第 ${i + 1} 次提醒</span>
      <input type="time" class="schedule-time-input" value="${times[i]}">
    `;
    scheduleTimeGroupEl.appendChild(wrapper);
  }
}

function getCurrentScheduleTimes() {
  return Array.from(document.querySelectorAll(".schedule-time-input")).map((input) => input.value);
}

function normalizeScheduleTimes(times, frequency) {
  const defaults = defaultScheduleTimes(frequency);
  const next = [];

  for (let i = 0; i < frequency; i += 1) {
    next.push(times[i] || defaults[i]);
  }

  return next.sort();
}

function defaultScheduleTimes(frequency) {
  const schedules = {
    1: ["08:00"],
    2: ["08:00", "20:00"],
    3: ["08:00", "13:00", "20:00"],
    4: ["08:00", "12:00", "18:00", "22:00"],
  };
  return schedules[frequency] || schedules[2];
}

function handleImageChange() {
  const file = sourceImageInput.files[0];
  sourceImageNameEl.textContent = file ? file.name : "支持处方照片、药盒照片、截图";
}

function handleRecognizeImage() {
  const file = sourceImageInput.files[0];
  if (!file) {
    setFeedback("请先上传一张处方图或药盒图片。");
    return;
  }

  const recognition = recognizeMedicationFromImage(file.name, sourceTypeSelect.value, recognitionModeSelect.value);
  applyRecognitionToForm(recognition);
  renderRecognitionResult(recognition, file.name);
  setFeedback("图片识别完成，表单已自动预填，请核对后再保存。");
}

function recognizeMedicationFromImage(fileName, sourceType, mode) {
  const lower = fileName.toLowerCase();
  const templates = [
    {
      keywords: ["缬沙坦", "valsartan"],
      data: {
        condition: "高血压",
        medName: "缬沙坦胶囊",
        medPurpose: "降压",
        dosePerTake: 1,
        doseUnit: "粒",
        frequencyPerDay: 1,
        scheduleTimes: ["08:00"],
        stockTotal: 30,
        refillThresholdDays: 7,
        followupCycleDays: 30,
        medNote: "建议早餐后服用，并继续记录血压。",
      },
    },
    {
      keywords: ["二甲双胍", "metformin"],
      data: {
        condition: "2型糖尿病",
        medName: "二甲双胍片",
        medPurpose: "控糖",
        dosePerTake: 1,
        doseUnit: "片",
        frequencyPerDay: 2,
        scheduleTimes: ["08:00", "20:00"],
        stockTotal: 60,
        refillThresholdDays: 5,
        followupCycleDays: 30,
        medNote: "建议餐后服用，减少胃肠不适。",
      },
    },
    {
      keywords: ["阿托伐他汀", "atorvastatin"],
      data: {
        condition: "高脂血症",
        medName: "阿托伐他汀钙片",
        medPurpose: "降脂",
        dosePerTake: 1,
        doseUnit: "片",
        frequencyPerDay: 1,
        scheduleTimes: ["21:00"],
        stockTotal: 30,
        refillThresholdDays: 7,
        followupCycleDays: 30,
        medNote: "建议晚间服用，按时复查血脂。",
      },
    },
  ];

  const matched = templates.find((item) => item.keywords.some((keyword) => lower.includes(keyword)));
  if (matched) {
    return {
      ...matched.data,
      sourceType,
      confidence: mode === "smart" ? "高" : "中",
    };
  }

  const genericBySource = sourceType === "prescription"
    ? {
        condition: "其他",
        medName: "处方药品（待确认）",
        medPurpose: "根据处方图片识别",
        dosePerTake: 1,
        doseUnit: "片",
        frequencyPerDay: 2,
        scheduleTimes: ["08:00", "20:00"],
        stockTotal: 30,
        refillThresholdDays: 7,
        followupCycleDays: 30,
        medNote: "AI 已从处方图片提取基础字段，请在保存前核对药名、剂量和频次。",
      }
    : {
        condition: "其他",
        medName: "药盒药品（待确认）",
        medPurpose: "根据药盒图片识别",
        dosePerTake: 1,
        doseUnit: "片",
        frequencyPerDay: 1,
        scheduleTimes: ["08:00"],
        stockTotal: 30,
        refillThresholdDays: 7,
        followupCycleDays: 30,
        medNote: "AI 已从药盒图片提取基础字段，请补全医嘱和具体提醒时间。",
      };

  return {
    ...genericBySource,
    sourceType,
    confidence: mode === "smart" ? "中" : "低",
  };
}

function applyRecognitionToForm(recognition) {
  document.getElementById("medName").value = recognition.medName;
  document.getElementById("medPurpose").value = recognition.medPurpose;
  document.getElementById("dosePerTake").value = recognition.dosePerTake;
  document.getElementById("doseUnit").value = recognition.doseUnit;
  document.getElementById("frequencyPerDay").value = String(recognition.frequencyPerDay);
  document.getElementById("stockTotal").value = recognition.stockTotal;
  document.getElementById("refillThresholdDays").value = recognition.refillThresholdDays;
  document.getElementById("followupCycleDays").value = recognition.followupCycleDays;
  document.getElementById("medNote").value = recognition.medNote;
  setSelectedCondition(recognition.condition || "其他");
  renderScheduleInputs(recognition.scheduleTimes);
}

function renderRecognitionResult(recognition, fileName) {
  recognitionResultEl.className = "recognition-result";
  recognitionResultEl.innerHTML = `
    <strong>识别完成：${fileName}</strong>
    <div>来源：${recognition.sourceType === "prescription" ? "处方图片" : "药盒图片"} · 置信度：${recognition.confidence}</div>
    <div>药品：${recognition.medName}</div>
    <div>剂量：${recognition.dosePerTake}${recognition.doseUnit} / 次 · ${recognition.frequencyPerDay} 次 / 天</div>
    <div>提醒时间：${recognition.scheduleTimes.join("、")}</div>
    <div>说明：${recognition.medNote}</div>
  `;
}

function clearRecognitionResult() {
  sourceImageInput.value = "";
  sourceImageNameEl.textContent = "支持处方照片、药盒照片、截图";
  recognitionResultEl.className = "recognition-result empty-state";
  recognitionResultEl.textContent = "还没有识别结果。上传图片后，这里会显示识别到的药品名称、剂量、频次和提醒时间建议。";
}

function handleAddMedication(event) {
  event.preventDefault();
  confirmNewPatient();
  confirmCustomCondition();

  const activePatient = getActivePatient();
  if (!activePatient) {
    setFeedback("请先选择或新建患者档案。");
    return;
  }

  const condition = getSelectedCondition();
  const medName = document.getElementById("medName").value.trim();
  const medPurpose = document.getElementById("medPurpose").value.trim();
  const dosePerTake = Number(document.getElementById("dosePerTake").value);
  const doseUnit = document.getElementById("doseUnit").value;
  const frequencyPerDay = Number(document.getElementById("frequencyPerDay").value);
  const scheduleTimes = normalizeScheduleTimes(getCurrentScheduleTimes(), frequencyPerDay);
  const startDate = document.getElementById("startDate").value;
  const stockTotal = Number(document.getElementById("stockTotal").value);
  const refillThresholdDays = Number(document.getElementById("refillThresholdDays").value);
  const lastVisitDate = document.getElementById("lastVisitDate").value;
  const followupCycleDays = Number(document.getElementById("followupCycleDays").value);
  const medNote = document.getElementById("medNote").value.trim();

  if (!medName || !startDate || !lastVisitDate || scheduleTimes.some((time) => !time)) {
    setFeedback("请补全药品名称、日期和每次提醒时间。");
    return;
  }

  const duplicate = activePatient.medications.find((item) =>
    item.name.toLowerCase() === medName.toLowerCase() && computeDaysLeft(item) > 0
  );

  const medication = normalizeMedication({
    id: crypto.randomUUID(),
    condition: condition || activePatient.condition || "未分类",
    name: medName,
    purpose: medPurpose,
    dosePerTake,
    doseUnit,
    frequencyPerDay,
    scheduleTimes,
    startDate,
    stockTotal,
    refillThresholdDays,
    lastVisitDate,
    followupCycleDays,
    note: medNote,
    createdAt: new Date().toISOString(),
  });

  activePatient.condition = condition || activePatient.condition;
  activePatient.medications.unshift(medication);
  saveState();

  resetMedicationPlannerForm();

  setFeedback(
    duplicate
      ? `已加入计划，但发现 ${medName} 可能存在重复购药风险，建议先核对现有库存。`
      : `${medName} 已加入用药计划。`
  );
  renderApp();
}

function seedDemoData() {
  let activePatient = getActivePatient();
  if (!activePatient) {
    activePatient = createPatientProfile("王阿姨");
    state.patients.push(activePatient);
    state.activePatientId = activePatient.id;
    lastSelectedPatientId = activePatient.id;
  }

  if (activePatient.medications.length > 0 && !window.confirm("加载演示数据会在现有数据基础上追加示例，是否继续？")) {
    return;
  }

  activePatient.name = activePatient.name || "王阿姨";
  activePatient.condition = activePatient.condition || "高血压";

  const demoMeds = [
    {
      id: crypto.randomUUID(),
      condition: "高血压",
      name: "缬沙坦胶囊",
      purpose: "降压",
      dosePerTake: 1,
      doseUnit: "粒",
      frequencyPerDay: 1,
      scheduleTimes: ["08:00"],
      startDate: formatDateInput(addDays(new Date(), -20)),
      stockTotal: 30,
      refillThresholdDays: 7,
      lastVisitDate: formatDateInput(addDays(new Date(), -20)),
      followupCycleDays: 30,
      note: "早餐后服用，建议配合居家血压记录。",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      condition: "2型糖尿病",
      name: "二甲双胍片",
      purpose: "控糖",
      dosePerTake: 1,
      doseUnit: "片",
      frequencyPerDay: 2,
      scheduleTimes: ["08:00", "20:00"],
      startDate: formatDateInput(addDays(new Date(), -18)),
      stockTotal: 60,
      refillThresholdDays: 5,
      lastVisitDate: formatDateInput(addDays(new Date(), -18)),
      followupCycleDays: 30,
      note: "早晚餐后服用，避免空腹。",
      createdAt: new Date().toISOString(),
    },
  ].map(normalizeMedication);

  const todayKey = getTodayKey();
  activePatient.reminders[todayKey] = activePatient.reminders[todayKey] || {};

  demoMeds.forEach((item) => {
    activePatient.medications.push(item);
    activePatient.reminders[todayKey][reminderKey(item.id, item.scheduleTimes[0])] = "done";
  });

  saveState();
  resetMedicationPlannerForm();
  setFeedback("演示数据已载入。");
  renderApp();
}

function renderApp() {
  const activePatient = getActivePatient();
  todayDateLabelEl.textContent = formatHumanDate(new Date());
  healthLogDateLabelEl.textContent = formatHumanDate(new Date());
  medicationPlanTitleEl.textContent = activePatient ? `${activePatient.name}的用药计划` : "患者用药计划";
  renderHealthLog();
  renderPendingAndCompletedTimelines();
  renderStockBoard();
  renderFollowups();
  renderMedicationList();
  renderStats();
  renderShell(activePatient);
}

function renderHealthLog() {
  const activePatient = getActivePatient();
  if (!activePatient) {
    const emptyLog = normalizeHealthLog();
    populateHealthLogForm(emptyLog);
    healthLogSummaryEl.className = "health-log-summary empty-state";
    healthLogSummaryEl.textContent = "请先新建患者档案，再记录今日血压、血糖和身体状况。";
    return;
  }

  const log = getTodayHealthLog();
  populateHealthLogForm(log);
  renderHealthLogSummary(log);
}

function getTodayHealthLog() {
  const activePatient = getActivePatient();
  return normalizeHealthLog(activePatient?.healthLogs[getTodayKey()] || {});
}

function populateHealthLogForm(log) {
  bpSystolicEl.value = log.bloodPressureSystolic === "" ? "" : String(log.bloodPressureSystolic);
  bpDiastolicEl.value = log.bloodPressureDiastolic === "" ? "" : String(log.bloodPressureDiastolic);
  bloodSugarValueEl.value = log.bloodSugarValue === "" ? "" : String(log.bloodSugarValue);
  bloodSugarUnitEl.value = log.bloodSugarUnit;
  bloodSugarTimingEl.value = log.bloodSugarTiming;
  relapseStatusEl.value = log.relapseStatus;
  bodyConditionStatusEl.value = log.bodyConditionStatus;
  healthConditionNoteEl.value = log.note;
}

function readHealthLogForm() {
  return normalizeHealthLog({
    bloodPressureSystolic: bpSystolicEl.value,
    bloodPressureDiastolic: bpDiastolicEl.value,
    bloodSugarValue: bloodSugarValueEl.value,
    bloodSugarUnit: bloodSugarUnitEl.value,
    bloodSugarTiming: bloodSugarTimingEl.value,
    relapseStatus: relapseStatusEl.value,
    bodyConditionStatus: bodyConditionStatusEl.value,
    note: healthConditionNoteEl.value,
  });
}

function hasHealthLogContent(log) {
  return [
    log.bloodPressureSystolic,
    log.bloodPressureDiastolic,
    log.bloodSugarValue,
    log.relapseStatus,
    log.bodyConditionStatus,
    log.note,
  ].some((value) => value !== "" && value !== null && typeof value !== "undefined");
}

function handleHealthLogPreview() {
  if (!getActivePatient()) {
    healthLogSummaryEl.className = "health-log-summary empty-state";
    healthLogSummaryEl.textContent = "请先新建患者档案，再记录今日血压、血糖和身体状况。";
    return;
  }

  renderHealthLogSummary(readHealthLogForm());
}

function handleHealthLogSubmit(event) {
  event.preventDefault();

  const activePatient = getActivePatient();
  if (!activePatient) {
    setFeedback("请先选择或新建患者档案。");
    return;
  }

  const log = readHealthLogForm();
  const todayKey = getTodayKey();
  if (!hasHealthLogContent(log)) {
    delete activePatient.healthLogs[todayKey];
    saveState();
    renderHealthLogSummary(log);
    setFeedback("今日健康记录已清空。");
    return;
  }

  activePatient.healthLogs[todayKey] = {
    ...log,
    updatedAt: new Date().toISOString(),
  };
  saveState();
  renderHealthLogSummary(activePatient.healthLogs[todayKey]);
  setFeedback("今日健康记录已保存。");
}

function handleHealthLogReset() {
  window.setTimeout(() => {
    const activePatient = getActivePatient();
    if (!activePatient) {
      return;
    }

    delete activePatient.healthLogs[getTodayKey()];
    const emptyLog = normalizeHealthLog();
    populateHealthLogForm(emptyLog);
    renderHealthLogSummary(emptyLog);
    saveState();
    setFeedback("今日健康记录已清空。");
  }, 0);
}

function renderHealthLogSummary(log) {
  if (!hasHealthLogContent(log)) {
    healthLogSummaryEl.className = "health-log-summary empty-state";
    healthLogSummaryEl.textContent = "还没有今日健康记录。录入血压、血糖、是否复发和身体状况后，这里会自动汇总状态。";
    return;
  }

  const pressureSummary = summarizeBloodPressure(log);
  const sugarSummary = summarizeBloodSugar(log);
  const relapseSummary = summarizeRelapse(log.relapseStatus);
  const bodySummary = summarizeBodyCondition(log.bodyConditionStatus);
  const cards = [
    renderHealthStatCard({
      title: "今日血压",
      value: pressureSummary.value,
      statusLabel: pressureSummary.statusLabel,
      statusClassName: pressureSummary.statusClassName,
      meta: pressureSummary.meta,
    }),
    renderHealthStatCard({
      title: "今日血糖",
      value: sugarSummary.value,
      statusLabel: sugarSummary.statusLabel,
      statusClassName: sugarSummary.statusClassName,
      meta: sugarSummary.meta,
    }),
    renderHealthStatCard({
      title: "复发情况",
      value: relapseSummary.value,
      statusLabel: relapseSummary.statusLabel,
      statusClassName: relapseSummary.statusClassName,
      meta: relapseSummary.meta,
    }),
    renderHealthStatCard({
      title: "身体状况",
      value: bodySummary.value,
      statusLabel: bodySummary.statusLabel,
      statusClassName: bodySummary.statusClassName,
      meta: bodySummary.meta,
    }),
  ];

  if (log.note) {
    cards.push(
      renderHealthStatCard({
        title: "补充记录",
        value: log.note,
        statusLabel: "已记录",
        statusClassName: "pill--muted",
        meta: "用于补充描述今天的症状、感受或波动情况。",
        cardClassName: "health-stat-card--note",
      })
    );
  }

  const summaryMeta = log.updatedAt ? `最后保存 ${formatTimeText(log.updatedAt)}` : "实时预览";
  healthLogSummaryEl.className = "health-log-summary";
  healthLogSummaryEl.innerHTML = `
    <div class="health-log-summary__head">
      <div>
        <h3>今日状态概览</h3>
        <p>血压和血糖会按常见居家记录范围自动标注偏低、正常或偏高，便于连续追踪。</p>
      </div>
      <span class="section-meta">${summaryMeta}</span>
    </div>
    <div class="health-stat-grid">
      ${cards.join("")}
    </div>
  `;
}

function renderHealthStatCard({
  title,
  value,
  statusLabel,
  statusClassName,
  meta,
  cardClassName = "",
}) {
  const cardClass = ["health-stat-card", cardClassName].filter(Boolean).join(" ");
  const pillClass = ["pill", statusClassName].filter(Boolean).join(" ");

  return `
    <article class="${cardClass}">
      <div class="health-stat-card__header">
        <h3>${escapeHtml(title)}</h3>
        <span class="${pillClass}">${escapeHtml(statusLabel)}</span>
      </div>
      <div class="health-stat-card__value">${escapeHtml(value)}</div>
      <div class="health-stat-card__meta">${escapeHtml(meta)}</div>
    </article>
  `;
}

function summarizeBloodPressure(log) {
  const systolic = log.bloodPressureSystolic;
  const diastolic = log.bloodPressureDiastolic;

  if (systolic === "" && diastolic === "") {
    return {
      value: "未记录",
      statusLabel: "待记录",
      statusClassName: "pill--muted",
      meta: "建议每天固定时段记录一次收缩压 / 舒张压。",
    };
  }

  const pressureValue = `${systolic === "" ? "--" : systolic} / ${diastolic === "" ? "--" : diastolic} mmHg`;
  if (systolic === "" || diastolic === "") {
    return {
      value: pressureValue,
      statusLabel: "待补全",
      statusClassName: "pill--muted",
      meta: "请补全收缩压和舒张压后再自动判断状态。",
    };
  }

  if (systolic < 90 || diastolic < 60) {
    return {
      value: pressureValue,
      statusLabel: "偏低",
      statusClassName: "pill--warning",
      meta: "低于常见居家血压范围，建议继续观察今天的波动情况。",
    };
  }

  if (systolic < 120 && diastolic < 80) {
    return {
      value: pressureValue,
      statusLabel: "正常",
      statusClassName: "",
      meta: "处于常见居家血压范围内。",
    };
  }

  return {
    value: pressureValue,
    statusLabel: "偏高",
    statusClassName: "pill--danger",
    meta: "高于常见居家血压范围，建议结合症状持续记录。",
  };
}

function summarizeBloodSugar(log) {
  const value = log.bloodSugarValue;
  const timingLabel = log.bloodSugarTiming === "postmeal" ? "餐后 2 小时" : "空腹 / 餐前";

  if (value === "") {
    return {
      value: "未记录",
      statusLabel: "待记录",
      statusClassName: "pill--muted",
      meta: `支持 ${timingLabel} 记录，录入后会自动标注状态。`,
    };
  }

  const numericValue = Number(value);
  const mgDlValue = log.bloodSugarUnit === "mg" ? numericValue : numericValue * 18;
  const displayValue = `${formatBloodSugarValue(numericValue, log.bloodSugarUnit)} ${log.bloodSugarUnit === "mg" ? "mg/dL" : "mmol/L"}`;
  const highThreshold = log.bloodSugarTiming === "postmeal" ? 180 : 130;

  if (mgDlValue < 70) {
    return {
      value: displayValue,
      statusLabel: "偏低",
      statusClassName: "pill--warning",
      meta: `${timingLabel}记录，低于常见血糖范围。`,
    };
  }

  if (mgDlValue > highThreshold || (log.bloodSugarTiming === "postmeal" && mgDlValue >= 180)) {
    return {
      value: displayValue,
      statusLabel: "偏高",
      statusClassName: "pill--danger",
      meta: `${timingLabel}记录，高于常见血糖范围。`,
    };
  }

  return {
    value: displayValue,
    statusLabel: "正常",
    statusClassName: "",
    meta: `${timingLabel}记录，处于常见血糖范围内。`,
  };
}

function summarizeRelapse(status) {
  const statusMap = {
    none: {
      value: "无复发",
      statusLabel: "稳定",
      statusClassName: "",
      meta: "今天未记录到明显复发或异常波动。",
    },
    fluctuating: {
      value: "有波动",
      statusLabel: "留意",
      statusClassName: "pill--warning",
      meta: "今天有轻微异常波动，建议继续结合症状观察。",
    },
    relapse: {
      value: "有复发",
      statusLabel: "关注",
      statusClassName: "pill--danger",
      meta: "今天出现复发或明显异常波动，建议重点标注。",
    },
  };

  return statusMap[status] || {
    value: "未记录",
    statusLabel: "待记录",
    statusClassName: "pill--muted",
    meta: "可记录今天是否出现复发、反复发作或明显异常。",
  };
}

function summarizeBodyCondition(status) {
  const statusMap = {
    good: {
      value: "状态良好",
      statusLabel: "良好",
      statusClassName: "",
      meta: "今天整体感受较好，精神和体力状态较稳定。",
    },
    stable: {
      value: "整体平稳",
      statusLabel: "平稳",
      statusClassName: "",
      meta: "今天身体状态总体平稳，没有明显不适。",
    },
    average: {
      value: "一般",
      statusLabel: "一般",
      statusClassName: "pill--warning",
      meta: "今天有轻微不适或状态一般，建议继续观察。",
    },
    unwell: {
      value: "有些不适",
      statusLabel: "不适",
      statusClassName: "pill--warning",
      meta: "今天有不适感，可在补充记录里写下具体表现。",
    },
    worse: {
      value: "状态欠佳",
      statusLabel: "欠佳",
      statusClassName: "pill--danger",
      meta: "今天状态较差，建议重点记录波动时间和表现。",
    },
  };

  return statusMap[status] || {
    value: "未记录",
    statusLabel: "待记录",
    statusClassName: "pill--muted",
    meta: "可记录今天整体身体感受，例如平稳、一般或状态欠佳。",
  };
}

function renderPendingAndCompletedTimelines() {
  const activePatient = getActivePatient();
  if (!activePatient) {
    pendingCountLabelEl.textContent = "0 项";
    completedCountLabelEl.textContent = "0 项";
    pendingTimelineEl.className = "timeline empty-state";
    completedTimelineEl.className = "timeline empty-state";
    pendingTimelineEl.textContent = "请先新建患者档案。";
    completedTimelineEl.textContent = "请先新建患者档案。";
    return;
  }

  const entries = buildTodayEntries();
  const pendingEntries = entries.filter((entry) => getReminderStatus(reminderKey(entry.medication.id, entry.time)) !== "done");
  const completedEntries = entries.filter((entry) => getReminderStatus(reminderKey(entry.medication.id, entry.time)) === "done");

  pendingCountLabelEl.textContent = `${pendingEntries.length} 项`;
  completedCountLabelEl.textContent = `${completedEntries.length} 项`;

  renderTimelineGroup(
    pendingTimelineEl,
    pendingEntries,
    "还没有待完成提醒。",
    (actionsEl, entry) => {
      const doneBtn = createMiniButton("已服药", "mini-btn mini-btn--done");
      doneBtn.addEventListener("click", () => {
        setReminderStatus(reminderKey(entry.medication.id, entry.time), "done");
        setFeedback(`已记录 ${entry.medication.name} 在 ${entry.time} 的服药完成情况。`);
        renderApp();
      });

      const laterBtn = createMiniButton("稍后提醒", "mini-btn mini-btn--ghost");
      laterBtn.addEventListener("click", () => {
        setReminderStatus(reminderKey(entry.medication.id, entry.time), "later");
        setFeedback(`已将 ${entry.medication.name} 设置为稍后 ${STATUS_DELAY_MINUTES} 分钟提醒。`);
        renderApp();
      });

      actionsEl.append(doneBtn, laterBtn);
    }
  );

  renderTimelineGroup(
    completedTimelineEl,
    completedEntries,
    "今天还没有完成记录。",
    (actionsEl, entry) => {
      const undoBtn = createMiniButton("撤销完成", "mini-btn mini-btn--undo");
      undoBtn.addEventListener("click", () => {
        setReminderStatus(reminderKey(entry.medication.id, entry.time), "pending");
        setFeedback(`已将 ${entry.medication.name} 的记录恢复为待完成。`);
        renderApp();
      });
      actionsEl.appendChild(undoBtn);
    }
  );
}

function renderTimelineGroup(container, entries, emptyText, bindActions) {
  container.innerHTML = "";

  if (entries.length === 0) {
    container.className = "timeline empty-state";
    container.textContent = emptyText;
    return;
  }

  container.className = "timeline";
  entries
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((entry) => {
      const node = timelineItemTemplate.content.firstElementChild.cloneNode(true);
      const status = getReminderStatus(reminderKey(entry.medication.id, entry.time));
      const pill = node.querySelector(".pill");
      const actionsEl = node.querySelector(".timeline-item__actions");

      node.querySelector(".timeline-item__time").textContent = entry.time;
      node.querySelector("h3").textContent = entry.medication.name;
      node.querySelector(".timeline-item__meta").textContent = `${entry.medication.dosePerTake}${entry.medication.doseUnit} / 次 · ${entry.medication.purpose || "长期管理"} · 库存约 ${computeRemainingStock(entry.medication)}${entry.medication.doseUnit}`;
      pill.textContent = statusToLabel(status);
      pill.className = `pill ${statusToClass(status)}`.trim();
      node.classList.toggle("timeline-item--done", status === "done");

      bindActions(actionsEl, entry);
      container.appendChild(node);
    });
}

function renderStockBoard() {
  stockBoardEl.innerHTML = "";
  const activePatient = getActivePatient();

  if (!activePatient) {
    stockBoardEl.className = "board-grid empty-state";
    stockBoardEl.textContent = "请先新建患者档案。";
    return;
  }

  if (activePatient.medications.length === 0) {
    stockBoardEl.className = "board-grid empty-state";
    stockBoardEl.textContent = "添加用药计划后，这里会自动估算剩余天数与断药风险。";
    return;
  }

  stockBoardEl.className = "board-grid";
  activePatient.medications
    .slice()
    .sort((a, b) => computeDaysLeft(a) - computeDaysLeft(b) || a.name.localeCompare(b.name, "zh-CN"))
    .forEach((item) => {
      const node = stockCardTemplate.content.firstElementChild.cloneNode(true);
      const daysLeft = computeDaysLeft(item);
      const dailyUse = computeDailyUse(item);
      const remainingStock = computeRemainingStock(item);
      const percent = Math.max(6, Math.min(100, Math.round((remainingStock / Math.max(item.stockTotal, 1)) * 100)));
      const pill = node.querySelector(".pill");
      const fill = node.querySelector(".stock-card__meter-fill");

      node.querySelector("h3").textContent = item.name;
      node.querySelector(".stock-card__desc").textContent = `当前库存约 ${remainingStock}${item.doseUnit}，按 ${dailyUse}${item.doseUnit} / 天估算。`;
      fill.style.width = `${percent}%`;
      node.querySelector(".stock-card__footer").textContent = daysLeft <= 0
        ? "库存已见底，建议立刻续方或补货。"
        : `预计还能服用 ${daysLeft} 天；提醒阈值为 ${item.refillThresholdDays} 天。`;

      if (daysLeft <= 3) {
        pill.textContent = "高风险";
        pill.classList.add("pill--danger");
        fill.style.background = "linear-gradient(90deg, #d44c36, #ef8f45)";
      } else if (daysLeft <= item.refillThresholdDays) {
        pill.textContent = "待续购";
        pill.classList.add("pill--warning");
      } else {
        pill.textContent = "库存安全";
      }

      stockBoardEl.appendChild(node);
    });
}

function renderFollowups() {
  followupBoardEl.innerHTML = "";
  const activePatient = getActivePatient();
  if (!activePatient) {
    followupBoardEl.className = "followup-list empty-state";
    followupBoardEl.textContent = "请先新建患者档案。";
    return;
  }

  const followups = getSortedFollowups();

  if (followups.length === 0) {
    followupBoardEl.className = "followup-list empty-state";
    followupBoardEl.textContent = "暂无复诊计划。";
    return;
  }

  followupBoardEl.className = "followup-list";
  followups.forEach((item) => {
    const node = followupCardTemplate.content.firstElementChild.cloneNode(true);
    const diff = diffInDays(new Date(), parseDate(item.nextDate));
    const sideEl = node.querySelector(".followup-card__side");
    const condition = item.condition || activePatient.condition || "未分类";

    node.querySelector("h3").textContent = item.name;
    node.querySelector(".followup-card__meta").textContent = `${condition} · 上次复诊 ${formatDateText(item.lastVisitDate)} · 周期 ${item.followupCycleDays} 天`;
    sideEl.textContent = formatFollowupCountdown(diff);
    sideEl.className = `followup-card__side followup-card__side--${getFollowupTone(diff)}`;

    followupBoardEl.appendChild(node);
  });
}

function renderMedicationListLegacy() {
  medicationListEl.innerHTML = "";
  const activePatient = getActivePatient();

  if (!activePatient) {
    medicationListEl.className = "medication-list empty-state";
    medicationListEl.textContent = "请先新建患者档案。";
    return;
  }

  if (activePatient.medications.length === 0) {
    medicationListEl.className = "medication-list empty-state";
    medicationListEl.textContent = "还没有药品记录。";
    return;
  }

  medicationListEl.className = "medication-list";
  const groups = groupByCondition(activePatient.medications);
  groups.forEach(([condition, items]) => {
    const groupNode = createConditionGroup(condition);
    items.forEach((item) => {
      const node = medicationCardTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector("h3").textContent = item.name;
      node.querySelector(".med-card__purpose").textContent = item.purpose || "未填写用途";
      node.querySelector(".med-card__details").innerHTML = `
        <div>所属疾病：${item.condition}</div>
        <div>剂量：${item.dosePerTake}${item.doseUnit} / 次，${item.frequencyPerDay} 次 / 天</div>
        <div>提醒时间：${item.scheduleTimes.join("、")}</div>
        <div>开始日期：${formatDateText(item.startDate)}，当前库存：${item.stockTotal}${item.doseUnit}</div>
        <div>上次复诊：${formatDateText(item.lastVisitDate)}，复诊周期：${item.followupCycleDays} 天</div>
        <div>备注：${item.note || "暂无"}</div>
      `;

      node.querySelector(".danger-link").addEventListener("click", () => {
        if (!window.confirm(`确定删除 ${item.name} 吗？`)) {
          return;
        }

        activePatient.medications = activePatient.medications.filter((med) => med.id !== item.id);
        Object.keys(activePatient.reminders).forEach((dateKey) => {
          Object.keys(activePatient.reminders[dateKey] || {}).forEach((key) => {
            if (key.startsWith(`${item.id}_`)) {
              delete activePatient.reminders[dateKey][key];
            }
          });
        });
        saveState();
        setFeedback(`${item.name} 已从计划中移除。`);
        renderApp();
      });

      groupNode.querySelector(".condition-group__body").appendChild(node);
    });
    medicationListEl.appendChild(groupNode);
  });
}

function renderStatsLegacy() {
  const activePatient = getActivePatient();
  if (!activePatient) {
    statPendingCountEl.textContent = "0";
    statLowStockEl.textContent = "0";
    statFollowupEl.textContent = "-";
    return;
  }

  const entries = buildTodayEntries();
  const pendingCount = entries.filter((entry) => getReminderStatus(reminderKey(entry.medication.id, entry.time)) !== "done").length;
  const lowStockCount = activePatient.medications.filter((item) => computeDaysLeft(item) <= item.refillThresholdDays).length;
  const nextFollowup = getSortedFollowups()[0];

  statPendingCountEl.textContent = String(pendingCount);
  statLowStockEl.textContent = String(lowStockCount);
  statFollowupEl.textContent = nextFollowup ? `${Math.max(diffInDays(new Date(), parseDate(nextFollowup.nextDate)), 0)} 天` : "-";
}

function buildTodayEntries() {
  const activePatient = getActivePatient();
  return (activePatient?.medications || []).flatMap((medication) =>
    medication.scheduleTimes.map((time) => ({ medication, time }))
  );
}

function computeDailyUse(medication) {
  return medication.dosePerTake * medication.scheduleTimes.length;
}

function computeElapsedDays(startDate) {
  const start = parseDate(startDate);
  const today = parseDate(getTodayKey());
  return Math.max(0, diffInDays(start, today));
}

function computeRemainingStock(medication) {
  const used = computeElapsedDays(medication.startDate) * computeDailyUse(medication);
  return Math.max(0, medication.stockTotal - used);
}

function computeDaysLeft(medication) {
  const dailyUse = computeDailyUse(medication);
  if (!dailyUse) {
    return 0;
  }
  return Math.floor(computeRemainingStock(medication) / dailyUse);
}

function getSortedFollowups() {
  const activePatient = getActivePatient();
  return (activePatient?.medications || [])
    .map((item) => ({
      ...item,
      nextDate: formatDateInput(addDays(parseDate(item.lastVisitDate), item.followupCycleDays)),
    }))
    .sort((a, b) => parseDate(a.nextDate) - parseDate(b.nextDate));
}

function getConditionValue(item) {
  const activePatient = getActivePatient();
  if (item && item.medication) {
    return (item.medication.condition || activePatient?.condition || "未分类").trim();
  }

  return ((item && item.condition) || activePatient?.condition || "未分类").trim();
}

function groupByCondition(items) {
  const groups = new Map();
  items.forEach((item) => {
    const condition = getConditionValue(item);
    if (!groups.has(condition)) {
      groups.set(condition, []);
    }
    groups.get(condition).push(item);
  });
  return Array.from(groups.entries());
}

function createConditionGroup(condition) {
  const wrapper = document.createElement("section");
  wrapper.className = "condition-group";
  wrapper.innerHTML = `
    <div class="condition-group__header">
      <span class="condition-group__tag">按疾病分类</span>
      <h3>${condition}</h3>
    </div>
    <div class="condition-group__body"></div>
  `;
  return wrapper;
}

function renderMedicationList() {
  medicationListEl.innerHTML = "";
  const activePatient = getActivePatient();

  if (!activePatient) {
    medicationListEl.className = "medication-list empty-state";
    medicationListEl.textContent = "请先新建患者档案。";
    return;
  }

  if (activePatient.medications.length === 0) {
    medicationListEl.className = "medication-list empty-state";
    medicationListEl.textContent = "还没有药品记录。";
    return;
  }

  medicationListEl.className = "medication-list";
  activePatient.medications
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .forEach((item) => {
      const node = medicationCardTemplate.content.firstElementChild.cloneNode(true);
      const remainingStock = computeRemainingStock(item);
      const condition = item.condition || activePatient.condition || "未分类";

      node.querySelector("h3").textContent = item.name;
      node.querySelector(".med-card__purpose").textContent = item.purpose || "未填写用途";
      node.querySelector(".med-card__details").innerHTML = `
        <div>慢病类型：${escapeHtml(condition)}</div>
        <div>剂量：${escapeHtml(`${item.dosePerTake}${item.doseUnit} / 次，${item.frequencyPerDay} 次/天`)}</div>
        <div>提醒时间：${escapeHtml(item.scheduleTimes.join("、"))}</div>
        <div>开始日期：${escapeHtml(formatDateText(item.startDate))}，当前余量：${escapeHtml(`${remainingStock}${item.doseUnit}`)}</div>
        <div>上次复诊：${escapeHtml(formatDateText(item.lastVisitDate))}，复诊周期：${escapeHtml(`${item.followupCycleDays} 天`)}</div>
        <div>备注：${escapeHtml(item.note || "暂无")}</div>
      `;

      node.querySelector(".danger-link").addEventListener("click", () => {
        if (!window.confirm(`确定删除 ${item.name} 吗？`)) {
          return;
        }

        activePatient.medications = activePatient.medications.filter((med) => med.id !== item.id);
        Object.keys(activePatient.reminders).forEach((dateKey) => {
          Object.keys(activePatient.reminders[dateKey] || {}).forEach((key) => {
            if (key.startsWith(`${item.id}_`)) {
              delete activePatient.reminders[dateKey][key];
            }
          });
        });
        saveState();
        setFeedback(`${item.name} 已从计划中移除。`);
        renderApp();
      });

      medicationListEl.appendChild(node);
    });
}

function renderStats() {
  const activePatient = getActivePatient();
  if (!activePatient) {
    statPendingCountEl.textContent = "0";
    statLowStockEl.textContent = "0";
    statFollowupEl.textContent = "-";
    return;
  }

  const entries = buildTodayEntries();
  const pendingCount = entries.filter((entry) => getReminderStatus(reminderKey(entry.medication.id, entry.time)) !== "done").length;
  const lowStockCount = activePatient.medications.filter((item) => computeDaysLeft(item) <= item.refillThresholdDays).length;
  const nextFollowup = getSortedFollowups()[0];

  statPendingCountEl.textContent = String(pendingCount);
  statLowStockEl.textContent = String(lowStockCount);
  statFollowupEl.textContent = nextFollowup
    ? formatFollowupCountdown(diffInDays(new Date(), parseDate(nextFollowup.nextDate)), { compact: true })
    : "-";
}

function formatFollowupCountdown(diff, { compact = false } = {}) {
  if (diff < 0) {
    return compact ? `超期 ${Math.abs(diff)} 天` : `已超期 ${Math.abs(diff)} 天`;
  }

  if (diff === 0) {
    return compact ? "今日" : "今日复诊";
  }

  return compact ? `${diff} 天后` : `${diff} 天后复诊`;
}

function getFollowupTone(diff) {
  if (diff < 0) {
    return "danger";
  }

  if (diff <= 3) {
    return "warning";
  }

  return "normal";
}

function getReminderStatus(key) {
  const activePatient = getActivePatient();
  const today = activePatient?.reminders[getTodayKey()] || {};
  return today[key] || "pending";
}

function setReminderStatus(key, status) {
  const activePatient = getActivePatient();
  if (!activePatient) {
    return;
  }

  const today = getTodayKey();
  activePatient.reminders[today] = activePatient.reminders[today] || {};
  activePatient.reminders[today][key] = status;
  saveState();
}

function reminderKey(medicationId, time) {
  return `${medicationId}_${time}`;
}

function statusToLabel(status) {
  if (status === "done") return "已完成";
  if (status === "later") return "稍后提醒";
  return "待完成";
}

function statusToClass(status) {
  if (status === "done") return "";
  if (status === "later") return "pill--warning";
  return "pill--danger";
}

function setFeedback(message) {
  if (!message) {
    feedbackBarEl.hidden = true;
    feedbackBarEl.innerHTML = "";
    return;
  }

  feedbackBarEl.hidden = false;
  feedbackBarEl.innerHTML = `<strong>操作反馈</strong><div>${message}</div>`;
}

function createMiniButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

function formatBloodSugarValue(value, unit) {
  if (!Number.isFinite(Number(value))) {
    return "";
  }

  return unit === "mg"
    ? String(Math.round(Number(value)))
    : Number(value).toFixed(1);
}

function formatTimeText(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTodayKey() {
  return formatDateInput(new Date());
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatDateText(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(parseDate(value));
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function diffInDays(a, b) {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
}
