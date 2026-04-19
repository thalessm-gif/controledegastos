const STORAGE_KEY = "controle-casa-v3";
const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwRoIHfXYo-krTAN4hIOgMUjlw25korrgBRymX1sC_QuG8gJOK4q5PfoVoN0z3BAKRF/exec";
const PEOPLE = [
  { id: "thales", name: "THALES" },
  { id: "catia", name: "CÁTIA" },
];
const DEFAULT_CATEGORIES = [
  "Água",
  "Assessoria",
  "Corridas (Provas/Fotos)",
  "Banho Babi",
  "Cabelo/Unha/Sobrancelha",
  "Celular",
  "Combustível",
  "Condomínio",
  "Farmácia",
  "Gás",
  "Internet",
  "Luz",
  "Mercado",
  "Petz",
  "Uber",
];
const OTHER_CATEGORY_VALUE = "__other__";
const DEFAULT_SEED_UPDATED_AT = "2026-04-17T00:00:00.000Z";
const DEFAULT_CARDS = [
  {
    id: "bb-catia",
    name: "Banco do Brasil - Cátia",
    closingDay: 27,
    paymentDay: 5,
    updatedAt: DEFAULT_SEED_UPDATED_AT,
  },
  {
    id: "bb-thales",
    name: "Banco do Brasil - Thales",
    closingDay: 24,
    paymentDay: 8,
    updatedAt: DEFAULT_SEED_UPDATED_AT,
  },
  {
    id: "itau-thales",
    name: "Itaú - Thales",
    closingDay: 27,
    paymentDay: 5,
    updatedAt: DEFAULT_SEED_UPDATED_AT,
  },
  {
    id: "mercadopago-thales",
    name: "Mercado Pago - Thales",
    closingDay: 15,
    paymentDay: 21,
    updatedAt: DEFAULT_SEED_UPDATED_AT,
  },
  {
    id: "santander-thales",
    name: "Santander - Thales",
    closingDay: 15,
    paymentDay: 21,
    updatedAt: DEFAULT_SEED_UPDATED_AT,
  },
];
const PAYMENT_TYPE_LABELS = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
};
const AUTO_SYNC_DELAY_MS = 1400;

let state = null;
let autoSyncTimer = 0;
let syncInFlight = false;
let syncQueued = false;
let currentToastId = 0;
let toastCloseTimer = 0;
const uiState = {
  purchaseEditId: "",
  cardEditId: "",
  filters: {
    responsible: "all",
    cardId: "all",
  },
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  state = loadState();
  state.settings.selectedMonth = getCurrentMonth();
  wireEvents();
  renderAll();
  scheduleAutoSync("init");
}

function bindEvent(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

function cacheDom() {
  dom.selectedMonth = document.querySelector("#selectedMonth");
  dom.statusBadge = document.querySelector("#statusBadge");
  dom.syncStatus = document.querySelector("#syncStatus");
  dom.toastViewport = document.querySelector("#toastViewport");
  dom.statsGrid = document.querySelector("#statsGrid");

  dom.purchaseForm = document.querySelector("#purchaseForm");
  dom.purchaseAmountInput = document.querySelector("#purchaseAmountInput");
  dom.responsibleSelect = document.querySelector("#responsibleSelect");
  dom.categorySelect = document.querySelector("#categorySelect");
  dom.customCategoryField = document.querySelector("#customCategoryField");
  dom.customCategoryInput = document.querySelector("#customCategoryInput");
  dom.paymentTypeSelect = document.querySelector("#paymentTypeSelect");
  dom.cardSelect = document.querySelector("#cardSelect");
  dom.installmentsInput = document.querySelector("#installmentsInput");
  dom.purchaseSubmitButton = document.querySelector("#purchaseSubmitButton");
  dom.purchaseCancelButton = document.querySelector("#purchaseCancelButton");
  dom.purchaseFormHint = document.querySelector("#purchaseFormHint");
  dom.purchasePreview = document.querySelector("#purchasePreview");

  dom.summaryResponsibleFilter = document.querySelector("#summaryResponsibleFilter");
  dom.summaryCardFilter = document.querySelector("#summaryCardFilter");
  dom.clearSummaryFilters = document.querySelector("#clearSummaryFilters");
  dom.monthSummaryText = document.querySelector("#monthSummaryText");
  dom.monthCharges = document.querySelector("#monthCharges");

  dom.cardSummaries = document.querySelector("#cardSummaries");
  dom.cardForm = document.querySelector("#cardForm");
  dom.cardSubmitButton = document.querySelector("#cardSubmitButton");
  dom.cardCancelButton = document.querySelector("#cardCancelButton");
  dom.cardFormHint = document.querySelector("#cardFormHint");
  dom.cardList = document.querySelector("#cardList");

  dom.installmentOverview = document.querySelector("#installmentOverview");

  dom.budgetForm = document.querySelector("#budgetForm");
  dom.budgetAmountInput = document.querySelector("#budgetAmountInput");
  dom.clearBudgetButton = document.querySelector("#clearBudgetButton");
  dom.budgetSummary = document.querySelector("#budgetSummary");
}

function wireEvents() {
  bindEvent(dom.selectedMonth, "change", handleMonthChange);

  bindEvent(dom.purchaseForm, "submit", handlePurchaseSubmit);
  bindEvent(dom.purchaseCancelButton, "click", cancelPurchaseEdit);
  bindEvent(dom.categorySelect, "change", renderAll);
  bindEvent(dom.customCategoryInput, "input", renderPurchasePreview);
  bindEvent(dom.paymentTypeSelect, "change", renderAll);
  bindEvent(dom.cardSelect, "change", renderPurchasePreview);
  bindEvent(dom.installmentsInput, "input", renderPurchasePreview);
  bindEvent(dom.purchaseForm?.elements?.date, "change", renderPurchasePreview);
  bindEvent(dom.purchaseAmountInput, "input", handleMoneyInput);

  bindEvent(dom.summaryResponsibleFilter, "change", handleFilterChange);
  bindEvent(dom.summaryCardFilter, "change", handleFilterChange);
  bindEvent(dom.clearSummaryFilters, "click", clearSummaryFilters);
  bindEvent(dom.monthCharges, "click", handleMonthChargesClick);

  bindEvent(dom.cardForm, "submit", handleCardSubmit);
  bindEvent(dom.cardCancelButton, "click", cancelCardEdit);
  bindEvent(dom.cardList, "click", handleCardListClick);

  bindEvent(dom.budgetForm, "submit", handleBudgetSubmit);
  bindEvent(dom.clearBudgetButton, "click", clearBudget);
  bindEvent(dom.budgetAmountInput, "input", handleMoneyInput);
}

function createEmptyState() {
  return {
    version: 3,
    settings: {
      selectedMonth: getCurrentMonth(),
      budgetAmount: 0,
      budgetOwner: "",
      updatedAt: "",
    },
    sync: {
      scriptUrl: DEFAULT_SCRIPT_URL,
      lastSyncedAt: "",
      lastSyncMessage: "Sincronização ainda não executada.",
    },
    cards: createDefaultCards(),
    purchases: [],
    deletions: {
      cards: [],
      purchases: [],
    },
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeState(saved ? JSON.parse(saved) : createEmptyState());
  } catch (error) {
    console.error(error);
    return normalizeState(createEmptyState());
  }
}

function normalizeState(rawState) {
  const empty = createEmptyState();
  const normalized = {
    version: 3,
    settings: {
      ...empty.settings,
      ...(rawState?.settings || {}),
    },
    sync: {
      ...empty.sync,
      ...(rawState?.sync || {}),
    },
    cards: Array.isArray(rawState?.cards)
      ? rawState.cards.map(normalizeCard).filter(Boolean)
      : [],
    purchases: Array.isArray(rawState?.purchases)
      ? rawState.purchases.map(normalizePurchase).filter(Boolean)
      : [],
    deletions: {
      cards: normalizeDeletionList(rawState?.deletions?.cards),
      purchases: normalizeDeletionList(rawState?.deletions?.purchases),
    },
  };

  normalized.settings.selectedMonth = isValidMonth(normalized.settings.selectedMonth)
    ? normalized.settings.selectedMonth
    : getCurrentMonth();
  normalized.settings.budgetAmount = normalizeMoney(normalized.settings.budgetAmount);
  normalized.settings.budgetOwner = normalizeBudgetOwner(normalized.settings.budgetOwner);
  normalized.settings.updatedAt = normalized.settings.updatedAt || "";
  normalized.sync.scriptUrl = cleanText(normalized.sync.scriptUrl) || DEFAULT_SCRIPT_URL;
  normalized.cards = ensureDefaultCards(normalized.cards, normalized.deletions.cards);

  return normalized;
}

function createDefaultCards() {
  return DEFAULT_CARDS.map((card) => normalizeCard(card)).filter(Boolean);
}

function ensureDefaultCards(cards, deletions = []) {
  const deletedIds = new Set(deletions.map((entry) => entry.id));
  const existingNames = new Set(cards.map((card) => normalizeCardName(card.name)));

  const missingCards = createDefaultCards().filter((card) => {
    return !deletedIds.has(card.id) && !existingNames.has(normalizeCardName(card.name));
  });

  return [...cards, ...missingCards];
}

function normalizeCard(card) {
  if (!card) {
    return null;
  }

  const normalized = {
    id: cleanText(card.id) || createId("card"),
    name: cleanText(card.name),
    closingDay: clampInteger(card.closingDay, 1, 31, 1),
    paymentDay: clampInteger(card.paymentDay, 1, 31, 1),
    updatedAt: cleanText(card.updatedAt) || nowIso(),
  };

  return normalized.name ? normalized : null;
}

function normalizePurchase(purchase) {
  if (!purchase) {
    return null;
  }

  const paymentType = normalizePaymentType(purchase.paymentType);
  const installments =
    paymentType === "credito"
      ? clampInteger(purchase.installments, 1, 48, 1)
      : 1;
  const normalized = {
    id: cleanText(purchase.id) || createId("purchase"),
    responsible: normalizeResponsible(purchase.responsible),
    date: isValidDate(purchase.date) ? purchase.date : getCurrentDate(),
    amount: normalizeMoney(purchase.amount),
    category: normalizeCategory(purchase.category),
    paymentType,
    cardId: paymentType === "credito" ? cleanText(purchase.cardId) : "",
    installments,
    notes: cleanText(purchase.notes),
    updatedAt: cleanText(purchase.updatedAt) || nowIso(),
  };

  return normalized.amount > 0 ? normalized : null;
}

function normalizeDeletionList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const byId = new Map();
  list.forEach((item) => {
    const id = cleanText(item?.id);
    const deletedAt = cleanText(item?.deletedAt);
    if (!id || !deletedAt) {
      return;
    }

    const current = byId.get(id);
    if (!current || deletedAt > current.deletedAt) {
      byId.set(id, { id, deletedAt });
    }
  });

  return Array.from(byId.values());
}

function persistState(options = {}) {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.skipRender) {
    renderAll();
  }
}

function persistAndAutoSync(reason) {
  persistState();
  scheduleAutoSync(reason);
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeCardName(value) {
  return cleanText(value).toLocaleLowerCase("pt-BR");
}

function normalizeMoney(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }

  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return 0;
  }

  const parsed = Number.parseFloat(
    rawValue
      .replace(/\s+/g, "")
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "")
  );
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100) / 100;
}

function getMoneyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDigitsAsMoney(value) {
  const digits = getMoneyDigits(value);
  if (!digits) {
    return "";
  }

  const centsValue = Number.parseInt(digits, 10) / 100;
  return centsValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoneyInputValue(value) {
  const amount = normalizeMoney(value);
  if (!amount) {
    return "";
  }

  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function sum(values) {
  return normalizeMoney(values.reduce((total, value) => total + value, 0));
}

function nowIso() {
  return new Date().toISOString();
}

function getCurrentDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return getCurrentDate().slice(0, 7);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function normalizeResponsible(value) {
  const normalized = cleanText(value).toLowerCase();
  return PEOPLE.some((person) => person.id === normalized) ? normalized : "thales";
}

function normalizeBudgetOwner(value) {
  const normalized = cleanText(value).toLowerCase();
  return PEOPLE.some((person) => person.id === normalized) ? normalized : "";
}

function normalizeCategory(value) {
  const category = cleanText(value);
  if (!category) {
    return DEFAULT_CATEGORIES[0];
  }
  if (DEFAULT_CATEGORIES.includes(category)) {
    return category;
  }
  return buildCustomCategoryLabel(category) || category;
}

function buildCustomCategoryLabel(value) {
  const detail = cleanText(value).replace(/^Outro:\s*/i, "");
  return detail ? `Outro: ${detail}` : "";
}

function getCurrentCategoryValueFromUi() {
  if (!dom.categorySelect) {
    return "";
  }
  const selectedValue = cleanText(dom.categorySelect?.value);
  if (selectedValue === OTHER_CATEGORY_VALUE) {
    return buildCustomCategoryLabel(dom.customCategoryInput?.value) || OTHER_CATEGORY_VALUE;
  }
  return selectedValue;
}

function getCategoryFieldState(categoryValue) {
  const category = cleanText(categoryValue);
  if (!category) {
    return { selectValue: "", customValue: "" };
  }
  if (category === OTHER_CATEGORY_VALUE) {
    return { selectValue: OTHER_CATEGORY_VALUE, customValue: "" };
  }
  if (DEFAULT_CATEGORIES.includes(category)) {
    return { selectValue: category, customValue: "" };
  }
  return {
    selectValue: OTHER_CATEGORY_VALUE,
    customValue: category.replace(/^Outro:\s*/i, ""),
  };
}

function getCategoryFromForm() {
  if (!dom.categorySelect) {
    return "";
  }
  const selectedValue = cleanText(dom.categorySelect.value);
  if (!selectedValue) {
    return "";
  }
  if (selectedValue === OTHER_CATEGORY_VALUE) {
    return buildCustomCategoryLabel(dom.customCategoryInput.value);
  }
  return normalizeCategory(selectedValue);
}

function normalizePaymentType(value) {
  return Object.prototype.hasOwnProperty.call(PAYMENT_TYPE_LABELS, value)
    ? value
    : "pix";
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addMonths(month, amount) {
  const [year, monthNumber] = String(month).split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(startMonth, endMonth) {
  const [startYear, startMonthNumber] = String(startMonth).split("-").map(Number);
  const [endYear, endMonthNumber] = String(endMonth).split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonthNumber - startMonthNumber);
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatMonthLabel(monthString) {
  const [year, month] = String(monthString).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function formatDateTime(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getResponsibleName(responsibleId) {
  return PEOPLE.find((person) => person.id === responsibleId)?.name || "THALES";
}

function getCardById(cardId) {
  return state.cards.find((card) => card.id === cardId) || null;
}

function getCardUsageCount(cardId) {
  return state.purchases.filter((purchase) => purchase.cardId === cardId).length;
}

function splitInstallments(totalAmount, installments) {
  const totalInCents = Math.round(normalizeMoney(totalAmount) * 100);
  const base = Math.floor(totalInCents / installments);
  const remainder = totalInCents % installments;
  const result = [];

  for (let index = 0; index < installments; index += 1) {
    result.push((base + (index < remainder ? 1 : 0)) / 100);
  }

  return result;
}

function getFirstChargeMonth(purchase) {
  const purchaseMonth = purchase.date.slice(0, 7);
  if (purchase.paymentType !== "credito") {
    return purchaseMonth;
  }

  const card = getCardById(purchase.cardId);
  if (!card) {
    return purchaseMonth;
  }

  const purchaseDay = Number.parseInt(purchase.date.slice(8, 10), 10);
  return purchaseDay <= card.closingDay ? purchaseMonth : addMonths(purchaseMonth, 1);
}

function getCardDueDate(month, card) {
  const [year, monthNumber] = month.split("-").map(Number);
  const day = Math.min(card.paymentDay, getDaysInMonth(year, monthNumber));
  return `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildChargeEntries(purchase) {
  const firstChargeMonth = getFirstChargeMonth(purchase);
  const amounts = splitInstallments(purchase.amount, purchase.installments);
  const card = getCardById(purchase.cardId);

  return amounts.map((amount, index) => {
    const chargeMonth =
      purchase.paymentType === "credito" ? addMonths(firstChargeMonth, index) : firstChargeMonth;
    const dueDate =
      purchase.paymentType === "credito" && card
        ? getCardDueDate(chargeMonth, card)
        : purchase.date;

    return {
      id: `${purchase.id}-${index + 1}`,
      purchaseId: purchase.id,
      responsible: purchase.responsible,
      responsibleLabel: getResponsibleName(purchase.responsible),
      purchaseDate: purchase.date,
      chargeMonth,
      dueDate,
      category: purchase.category,
      paymentType: purchase.paymentType,
      paymentTypeLabel: PAYMENT_TYPE_LABELS[purchase.paymentType],
      cardId: purchase.cardId,
      cardName: card?.name || "",
      installmentIndex: index + 1,
      installments: purchase.installments,
      amount,
      notes: purchase.notes,
      detail: buildChargeDetail(purchase, card, chargeMonth, dueDate, index + 1),
    };
  });
}

function buildChargeDetail(purchase, card, chargeMonth, dueDate, installmentIndex) {
  const parts = [PAYMENT_TYPE_LABELS[purchase.paymentType]];
  parts.push(`compra em ${formatDate(purchase.date)}`);
  if (card) {
    parts.push(card.name);
    parts.push(`vence em ${formatDate(dueDate)}`);
  } else {
    parts.push(`entra em ${formatMonthLabel(chargeMonth)}`);
  }

  if (purchase.paymentType === "credito") {
    parts.push(`${installmentIndex}/${purchase.installments}`);
  }

  if (purchase.notes) {
    parts.push(purchase.notes);
  }

  return parts.join(" • ");
}

function getMonthlyCharges(month) {
  return state.purchases
    .flatMap((purchase) => buildChargeEntries(purchase))
    .filter((charge) => charge.chargeMonth === month)
    .sort((left, right) => {
      if (left.dueDate !== right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }
      if (left.category !== right.category) {
        return left.category.localeCompare(right.category);
      }
      return left.responsibleLabel.localeCompare(right.responsibleLabel);
    });
}

function getMonthlySummary(month) {
  const charges = getMonthlyCharges(month);
  const total = sum(charges.map((charge) => charge.amount));
  const byPerson = PEOPLE.map((person) => {
    const personTotal = sum(
      charges
        .filter((charge) => charge.responsible === person.id)
        .map((charge) => charge.amount)
    );
    return {
      ...person,
      total: personTotal,
      share: total > 0 ? Math.round((personTotal / total) * 100) : 0,
    };
  });

  const creditCharges = charges.filter((charge) => charge.paymentType === "credito");
  const byCard = state.cards
    .map((card) => {
      const cardCharges = creditCharges.filter((charge) => charge.cardId === card.id);
      return {
        id: card.id,
        name: card.name,
        total: sum(cardCharges.map((charge) => charge.amount)),
        count: cardCharges.length,
        charges: cardCharges,
        dueDate: getCardDueDate(month, card),
        closingDay: card.closingDay,
        paymentDay: card.paymentDay,
      };
    })
    .filter((card) => card.total > 0)
    .sort((left, right) => right.total - left.total);

  return {
    month,
    charges,
    total,
    byPerson,
    byCard,
  };
}

function getActiveInstallments(month) {
  return state.purchases
    .filter((purchase) => purchase.paymentType === "credito" && purchase.installments > 1)
    .map((purchase) => {
      const firstChargeMonth = getFirstChargeMonth(purchase);
      const chargedCount = Math.max(
        0,
        Math.min(purchase.installments, monthDiff(firstChargeMonth, month) + 1)
      );
      const remainingCount = Math.max(0, purchase.installments - chargedCount);
      const amounts = splitInstallments(purchase.amount, purchase.installments);
      const remainingAmount = sum(amounts.slice(chargedCount));
      const nextChargeMonth =
        remainingCount > 0 ? addMonths(firstChargeMonth, chargedCount) : "";
      const card = getCardById(purchase.cardId);

      return {
        purchase,
        card,
        chargedCount,
        remainingCount,
        remainingAmount,
        nextChargeMonth,
      };
    })
    .filter((item) => item.remainingCount > 0)
    .sort((left, right) => left.nextChargeMonth.localeCompare(right.nextChargeMonth));
}

function applySummaryFilters(charges) {
  return charges.filter((charge) => {
    if (uiState.filters.responsible !== "all" && charge.responsible !== uiState.filters.responsible) {
      return false;
    }
    if (uiState.filters.cardId === "all") {
      return true;
    }
    if (uiState.filters.cardId === "__sem_cartao__") {
      return !charge.cardId;
    }
    return charge.cardId === uiState.filters.cardId;
  });
}

function renderAll() {
  renderHeader();
  renderStatus();
  renderSelectOptions();
  renderPurchaseFormState();
  renderPurchasePreview();
  renderStats();
  renderMonthCharges();
  renderCardSummaries();
  renderCardList();
  renderInstallmentOverview();
  renderBudget();
}

function renderHeader() {
  if (!dom.selectedMonth) {
    return;
  }
  dom.selectedMonth.value = state.settings.selectedMonth;
}

function renderStatus() {
  if (!dom.statusBadge || !dom.syncStatus) {
    return;
  }
  const cardCount = state.cards.length;
  dom.statusBadge.textContent =
    cardCount > 0
      ? `${cardCount} cartões cadastrados para THALES e CÁTIA.`
      : "Cadastre os cartões para o crédito calcular a cobrança sozinho.";

  const syncParts = [state.sync.lastSyncMessage];
  if (state.sync.lastSyncedAt) {
    syncParts.push(`Última sincronização: ${formatDateTime(state.sync.lastSyncedAt)}`);
  }
  dom.syncStatus.textContent = syncParts.filter(Boolean).join(" ");
}

function renderSelectOptions() {
  if (!(dom.purchaseForm && dom.responsibleSelect && dom.categorySelect && dom.cardSelect)) {
    if (dom.summaryResponsibleFilter) {
      setSelectOptions(
        dom.summaryResponsibleFilter,
        [{ value: "all", label: "Todos" }].concat(
          PEOPLE.map((person) => ({ value: person.id, label: person.name }))
        ),
        uiState.filters.responsible
      );
    }

    if (dom.summaryCardFilter) {
      setSelectOptions(
        dom.summaryCardFilter,
        [{ value: "all", label: "Todos" }, { value: "__sem_cartao__", label: "Sem cartão" }].concat(
          state.cards.map((card) => ({ value: card.id, label: card.name }))
        ),
        uiState.filters.cardId
      );
    }

    if (dom.budgetForm) {
      dom.budgetForm.elements.budgetAmount.value = formatMoneyInputValue(state.settings.budgetAmount);
      dom.budgetForm.elements.budgetOwner.value = state.settings.budgetOwner || "";
    }
    return;
  }

  const categoryState = getCategoryFieldState(getCurrentCategoryValueFromUi());
  const selectedResponsible = cleanText(dom.purchaseForm.elements.responsible.value);
  const selectedPaymentType = cleanText(dom.paymentTypeSelect?.value);
  setSelectOptions(
    dom.responsibleSelect,
    [{ value: "", label: "Escolher" }].concat(
      PEOPLE.map((person) => ({ value: person.id, label: person.name }))
    ),
    selectedResponsible
  );
  setSelectOptions(
    dom.categorySelect,
    [{ value: "", label: "Escolher" }].concat(
      DEFAULT_CATEGORIES.map((category) => ({ value: category, label: category })),
      {
        value: OTHER_CATEGORY_VALUE,
        label: "Outro (digitar)",
      }
    ),
    categoryState.selectValue
  );
  dom.customCategoryInput.value = categoryState.customValue;
  setSelectOptions(
    dom.paymentTypeSelect,
    [{ value: "", label: "Escolher" }].concat(
      Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
    ),
    selectedPaymentType
  );
  setSelectOptions(
    dom.cardSelect,
    [{ value: "", label: "Não se aplica" }].concat(
      state.cards.map((card) => ({ value: card.id, label: card.name }))
    ),
    dom.purchaseForm.elements.cardId.value || ""
  );
  setSelectOptions(
    dom.summaryResponsibleFilter,
    [{ value: "all", label: "Todos" }].concat(
      PEOPLE.map((person) => ({ value: person.id, label: person.name }))
    ),
    uiState.filters.responsible
  );
  setSelectOptions(
    dom.summaryCardFilter,
    [{ value: "all", label: "Todos" }, { value: "__sem_cartao__", label: "Sem cartão" }].concat(
      state.cards.map((card) => ({ value: card.id, label: card.name }))
    ),
    uiState.filters.cardId
  );

  if (dom.budgetForm) {
    dom.budgetForm.elements.budgetAmount.value = formatMoneyInputValue(state.settings.budgetAmount);
    dom.budgetForm.elements.budgetOwner.value = state.settings.budgetOwner || "";
  }
}

function setSelectOptions(select, options, selectedValue) {
  if (!select) {
    return;
  }
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  select.value = options.some((option) => option.value === selectedValue)
    ? selectedValue
    : options[0]?.value || "";
}

function renderPurchaseFormState() {
  if (
    !dom.purchaseForm ||
    !dom.categorySelect ||
    !dom.paymentTypeSelect ||
    !dom.cardSelect ||
    !dom.installmentsInput ||
    !dom.purchaseSubmitButton ||
    !dom.purchaseCancelButton ||
    !dom.purchaseFormHint
  ) {
    return;
  }
  const editing = Boolean(uiState.purchaseEditId);
  const isCredit = dom.paymentTypeSelect.value === "credito";
  const isCustomCategory = dom.categorySelect.value === OTHER_CATEGORY_VALUE;

  dom.cardSelect.disabled = !isCredit;
  dom.installmentsInput.disabled = !isCredit;
  if (!isCredit) {
    dom.cardSelect.value = "";
    dom.installmentsInput.value = "1";
  }

  dom.customCategoryField.classList.toggle("hidden", !isCustomCategory);
  dom.customCategoryInput.disabled = !isCustomCategory;
  dom.customCategoryInput.required = isCustomCategory;
  if (!isCustomCategory) {
    dom.customCategoryInput.value = "";
  }

  dom.purchaseSubmitButton.textContent = editing ? "Salvar alterações" : "Salvar gasto";
  dom.purchaseCancelButton.classList.toggle("hidden", !editing);
  dom.purchaseFormHint.textContent =
    editing
      ? "Você está editando uma compra já cadastrada."
      : isCredit && !state.cards.length
        ? "Cadastre um cartão antes de lançar compras no crédito."
        : isCustomCategory
          ? "Use Outro para detalhar uma categoria livre sem bagunçar a lista principal."
          : "Se for no crédito, o sistema calcula sozinho o mês de cobrança.";

  if (!editing && !dom.paymentTypeSelect.value) {
    dom.purchaseFormHint.textContent = "Escolha os campos principais para registrar o gasto.";
  }

  if (dom.cardSubmitButton && dom.cardCancelButton && dom.cardFormHint) {
    dom.cardSubmitButton.textContent = uiState.cardEditId ? "Salvar alterações" : "Salvar cartão";
    dom.cardCancelButton.classList.toggle("hidden", !uiState.cardEditId);
    dom.cardFormHint.textContent = uiState.cardEditId
      ? "Editar um cartão recalcula as compras ligadas a ele."
      : "O fechamento define em qual mês cada compra entra.";
  }
}

function renderPurchasePreview() {
  if (!dom.purchasePreview || !dom.purchaseForm) {
    return;
  }
  const draft = getPurchaseDraftFromForm();
  if (!draft.date || draft.amount <= 0) {
    dom.purchasePreview.innerHTML = `
      <strong>Prévia da cobrança</strong>
      <p>Preencha data, valor e tipo de pagamento para ver como esse gasto vai entrar no mês.</p>
    `;
    return;
  }

  if (draft.paymentType !== "credito") {
    dom.purchasePreview.innerHTML = `
      <strong>Prévia da cobrança</strong>
      <p>Esse gasto entra em <strong>${escapeHtml(formatMonthLabel(draft.date.slice(0, 7)))}</strong>, no próprio mês da compra.</p>
    `;
    return;
  }

  const card = getCardById(draft.cardId);
  if (!card) {
    dom.purchasePreview.innerHTML = `
      <strong>Prévia da cobrança</strong>
      <p>Selecione um cartão para o sistema calcular o mês da cobrança e o vencimento da fatura.</p>
    `;
    return;
  }

  const firstChargeMonth = getFirstChargeMonth(draft);
  const dueDate = getCardDueDate(firstChargeMonth, card);
  const lastChargeMonth = addMonths(firstChargeMonth, draft.installments - 1);
  const purchaseDay = Number.parseInt(draft.date.slice(8, 10), 10);
  const billingHint =
    purchaseDay <= card.closingDay
      ? `Como a compra foi lançada até o fechamento do dia ${card.closingDay}, ela cai na fatura de ${formatMonthLabel(firstChargeMonth)}.`
      : `Como a compra passou do fechamento do dia ${card.closingDay}, ela só entra na fatura de ${formatMonthLabel(firstChargeMonth)}.`;
  dom.purchasePreview.innerHTML = `
    <strong>Prévia da cobrança</strong>
    <p>${escapeHtml(billingHint)}</p>
    <p>Primeiro vencimento em <strong>${escapeHtml(formatDate(dueDate))}</strong>.</p>
    <p>${draft.installments > 1 ? `Última parcela em ${escapeHtml(formatMonthLabel(lastChargeMonth))}.` : "Compra à vista no crédito."}</p>
  `;
}

function renderStats() {
  if (!dom.statsGrid) {
    return;
  }
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const creditTotal = sum(
    summary.charges
      .filter((charge) => charge.paymentType === "credito")
      .map((charge) => charge.amount)
  );
  const creditShare = summary.total > 0 ? Math.round((creditTotal / summary.total) * 100) : 0;

  const stats = [
    {
      label: "Total do mês",
      value: formatCurrency(summary.total),
      support: `${summary.charges.length} cobrança(s) organizadas em ${formatMonthLabel(state.settings.selectedMonth)}`,
      progress: summary.total > 0 ? 100 : 0,
    },
    ...summary.byPerson.map((person) => ({
      label: person.name,
      value: formatCurrency(person.total),
      support: `${person.share}% do total do mês`,
      progress: person.share,
    })),
    {
      label: "No crédito",
      value: formatCurrency(creditTotal),
      support:
        creditTotal > 0
          ? `${summary.byCard.length} cartão(ões) com cobrança neste mês`
          : "Nenhuma cobrança no crédito neste mês",
      progress: creditShare,
    },
  ];

  dom.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <span class="stat-label">${escapeHtml(stat.label)}</span>
          <strong class="stat-value">${escapeHtml(stat.value)}</strong>
          <span class="stat-support">${escapeHtml(stat.support)}</span>
          <div class="progress-shell">
            <div class="progress-fill" style="width: ${Math.max(0, Math.min(100, stat.progress || 0))}%"></div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMonthCharges() {
  if (!dom.monthSummaryText || !dom.monthCharges) {
    return;
  }
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const filteredCharges = applySummaryFilters(summary.charges);
  const filteredTotal = sum(filteredCharges.map((charge) => charge.amount));

  dom.monthSummaryText.textContent =
    filteredCharges.length > 0
      ? `${filteredCharges.length} item(ns) cobrados no mês, somando ${formatCurrency(filteredTotal)}.`
      : `Nenhum gasto encontrado para ${formatMonthLabel(state.settings.selectedMonth)} com os filtros atuais.`;

  if (!filteredCharges.length) {
    dom.monthCharges.innerHTML = `
      <div class="empty-state">
        <p>Quando vocês começarem a lançar compras, o mês aparece aqui já organizado pela cobrança certa.</p>
      </div>
    `;
    return;
  }

  dom.monthCharges.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Categoria</th>
          <th>Responsável</th>
          <th>Detalhe</th>
          <th>Valor</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${filteredCharges
          .map(
            (charge) => `
              <tr>
                <td>
                  <strong>${escapeHtml(charge.category)}</strong>
                  <span class="muted-line">${escapeHtml(charge.notes || "Sem observação")}</span>
                </td>
                <td>${escapeHtml(charge.responsibleLabel)}</td>
                <td>${escapeHtml(charge.detail)}</td>
                <td class="amount-cell">${escapeHtml(formatCurrency(charge.amount))}</td>
                <td>
                  <button class="button button-secondary" type="button" data-action="edit-purchase" data-id="${escapeHtml(charge.purchaseId)}">Editar</button>
                  <button class="button button-secondary" type="button" data-action="delete-purchase" data-id="${escapeHtml(charge.purchaseId)}">Excluir</button>
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderCardSummaries() {
  if (!dom.cardSummaries) {
    return;
  }
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const cards = summary.byCard;
  if (!cards.length) {
    dom.cardSummaries.innerHTML = `
      <div class="empty-state">
        <p>Os resumos dos cartões aparecem assim que existirem compras no crédito cobradas no mês.</p>
      </div>
    `;
    return;
  }

  dom.cardSummaries.innerHTML = cards
    .map(
      (card) => `
        <article class="card-summary">
          <div class="card-summary-head">
            <div>
              <strong>${escapeHtml(card.name)}</strong>
              <span class="muted-line">Fecha dia ${escapeHtml(String(card.closingDay))} • vence dia ${escapeHtml(String(card.paymentDay))}</span>
            </div>
            <span class="tag tag-neutral">${escapeHtml(formatCurrency(card.total))}</span>
          </div>
          <div class="mini-stat-grid">
            <div class="mini-stat">
              <span>Itens do mês</span>
              <strong>${escapeHtml(String(card.count))}</strong>
            </div>
            <div class="mini-stat">
              <span>Vencimento</span>
              <strong>${escapeHtml(formatDate(card.dueDate))}</strong>
            </div>
            <div class="mini-stat">
              <span>Participação</span>
              <strong>${escapeHtml(`${summary.total > 0 ? Math.round((card.total / summary.total) * 100) : 0}%`)}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCardList() {
  if (!dom.cardList) {
    return;
  }
  if (!state.cards.length) {
    dom.cardList.innerHTML = `
      <div class="empty-state">
        <p>Cadastre os cartões que vocês usam e eu passo a calcular automaticamente o mês da cobrança.</p>
      </div>
    `;
    return;
  }

  dom.cardList.innerHTML = state.cards
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(
      (card) => `
        <article class="info-card">
          <div class="card-row-head">
            <div>
              <strong>${escapeHtml(card.name)}</strong>
              <span class="muted-line">Fecha dia ${escapeHtml(String(card.closingDay))} • vence dia ${escapeHtml(String(card.paymentDay))}</span>
            </div>
            <span class="tag tag-neutral">${escapeHtml(String(getCardUsageCount(card.id)))} compra(s)</span>
          </div>
          <div class="card-row-actions">
            <button class="ghost-button" type="button" data-action="edit-card" data-id="${escapeHtml(card.id)}">Editar</button>
            <button class="ghost-button" type="button" data-action="delete-card" data-id="${escapeHtml(card.id)}">Excluir</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderInstallmentOverview() {
  if (!dom.installmentOverview) {
    return;
  }
  const items = getActiveInstallments(state.settings.selectedMonth);
  if (!items.length) {
    dom.installmentOverview.innerHTML = `
      <div class="empty-state">
        <p>Quando entrarem compras parceladas, você vai ver aqui o que ainda falta cobrar.</p>
      </div>
    `;
    return;
  }

  dom.installmentOverview.innerHTML = items
    .map(
      (item) => `
        <article class="info-card">
          <div class="installment-row-head">
            <div>
              <strong>${escapeHtml(item.purchase.category)} • ${escapeHtml(getResponsibleName(item.purchase.responsible))}</strong>
              <span class="muted-line">${escapeHtml(item.card?.name || "Cartão não encontrado")} • ${escapeHtml(item.chargedCount.toString())}/${escapeHtml(item.purchase.installments.toString())} já cobradas</span>
            </div>
            <span class="tag tag-warning">${escapeHtml(`${item.remainingCount} restantes`)}</span>
          </div>
          <div class="mini-stat-grid">
            <div class="mini-stat">
              <span>Valor total</span>
              <strong>${escapeHtml(formatCurrency(item.purchase.amount))}</strong>
            </div>
            <div class="mini-stat">
              <span>Falta cobrar</span>
              <strong>${escapeHtml(formatCurrency(item.remainingAmount))}</strong>
            </div>
            <div class="mini-stat">
              <span>Próxima cobrança</span>
              <strong>${escapeHtml(formatMonthLabel(item.nextChargeMonth))}</strong>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderBudget() {
  if (!dom.budgetSummary) {
    return;
  }
  const amount = state.settings.budgetAmount;
  const owner = state.settings.budgetOwner;
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const monthTotal = getBudgetTrackedTotal(summary, owner);

  if (!amount) {
    dom.budgetSummary.innerHTML = `
      <strong>Sem orçamento definido</strong>
      <p>Se quiser, você pode colocar um valor e vincular a THALES, à CÁTIA ou ao total da casa.</p>
    `;
    return;
  }

  const difference = amount - monthTotal;
  dom.budgetSummary.innerHTML = `
    <strong>${escapeHtml(owner ? `Orçamento de ${getResponsibleName(owner)}` : "Orçamento da casa")}</strong>
    <p>Valor configurado: ${escapeHtml(formatCurrency(amount))}</p>
    <p>Gasto acompanhado: ${escapeHtml(formatCurrency(monthTotal))}</p>
    <p>${escapeHtml(difference >= 0 ? "Sobra atual" : "Excedente atual")}: ${escapeHtml(formatCurrency(Math.abs(difference)))}</p>
  `;
}

function getBudgetTrackedTotal(summary, owner) {
  if (!owner) {
    return summary.total;
  }
  return summary.byPerson.find((person) => person.id === owner)?.total || 0;
}

function getPurchaseDraftFromForm() {
  const category = getCategoryFromForm();
  return normalizePurchase({
    id: cleanText(dom.purchaseForm.elements.entryId.value) || createId("draft"),
    responsible: dom.purchaseForm.elements.responsible.value || "thales",
    date: dom.purchaseForm.elements.date.value || getCurrentDate(),
    amount: dom.purchaseForm.elements.amount.value,
    category: category || DEFAULT_CATEGORIES[0],
    paymentType: dom.paymentTypeSelect.value || "pix",
    cardId: dom.cardSelect.value,
    installments: dom.installmentsInput.value || 1,
    notes: dom.purchaseForm.elements.notes.value,
    updatedAt: nowIso(),
  }) || {
    responsible: "thales",
    date: getCurrentDate(),
    amount: 0,
    category: category || DEFAULT_CATEGORIES[0],
    paymentType: dom.paymentTypeSelect.value || "pix",
    cardId: dom.cardSelect.value,
    installments: clampInteger(dom.installmentsInput.value, 1, 48, 1),
    notes: cleanText(dom.purchaseForm.elements.notes.value),
  };
}

function handleMonthChange() {
  if (!isValidMonth(dom.selectedMonth.value)) {
    return;
  }

  state.settings.selectedMonth = dom.selectedMonth.value;
  persistState();
}

function handleFilterChange() {
  uiState.filters.responsible = dom.summaryResponsibleFilter.value;
  uiState.filters.cardId = dom.summaryCardFilter.value;
  renderAll();
}

function clearSummaryFilters() {
  uiState.filters = {
    responsible: "all",
    cardId: "all",
  };
  renderAll();
}

function handlePurchaseSubmit(event) {
  event.preventDefault();

  const form = new FormData(dom.purchaseForm);
  const paymentType = form.get("paymentType");
  const cardId = cleanText(form.get("cardId"));
  const category = getCategoryFromForm();
  const installments =
    paymentType === "credito" ? clampInteger(form.get("installments"), 1, 48, 1) : 1;

  if (dom.categorySelect.value === OTHER_CATEGORY_VALUE && !category) {
    setSyncMessage("Descreva a categoria quando escolher Outro.", false);
    renderStatus();
    return;
  }

  if (paymentType === "credito" && !cardId) {
    setSyncMessage("Selecione um cartão para compras no crédito.", false);
    renderStatus();
    return;
  }

  const purchase = normalizePurchase({
    id: cleanText(form.get("entryId")) || createId("purchase"),
    responsible: form.get("responsible"),
    date: form.get("date"),
    amount: form.get("amount"),
    category,
    paymentType,
    cardId,
    installments,
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!purchase) {
    setSyncMessage("Não foi possível salvar esse gasto.", false);
    renderStatus();
    return;
  }

  if (uiState.purchaseEditId) {
    state.purchases = state.purchases.map((item) => (item.id === purchase.id ? purchase : item));
    setSyncMessage("Gasto atualizado no painel local.", false);
    showToast("Lançamento atualizado.", { tone: "success", duration: 1600 });
  } else {
    state.purchases.unshift(purchase);
    setSyncMessage("Gasto salvo no painel local.", false);
    showToast("Lançamento cadastrado.", { tone: "success", duration: 1600 });
  }

  cancelPurchaseEdit({ silent: true });
  persistAndAutoSync("purchase");
}

function handleMonthChargesClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const purchaseId = button.dataset.id;
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) {
    return;
  }

  if (button.dataset.action === "edit-purchase") {
    startPurchaseEdit(purchaseId);
    return;
  }

  if (
    button.dataset.action === "delete-purchase" &&
    window.confirm("Excluir essa compra por completo?")
  ) {
    state.purchases = state.purchases.filter((item) => item.id !== purchaseId);
    state.deletions.purchases = upsertDeletion(state.deletions.purchases, purchaseId);
    cancelPurchaseEdit({ silent: true });
    setSyncMessage("Compra excluída do painel local.", false);
    persistAndAutoSync("purchase");
  }
}

function startPurchaseEdit(purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) {
    return;
  }

  uiState.purchaseEditId = purchase.id;
  dom.purchaseForm.elements.entryId.value = purchase.id;
  dom.purchaseForm.elements.responsible.value = purchase.responsible;
  dom.purchaseForm.elements.date.value = purchase.date;
  dom.purchaseForm.elements.amount.value = formatMoneyInputValue(purchase.amount);
  const categoryState = getCategoryFieldState(purchase.category);
  dom.categorySelect.value = categoryState.selectValue;
  dom.customCategoryInput.value = categoryState.customValue;
  dom.paymentTypeSelect.value = purchase.paymentType;
  dom.cardSelect.value = purchase.cardId || "";
  dom.installmentsInput.value = purchase.installments;
  dom.purchaseForm.elements.notes.value = purchase.notes || "";
  renderAll();
}

function cancelPurchaseEdit(options = {}) {
  uiState.purchaseEditId = "";
  dom.purchaseForm.reset();
  dom.purchaseForm.elements.entryId.value = "";
  dom.purchaseForm.elements.responsible.value = "thales";
  dom.purchaseForm.elements.date.value = getCurrentDate();
  dom.categorySelect.value = DEFAULT_CATEGORIES[0];
  dom.customCategoryInput.value = "";
  dom.paymentTypeSelect.value = "pix";
  dom.cardSelect.value = "";
  dom.installmentsInput.value = "1";
  if (!options.silent) {
    renderAll();
  }
}

function handleCardSubmit(event) {
  event.preventDefault();

  const form = new FormData(dom.cardForm);
  const card = normalizeCard({
    id: cleanText(form.get("entryId")) || createId("card"),
    name: form.get("name"),
    closingDay: form.get("closingDay"),
    paymentDay: form.get("paymentDay"),
    updatedAt: nowIso(),
  });

  if (!card) {
    setSyncMessage("Não foi possível salvar esse cartão.", false);
    renderStatus();
    return;
  }

  if (uiState.cardEditId) {
    state.cards = state.cards.map((item) => (item.id === card.id ? card : item));
    setSyncMessage("Cartão atualizado no painel local.", false);
  } else {
    state.cards.push(card);
    setSyncMessage("Cartão salvo no painel local.", false);
  }

  cancelCardEdit({ silent: true });
  persistAndAutoSync("card");
}

function handleCardListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const cardId = button.dataset.id;
  const card = getCardById(cardId);
  if (!card) {
    return;
  }

  if (button.dataset.action === "edit-card") {
    startCardEdit(cardId);
    return;
  }

  if (button.dataset.action === "delete-card") {
    if (getCardUsageCount(cardId) > 0) {
      setSyncMessage("Esse cartão já está ligado a compras. Edite as compras antes de excluir.", false);
      renderStatus();
      return;
    }

    if (!window.confirm(`Excluir o cartão "${card.name}"?`)) {
      return;
    }

    state.cards = state.cards.filter((item) => item.id !== cardId);
    state.deletions.cards = upsertDeletion(state.deletions.cards, cardId);
    cancelCardEdit({ silent: true });
    setSyncMessage("Cartão excluído do painel local.", false);
    persistAndAutoSync("card");
  }
}

function startCardEdit(cardId) {
  const card = getCardById(cardId);
  if (!card) {
    return;
  }

  uiState.cardEditId = card.id;
  dom.cardForm.elements.entryId.value = card.id;
  dom.cardForm.elements.name.value = card.name;
  dom.cardForm.elements.closingDay.value = card.closingDay;
  dom.cardForm.elements.paymentDay.value = card.paymentDay;
  renderAll();
}

function cancelCardEdit(options = {}) {
  uiState.cardEditId = "";
  dom.cardForm.reset();
  dom.cardForm.elements.entryId.value = "";
  if (!options.silent) {
    renderAll();
  }
}

function handleBudgetSubmit(event) {
  event.preventDefault();

  const form = new FormData(dom.budgetForm);
  state.settings.budgetAmount = normalizeMoney(form.get("budgetAmount"));
  state.settings.budgetOwner = normalizeBudgetOwner(form.get("budgetOwner"));
  state.settings.updatedAt = nowIso();
  setSyncMessage("Orçamento salvo no painel local.", false);
  persistAndAutoSync("budget");
}

function clearBudget() {
  state.settings.budgetAmount = 0;
  state.settings.budgetOwner = "";
  state.settings.updatedAt = nowIso();
  setSyncMessage("Orçamento limpo no painel local.", false);
  persistAndAutoSync("budget");
}

function upsertDeletion(list, id) {
  return normalizeDeletionList([...list, { id, deletedAt: nowIso() }]);
}

function setSyncMessage(message, markSynced) {
  state.sync.lastSyncMessage = message;
  if (markSynced) {
    state.sync.lastSyncedAt = nowIso();
  }
}

function showToast(message, options = {}) {
  if (!dom.toastViewport) {
    return 0;
  }

  const tone = options.tone || "info";
  const sticky = Boolean(options.sticky);
  const duration = options.duration ?? 2200;
  const toastId = options.toastId || currentToastId + 1;

  currentToastId = toastId;
  window.clearTimeout(toastCloseTimer);

  dom.toastViewport.innerHTML = `
    <div class="toast toast-${escapeHtml(tone)}" data-toast-id="${escapeHtml(String(toastId))}">
      ${escapeHtml(message)}
    </div>
  `;

  const toast = dom.toastViewport.firstElementChild;
  if (toast) {
    window.requestAnimationFrame(() => {
      toast.classList.add("toast-visible");
    });
  }

  if (!sticky) {
    toastCloseTimer = window.setTimeout(() => {
      closeToast(toastId);
    }, duration);
  }

  return toastId;
}

function closeToast(toastId = currentToastId) {
  if (!dom.toastViewport || toastId !== currentToastId) {
    return;
  }

  const toast = dom.toastViewport.firstElementChild;
  if (!toast) {
    return;
  }

  toast.classList.remove("toast-visible");
  window.clearTimeout(toastCloseTimer);
  toastCloseTimer = window.setTimeout(() => {
    if (toastId !== currentToastId) {
      return;
    }
    dom.toastViewport.innerHTML = "";
  }, 220);
}

function handleMoneyInput(event) {
  event.target.value = formatDigitsAsMoney(event.target.value);
  if (event.target === dom.purchaseAmountInput) {
    renderPurchasePreview();
  }
}

function scheduleAutoSync(reason = "update") {
  if (!state?.sync?.scriptUrl) {
    return;
  }

  window.clearTimeout(autoSyncTimer);
  autoSyncTimer = window.setTimeout(() => {
    autoSyncTimer = 0;
    void syncWithGoogle({ automated: true, reason });
  }, reason === "init" ? 150 : AUTO_SYNC_DELAY_MS);
}

async function syncWithGoogle(options = {}) {
  if (syncInFlight) {
    syncQueued = true;
    return;
  }

  syncInFlight = true;
  const showSyncFeedback = shouldShowSyncFeedback(options.reason);
  const syncToastId = showSyncFeedback
    ? showToast("Sincronizando...", { tone: "info", sticky: true })
    : 0;
  try {
    setSyncMessage(
        options.automated
        ? "Sincronizando automaticamente com o Google Sheets..."
        : "Sincronizando com Google Sheets...",
      false
    );
    renderStatus();

    const remoteState = await fetchRemoteState(state.sync.scriptUrl);
    const merged = mergeStates(state, remoteState);
    const saved = await pushRemoteState(state.sync.scriptUrl, merged);
    const telegramWarning = getTelegramSyncWarning(saved.telegram);
    state = mergeStates(merged, saved.state);
    if (telegramWarning) {
      setSyncMessage(telegramWarning, true);
    } else {
      setSyncMessage(
        options.automated
        ? "Dados sincronizados automaticamente."
        : "Sincronização concluída com sucesso.",
        true
      );
    }
    if (showSyncFeedback) {
      showToast(telegramWarning ? "Telegram nao enviou." : "Sincronizado.", {
        toastId: syncToastId,
        tone: telegramWarning ? "error" : "success",
        duration: telegramWarning ? 2600 : 1200,
      });
    }
    persistState();
  } catch (error) {
    console.error(error);
    setSyncMessage(
      "Falha na sincronização. Atualize o Apps Script com a versão nova antes de tentar de novo.",
      false
    );
    showToast("Falha ao sincronizar.", {
      toastId: syncToastId || undefined,
      tone: "error",
      duration: 2200,
    });
    renderStatus();
  } finally {
    syncInFlight = false;
    if (syncQueued) {
      syncQueued = false;
      scheduleAutoSync("queued");
    }
  }
}

function shouldShowSyncFeedback(reason = "") {
  return ["init", "purchase", "card", "budget"].includes(reason);
}

async function fetchRemoteState(scriptUrl) {
  const response = await fetch(`${scriptUrl}?mode=pull&t=${Date.now()}`);
  if (!response.ok) {
    throw new Error("Falha ao buscar o estado remoto.");
  }

  const payload = await response.json();
  return normalizeState(payload?.payload || payload);
}

async function pushRemoteState(scriptUrl, payload) {
  const body = new URLSearchParams({
    mode: "replaceAll",
    payload: JSON.stringify(payload),
  });

  const response = await fetch(scriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Falha ao salvar o estado remoto.");
  }

  const result = await response.json();
  return {
    state: normalizeState(result?.payload || result),
    telegram: result?.telegram || null,
  };
}

function getTelegramSyncWarning(telegram) {
  if (!telegram || telegram.ok || telegram.skipped) {
    return "";
  }

  if (telegram.reason === "missing_bot_token") {
    return "Dados sincronizados, mas falta TELEGRAM_BOT_TOKEN no Apps Script.";
  }
  if (telegram.reason === "missing_chat_id") {
    return "Dados sincronizados, mas falta TELEGRAM_CHAT_ID no Apps Script.";
  }

  const failedResult = Array.isArray(telegram.results)
    ? telegram.results.find((result) => !result.ok)
    : null;
  const detail = cleanText(failedResult?.description || telegram.description);
  return detail
    ? `Dados sincronizados, mas o Telegram nao enviou: ${detail}`
    : "Dados sincronizados, mas o Telegram nao enviou.";
}

function mergeStates(localState, remoteState) {
  const local = normalizeState(localState);
  const remote = normalizeState(remoteState);

  const mergedCards = mergeCollection(
    local.cards,
    remote.cards,
    local.deletions.cards,
    remote.deletions.cards
  );
  const mergedPurchases = mergeCollection(
    local.purchases,
    remote.purchases,
    local.deletions.purchases,
    remote.deletions.purchases
  );
  const mergedSettings =
    remote.settings.updatedAt > local.settings.updatedAt ? remote.settings : local.settings;

  return normalizeState({
    version: 3,
    settings: {
      ...mergedSettings,
      selectedMonth: local.settings.selectedMonth,
    },
    sync: {
      scriptUrl: local.sync.scriptUrl || remote.sync.scriptUrl || DEFAULT_SCRIPT_URL,
      lastSyncedAt: local.sync.lastSyncedAt || remote.sync.lastSyncedAt || "",
      lastSyncMessage: local.sync.lastSyncMessage || remote.sync.lastSyncMessage || "",
    },
    cards: mergedCards.items,
    purchases: mergedPurchases.items,
    deletions: {
      cards: mergedCards.deletions,
      purchases: mergedPurchases.deletions,
    },
  });
}

function mergeCollection(localItems, remoteItems, localDeletions, remoteDeletions) {
  const itemsById = new Map();
  [...localItems, ...remoteItems].forEach((item) => {
    const current = itemsById.get(item.id);
    if (!current || item.updatedAt > current.updatedAt) {
      itemsById.set(item.id, item);
    }
  });

  const deletionsById = new Map();
  [...localDeletions, ...remoteDeletions].forEach((entry) => {
    const current = deletionsById.get(entry.id);
    if (!current || entry.deletedAt > current.deletedAt) {
      deletionsById.set(entry.id, entry);
    }
  });

  const items = [];
  itemsById.forEach((item) => {
    const deletion = deletionsById.get(item.id);
    if (deletion && deletion.deletedAt >= item.updatedAt) {
      return;
    }
    items.push(item);
  });

  return {
    items: items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    deletions: Array.from(deletionsById.values()),
  };
}

function renderSelectOptions() {
  if (!(dom.purchaseForm && dom.responsibleSelect && dom.categorySelect && dom.cardSelect)) {
    if (dom.summaryResponsibleFilter) {
      setSelectOptions(
        dom.summaryResponsibleFilter,
        [{ value: "all", label: "Todos" }].concat(
          PEOPLE.map((person) => ({ value: person.id, label: person.name }))
        ),
        uiState.filters.responsible
      );
    }

    if (dom.summaryCardFilter) {
      setSelectOptions(
        dom.summaryCardFilter,
        [{ value: "all", label: "Todos" }, { value: "__sem_cartao__", label: "Sem cartão" }].concat(
          state.cards.map((card) => ({ value: card.id, label: card.name }))
        ),
        uiState.filters.cardId
      );
    }

    if (dom.budgetForm) {
      dom.budgetForm.elements.budgetAmount.value = formatMoneyInputValue(state.settings.budgetAmount);
      dom.budgetForm.elements.budgetOwner.value = state.settings.budgetOwner || "";
    }
    return;
  }

  const categoryState = getCategoryFieldState(getCurrentCategoryValueFromUi());
  const selectedResponsible = cleanText(dom.purchaseForm.elements.responsible.value);
  const selectedPaymentType = cleanText(dom.paymentTypeSelect?.value);

  setSelectOptions(
    dom.responsibleSelect,
    [{ value: "", label: "Escolher" }].concat(
      PEOPLE.map((person) => ({ value: person.id, label: person.name }))
    ),
    selectedResponsible
  );

  setSelectOptions(
    dom.categorySelect,
    [{ value: "", label: "Escolher" }].concat(
      DEFAULT_CATEGORIES.map((category) => ({ value: category, label: category })),
      { value: OTHER_CATEGORY_VALUE, label: "Outro (digitar)" }
    ),
    categoryState.selectValue
  );
  dom.customCategoryInput.value = categoryState.customValue;

  setSelectOptions(
    dom.paymentTypeSelect,
    [{ value: "", label: "Escolher" }].concat(
      Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))
    ),
    selectedPaymentType
  );

  setSelectOptions(
    dom.cardSelect,
    [{ value: "", label: "Não se aplica" }].concat(
      state.cards.map((card) => ({ value: card.id, label: card.name }))
    ),
    dom.purchaseForm.elements.cardId.value || ""
  );

  setSelectOptions(
    dom.summaryResponsibleFilter,
    [{ value: "all", label: "Todos" }].concat(
      PEOPLE.map((person) => ({ value: person.id, label: person.name }))
    ),
    uiState.filters.responsible
  );

  setSelectOptions(
    dom.summaryCardFilter,
    [{ value: "all", label: "Todos" }, { value: "__sem_cartao__", label: "Sem cartão" }].concat(
      state.cards.map((card) => ({ value: card.id, label: card.name }))
    ),
    uiState.filters.cardId
  );

  if (dom.budgetForm) {
    dom.budgetForm.elements.budgetAmount.value = formatMoneyInputValue(state.settings.budgetAmount);
    dom.budgetForm.elements.budgetOwner.value = state.settings.budgetOwner || "";
  }
}

function renderPurchaseFormState() {
  if (
    !dom.purchaseForm ||
    !dom.categorySelect ||
    !dom.paymentTypeSelect ||
    !dom.cardSelect ||
    !dom.installmentsInput ||
    !dom.purchaseSubmitButton ||
    !dom.purchaseCancelButton ||
    !dom.purchaseFormHint
  ) {
    return;
  }

  const editing = Boolean(uiState.purchaseEditId);
  const isCredit = dom.paymentTypeSelect.value === "credito";
  const isCustomCategory = dom.categorySelect.value === OTHER_CATEGORY_VALUE;

  dom.cardSelect.disabled = !isCredit;
  dom.installmentsInput.disabled = !isCredit;
  if (!isCredit) {
    dom.cardSelect.value = "";
    dom.installmentsInput.value = "1";
  }

  dom.customCategoryField.classList.toggle("hidden", !isCustomCategory);
  dom.customCategoryInput.disabled = !isCustomCategory;
  dom.customCategoryInput.required = isCustomCategory;
  if (!isCustomCategory) {
    dom.customCategoryInput.value = "";
  }

  dom.purchaseSubmitButton.textContent = editing ? "Salvar alterações" : "Salvar gasto";
  dom.purchaseCancelButton.classList.toggle("hidden", !editing);

  if (editing) {
    dom.purchaseFormHint.textContent = "Você está editando uma compra já cadastrada.";
  } else if (!dom.paymentTypeSelect.value) {
    dom.purchaseFormHint.textContent = "Escolha os campos principais para registrar o gasto.";
  } else if (isCredit && !state.cards.length) {
    dom.purchaseFormHint.textContent = "Cadastre um cartão antes de lançar compras no crédito.";
  } else if (isCustomCategory) {
    dom.purchaseFormHint.textContent = "Use Outro para detalhar uma categoria livre sem bagunçar a lista principal.";
  } else {
    dom.purchaseFormHint.textContent = "Se for no crédito, o sistema calcula sozinho o mês de cobrança.";
  }

  if (dom.cardSubmitButton && dom.cardCancelButton && dom.cardFormHint) {
    dom.cardSubmitButton.textContent = uiState.cardEditId ? "Salvar alterações" : "Salvar cartão";
    dom.cardCancelButton.classList.toggle("hidden", !uiState.cardEditId);
    dom.cardFormHint.textContent = uiState.cardEditId
      ? "Editar um cartão recalcula as compras ligadas a ele."
      : "O fechamento define em qual mês cada compra entra.";
  }
}

function renderMonthCharges() {
  if (!dom.monthSummaryText || !dom.monthCharges) {
    return;
  }

  const summary = getMonthlySummary(state.settings.selectedMonth);
  const filteredCharges = applySummaryFilters(summary.charges);
  const filteredTotal = sum(filteredCharges.map((charge) => charge.amount));

  dom.monthSummaryText.textContent =
    filteredCharges.length > 0
      ? `${filteredCharges.length} item(ns) cobrados no mês, somando ${formatCurrency(filteredTotal)}.`
      : `Nenhum gasto encontrado para ${formatMonthLabel(state.settings.selectedMonth)} com os filtros atuais.`;

  if (!filteredCharges.length) {
    dom.monthCharges.innerHTML = `
      <div class="empty-state">
        <p>Quando vocês começarem a lançar compras, o mês aparece aqui já organizado pela cobrança certa.</p>
      </div>
    `;
    return;
  }

  dom.monthCharges.innerHTML = filteredCharges
    .map((charge) => {
      const metaItems = [
        `Compra em ${formatDate(charge.purchaseDate)}`,
        charge.paymentTypeLabel,
        charge.cardName ? `Cartão ${charge.cardName}` : `Lançado em ${formatMonthLabel(charge.chargeMonth)}`,
      ];

      if (charge.paymentType === "credito") {
        metaItems.push(`Parcela ${charge.installmentIndex}/${charge.installments}`);
        metaItems.push(`Vence em ${formatDate(charge.dueDate)}`);
      }

      return `
        <article class="charge-card">
          <div class="charge-card-head">
            <div class="charge-card-main">
              <strong class="charge-card-title">${escapeHtml(charge.category)}</strong>
              <span class="tag tag-neutral">${escapeHtml(charge.responsibleLabel)}</span>
            </div>
            <strong class="charge-card-amount">${escapeHtml(formatCurrency(charge.amount))}</strong>
          </div>
          <div class="charge-card-meta">
            ${metaItems.map((item) => `<span class="charge-card-line">${escapeHtml(item)}</span>`).join("")}
            ${
              charge.notes
                ? `<span class="charge-card-line charge-card-note">Observação: ${escapeHtml(charge.notes)}</span>`
                : ""
            }
          </div>
          <div class="charge-card-actions">
            <button class="ghost-button" type="button" data-action="edit-purchase" data-id="${escapeHtml(charge.purchaseId)}">Editar</button>
            <button class="ghost-button" type="button" data-action="delete-purchase" data-id="${escapeHtml(charge.purchaseId)}">Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function handlePurchaseSubmit(event) {
  event.preventDefault();

  const form = new FormData(dom.purchaseForm);
  const responsible = cleanText(form.get("responsible"));
  const date = cleanText(form.get("date"));
  const paymentType = cleanText(form.get("paymentType"));
  const cardId = cleanText(form.get("cardId"));
  const category = getCategoryFromForm();
  const installments =
    paymentType === "credito" ? clampInteger(form.get("installments"), 1, 48, 1) : 1;

  if (!PEOPLE.some((person) => person.id === responsible)) {
    setSyncMessage("Escolha quem fez o gasto.", false);
    showToast("Escolha o responsável.", { tone: "error", duration: 1800 });
    return;
  }

  if (!isValidDate(date)) {
    setSyncMessage("Escolha a data do gasto.", false);
    showToast("Escolha a data do gasto.", { tone: "error", duration: 1800 });
    return;
  }

  if (!category) {
    setSyncMessage("Escolha a categoria do gasto.", false);
    showToast("Escolha a categoria.", { tone: "error", duration: 1800 });
    return;
  }

  if (!Object.prototype.hasOwnProperty.call(PAYMENT_TYPE_LABELS, paymentType)) {
    setSyncMessage("Escolha o tipo de pagamento.", false);
    showToast("Escolha o tipo de pagamento.", { tone: "error", duration: 1800 });
    return;
  }

  if (dom.categorySelect.value === OTHER_CATEGORY_VALUE && !category) {
    setSyncMessage("Descreva a categoria quando escolher Outro.", false);
    showToast("Descreva a categoria em Outro.", { tone: "error", duration: 1800 });
    return;
  }

  if (paymentType === "credito" && !cardId) {
    setSyncMessage("Selecione um cartão para compras no crédito.", false);
    showToast("Selecione um cartão para o crédito.", { tone: "error", duration: 1800 });
    return;
  }

  const purchase = normalizePurchase({
    id: cleanText(form.get("entryId")) || createId("purchase"),
    responsible,
    date,
    amount: form.get("amount"),
    category,
    paymentType,
    cardId,
    installments,
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!purchase) {
    setSyncMessage("Não foi possível salvar esse gasto.", false);
    showToast("Confira o valor do gasto.", { tone: "error", duration: 1800 });
    return;
  }

  if (uiState.purchaseEditId) {
    state.purchases = state.purchases.map((item) => (item.id === purchase.id ? purchase : item));
    setSyncMessage("Gasto atualizado no painel local.", false);
    showToast("Lançamento atualizado.", { tone: "success", duration: 1600 });
  } else {
    state.purchases.unshift(purchase);
    setSyncMessage("Gasto salvo no painel local.", false);
    showToast("Lançamento cadastrado.", { tone: "success", duration: 1600 });
  }

  cancelPurchaseEdit({ silent: true });
  persistAndAutoSync("purchase");
}

function cancelPurchaseEdit(options = {}) {
  uiState.purchaseEditId = "";
  dom.purchaseForm.reset();
  dom.purchaseForm.elements.entryId.value = "";
  dom.purchaseForm.elements.responsible.value = "";
  dom.purchaseForm.elements.date.value = "";
  dom.categorySelect.value = "";
  dom.customCategoryInput.value = "";
  dom.paymentTypeSelect.value = "";
  dom.cardSelect.value = "";
  dom.installmentsInput.value = "1";
  dom.purchaseForm.elements.notes.value = "";

  if (!options.silent) {
    renderAll();
  }
}
