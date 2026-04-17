const SHEETS = {
  settings: "Settings",
  expenses: "Expenses",
  installments: "Installments",
  deletedExpenses: "DeletedExpenses",
  deletedInstallments: "DeletedInstallments",
};

function doGet(e) {
  const mode = String((e && e.parameter && e.parameter.mode) || "pull").toLowerCase();

  if (mode !== "pull") {
    return jsonOutput_({
      ok: false,
      error: "Modo inválido.",
    });
  }

  ensureSheets_();
  return jsonOutput_({
    ok: true,
    payload: readState_(),
  });
}

function doPost(e) {
  const mode = String((e && e.parameter && e.parameter.mode) || "").toLowerCase();

  if (mode !== "replaceall") {
    return jsonOutput_({
      ok: false,
      error: "Modo inválido.",
    });
  }

  const payload = JSON.parse((e && e.parameter && e.parameter.payload) || "{}");
  ensureSheets_();
  writeState_(payload);

  return jsonOutput_({
    ok: true,
    payload: readState_(),
  });
}

function ensureSheets_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(spreadsheet, SHEETS.settings, ["key", "value", "updatedAt"]);
  ensureSheet_(spreadsheet, SHEETS.expenses, [
    "id",
    "date",
    "referenceMonth",
    "description",
    "category",
    "amount",
    "personId",
    "paymentMethod",
    "notes",
    "updatedAt",
  ]);
  ensureSheet_(spreadsheet, SHEETS.installments, [
    "id",
    "purchaseDate",
    "description",
    "category",
    "totalAmount",
    "installmentCount",
    "paidInstallments",
    "firstMonth",
    "personId",
    "cardName",
    "notes",
    "installmentAmountsJson",
    "updatedAt",
  ]);
  ensureSheet_(spreadsheet, SHEETS.deletedExpenses, ["id", "deletedAt"]);
  ensureSheet_(spreadsheet, SHEETS.deletedInstallments, ["id", "deletedAt"]);
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const differs = headers.some(function (header, index) {
    return currentHeaders[index] !== header;
  });

  if (differs) {
    sheet.clear();
    sheet.appendRow(headers);
  }
}

function readState_() {
  return {
    version: 1,
    seededDemo: false,
    settings: readSettings_(),
    sync: {
      scriptUrl: "",
      autoSync: false,
      lastSyncedAt: "",
      lastSyncMessage: "Sincronizado com Google Sheets.",
    },
    expenses: readRows_(SHEETS.expenses).map(function (row) {
      return {
        id: row[0],
        date: row[1],
        referenceMonth: row[2],
        description: row[3],
        category: row[4],
        amount: Number(row[5]) || 0,
        personId: row[6],
        paymentMethod: row[7],
        notes: row[8],
        updatedAt: row[9],
      };
    }),
    installments: readRows_(SHEETS.installments).map(function (row) {
      return {
        id: row[0],
        purchaseDate: row[1],
        description: row[2],
        category: row[3],
        totalAmount: Number(row[4]) || 0,
        installmentCount: Number(row[5]) || 0,
        paidInstallments: Number(row[6]) || 0,
        firstMonth: row[7],
        personId: row[8],
        cardName: row[9],
        notes: row[10],
        installmentAmounts: safeJsonParse_(row[11], []),
        updatedAt: row[12],
      };
    }),
    deletions: {
      expenses: readRows_(SHEETS.deletedExpenses).map(function (row) {
        return { id: row[0], deletedAt: row[1] };
      }),
      installments: readRows_(SHEETS.deletedInstallments).map(function (row) {
        return { id: row[0], deletedAt: row[1] };
      }),
    },
  };
}

function readSettings_() {
  const rows = readRows_(SHEETS.settings);
  const map = {};

  rows.forEach(function (row) {
    map[row[0]] = row[1];
  });

  return {
    householdLabel: map.householdLabel || "Painel financeiro da casa",
    people: safeJsonParse_(
      map.peopleJson,
      [
        { id: "person-1", name: "Você" },
        { id: "person-2", name: "Sua esposa" },
      ]
    ),
    monthlyBudget: Number(map.monthlyBudget) || 0,
    selectedMonth:
      map.selectedMonth ||
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM"),
    categories: safeJsonParse_(map.categoriesJson, []),
    updatedAt: map.updatedAt || new Date().toISOString(),
  };
}

function writeState_(payload) {
  writeSettings_(payload.settings || {});
  writeExpenses_(payload.expenses || []);
  writeInstallments_(payload.installments || []);
  writeDeletions_(SHEETS.deletedExpenses, payload.deletions && payload.deletions.expenses);
  writeDeletions_(
    SHEETS.deletedInstallments,
    payload.deletions && payload.deletions.installments
  );
}

function writeSettings_(settings) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.settings);
  clearDataRows_(sheet);

  const rows = [
    [
      "householdLabel",
      settings.householdLabel || "Painel financeiro da casa",
      settings.updatedAt || new Date().toISOString(),
    ],
    [
      "peopleJson",
      JSON.stringify(settings.people || []),
      settings.updatedAt || new Date().toISOString(),
    ],
    [
      "monthlyBudget",
      Number(settings.monthlyBudget) || 0,
      settings.updatedAt || new Date().toISOString(),
    ],
    [
      "selectedMonth",
      settings.selectedMonth || "",
      settings.updatedAt || new Date().toISOString(),
    ],
    [
      "categoriesJson",
      JSON.stringify(settings.categories || []),
      settings.updatedAt || new Date().toISOString(),
    ],
    [
      "updatedAt",
      settings.updatedAt || new Date().toISOString(),
      settings.updatedAt || new Date().toISOString(),
    ],
  ];

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function writeExpenses_(expenses) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.expenses);
  clearDataRows_(sheet);

  if (!expenses.length) {
    return;
  }

  const rows = expenses.map(function (expense) {
    return [
      expense.id || "",
      expense.date || "",
      expense.referenceMonth || "",
      expense.description || "",
      expense.category || "",
      Number(expense.amount) || 0,
      expense.personId || "",
      expense.paymentMethod || "",
      expense.notes || "",
      expense.updatedAt || new Date().toISOString(),
    ];
  });

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function writeInstallments_(installments) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.installments);
  clearDataRows_(sheet);

  if (!installments.length) {
    return;
  }

  const rows = installments.map(function (installment) {
    return [
      installment.id || "",
      installment.purchaseDate || "",
      installment.description || "",
      installment.category || "",
      Number(installment.totalAmount) || 0,
      Number(installment.installmentCount) || 0,
      Number(installment.paidInstallments) || 0,
      installment.firstMonth || "",
      installment.personId || "",
      installment.cardName || "",
      installment.notes || "",
      JSON.stringify(installment.installmentAmounts || []),
      installment.updatedAt || new Date().toISOString(),
    ];
  });

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function writeDeletions_(sheetName, deletions) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  clearDataRows_(sheet);

  if (!deletions || !deletions.length) {
    return;
  }

  const rows = deletions.map(function (entry) {
    return [entry.id || "", entry.deletedAt || new Date().toISOString()];
  });

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}

function clearDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
}

function readRows_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) {
    return [];
  }

  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function safeJsonParse_(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function jsonOutput_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
