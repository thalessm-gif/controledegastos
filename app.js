const STORAGE_KEY = "controle-casa-v1";
const DEFAULT_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwRoIHfXYo-krTAN4hIOgMUjlw25korrgBRymX1sC_QuG8gJOK4q5PfoVoN0z3BAKRF/exec";
const DEFAULT_CATEGORIES = [
  "Mercado",
  "Moradia",
  "Contas",
  "Saude",
  "Transporte",
  "Casa",
  "Educacao",
  "Lazer",
  "Pets",
  "Outros",
];

const PAYMENT_METHOD_LABELS = {
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
};

let state = null;
const uiState = {
  activeForm: "expense",
  expenseEditId: "",
  installmentEditId: "",
  filters: {
    search: "",
    personId: "all",
    category: "all",
    cardName: "all",
    type: "all",
    status: "all",
  },
};

const dom = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDom();
  state = loadState();
  wireEvents();
  hydrateFormDefaults();
  renderAll();
}

function cacheDom() {
  dom.householdTitle = document.querySelector("#householdTitle");
  dom.selectedMonth = document.querySelector("#selectedMonth");
  dom.syncNowButton = document.querySelector("#syncNowButton");
  dom.dataModeBadge = document.querySelector("#dataModeBadge");
  dom.syncStatus = document.querySelector("#syncStatus");
  dom.statsGrid = document.querySelector("#statsGrid");
  dom.expenseForm = document.querySelector("#expenseForm");
  dom.installmentForm = document.querySelector("#installmentForm");
  dom.monthTable = document.querySelector("#monthTable");
  dom.monthTableSummary = document.querySelector("#monthTableSummary");
  dom.categoryBreakdown = document.querySelector("#categoryBreakdown");
  dom.installmentsList = document.querySelector("#installmentsList");
  dom.monthClosingPanel = document.querySelector("#monthClosingPanel");
  dom.settingsForm = document.querySelector("#settingsForm");
  dom.importFile = document.querySelector("#importFile");
  dom.categoryOptions = document.querySelector("#categoryOptions");
  dom.pullGoogleButton = document.querySelector("#pullGoogleButton");
  dom.pushGoogleButton = document.querySelector("#pushGoogleButton");
  dom.exportButton = document.querySelector("#exportButton");
  dom.importButton = document.querySelector("#importButton");
  dom.clearDemoButton = document.querySelector("#clearDemoButton");
  dom.segmentButtons = document.querySelectorAll(".segment-button");
  dom.expensePersonSelect = document.querySelector("#expensePersonSelect");
  dom.installmentPersonSelect = document.querySelector("#installmentPersonSelect");
  dom.expenseSubmitButton = document.querySelector("#expenseSubmitButton");
  dom.installmentSubmitButton = document.querySelector("#installmentSubmitButton");
  dom.expenseCancelButton = document.querySelector("#expenseCancelButton");
  dom.installmentCancelButton = document.querySelector("#installmentCancelButton");
  dom.expenseFormHint = document.querySelector("#expenseFormHint");
  dom.installmentFormHint = document.querySelector("#installmentFormHint");
  dom.searchFilter = document.querySelector("#searchFilter");
  dom.personFilter = document.querySelector("#personFilter");
  dom.categoryFilter = document.querySelector("#categoryFilter");
  dom.cardFilter = document.querySelector("#cardFilter");
  dom.typeFilter = document.querySelector("#typeFilter");
  dom.statusFilter = document.querySelector("#statusFilter");
  dom.clearFiltersButton = document.querySelector("#clearFiltersButton");
}

function wireEvents() {
  dom.selectedMonth.addEventListener("change", handleMonthChange);
  dom.syncNowButton.addEventListener("click", () => syncWithGoogle("merge"));

  dom.segmentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      uiState.activeForm = button.dataset.formTarget;
      renderFormMode();
    });
  });

  dom.expenseForm.addEventListener("submit", handleExpenseSubmit);
  dom.installmentForm.addEventListener("submit", handleInstallmentSubmit);
  dom.settingsForm.addEventListener("submit", handleSettingsSubmit);
  dom.monthTable.addEventListener("click", handleMonthTableClick);
  dom.installmentsList.addEventListener("click", handleInstallmentListClick);

  dom.pullGoogleButton.addEventListener("click", () => syncWithGoogle("pull"));
  dom.pushGoogleButton.addEventListener("click", () => syncWithGoogle("push"));
  dom.exportButton.addEventListener("click", exportState);
  dom.importButton.addEventListener("click", () => dom.importFile.click());
  dom.importFile.addEventListener("change", importStateFromFile);
  dom.clearDemoButton.addEventListener("click", clearDemoData);
  dom.expenseCancelButton.addEventListener("click", cancelExpenseEdit);
  dom.installmentCancelButton.addEventListener("click", cancelInstallmentEdit);
  dom.clearFiltersButton.addEventListener("click", clearFilters);
  dom.monthClosingPanel.addEventListener("click", handleMonthClosingClick);

  [
    dom.searchFilter,
    dom.personFilter,
    dom.categoryFilter,
    dom.cardFilter,
    dom.typeFilter,
    dom.statusFilter,
  ].forEach((element) => {
    element.addEventListener("input", handleFilterChange);
    element.addEventListener("change", handleFilterChange);
  });

  dom.expenseForm.elements.date.addEventListener("change", () => {
    if (!dom.expenseForm.elements.referenceMonth.value) {
      dom.expenseForm.elements.referenceMonth.value = getMonthFromDate(
        dom.expenseForm.elements.date.value
      );
    }
  });

  dom.installmentForm.elements.purchaseDate.addEventListener("change", () => {
    if (!dom.installmentForm.elements.firstMonth.value) {
      dom.installmentForm.elements.firstMonth.value = getMonthFromDate(
        dom.installmentForm.elements.purchaseDate.value
      );
    }
  });
}

function createEmptyState() {
  return {
    version: 1,
    seededDemo: false,
    settings: {
      householdLabel: "Painel financeiro da casa",
      people: [
        { id: "person-1", name: "Você" },
        { id: "person-2", name: "Sua esposa" },
      ],
      monthlyBudget: 5000,
      selectedMonth: getCurrentMonth(),
      categories: [...DEFAULT_CATEGORIES],
      updatedAt: nowIso(),
    },
    sync: {
      scriptUrl: DEFAULT_SCRIPT_URL,
      autoSync: false,
      lastSyncedAt: "",
      lastSyncMessage: "Sincronização ainda não configurada.",
    },
    expenses: [],
    installments: [],
    monthClosures: [],
    deletions: {
      expenses: [],
      installments: [],
    },
  };
}

function buildDemoState() {
  const demo = createEmptyState();
  const currentMonth = demo.settings.selectedMonth;
  const lastMonth = addMonths(currentMonth, -1);

  demo.seededDemo = true;
  demo.settings.people = [
    { id: "person-1", name: "Thales" },
    { id: "person-2", name: "Esposa" },
  ];
  demo.settings.monthlyBudget = 6500;
  demo.settings.categories = [
    ...DEFAULT_CATEGORIES,
    "Assinaturas",
    "Farmacia",
    "Restaurante",
  ];
  demo.expenses = [
    {
      id: "exp-demo-1",
      date: `${currentMonth}-03`,
      referenceMonth: currentMonth,
      description: "Supermercado do mês",
      category: "Mercado",
      amount: 428.35,
      personId: "person-1",
      paymentMethod: "debito",
      notes: "Compra grande da quinzena",
      updatedAt: nowIso(),
    },
    {
      id: "exp-demo-2",
      date: `${currentMonth}-05`,
      referenceMonth: currentMonth,
      description: "Internet fibra",
      category: "Contas",
      amount: 119.9,
      personId: "person-2",
      paymentMethod: "pix",
      notes: "",
      updatedAt: nowIso(),
    },
    {
      id: "exp-demo-3",
      date: `${currentMonth}-09`,
      referenceMonth: currentMonth,
      description: "Farmacia",
      category: "Saude",
      amount: 87.42,
      personId: "person-2",
      paymentMethod: "credito",
      notes: "Medicamentos",
      updatedAt: nowIso(),
    },
    {
      id: "exp-demo-4",
      date: `${lastMonth}-28`,
      referenceMonth: currentMonth,
      description: "Combustível",
      category: "Transporte",
      amount: 160,
      personId: "person-1",
      paymentMethod: "credito",
      notes: "Lançado na fatura deste mês",
      updatedAt: nowIso(),
    },
  ];

  demo.installments = [
    normalizeInstallment({
      id: "inst-demo-1",
      purchaseDate: `${lastMonth}-12`,
      description: "Sofá da sala",
      category: "Casa",
      totalAmount: 2899.9,
      installmentCount: 10,
      paidInstallments: 2,
      firstMonth: lastMonth,
      personId: "person-1",
      cardName: "Visa Casa",
      notes: "Parcela fixa da reforma",
      updatedAt: nowIso(),
    }),
    normalizeInstallment({
      id: "inst-demo-2",
      purchaseDate: `${currentMonth}-02`,
      description: "Air fryer",
      category: "Casa",
      totalAmount: 459.8,
      installmentCount: 4,
      paidInstallments: 1,
      firstMonth: currentMonth,
      personId: "person-2",
      cardName: "Master Família",
      notes: "",
      updatedAt: nowIso(),
    }),
  ];

  return demo;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const initialState = createEmptyState();
      persistState({ skipRender: true, skipAutoSync: true }, initialState);
      return initialState;
    }

    return normalizeState(JSON.parse(saved));
  } catch (error) {
    console.error(error);
    return buildDemoState();
  }
}

function normalizeState(rawState) {
  const empty = createEmptyState();
  const normalized = {
    version: 1,
    seededDemo: Boolean(rawState?.seededDemo),
    settings: {
      ...empty.settings,
      ...(rawState?.settings || {}),
    },
    sync: {
      ...empty.sync,
      ...(rawState?.sync || {}),
    },
    expenses: Array.isArray(rawState?.expenses)
      ? rawState.expenses.map(normalizeExpense).filter(Boolean)
      : [],
    installments: Array.isArray(rawState?.installments)
      ? rawState.installments.map(normalizeInstallment).filter(Boolean)
      : [],
    monthClosures: Array.isArray(rawState?.monthClosures)
      ? rawState.monthClosures.map(normalizeMonthClosure).filter(Boolean)
      : [],
    deletions: {
      expenses: normalizeDeletionList(rawState?.deletions?.expenses),
      installments: normalizeDeletionList(rawState?.deletions?.installments),
    },
  };

  if (!Array.isArray(normalized.settings.people) || normalized.settings.people.length < 2) {
    normalized.settings.people = empty.settings.people;
  } else {
    normalized.settings.people = normalized.settings.people.map((person, index) => ({
      id: person.id || `person-${index + 1}`,
      name: cleanText(person.name) || `Pessoa ${index + 1}`,
    }));
  }

  const rawCategories = Array.isArray(normalized.settings.categories)
    ? normalized.settings.categories
    : [];

  normalized.settings.categories = Array.from(
    new Set(
      [...DEFAULT_CATEGORIES, ...rawCategories]
        .map((category) => cleanText(category))
        .filter(Boolean)
    )
  );

  normalized.settings.householdLabel =
    cleanText(normalized.settings.householdLabel) || empty.settings.householdLabel;
  normalized.settings.selectedMonth =
    isValidMonth(normalized.settings.selectedMonth) && normalized.settings.selectedMonth
      ? normalized.settings.selectedMonth
      : getCurrentMonth();
  normalized.settings.monthlyBudget = normalizeMoney(normalized.settings.monthlyBudget);
  normalized.settings.updatedAt = normalized.settings.updatedAt || nowIso();
  normalized.sync.scriptUrl = cleanText(normalized.sync.scriptUrl) || DEFAULT_SCRIPT_URL;
  normalized.monthClosures = mergeMonthClosures(normalized.monthClosures, []);

  return normalized;
}

function normalizeExpense(expense) {
  if (!expense) {
    return null;
  }

  const normalized = {
    id: expense.id || createId("exp"),
    date: isValidDate(expense.date) ? expense.date : getCurrentDate(),
    referenceMonth: isValidMonth(expense.referenceMonth)
      ? expense.referenceMonth
      : getCurrentMonth(),
    description: cleanText(expense.description) || "Gasto sem descrição",
    category: cleanText(expense.category) || "Outros",
    amount: normalizeMoney(expense.amount),
    personId: cleanText(expense.personId) || "person-1",
    paymentMethod: PAYMENT_METHOD_LABELS[expense.paymentMethod]
      ? expense.paymentMethod
      : "pix",
    cardName: cleanText(expense.cardName),
    notes: cleanText(expense.notes),
    updatedAt: expense.updatedAt || nowIso(),
  };

  return normalized.amount > 0 ? normalized : null;
}

function normalizeInstallment(installment) {
  if (!installment) {
    return null;
  }

  const count = clampInteger(installment.installmentCount, 2, 48, 2);
  const totalAmount = normalizeMoney(installment.totalAmount);
  const installmentAmounts = Array.isArray(installment.installmentAmounts)
    ? installment.installmentAmounts.map((value) => normalizeMoney(value))
    : splitInstallments(totalAmount, count);

  const normalized = {
    id: installment.id || createId("inst"),
    purchaseDate: isValidDate(installment.purchaseDate)
      ? installment.purchaseDate
      : getCurrentDate(),
    description: cleanText(installment.description) || "Compra parcelada",
    category: cleanText(installment.category) || "Outros",
    totalAmount,
    installmentCount: count,
    paidInstallments: clampInteger(installment.paidInstallments, 0, count, 0),
    firstMonth: isValidMonth(installment.firstMonth)
      ? installment.firstMonth
      : getCurrentMonth(),
    personId: cleanText(installment.personId) || "person-1",
    cardName: cleanText(installment.cardName) || "Cartão",
    notes: cleanText(installment.notes),
    installmentAmounts,
    updatedAt: installment.updatedAt || nowIso(),
  };

  return normalized.totalAmount > 0 ? normalized : null;
}

function normalizeMonthClosure(monthClosure) {
  if (!monthClosure || !isValidMonth(monthClosure.month)) {
    return null;
  }

  return {
    id: monthClosure.id || monthClosure.month,
    month: monthClosure.month,
    status: monthClosure.status === "closed" ? "closed" : "open",
    closedAt: monthClosure.closedAt || "",
    note: cleanText(monthClosure.note),
    monthTotal: normalizeMoney(monthClosure.monthTotal),
    itemCount: clampInteger(monthClosure.itemCount, 0, 100000, 0),
    byPerson: Array.isArray(monthClosure.byPerson)
      ? monthClosure.byPerson.map((person) => ({
          id: cleanText(person.id) || "person-1",
          name: cleanText(person.name) || "Pessoa",
          total: normalizeMoney(person.total),
          share: clampInteger(person.share, 0, 100, 0),
        }))
      : [],
    categoryTotals: Array.isArray(monthClosure.categoryTotals)
      ? monthClosure.categoryTotals.map((category) => ({
          name: cleanText(category.name) || "Outros",
          total: normalizeMoney(category.total),
          share: cleanText(category.share),
        }))
      : [],
    remainingInstallmentsAmount: normalizeMoney(monthClosure.remainingInstallmentsAmount),
    paidInstallmentsAmount: normalizeMoney(monthClosure.paidInstallmentsAmount),
    openInstallments: clampInteger(monthClosure.openInstallments, 0, 100000, 0),
    paidInstallmentsCount: clampInteger(monthClosure.paidInstallmentsCount, 0, 100000, 0),
    updatedAt: monthClosure.updatedAt || nowIso(),
  };
}

function normalizeDeletionList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  const map = new Map();

  list.forEach((item) => {
    if (!item || !item.id || !item.deletedAt) {
      return;
    }

    const existing = map.get(item.id);
    if (!existing || item.deletedAt > existing.deletedAt) {
      map.set(item.id, {
        id: item.id,
        deletedAt: item.deletedAt,
      });
    }
  });

  return Array.from(map.values());
}

function hydrateFormDefaults() {
  dom.selectedMonth.value = state.settings.selectedMonth;
  dom.expenseForm.elements.date.value = getCurrentDate();
  dom.expenseForm.elements.referenceMonth.value = state.settings.selectedMonth;
  dom.installmentForm.elements.purchaseDate.value = getCurrentDate();
  dom.installmentForm.elements.firstMonth.value = state.settings.selectedMonth;
}

function renderAll() {
  renderHeader();
  renderFormMode();
  populatePeopleOptions();
  populateCategoryOptions();
  renderFilters();
  renderFormStates();
  renderStats();
  renderMonthTable();
  renderCategoryBreakdown();
  renderInstallments();
  renderMonthClosure();
  renderSettings();
  renderStatus();
}

function renderHeader() {
  dom.householdTitle.textContent = state.settings.householdLabel;
  dom.selectedMonth.value = state.settings.selectedMonth;
}

function renderFormMode() {
  dom.segmentButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.formTarget === uiState.activeForm);
  });

  dom.expenseForm.classList.toggle("hidden", uiState.activeForm !== "expense");
  dom.installmentForm.classList.toggle("hidden", uiState.activeForm !== "installment");
}

function populatePeopleOptions() {
  const options = state.settings.people
    .map((person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`)
    .join("");

  const currentExpenseValue = dom.expensePersonSelect.value;
  const currentInstallmentValue = dom.installmentPersonSelect.value;

  dom.expensePersonSelect.innerHTML = options;
  dom.installmentPersonSelect.innerHTML = options;

  dom.expensePersonSelect.value =
    currentExpenseValue || state.settings.people[0]?.id || "person-1";
  dom.installmentPersonSelect.value =
    currentInstallmentValue || state.settings.people[0]?.id || "person-1";
}

function populateCategoryOptions() {
  dom.categoryOptions.innerHTML = state.settings.categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

function renderFilters() {
  const monthItems = getMonthlyItems(state.settings.selectedMonth);
  const categories = Array.from(
    new Set(monthItems.map((item) => item.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const cards = Array.from(
    new Set(
      monthItems
        .map((item) => item.cardName)
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  dom.searchFilter.value = uiState.filters.search;
  dom.personFilter.innerHTML = [
    `<option value="all">Todas</option>`,
    ...state.settings.people.map(
      (person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`
    ),
  ].join("");
  dom.categoryFilter.innerHTML = [
    `<option value="all">Todas</option>`,
    ...categories.map(
      (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ),
  ].join("");
  dom.cardFilter.innerHTML = [
    `<option value="all">Todos</option>`,
    `<option value="__none__">Sem cartao</option>`,
    ...cards.map((card) => `<option value="${escapeHtml(card)}">${escapeHtml(card)}</option>`),
  ].join("");

  dom.personFilter.value = ensureFilterOption(dom.personFilter, uiState.filters.personId);
  dom.categoryFilter.value = ensureFilterOption(dom.categoryFilter, uiState.filters.category);
  dom.cardFilter.value = ensureFilterOption(dom.cardFilter, uiState.filters.cardName);
  dom.typeFilter.value = ensureFilterOption(dom.typeFilter, uiState.filters.type);
  dom.statusFilter.value = ensureFilterOption(dom.statusFilter, uiState.filters.status);
}

function renderFormStates() {
  const expenseMode = uiState.expenseEditId ? "edit" : "create";
  const installmentMode = uiState.installmentEditId ? "edit" : "create";
  const selectedMonthClosed = isMonthClosed(state.settings.selectedMonth);

  dom.expenseSubmitButton.textContent =
    expenseMode === "edit" ? "Salvar alteracoes" : "Salvar gasto";
  dom.installmentSubmitButton.textContent =
    installmentMode === "edit" ? "Salvar alteracoes" : "Salvar parcelado";
  dom.expenseCancelButton.classList.toggle("hidden", expenseMode !== "edit");
  dom.installmentCancelButton.classList.toggle("hidden", installmentMode !== "edit");
  dom.expenseFormHint.textContent =
    expenseMode === "edit"
      ? "Edite o gasto e salve para atualizar a linha existente."
      : selectedMonthClosed
        ? "Este mes esta fechado. Ainda e possivel lancar para outro mes aberto."
        : "Registre compras do dia a dia e deixe o mes de referencia certo.";
  dom.installmentFormHint.textContent =
    installmentMode === "edit"
      ? "Edite a compra parcelada inteira, inclusive cartao e numero de parcelas."
      : selectedMonthClosed
        ? "Se a primeira fatura cair em mes fechado, o app vai bloquear a gravacao."
        : "Use para compras grandes no cartao e acompanhe parcela por parcela.";
}

function renderStats() {
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const budget = state.settings.monthlyBudget || 0;
  const budgetUsage = budget > 0 ? (summary.monthTotal / budget) * 100 : 0;
  const installmentBalance = summary.remainingInstallmentsAmount;
  const paidInstallmentAmount = summary.paidInstallmentsAmount;

  const stats = [
    {
      label: "Total do mês",
      value: formatCurrency(summary.monthTotal),
      support: `${summary.items.length} lançamentos no mês`,
      progress: budget > 0 ? Math.min(100, budgetUsage) : 0,
    },
    {
      label: "Orçamento usado",
      value: budget > 0 ? `${Math.round(budgetUsage)}%` : "Sem meta",
      support:
        budget > 0
          ? `${formatCurrency(Math.max(0, budget - summary.monthTotal))} ainda livres`
          : "Defina um orçamento para acompanhar",
      progress: Math.min(100, budgetUsage || 0),
    },
    {
      label: "Parcelados em aberto",
      value: formatCurrency(installmentBalance),
      support: `${summary.openInstallments} compras ainda ativas`,
      progress:
        installmentBalance + paidInstallmentAmount > 0
          ? Math.round(
              (paidInstallmentAmount / (installmentBalance + paidInstallmentAmount)) * 100
            )
          : 0,
    },
    {
      label: "Parcelados já pagos",
      value: formatCurrency(paidInstallmentAmount),
      support: `${summary.paidInstallmentsCount} parcelas registradas como pagas`,
      progress:
        installmentBalance + paidInstallmentAmount > 0
          ? Math.round(
              (paidInstallmentAmount / (installmentBalance + paidInstallmentAmount)) * 100
            )
          : 0,
    },
    ...summary.byPerson.map((item) => ({
      label: item.name,
      value: formatCurrency(item.total),
      support: `${item.share}% do total da casa neste mês`,
      progress: item.share,
    })),
  ];

  dom.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <span class="stat-label">${escapeHtml(stat.label)}</span>
          <strong class="stat-value">${escapeHtml(stat.value)}</strong>
          <span class="stat-support">${escapeHtml(stat.support)}</span>
          <div class="progress-shell">
            <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, stat.progress || 0))}%"></div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMonthTable() {
  const summary = getMonthlySummary(state.settings.selectedMonth);

  if (!summary.items.length) {
    dom.monthTable.innerHTML = `
      <div class="empty-state">
        <p>Nenhum lançamento encontrado para ${formatMonthLabel(state.settings.selectedMonth)}.</p>
      </div>
    `;
    return;
  }

  dom.monthTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Data</th>
          <th>Categoria</th>
          <th>Pessoa</th>
          <th>Status</th>
          <th>Valor</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        ${summary.items
          .map((item) => {
            const canDelete = item.source === "expense";
            return `
              <tr>
                <td>
                  <strong>${escapeHtml(item.description)}</strong>
                  <span class="installment-subtitle">${escapeHtml(item.detail)}</span>
                </td>
                <td>${escapeHtml(formatDate(item.date))}</td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.personName)}</td>
                <td>${renderTagHtml(item.statusTone, item.status)}</td>
                <td class="amount-cell">${escapeHtml(formatCurrency(item.amount))}</td>
                <td>
                  ${
                    canDelete
                      ? `<button class="button button-secondary table-action" type="button" data-action="delete-expense" data-id="${escapeHtml(item.id)}">Excluir</button>`
                      : `<span class="tag tag-neutral">Gerencie ao lado</span>`
                  }
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderCategoryBreakdown() {
  const summary = getMonthlySummary(state.settings.selectedMonth);

  if (!summary.categoryTotals.length) {
    dom.categoryBreakdown.innerHTML = `
      <div class="empty-state">
        <p>As categorias vão aparecer aqui conforme os gastos forem entrando.</p>
      </div>
    `;
    return;
  }

  dom.categoryBreakdown.innerHTML = summary.categoryTotals
    .map((category) => {
      const width = summary.monthTotal > 0 ? (category.total / summary.monthTotal) * 100 : 0;
      return `
        <div class="category-row">
          <div>
            <div class="category-title">
              <strong>${escapeHtml(category.name)}</strong>
              <span>${escapeHtml(formatCurrency(category.total))}</span>
            </div>
            <div class="mini-bar"><span style="width: ${Math.min(100, width)}%"></span></div>
          </div>
          <span class="tag tag-neutral">${escapeHtml(category.share)} do mês</span>
        </div>
      `;
    })
    .join("");
}

function renderInstallments() {
  if (!state.installments.length) {
    dom.installmentsList.innerHTML = `
      <div class="empty-state">
        <p>As compras parceladas vão aparecer aqui com o progresso pago e o saldo restante.</p>
      </div>
    `;
    return;
  }

  const selectedMonth = state.settings.selectedMonth;
  const cards = state.installments
    .slice()
    .sort((a, b) => {
      const aNext = getNextPendingMonth(a) || "9999-12";
      const bNext = getNextPendingMonth(b) || "9999-12";
      return aNext.localeCompare(bNext);
    })
    .map((installment) => {
      const personName = getPersonName(installment.personId);
      const paidAmount = getPaidAmount(installment);
      const remainingAmount = Math.max(0, installment.totalAmount - paidAmount);
      const nextIndex = installment.paidInstallments + 1;
      const nextMonth = getNextPendingMonth(installment);
      const currentMonthIndex = monthDiff(installment.firstMonth, selectedMonth) + 1;
      const thisMonthAmount =
        currentMonthIndex >= 1 && currentMonthIndex <= installment.installmentCount
          ? installment.installmentAmounts[currentMonthIndex - 1]
          : 0;
      const progress = Math.round(
        (installment.paidInstallments / installment.installmentCount) * 100
      );

      let tagText = "Ativo";
      let tagTone = "neutral";

      if (installment.paidInstallments >= installment.installmentCount) {
        tagText = "Concluído";
        tagTone = "success";
      } else if (nextMonth && nextMonth < selectedMonth) {
        tagText = "Parcela pendente";
        tagTone = "danger";
      } else if (nextMonth === selectedMonth) {
        tagText = "Entra neste mês";
        tagTone = "warning";
      }

      return `
        <article class="installment-card">
          <div class="installment-head">
            <div>
              <strong>${escapeHtml(installment.description)}</strong>
              <div class="installment-subtitle">
                ${escapeHtml(personName)} • ${escapeHtml(installment.cardName)} • ${escapeHtml(
        installment.category
      )}
              </div>
            </div>
            ${renderTagHtml(tagTone, tagText)}
          </div>

          <div class="installment-meta">
            <span>Compra em ${escapeHtml(formatDate(installment.purchaseDate))}</span>
            <span>${escapeHtml(installment.paidInstallments.toString())}/${escapeHtml(
        installment.installmentCount.toString()
      )} parcelas pagas</span>
          </div>

          <div class="installment-grid">
            <div>
              <span>Valor total</span>
              <strong>${escapeHtml(formatCurrency(installment.totalAmount))}</strong>
            </div>
            <div>
              <span>Já pago</span>
              <strong>${escapeHtml(formatCurrency(paidAmount))}</strong>
            </div>
            <div>
              <span>Falta pagar</span>
              <strong>${escapeHtml(formatCurrency(remainingAmount))}</strong>
            </div>
          </div>

          <div class="installment-grid">
            <div>
              <span>Parcela do mês selecionado</span>
              <strong>${escapeHtml(thisMonthAmount ? formatCurrency(thisMonthAmount) : "Sem cobrança")}</strong>
            </div>
            <div>
              <span>Próxima parcela</span>
              <strong>${escapeHtml(nextMonth ? `${nextIndex}/${installment.installmentCount} em ${formatMonthLabel(nextMonth)}` : "Finalizado")}</strong>
            </div>
            <div>
              <span>Observação</span>
              <strong>${escapeHtml(installment.notes || "Sem observação")}</strong>
            </div>
          </div>

          <div class="progress-shell" aria-hidden="true">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>

          <div class="installment-actions">
            <div class="installment-button-group">
              <button class="ghost-button" type="button" data-action="decrement-paid" data-id="${escapeHtml(
                installment.id
              )}">
                Voltar 1 parcela
              </button>
              <button class="ghost-button" type="button" data-action="increment-paid" data-id="${escapeHtml(
                installment.id
              )}">
                Marcar 1 parcela paga
              </button>
            </div>
            <button class="ghost-button" type="button" data-action="delete-installment" data-id="${escapeHtml(
              installment.id
            )}">
              Excluir compra
            </button>
          </div>
        </article>
      `;
    });

  dom.installmentsList.innerHTML = cards.join("");
}

function renderSettings() {
  dom.settingsForm.elements.householdLabel.value = state.settings.householdLabel;
  dom.settingsForm.elements.personOne.value = state.settings.people[0]?.name || "Pessoa 1";
  dom.settingsForm.elements.personTwo.value = state.settings.people[1]?.name || "Pessoa 2";
  dom.settingsForm.elements.monthlyBudget.value = state.settings.monthlyBudget || 0;
  dom.settingsForm.elements.scriptUrl.value = state.sync.scriptUrl || "";
  dom.settingsForm.elements.autoSync.checked = Boolean(state.sync.autoSync);
}

function renderStatus() {
  dom.dataModeBadge.textContent = state.seededDemo
    ? "Usando dados de exemplo para visualização."
    : "Usando seus dados reais neste navegador.";

  const syncParts = [];

  if (state.sync.lastSyncMessage) {
    syncParts.push(state.sync.lastSyncMessage);
  }

  if (state.sync.lastSyncedAt) {
    syncParts.push(`Última sync: ${formatDateTime(state.sync.lastSyncedAt)}`);
  }

  dom.syncStatus.textContent = syncParts.join(" ") || "Sincronização ainda não configurada.";
}

function handleMonthChange() {
  if (!isValidMonth(dom.selectedMonth.value)) {
    return;
  }

  state.settings.selectedMonth = dom.selectedMonth.value;
  state.settings.updatedAt = nowIso();
  persistState();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  prepareForRealData();

  const form = new FormData(dom.expenseForm);
  const category = addCategoryIfNeeded(form.get("category"));
  const expense = normalizeExpense({
    id: createId("exp"),
    date: form.get("date"),
    referenceMonth: form.get("referenceMonth"),
    description: form.get("description"),
    category,
    amount: form.get("amount"),
    personId: form.get("personId"),
    paymentMethod: form.get("paymentMethod"),
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!expense) {
    setSyncMessage("Não foi possível salvar esse gasto.", false);
    renderStatus();
    return;
  }

  state.expenses.unshift(expense);
  state.seededDemo = false;
  persistState();
  dom.expenseForm.reset();
  dom.expenseForm.elements.date.value = getCurrentDate();
  dom.expenseForm.elements.referenceMonth.value = state.settings.selectedMonth;
  dom.expenseForm.elements.personId.value = state.settings.people[0]?.id || "person-1";
  setSyncMessage("Gasto salvo com sucesso.", false);
  renderAll();
}

function handleInstallmentSubmit(event) {
  event.preventDefault();
  prepareForRealData();

  const form = new FormData(dom.installmentForm);
  const category = addCategoryIfNeeded(form.get("category"));
  const installment = normalizeInstallment({
    id: createId("inst"),
    purchaseDate: form.get("purchaseDate"),
    description: form.get("description"),
    category,
    totalAmount: form.get("totalAmount"),
    installmentCount: form.get("installmentCount"),
    paidInstallments: 0,
    firstMonth: form.get("firstMonth"),
    personId: form.get("personId"),
    cardName: form.get("cardName"),
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!installment) {
    setSyncMessage("Não foi possível salvar essa compra parcelada.", false);
    renderStatus();
    return;
  }

  state.installments.unshift(installment);
  state.seededDemo = false;
  persistState();
  dom.installmentForm.reset();
  dom.installmentForm.elements.purchaseDate.value = getCurrentDate();
  dom.installmentForm.elements.firstMonth.value = state.settings.selectedMonth;
  dom.installmentForm.elements.personId.value = state.settings.people[0]?.id || "person-1";
  setSyncMessage("Compra parcelada salva com sucesso.", false);
  renderAll();
}

function handleSettingsSubmit(event) {
  event.preventDefault();

  const form = new FormData(dom.settingsForm);
  state.settings.householdLabel =
    cleanText(form.get("householdLabel")) || "Painel financeiro da casa";
  state.settings.people = [
    {
      id: state.settings.people[0]?.id || "person-1",
      name: cleanText(form.get("personOne")) || "Pessoa 1",
    },
    {
      id: state.settings.people[1]?.id || "person-2",
      name: cleanText(form.get("personTwo")) || "Pessoa 2",
    },
  ];
  state.settings.monthlyBudget = normalizeMoney(form.get("monthlyBudget"));
  state.settings.updatedAt = nowIso();
  state.sync.scriptUrl = cleanText(form.get("scriptUrl"));
  state.sync.autoSync = Boolean(form.get("autoSync"));
  state.seededDemo = false;
  persistState();
  setSyncMessage("Configurações salvas.", false);
  renderAll();
}

function handleMonthTableClick(event) {
  const button = event.target.closest("[data-action='delete-expense']");
  if (!button) {
    return;
  }

  const expenseId = button.dataset.id;
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) {
    return;
  }

  if (!window.confirm(`Excluir o gasto "${expense.description}"?`)) {
    return;
  }

  deleteExpense(expenseId);
  setSyncMessage("Gasto removido.", false);
  renderAll();
}

function handleInstallmentListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const installmentId = button.dataset.id;
  const installment = state.installments.find((item) => item.id === installmentId);
  if (!installment) {
    return;
  }

  if (button.dataset.action === "increment-paid") {
    installment.paidInstallments = Math.min(
      installment.installmentCount,
      installment.paidInstallments + 1
    );
    installment.updatedAt = nowIso();
    persistState();
    setSyncMessage("Parcela marcada como paga.", false);
    renderAll();
    return;
  }

  if (button.dataset.action === "decrement-paid") {
    installment.paidInstallments = Math.max(0, installment.paidInstallments - 1);
    installment.updatedAt = nowIso();
    persistState();
    setSyncMessage("Última parcela marcada como pendente.", false);
    renderAll();
    return;
  }

  if (button.dataset.action === "delete-installment") {
    if (!window.confirm(`Excluir a compra parcelada "${installment.description}"?`)) {
      return;
    }

    deleteInstallment(installmentId);
    setSyncMessage("Compra parcelada removida.", false);
    renderAll();
  }
}

function deleteExpense(expenseId) {
  state.expenses = state.expenses.filter((item) => item.id !== expenseId);
  state.deletions.expenses = upsertDeletion(state.deletions.expenses, expenseId);
  persistState();
}

function deleteInstallment(installmentId) {
  state.installments = state.installments.filter((item) => item.id !== installmentId);
  state.deletions.installments = upsertDeletion(
    state.deletions.installments,
    installmentId
  );
  persistState();
}

function upsertDeletion(list, id) {
  return normalizeDeletionList([...list, { id, deletedAt: nowIso() }]);
}

function clearDemoData() {
  if (
    !window.confirm(
      "Isso vai remover todos os dados atuais deste navegador e deixar o painel vazio. Deseja continuar?"
    )
  ) {
    return;
  }

  state = createEmptyState();
  hydrateFormDefaults();
  persistState();
  setSyncMessage("Painel limpo. Agora você pode começar com os seus dados.", false);
  renderAll();
}

function prepareForRealData() {
  if (!state.seededDemo) {
    return;
  }

  state.expenses = [];
  state.installments = [];
  state.deletions = {
    expenses: [],
    installments: [],
  };
  state.seededDemo = false;
  state.sync.lastSyncMessage = "Dados de exemplo removidos para começar seu uso real.";
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `controle-casa-${state.settings.selectedMonth}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importStateFromFile(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeState(JSON.parse(String(reader.result)));
      state = mergeStates(state, imported);
      state.seededDemo = false;
      persistState();
      setSyncMessage("Arquivo importado com sucesso.", false);
      renderAll();
    } catch (error) {
      console.error(error);
      setSyncMessage("Não consegui importar esse arquivo JSON.", true);
      renderStatus();
    } finally {
      dom.importFile.value = "";
    }
  };
  reader.readAsText(file);
}

async function syncWithGoogle(mode) {
  const scriptUrl = cleanText(state.sync.scriptUrl);

  if (!scriptUrl) {
    setSyncMessage(
      "Defina a URL do Apps Script nas configurações para usar a sincronização.",
      true
    );
    renderStatus();
    return;
  }

  if (mode === "push" && state.seededDemo) {
    setSyncMessage(
      "Os dados atuais ainda são de exemplo. Use Limpar dados de exemplo ou lance um gasto real antes de enviar ao Google.",
      true
    );
    renderStatus();
    return;
  }

  try {
    setSyncMessage("Sincronizando com o Google Sheets...", false);
    renderStatus();

    if (mode === "pull") {
      const remoteState = await fetchRemoteState(scriptUrl);
      state = state.seededDemo ? normalizeState(remoteState) : mergeStates(state, remoteState);
      state.sync.scriptUrl = scriptUrl;
      state.seededDemo = false;
      persistState({ skipAutoSync: true });
      setSyncMessage("Dados puxados do Google com sucesso.", false, true);
      renderAll();
      return;
    }

    if (mode === "merge" && state.seededDemo) {
      const remoteState = await fetchRemoteState(scriptUrl);
      state = normalizeState(remoteState);
      state.sync.scriptUrl = scriptUrl;
      state.seededDemo = false;
      persistState({ skipAutoSync: true });
      setSyncMessage("Dados do Google carregados no painel.", false, true);
      renderAll();
      return;
    }

    const localBaseState = state;
    localBaseState.sync.scriptUrl = scriptUrl;
    const mergedState =
      mode === "push"
        ? localBaseState
        : mergeStates(localBaseState, await fetchRemoteState(scriptUrl));
    const remoteResponse = await pushRemoteState(scriptUrl, mergedState);
    state = mergeStates(mergedState, remoteResponse);
    state.seededDemo = false;
    persistState({ skipAutoSync: true });
    setSyncMessage("Sincronização concluída com sucesso.", false, true);
    renderAll();
  } catch (error) {
    console.error(error);
    setSyncMessage(
      "Falha na sincronização. Confira a URL do Apps Script e se a implantação está pública.",
      true
    );
    renderStatus();
  }
}

async function fetchRemoteState(scriptUrl) {
  const response = await fetch(`${scriptUrl}?mode=pull&t=${Date.now()}`);
  if (!response.ok) {
    throw new Error("Falha ao buscar dados remotos.");
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
    throw new Error("Falha ao enviar dados remotos.");
  }

  const result = await response.json();
  return normalizeState(result?.payload || result);
}

function mergeStates(localState, remoteState) {
  const normalizedLocal = normalizeState(localState);
  const normalizedRemote = normalizeState(remoteState);

  const mergedExpenses = mergeCollection(
    normalizedLocal.expenses,
    normalizedRemote.expenses,
    normalizedLocal.deletions.expenses,
    normalizedRemote.deletions.expenses
  );

  const mergedInstallments = mergeCollection(
    normalizedLocal.installments,
    normalizedRemote.installments,
    normalizedLocal.deletions.installments,
    normalizedRemote.deletions.installments
  );

  const settings =
    normalizedRemote.settings.updatedAt > normalizedLocal.settings.updatedAt
      ? normalizedRemote.settings
      : normalizedLocal.settings;

  const sync =
    (normalizedRemote.sync.lastSyncedAt || "") > (normalizedLocal.sync.lastSyncedAt || "")
      ? normalizedRemote.sync
      : normalizedLocal.sync;

  return normalizeState({
    version: 1,
    seededDemo: normalizedLocal.seededDemo && normalizedRemote.seededDemo,
    settings,
    sync,
    expenses: mergedExpenses.items,
    installments: mergedInstallments.items,
    deletions: {
      expenses: mergedExpenses.deletions,
      installments: mergedInstallments.deletions,
    },
  });
}

function mergeCollection(localItems, remoteItems, localDeletions, remoteDeletions) {
  const itemsMap = new Map();
  [...localItems, ...remoteItems].forEach((item) => {
    const existing = itemsMap.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      itemsMap.set(item.id, item);
    }
  });

  const deletionsMap = new Map();
  [...localDeletions, ...remoteDeletions].forEach((entry) => {
    const existing = deletionsMap.get(entry.id);
    if (!existing || entry.deletedAt > existing.deletedAt) {
      deletionsMap.set(entry.id, entry);
    }
  });

  const items = [];
  itemsMap.forEach((item, id) => {
    const deletion = deletionsMap.get(id);
    if (deletion && deletion.deletedAt >= item.updatedAt) {
      return;
    }
    items.push(item);
  });

  return {
    items: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    deletions: Array.from(deletionsMap.values()),
  };
}

function persistState(options = {}, nextState = state) {
  state = normalizeState(nextState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  if (!options.skipRender) {
    renderAll();
  }

  if (!options.skipAutoSync && state.sync.autoSync && state.sync.scriptUrl) {
    syncWithGoogle("merge");
  }
}

function getMonthlySummary(month) {
  const items = getMonthlyItems(month);
  const monthTotal = sum(items.map((item) => item.amount));
  const categoryMap = new Map();

  items.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
  });

  const categoryTotals = Array.from(categoryMap.entries())
    .map(([name, total]) => ({
      name,
      total,
      share: `${Math.round((total / (monthTotal || 1)) * 100)}%`,
    }))
    .sort((a, b) => b.total - a.total);

  const byPerson = state.settings.people.map((person) => {
    const total = sum(
      items.filter((item) => item.personId === person.id).map((item) => item.amount)
    );
    const share = monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0;
    return {
      id: person.id,
      name: person.name,
      total,
      share,
    };
  });

  const remainingInstallmentsAmount = sum(
    state.installments.map((installment) =>
      Math.max(0, installment.totalAmount - getPaidAmount(installment))
    )
  );

  const paidInstallmentsAmount = sum(
    state.installments.map((installment) => getPaidAmount(installment))
  );
  const openInstallments = state.installments.filter(
    (installment) => installment.paidInstallments < installment.installmentCount
  ).length;
  const paidInstallmentsCount = sum(
    state.installments.map((installment) => installment.paidInstallments)
  );

  return {
    month,
    items,
    monthTotal,
    categoryTotals,
    byPerson,
    remainingInstallmentsAmount,
    paidInstallmentsAmount,
    openInstallments,
    paidInstallmentsCount,
  };
}

function getMonthlyItems(month) {
  const oneTimeItems = state.expenses
    .filter((expense) => expense.referenceMonth === month)
    .map((expense) => ({
      id: expense.id,
      source: "expense",
      description: expense.description,
      detail: `${PAYMENT_METHOD_LABELS[expense.paymentMethod]} • referência ${formatMonthLabel(
        expense.referenceMonth
      )}${expense.notes ? ` • ${expense.notes}` : ""}`,
      date: expense.date,
      category: expense.category,
      personId: expense.personId,
      personName: getPersonName(expense.personId),
      amount: expense.amount,
      status: "Lançado",
      statusTone: "neutral",
    }));

  const installmentItems = state.installments
    .map((installment) => {
      const index = monthDiff(installment.firstMonth, month) + 1;
      if (index < 1 || index > installment.installmentCount) {
        return null;
      }

      const statusTone =
        index <= installment.paidInstallments
          ? "success"
          : month < getCurrentMonth()
            ? "danger"
            : index === installment.paidInstallments + 1
              ? "warning"
              : "neutral";

      const status =
        index <= installment.paidInstallments
          ? "Pago"
          : month < getCurrentMonth()
            ? "Em aberto"
            : "Previsto";

      return {
        id: `${installment.id}-${index}`,
        source: "installment",
        description: `${installment.description} (${index}/${installment.installmentCount})`,
        detail: `${installment.cardName}${installment.notes ? ` • ${installment.notes}` : ""}`,
        date: installment.purchaseDate,
        category: installment.category,
        personId: installment.personId,
        personName: getPersonName(installment.personId),
        amount: installment.installmentAmounts[index - 1] || 0,
        status,
        statusTone,
      };
    })
    .filter(Boolean);

  return [...oneTimeItems, ...installmentItems].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.amount - a.amount;
  });
}

function getPaidAmount(installment) {
  return normalizeMoney(
    sum(installment.installmentAmounts.slice(0, installment.paidInstallments))
  );
}

function getNextPendingMonth(installment) {
  if (installment.paidInstallments >= installment.installmentCount) {
    return "";
  }
  return addMonths(installment.firstMonth, installment.paidInstallments);
}

function splitInstallments(totalAmount, count) {
  const totalInCents = Math.round(normalizeMoney(totalAmount) * 100);
  const base = Math.floor(totalInCents / count);
  const remainder = totalInCents % count;
  const installments = [];

  for (let index = 0; index < count; index += 1) {
    const cents = base + (index < remainder ? 1 : 0);
    installments.push(cents / 100);
  }

  return installments;
}

function setSyncMessage(message, isError, markSynced) {
  state.sync.lastSyncMessage = message;
  if (markSynced) {
    state.sync.lastSyncedAt = nowIso();
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
  } catch (error) {
    console.warn(error);
  }

  if (isError) {
    console.warn(message);
  }
}

function renderTagHtml(tone, label) {
  const className = {
    neutral: "tag-neutral",
    warning: "tag-warning",
    danger: "tag-danger",
    success: "tag-success",
  }[tone] || "tag-neutral";

  return `<span class="tag ${className}">${escapeHtml(label)}</span>`;
}

function addCategoryIfNeeded(rawValue) {
  const category = cleanText(rawValue);
  if (!category) {
    return "Outros";
  }

  if (!state.settings.categories.includes(category)) {
    state.settings.categories.push(category);
    state.settings.updatedAt = nowIso();
  }

  return category;
}

function getPersonName(personId) {
  return state.settings.people.find((person) => person.id === personId)?.name || "Pessoa";
}

function cleanText(value) {
  return String(value || "").trim();
}

function normalizeMoney(value) {
  const normalized = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(normalized)) {
    return 0;
  }
  return Math.round(normalized * 100) / 100;
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function sum(list) {
  return normalizeMoney(list.reduce((total, value) => total + value, 0));
}

function nowIso() {
  return new Date().toISOString();
}

function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return getCurrentDate().slice(0, 7);
}

function getMonthFromDate(date) {
  return isValidDate(date) ? date.slice(0, 7) : getCurrentMonth();
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function addMonths(month, amount) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDiff(startMonth, endMonth) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
  return (endYear - startYear) * 12 + (endMonthNumber - startMonthNumber);
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
    month: "short",
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

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createEmptyState() {
  return {
    version: 2,
    seededDemo: false,
    settings: {
      householdLabel: "Painel financeiro da casa",
      people: [
        { id: "person-1", name: "Voce" },
        { id: "person-2", name: "Sua esposa" },
      ],
      monthlyBudget: 5000,
      selectedMonth: getCurrentMonth(),
      categories: [...DEFAULT_CATEGORIES],
      updatedAt: nowIso(),
    },
    sync: {
      scriptUrl: DEFAULT_SCRIPT_URL,
      autoSync: false,
      lastSyncedAt: "",
      lastSyncMessage: "Sincronizacao ainda nao configurada.",
    },
    expenses: [],
    installments: [],
    monthClosures: [],
    deletions: {
      expenses: [],
      installments: [],
    },
  };
}

function normalizeState(rawState) {
  const empty = createEmptyState();
  const normalized = {
    version: 2,
    seededDemo: Boolean(rawState?.seededDemo),
    settings: {
      ...empty.settings,
      ...(rawState?.settings || {}),
    },
    sync: {
      ...empty.sync,
      ...(rawState?.sync || {}),
    },
    expenses: Array.isArray(rawState?.expenses)
      ? rawState.expenses.map(normalizeExpense).filter(Boolean)
      : [],
    installments: Array.isArray(rawState?.installments)
      ? rawState.installments.map(normalizeInstallment).filter(Boolean)
      : [],
    monthClosures: Array.isArray(rawState?.monthClosures)
      ? rawState.monthClosures.map(normalizeMonthClosure).filter(Boolean)
      : [],
    deletions: {
      expenses: normalizeDeletionList(rawState?.deletions?.expenses),
      installments: normalizeDeletionList(rawState?.deletions?.installments),
    },
  };

  if (!Array.isArray(normalized.settings.people) || normalized.settings.people.length < 2) {
    normalized.settings.people = empty.settings.people;
  } else {
    normalized.settings.people = normalized.settings.people.map((person, index) => ({
      id: cleanText(person.id) || `person-${index + 1}`,
      name: cleanText(person.name) || `Pessoa ${index + 1}`,
    }));
  }

  const rawCategories = Array.isArray(normalized.settings.categories)
    ? normalized.settings.categories
    : [];

  normalized.settings.categories = Array.from(
    new Set(
      [...DEFAULT_CATEGORIES, ...rawCategories]
        .map((category) => cleanText(category))
        .filter(Boolean)
    )
  );
  normalized.settings.householdLabel =
    cleanText(normalized.settings.householdLabel) || empty.settings.householdLabel;
  normalized.settings.selectedMonth =
    isValidMonth(normalized.settings.selectedMonth) && normalized.settings.selectedMonth
      ? normalized.settings.selectedMonth
      : getCurrentMonth();
  normalized.settings.monthlyBudget = normalizeMoney(normalized.settings.monthlyBudget);
  normalized.settings.updatedAt = normalized.settings.updatedAt || nowIso();
  normalized.sync.scriptUrl = cleanText(normalized.sync.scriptUrl) || DEFAULT_SCRIPT_URL;
  normalized.monthClosures = mergeMonthClosures(normalized.monthClosures, []);

  return normalized;
}

function normalizeExpense(expense) {
  if (!expense) {
    return null;
  }

  const normalized = {
    id: expense.id || createId("exp"),
    date: isValidDate(expense.date) ? expense.date : getCurrentDate(),
    referenceMonth: isValidMonth(expense.referenceMonth)
      ? expense.referenceMonth
      : getCurrentMonth(),
    description: cleanText(expense.description) || "Gasto sem descricao",
    category: cleanText(expense.category) || "Outros",
    amount: normalizeMoney(expense.amount),
    personId: cleanText(expense.personId) || "person-1",
    paymentMethod: PAYMENT_METHOD_LABELS[expense.paymentMethod]
      ? expense.paymentMethod
      : "pix",
    cardName: cleanText(expense.cardName),
    notes: cleanText(expense.notes),
    updatedAt: expense.updatedAt || nowIso(),
  };

  return normalized.amount > 0 ? normalized : null;
}

function renderAll() {
  renderHeader();
  renderFormMode();
  populatePeopleOptions();
  populateCategoryOptions();
  renderFilters();
  renderFormStates();
  renderStats();
  renderMonthTable();
  renderCategoryBreakdown();
  renderInstallments();
  renderMonthClosure();
  renderSettings();
  renderStatus();
}

function renderFilters() {
  const monthItems = getMonthlyItems(state.settings.selectedMonth);
  const categories = Array.from(
    new Set(monthItems.map((item) => item.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const cards = Array.from(
    new Set(monthItems.map((item) => item.cardName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  dom.searchFilter.value = uiState.filters.search;
  dom.personFilter.innerHTML = [
    `<option value="all">Todas</option>`,
    ...state.settings.people.map(
      (person) => `<option value="${escapeHtml(person.id)}">${escapeHtml(person.name)}</option>`
    ),
  ].join("");
  dom.categoryFilter.innerHTML = [
    `<option value="all">Todas</option>`,
    ...categories.map(
      (category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
    ),
  ].join("");
  dom.cardFilter.innerHTML = [
    `<option value="all">Todos</option>`,
    `<option value="__none__">Sem cartao</option>`,
    ...cards.map((card) => `<option value="${escapeHtml(card)}">${escapeHtml(card)}</option>`),
  ].join("");

  dom.personFilter.value = ensureFilterOption(dom.personFilter, uiState.filters.personId);
  dom.categoryFilter.value = ensureFilterOption(dom.categoryFilter, uiState.filters.category);
  dom.cardFilter.value = ensureFilterOption(dom.cardFilter, uiState.filters.cardName);
  dom.typeFilter.value = ensureFilterOption(dom.typeFilter, uiState.filters.type);
  dom.statusFilter.value = ensureFilterOption(dom.statusFilter, uiState.filters.status);
}

function renderFormStates() {
  const selectedMonthClosed = isMonthClosed(state.settings.selectedMonth);
  const expenseMode = uiState.expenseEditId ? "edit" : "create";
  const installmentMode = uiState.installmentEditId ? "edit" : "create";

  dom.expenseSubmitButton.textContent =
    expenseMode === "edit" ? "Salvar alteracoes" : "Salvar gasto";
  dom.installmentSubmitButton.textContent =
    installmentMode === "edit" ? "Salvar alteracoes" : "Salvar parcelado";
  dom.expenseCancelButton.classList.toggle("hidden", expenseMode !== "edit");
  dom.installmentCancelButton.classList.toggle("hidden", installmentMode !== "edit");
  dom.expenseFormHint.textContent =
    expenseMode === "edit"
      ? "Edite o gasto e salve para atualizar o registro existente."
      : selectedMonthClosed
        ? "Este mes esta fechado. Lance apenas em meses ainda abertos."
        : "Registre compras do dia a dia e ajuste o mes de referencia.";
  dom.installmentFormHint.textContent =
    installmentMode === "edit"
      ? "Edite a compra parcelada inteira, inclusive cartao e numero de parcelas."
      : selectedMonthClosed
        ? "Se a primeira fatura cair em mes fechado, o app vai bloquear o envio."
        : "Use para compras grandes no cartao e acompanhe parcela por parcela.";
}

function getMonthlySummary(month) {
  const items = getMonthlyItems(month);
  const monthTotal = sum(items.map((item) => item.amount));
  const categoryMap = new Map();

  items.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
  });

  const categoryTotals = Array.from(categoryMap.entries())
    .map(([name, total]) => ({
      name,
      total,
      share: `${Math.round((total / (monthTotal || 1)) * 100)}%`,
    }))
    .sort((a, b) => b.total - a.total);

  const byPerson = state.settings.people.map((person) => {
    const total = sum(
      items.filter((item) => item.personId === person.id).map((item) => item.amount)
    );
    return {
      id: person.id,
      name: person.name,
      total,
      share: monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0,
    };
  });

  return {
    month,
    items,
    monthTotal,
    categoryTotals,
    byPerson,
    remainingInstallmentsAmount: sum(
      state.installments.map((installment) =>
        Math.max(0, installment.totalAmount - getPaidAmount(installment))
      )
    ),
    paidInstallmentsAmount: sum(
      state.installments.map((installment) => getPaidAmount(installment))
    ),
    openInstallments: state.installments.filter(
      (installment) => installment.paidInstallments < installment.installmentCount
    ).length,
    paidInstallmentsCount: sum(
      state.installments.map((installment) => installment.paidInstallments)
    ),
  };
}

function getMonthlyItems(month) {
  const oneTimeItems = state.expenses
    .filter((expense) => expense.referenceMonth === month)
    .map((expense) => ({
      id: expense.id,
      source: "expense",
      description: expense.description,
      detail: [
        getPaymentMethodLabel(expense.paymentMethod),
        expense.cardName || "",
        expense.notes || "",
      ]
        .filter(Boolean)
        .join(" • "),
      date: expense.date,
      category: expense.category,
      personId: expense.personId,
      personName: getPersonName(expense.personId),
      amount: expense.amount,
      status: "Lancado",
      statusTone: "neutral",
      cardName: expense.cardName,
      paymentMethod: expense.paymentMethod,
      referenceMonth: expense.referenceMonth,
      searchText: [expense.description, expense.notes, expense.category, expense.cardName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));

  const installmentItems = state.installments
    .map((installment) => {
      const index = monthDiff(installment.firstMonth, month) + 1;
      if (index < 1 || index > installment.installmentCount) {
        return null;
      }

      const status =
        index <= installment.paidInstallments
          ? "Pago"
          : month < getCurrentMonth()
            ? "Em aberto"
            : "Previsto";
      const statusTone =
        status === "Pago"
          ? "success"
          : status === "Em aberto"
            ? "danger"
            : index === installment.paidInstallments + 1
              ? "warning"
              : "neutral";

      return {
        id: `${installment.id}-${index}`,
        source: "installment",
        installmentId: installment.id,
        description: `${installment.description} (${index}/${installment.installmentCount})`,
        detail: [installment.cardName, installment.notes].filter(Boolean).join(" • "),
        date: installment.purchaseDate,
        category: installment.category,
        personId: installment.personId,
        personName: getPersonName(installment.personId),
        amount: installment.installmentAmounts[index - 1] || 0,
        status,
        statusTone,
        cardName: installment.cardName,
        paymentMethod: "credito",
        referenceMonth: month,
        searchText: [
          installment.description,
          installment.notes,
          installment.category,
          installment.cardName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      };
    })
    .filter(Boolean);

  return [...oneTimeItems, ...installmentItems].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.amount - a.amount;
  });
}

function applyMonthlyFilters(items) {
  return items.filter((item) => {
    if (uiState.filters.personId !== "all" && item.personId !== uiState.filters.personId) {
      return false;
    }

    if (uiState.filters.category !== "all" && item.category !== uiState.filters.category) {
      return false;
    }

    if (uiState.filters.cardName === "__none__" && item.cardName) {
      return false;
    }

    if (
      uiState.filters.cardName !== "all" &&
      uiState.filters.cardName !== "__none__" &&
      item.cardName !== uiState.filters.cardName
    ) {
      return false;
    }

    if (uiState.filters.type !== "all" && item.source !== uiState.filters.type) {
      return false;
    }

    if (uiState.filters.status !== "all" && getStatusFilterKey(item.status) !== uiState.filters.status) {
      return false;
    }

    if (uiState.filters.search && !item.searchText.includes(uiState.filters.search)) {
      return false;
    }

    return true;
  });
}

function buildTableSummaryText(allItems, filteredItems) {
  const selectedMonthLabel = formatMonthLabel(state.settings.selectedMonth);
  if (!allItems.length) {
    return `Sem lancamentos em ${selectedMonthLabel}.`;
  }

  const filteredTotal = sum(filteredItems.map((item) => item.amount));
  if (filteredItems.length === allItems.length) {
    return `${filteredItems.length} lancamentos em ${selectedMonthLabel}, somando ${formatCurrency(filteredTotal)}.`;
  }

  return `${filteredItems.length} de ${allItems.length} lancamentos visiveis, somando ${formatCurrency(filteredTotal)} com os filtros atuais.`;
}

function ensureFilterOption(select, value) {
  return Array.from(select.options).some((option) => option.value === value) ? value : "all";
}

function getStatusFilterKey(status) {
  return String(status || "")
    .toLowerCase()
    .replaceAll(" ", "-");
}

function getPaymentMethodLabel(paymentMethod) {
  return {
    pix: "Pix",
    debito: "Debito",
    credito: "Credito",
    dinheiro: "Dinheiro",
    boleto: "Boleto",
  }[paymentMethod] || "Pagamento";
}

function getMonthClosure(month) {
  return state.monthClosures.find((closure) => closure.month === month) || null;
}

function isMonthClosed(month) {
  return getMonthClosure(month)?.status === "closed";
}

function mergeMonthClosures(localClosures, remoteClosures) {
  const map = new Map();
  [...localClosures, ...remoteClosures].forEach((closure) => {
    if (!closure) {
      return;
    }

    const existing = map.get(closure.month);
    if (!existing || closure.updatedAt > existing.updatedAt) {
      map.set(closure.month, closure);
    }
  });

  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

function renderStats() {
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const budget = state.settings.monthlyBudget || 0;
  const budgetUsage = budget > 0 ? (summary.monthTotal / budget) * 100 : 0;
  const selectedClosure = getMonthClosure(state.settings.selectedMonth);

  const stats = [
    {
      label: "Total do mes",
      value: formatCurrency(summary.monthTotal),
      support: `${summary.items.length} lancamentos no mes`,
      progress: budget > 0 ? Math.min(100, budgetUsage) : 0,
    },
    {
      label: "Orcamento usado",
      value: budget > 0 ? `${Math.round(budgetUsage)}%` : "Sem meta",
      support:
        budget > 0
          ? `${formatCurrency(Math.max(0, budget - summary.monthTotal))} ainda livres`
          : "Defina um orcamento para acompanhar",
      progress: Math.min(100, budgetUsage || 0),
    },
    {
      label: "Parcelados em aberto",
      value: formatCurrency(summary.remainingInstallmentsAmount),
      support: `${summary.openInstallments} compras ainda ativas`,
      progress:
        summary.remainingInstallmentsAmount + summary.paidInstallmentsAmount > 0
          ? Math.round(
              (summary.paidInstallmentsAmount /
                (summary.remainingInstallmentsAmount + summary.paidInstallmentsAmount)) *
                100
            )
          : 0,
    },
    {
      label: "Mes selecionado",
      value: selectedClosure?.status === "closed" ? "Fechado" : "Aberto",
      support:
        selectedClosure?.status === "closed"
          ? `Fechado em ${formatDateTime(selectedClosure.closedAt)}`
          : "Lancamentos continuam liberados",
      progress: selectedClosure?.status === "closed" ? 100 : 35,
    },
    ...summary.byPerson.map((item) => ({
      label: item.name,
      value: formatCurrency(item.total),
      support: `${item.share}% do total da casa neste mes`,
      progress: item.share,
    })),
  ];

  dom.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <span class="stat-label">${escapeHtml(stat.label)}</span>
          <strong class="stat-value">${escapeHtml(stat.value)}</strong>
          <span class="stat-support">${escapeHtml(stat.support)}</span>
          <div class="progress-shell">
            <div class="progress-fill" style="width: ${Math.min(100, Math.max(0, stat.progress || 0))}%"></div>
          </div>
        </article>
      `
    )
    .join("");
}

function renderMonthTable() {
  const summary = getMonthlySummary(state.settings.selectedMonth);
  const filteredItems = applyMonthlyFilters(summary.items);

  dom.monthTableSummary.textContent = buildTableSummaryText(summary.items, filteredItems);

  if (!filteredItems.length) {
    dom.monthTable.innerHTML = `
      <div class="empty-state">
        <p>Nenhum lancamento encontrado com os filtros atuais para ${formatMonthLabel(state.settings.selectedMonth)}.</p>
      </div>
    `;
    return;
  }

  dom.monthTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Descricao</th>
          <th>Data</th>
          <th>Categoria</th>
          <th>Pessoa</th>
          <th>Status</th>
          <th>Valor</th>
          <th>Acao</th>
        </tr>
      </thead>
      <tbody>
        ${filteredItems
          .map((item) => {
            const canEdit = item.source === "expense" && !isMonthClosed(item.referenceMonth);
            return `
              <tr>
                <td>
                  <strong>${escapeHtml(item.description)}</strong>
                  <span class="installment-subtitle">${escapeHtml(item.detail || "Sem detalhes")}</span>
                </td>
                <td>${escapeHtml(formatDate(item.date))}</td>
                <td>${escapeHtml(item.category)}</td>
                <td>${escapeHtml(item.personName)}</td>
                <td>${renderTagHtml(item.statusTone, item.status)}</td>
                <td class="amount-cell">${escapeHtml(formatCurrency(item.amount))}</td>
                <td>
                  ${
                    item.source === "expense"
                      ? `
                        <button class="button button-secondary table-action" type="button" data-action="edit-expense" data-id="${escapeHtml(item.id)}" ${canEdit ? "" : "disabled"}>Editar</button>
                        <button class="button button-secondary table-action" type="button" data-action="delete-expense" data-id="${escapeHtml(item.id)}" ${canEdit ? "" : "disabled"}>Excluir</button>
                      `
                      : `<span class="tag tag-neutral">Gerencie ao lado</span>`
                  }
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function renderCategoryBreakdown() {
  const filteredItems = applyMonthlyFilters(getMonthlyItems(state.settings.selectedMonth));
  const filteredTotal = sum(filteredItems.map((item) => item.amount));
  const categoryMap = new Map();

  filteredItems.forEach((item) => {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([name, total]) => ({
      name,
      total,
      share: `${Math.round((total / (filteredTotal || 1)) * 100)}%`,
    }))
    .sort((a, b) => b.total - a.total);

  if (!categories.length) {
    dom.categoryBreakdown.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma categoria aparece com os filtros atuais.</p>
      </div>
    `;
    return;
  }

  dom.categoryBreakdown.innerHTML = categories
    .map((category) => {
      const width = filteredTotal > 0 ? (category.total / filteredTotal) * 100 : 0;
      return `
        <div class="category-row">
          <div>
            <div class="category-title">
              <strong>${escapeHtml(category.name)}</strong>
              <span>${escapeHtml(formatCurrency(category.total))}</span>
            </div>
            <div class="mini-bar"><span style="width: ${Math.min(100, width)}%"></span></div>
          </div>
          <span class="tag tag-neutral">${escapeHtml(category.share)} do filtro</span>
        </div>
      `;
    })
    .join("");
}

function renderInstallments() {
  const selectedMonth = state.settings.selectedMonth;
  const filteredInstallments = state.installments
    .filter((installment) => installmentTouchesMonth(installment, selectedMonth))
    .filter((installment) => installmentMatchesFilters(installment))
    .sort((a, b) => {
      const aNext = getNextPendingMonth(a) || "9999-12";
      const bNext = getNextPendingMonth(b) || "9999-12";
      return aNext.localeCompare(bNext);
    });

  if (!filteredInstallments.length) {
    dom.installmentsList.innerHTML = `
      <div class="empty-state">
        <p>Nenhuma compra parcelada aparece com os filtros atuais neste mes.</p>
      </div>
    `;
    return;
  }

  dom.installmentsList.innerHTML = filteredInstallments
    .map((installment) => {
      const personName = getPersonName(installment.personId);
      const paidAmount = getPaidAmount(installment);
      const remainingAmount = Math.max(0, installment.totalAmount - paidAmount);
      const nextMonth = getNextPendingMonth(installment);
      const currentMonthIndex = monthDiff(installment.firstMonth, selectedMonth) + 1;
      const thisMonthAmount =
        currentMonthIndex >= 1 && currentMonthIndex <= installment.installmentCount
          ? installment.installmentAmounts[currentMonthIndex - 1]
          : 0;
      const progress = Math.round(
        (installment.paidInstallments / installment.installmentCount) * 100
      );
      const lockMonths = getInstallmentClosedMonths(installment);
      const editLocked = lockMonths.length > 0;
      const incrementMonth = getNextPendingMonth(installment);
      const decrementMonth =
        installment.paidInstallments > 0
          ? addMonths(installment.firstMonth, installment.paidInstallments - 1)
          : "";

      let tagText = "Ativo";
      let tagTone = "neutral";

      if (installment.paidInstallments >= installment.installmentCount) {
        tagText = "Concluido";
        tagTone = "success";
      } else if (nextMonth && nextMonth < selectedMonth) {
        tagText = "Parcela pendente";
        tagTone = "danger";
      } else if (nextMonth === selectedMonth) {
        tagText = "Entra neste mes";
        tagTone = "warning";
      }

      return `
        <article class="installment-card">
          <div class="installment-head">
            <div>
              <strong>${escapeHtml(installment.description)}</strong>
              <div class="installment-subtitle">
                ${escapeHtml(personName)} • ${escapeHtml(installment.cardName)} • ${escapeHtml(installment.category)}
              </div>
            </div>
            ${renderTagHtml(tagTone, tagText)}
          </div>

          <div class="installment-meta">
            <span>Compra em ${escapeHtml(formatDate(installment.purchaseDate))}</span>
            <span>${escapeHtml(installment.paidInstallments.toString())}/${escapeHtml(installment.installmentCount.toString())} parcelas pagas</span>
          </div>

          <div class="installment-grid">
            <div>
              <span>Valor total</span>
              <strong>${escapeHtml(formatCurrency(installment.totalAmount))}</strong>
            </div>
            <div>
              <span>Ja pago</span>
              <strong>${escapeHtml(formatCurrency(paidAmount))}</strong>
            </div>
            <div>
              <span>Falta pagar</span>
              <strong>${escapeHtml(formatCurrency(remainingAmount))}</strong>
            </div>
          </div>

          <div class="installment-grid">
            <div>
              <span>Parcela do mes selecionado</span>
              <strong>${escapeHtml(thisMonthAmount ? formatCurrency(thisMonthAmount) : "Sem cobranca")}</strong>
            </div>
            <div>
              <span>Proxima parcela</span>
              <strong>${escapeHtml(nextMonth ? `${installment.paidInstallments + 1}/${installment.installmentCount} em ${formatMonthLabel(nextMonth)}` : "Finalizado")}</strong>
            </div>
            <div>
              <span>Observacao</span>
              <strong>${escapeHtml(installment.notes || "Sem observacao")}</strong>
            </div>
          </div>

          <div class="progress-shell" aria-hidden="true">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>

          <div class="installment-actions">
            <div class="installment-button-group">
              <button class="ghost-button" type="button" data-action="edit-installment" data-id="${escapeHtml(installment.id)}" ${editLocked ? "disabled" : ""}>Editar</button>
              <button class="ghost-button" type="button" data-action="decrement-paid" data-id="${escapeHtml(installment.id)}" ${!decrementMonth || isMonthClosed(decrementMonth) ? "disabled" : ""}>Voltar 1 parcela</button>
              <button class="ghost-button" type="button" data-action="increment-paid" data-id="${escapeHtml(installment.id)}" ${!incrementMonth || isMonthClosed(incrementMonth) ? "disabled" : ""}>Marcar 1 parcela paga</button>
            </div>
            <button class="ghost-button" type="button" data-action="delete-installment" data-id="${escapeHtml(installment.id)}" ${editLocked ? "disabled" : ""}>Excluir compra</button>
          </div>

          ${
            editLocked
              ? `<p class="muted-line">Essa compra toca meses ja fechados (${escapeHtml(lockMonths.join(", "))}) e por isso nao pode mais ser editada ou excluida.</p>`
              : ""
          }
        </article>
      `;
    })
    .join("");
}

function renderMonthClosure() {
  const month = state.settings.selectedMonth;
  const summary = getMonthlySummary(month);
  const closure = getMonthClosure(month);
  const snapshot = closure?.status === "closed" ? closure : serializeMonthClosure(month, summary);

  dom.monthClosingPanel.innerHTML = `
    <div class="closing-status">
      <div>
        <strong>${closure?.status === "closed" ? "Mes fechado" : "Mes aberto"}</strong>
        <p class="muted-line">
          ${
            closure?.status === "closed"
              ? `Fechado em ${escapeHtml(formatDateTime(closure.closedAt))}. Para mudar lancamentos deste mes, sera preciso reabrir.`
              : "Feche o mes quando quiser congelar os totais e evitar mudancas acidentais."
          }
        </p>
      </div>
      ${renderTagHtml(closure?.status === "closed" ? "success" : "warning", closure?.status === "closed" ? "Fechado" : "Aberto")}
    </div>

    <div class="closing-grid">
      <div class="info-card">
        <strong>Total do mes</strong>
        <p>${escapeHtml(formatCurrency(snapshot.monthTotal))}</p>
      </div>
      <div class="info-card">
        <strong>Lancamentos</strong>
        <p>${escapeHtml(String(snapshot.itemCount))}</p>
      </div>
      <div class="info-card">
        <strong>Parcelados em aberto</strong>
        <p>${escapeHtml(String(snapshot.openInstallments))}</p>
      </div>
      <div class="info-card">
        <strong>Parcelados ja pagos</strong>
        <p>${escapeHtml(String(snapshot.paidInstallmentsCount))}</p>
      </div>
    </div>

    <div class="closing-grid">
      ${snapshot.byPerson
        .map(
          (person) => `
            <div class="info-card">
              <strong>${escapeHtml(person.name)}</strong>
              <p>${escapeHtml(formatCurrency(person.total))}</p>
            </div>
          `
        )
        .join("")}
    </div>

    <div class="closing-actions">
      ${
        closure?.status === "closed"
          ? `<button class="button button-secondary" type="button" data-action="reopen-month">Reabrir mes</button>`
          : `<button class="button" type="button" data-action="close-month">Fechar mes</button>`
      }
    </div>
  `;
}

function renderStatus() {
  const selectedMonthClosed = isMonthClosed(state.settings.selectedMonth);
  dom.dataModeBadge.textContent = selectedMonthClosed
    ? `Mes ${formatMonthLabel(state.settings.selectedMonth)} fechado.`
    : "Painel pronto para novos lancamentos.";

  const syncParts = [];
  if (state.sync.lastSyncMessage) {
    syncParts.push(state.sync.lastSyncMessage);
  }

  if (state.sync.lastSyncedAt) {
    syncParts.push(`Ultima sync: ${formatDateTime(state.sync.lastSyncedAt)}`);
  }

  dom.syncStatus.textContent = syncParts.join(" ") || "Sincronizacao ainda nao configurada.";
}

function handleFilterChange() {
  uiState.filters.search = cleanText(dom.searchFilter.value).toLowerCase();
  uiState.filters.personId = dom.personFilter.value;
  uiState.filters.category = dom.categoryFilter.value;
  uiState.filters.cardName = dom.cardFilter.value;
  uiState.filters.type = dom.typeFilter.value;
  uiState.filters.status = dom.statusFilter.value;
  renderAll();
}

function clearFilters() {
  uiState.filters = {
    search: "",
    personId: "all",
    category: "all",
    cardName: "all",
    type: "all",
    status: "all",
  };
  renderAll();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  prepareForRealData();

  const form = new FormData(dom.expenseForm);
  const entryId = cleanText(form.get("entryId"));
  const referenceMonth = form.get("referenceMonth");

  if (isMonthClosed(referenceMonth)) {
    setSyncMessage("Esse mes ja esta fechado. Reabra o mes antes de alterar lancamentos dele.", true);
    renderStatus();
    return;
  }

  const category = addCategoryIfNeeded(form.get("category"));
  const expense = normalizeExpense({
    id: entryId || createId("exp"),
    date: form.get("date"),
    referenceMonth,
    description: form.get("description"),
    category,
    amount: form.get("amount"),
    personId: form.get("personId"),
    paymentMethod: form.get("paymentMethod"),
    cardName: form.get("cardName"),
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!expense) {
    setSyncMessage("Nao foi possivel salvar esse gasto.", true);
    renderStatus();
    return;
  }

  if (entryId) {
    state.expenses = state.expenses.map((item) => (item.id === entryId ? expense : item));
    setSyncMessage("Gasto atualizado com sucesso.", false);
  } else {
    state.expenses.unshift(expense);
    setSyncMessage("Gasto salvo com sucesso.", false);
  }

  state.seededDemo = false;
  cancelExpenseEdit({ silent: true });
  persistState();
}

function handleInstallmentSubmit(event) {
  event.preventDefault();
  prepareForRealData();

  const form = new FormData(dom.installmentForm);
  const entryId = cleanText(form.get("entryId"));
  const firstMonth = form.get("firstMonth");

  if (isMonthClosed(firstMonth)) {
    setSyncMessage("A primeira fatura cai em um mes fechado. Reabra esse mes antes de salvar.", true);
    renderStatus();
    return;
  }

  const existing = entryId
    ? state.installments.find((installment) => installment.id === entryId)
    : null;
  if (existing && getInstallmentClosedMonths(existing).length) {
    setSyncMessage("Essa compra parcelada ja toca meses fechados e nao pode mais ser editada.", true);
    renderStatus();
    return;
  }

  const category = addCategoryIfNeeded(form.get("category"));
  const installment = normalizeInstallment({
    id: entryId || createId("inst"),
    purchaseDate: form.get("purchaseDate"),
    description: form.get("description"),
    category,
    totalAmount: form.get("totalAmount"),
    installmentCount: form.get("installmentCount"),
    paidInstallments: existing?.paidInstallments || 0,
    firstMonth,
    personId: form.get("personId"),
    cardName: form.get("cardName"),
    notes: form.get("notes"),
    updatedAt: nowIso(),
  });

  if (!installment) {
    setSyncMessage("Nao foi possivel salvar essa compra parcelada.", true);
    renderStatus();
    return;
  }

  if (entryId) {
    state.installments = state.installments.map((item) =>
      item.id === entryId ? installment : item
    );
    setSyncMessage("Compra parcelada atualizada com sucesso.", false);
  } else {
    state.installments.unshift(installment);
    setSyncMessage("Compra parcelada salva com sucesso.", false);
  }

  state.seededDemo = false;
  cancelInstallmentEdit({ silent: true });
  persistState();
}

function handleMonthTableClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) {
    return;
  }

  const expenseId = button.dataset.id;
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) {
    return;
  }

  if (button.dataset.action === "edit-expense") {
    startExpenseEdit(expenseId);
    return;
  }

  if (button.dataset.action === "delete-expense") {
    if (isMonthClosed(expense.referenceMonth)) {
      setSyncMessage("Esse mes esta fechado e nao permite excluir o gasto.", true);
      renderStatus();
      return;
    }

    if (!window.confirm(`Excluir o gasto "${expense.description}"?`)) {
      return;
    }

    deleteExpense(expenseId);
    setSyncMessage("Gasto removido.", false);
    renderAll();
  }
}

function handleInstallmentListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) {
    return;
  }

  const installmentId = button.dataset.id;
  const installment = state.installments.find((item) => item.id === installmentId);
  if (!installment) {
    return;
  }

  if (button.dataset.action === "edit-installment") {
    startInstallmentEdit(installmentId);
    return;
  }

  if (button.dataset.action === "increment-paid") {
    const targetMonth = getNextPendingMonth(installment);
    if (!targetMonth || isMonthClosed(targetMonth)) {
      setSyncMessage("A proxima parcela cai em um mes fechado e nao pode ser alterada.", true);
      renderStatus();
      return;
    }

    installment.paidInstallments = Math.min(
      installment.installmentCount,
      installment.paidInstallments + 1
    );
    installment.updatedAt = nowIso();
    persistState();
    setSyncMessage("Parcela marcada como paga.", false);
    renderAll();
    return;
  }

  if (button.dataset.action === "decrement-paid") {
    const targetMonth =
      installment.paidInstallments > 0
        ? addMonths(installment.firstMonth, installment.paidInstallments - 1)
        : "";
    if (!targetMonth || isMonthClosed(targetMonth)) {
      setSyncMessage("A parcela a voltar pertence a um mes fechado e nao pode ser alterada.", true);
      renderStatus();
      return;
    }

    installment.paidInstallments = Math.max(0, installment.paidInstallments - 1);
    installment.updatedAt = nowIso();
    persistState();
    setSyncMessage("Ultima parcela marcada como pendente.", false);
    renderAll();
    return;
  }

  if (button.dataset.action === "delete-installment") {
    if (getInstallmentClosedMonths(installment).length) {
      setSyncMessage("Essa compra toca meses fechados e nao pode mais ser excluida.", true);
      renderStatus();
      return;
    }

    if (!window.confirm(`Excluir a compra parcelada "${installment.description}"?`)) {
      return;
    }

    deleteInstallment(installmentId);
    setSyncMessage("Compra parcelada removida.", false);
    renderAll();
  }
}

function handleMonthClosingClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  if (button.dataset.action === "close-month") {
    closeSelectedMonth();
    return;
  }

  if (button.dataset.action === "reopen-month") {
    reopenSelectedMonth();
  }
}

function closeSelectedMonth() {
  const month = state.settings.selectedMonth;
  if (isMonthClosed(month)) {
    return;
  }

  const summary = getMonthlySummary(month);
  const nextClosure = serializeMonthClosure(month, summary);
  nextClosure.status = "closed";
  nextClosure.closedAt = nowIso();
  nextClosure.updatedAt = nowIso();

  state.monthClosures = mergeMonthClosures(state.monthClosures, [nextClosure]);
  persistState();
  setSyncMessage(`Mes ${formatMonthLabel(month)} fechado.`, false);
  renderAll();
}

function reopenSelectedMonth() {
  const month = state.settings.selectedMonth;
  const current = getMonthClosure(month);
  if (!current || current.status !== "closed") {
    return;
  }

  const reopened = {
    ...current,
    status: "open",
    updatedAt: nowIso(),
  };
  state.monthClosures = mergeMonthClosures(state.monthClosures, [reopened]);
  persistState();
  setSyncMessage(`Mes ${formatMonthLabel(month)} reaberto.`, false);
  renderAll();
}

function startExpenseEdit(expenseId) {
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) {
    return;
  }

  uiState.expenseEditId = expenseId;
  uiState.activeForm = "expense";
  dom.expenseForm.elements.entryId.value = expense.id;
  dom.expenseForm.elements.description.value = expense.description;
  dom.expenseForm.elements.amount.value = expense.amount;
  dom.expenseForm.elements.date.value = expense.date;
  dom.expenseForm.elements.referenceMonth.value = expense.referenceMonth;
  dom.expenseForm.elements.category.value = expense.category;
  dom.expenseForm.elements.personId.value = expense.personId;
  dom.expenseForm.elements.paymentMethod.value = expense.paymentMethod;
  dom.expenseForm.elements.cardName.value = expense.cardName || "";
  dom.expenseForm.elements.notes.value = expense.notes || "";
  renderAll();
}

function startInstallmentEdit(installmentId) {
  const installment = state.installments.find((item) => item.id === installmentId);
  if (!installment) {
    return;
  }

  uiState.installmentEditId = installmentId;
  uiState.activeForm = "installment";
  dom.installmentForm.elements.entryId.value = installment.id;
  dom.installmentForm.elements.description.value = installment.description;
  dom.installmentForm.elements.totalAmount.value = installment.totalAmount;
  dom.installmentForm.elements.purchaseDate.value = installment.purchaseDate;
  dom.installmentForm.elements.firstMonth.value = installment.firstMonth;
  dom.installmentForm.elements.category.value = installment.category;
  dom.installmentForm.elements.personId.value = installment.personId;
  dom.installmentForm.elements.cardName.value = installment.cardName;
  dom.installmentForm.elements.installmentCount.value = installment.installmentCount;
  dom.installmentForm.elements.notes.value = installment.notes || "";
  renderAll();
}

function cancelExpenseEdit(options = {}) {
  uiState.expenseEditId = "";
  dom.expenseForm.reset();
  dom.expenseForm.elements.entryId.value = "";
  dom.expenseForm.elements.date.value = getCurrentDate();
  dom.expenseForm.elements.referenceMonth.value = state.settings.selectedMonth;
  dom.expenseForm.elements.personId.value = state.settings.people[0]?.id || "person-1";
  if (!options.silent) {
    renderAll();
  }
}

function cancelInstallmentEdit(options = {}) {
  uiState.installmentEditId = "";
  dom.installmentForm.reset();
  dom.installmentForm.elements.entryId.value = "";
  dom.installmentForm.elements.purchaseDate.value = getCurrentDate();
  dom.installmentForm.elements.firstMonth.value = state.settings.selectedMonth;
  dom.installmentForm.elements.personId.value = state.settings.people[0]?.id || "person-1";
  if (!options.silent) {
    renderAll();
  }
}

function prepareForRealData() {
  if (!state.seededDemo) {
    return;
  }

  state.expenses = [];
  state.installments = [];
  state.monthClosures = [];
  state.deletions = {
    expenses: [],
    installments: [],
  };
  state.seededDemo = false;
  state.sync.lastSyncMessage = "Dados de exemplo removidos para comecar seu uso real.";
}

function installmentTouchesMonth(installment, month) {
  const index = monthDiff(installment.firstMonth, month) + 1;
  return index >= 1 && index <= installment.installmentCount;
}

function installmentMatchesFilters(installment) {
  if (uiState.filters.type === "expense") {
    return false;
  }

  if (
    uiState.filters.personId !== "all" &&
    installment.personId !== uiState.filters.personId
  ) {
    return false;
  }

  if (uiState.filters.category !== "all" && installment.category !== uiState.filters.category) {
    return false;
  }

  if (uiState.filters.cardName === "__none__") {
    return false;
  }

  if (
    uiState.filters.cardName !== "all" &&
    installment.cardName !== uiState.filters.cardName
  ) {
    return false;
  }

  const statusKey = getStatusFilterKey(
    installment.paidInstallments >= installment.installmentCount
      ? "Pago"
      : getNextPendingMonth(installment) < state.settings.selectedMonth
        ? "Em aberto"
        : "Previsto"
  );
  if (uiState.filters.status !== "all" && statusKey !== uiState.filters.status) {
    return false;
  }

  if (uiState.filters.search) {
    const haystack = [
      installment.description,
      installment.notes,
      installment.cardName,
      installment.category,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(uiState.filters.search)) {
      return false;
    }
  }

  return true;
}

function getInstallmentClosedMonths(installment) {
  return state.monthClosures
    .filter((closure) => closure.status === "closed" && installmentTouchesMonth(installment, closure.month))
    .map((closure) => formatMonthLabel(closure.month));
}

function serializeMonthClosure(month, summary) {
  return normalizeMonthClosure({
    id: month,
    month,
    status: "open",
    closedAt: "",
    note: "",
    monthTotal: summary.monthTotal,
    itemCount: summary.items.length,
    byPerson: summary.byPerson,
    categoryTotals: summary.categoryTotals,
    remainingInstallmentsAmount: summary.remainingInstallmentsAmount,
    paidInstallmentsAmount: summary.paidInstallmentsAmount,
    openInstallments: summary.openInstallments,
    paidInstallmentsCount: summary.paidInstallmentsCount,
    updatedAt: nowIso(),
  });
}

function mergeStates(localState, remoteState) {
  const normalizedLocal = normalizeState(localState);
  const normalizedRemote = normalizeState(remoteState);

  const mergedExpenses = mergeCollection(
    normalizedLocal.expenses,
    normalizedRemote.expenses,
    normalizedLocal.deletions.expenses,
    normalizedRemote.deletions.expenses
  );
  const mergedInstallments = mergeCollection(
    normalizedLocal.installments,
    normalizedRemote.installments,
    normalizedLocal.deletions.installments,
    normalizedRemote.deletions.installments
  );

  return normalizeState({
    version: 2,
    seededDemo: normalizedLocal.seededDemo && normalizedRemote.seededDemo,
    settings:
      normalizedRemote.settings.updatedAt > normalizedLocal.settings.updatedAt
        ? normalizedRemote.settings
        : normalizedLocal.settings,
    sync:
      (normalizedRemote.sync.lastSyncedAt || "") > (normalizedLocal.sync.lastSyncedAt || "")
        ? normalizedRemote.sync
        : normalizedLocal.sync,
    expenses: mergedExpenses.items,
    installments: mergedInstallments.items,
    monthClosures: mergeMonthClosures(
      normalizedLocal.monthClosures,
      normalizedRemote.monthClosures
    ),
    deletions: {
      expenses: mergedExpenses.deletions,
      installments: mergedInstallments.deletions,
    },
  });
}
