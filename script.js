const STORAGE_KEY = "company-it-requirements-v1";

const $ = (id) => document.getElementById(id);

const demoData = [];

let companies = loadData();
let statusChart = null;
let departmentChart = null;
let toastTimer = null;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : demoData;
  } catch {
    return demoData;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

function verificationLabel(status) {
  const labels = {
    verified: "Verified",
    pending: "Pending Verification",
    "follow-up": "Follow-up Required"
  };

  return labels[status] || labels.pending;
}

function statusClass(status) {
  return status === "verified"
    ? "status-active"
    : status === "follow-up"
      ? "status-expired"
      : "status-soon";
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

/* Dashboard statistics */

function renderStats() {
  const userTypes = new Set(
    companies.map(item => item.userType).filter(Boolean)
  );

  const licenseAssignments = companies.filter(
    item => item.microsoftLicense
  );

  const pending = companies.filter(
    item => (item.verificationStatus || "pending") !== "verified"
  );

  $("totalCount").textContent = companies.length;
  $("activeCount").textContent = userTypes.size;
  $("soonCount").textContent = licenseAssignments.length;
  $("expiredCount").textContent = pending.length;
}

/* Company search and filtering */

function getFilteredData() {
  const query = $("searchInput").value.trim().toLowerCase();
  const filter = $("statusFilter").value;

  return companies.filter(company => {
    const searchable = [
      company.name,
      company.website,
      company.locations,
      company.emailDomain,
      company.notes,
      company.source
    ].join(" ").toLowerCase();

    const status = company.verificationStatus || "pending";

    return searchable.includes(query) &&
      (filter === "all" || status === filter);
  });
}

/* Company directory */

function renderTable() {
  const data = getFilteredData();

  $("licenseTable").innerHTML = data.map(company => {
    const status = company.verificationStatus || "pending";

    let website = "—";

    if (company.website) {
      try {
        const url = new URL(company.website);

        if (url.protocol === "https:" || url.protocol === "http:") {
          website = `<a href="${escapeHTML(url.href)}"
            target="_blank" rel="noopener noreferrer">
            ${escapeHTML(url.hostname)}
          </a>`;
        }
      } catch {
        website = escapeHTML(company.website);
      }
    }

    return `
      <tr>
        <td>
          <div class="program-name">${escapeHTML(company.name)}</div>
          <div class="program-subtitle">
            ${escapeHTML(company.notes || "Company record")}
          </div>
        </td>

        <td>${website}</td>

        <td>${escapeHTML(company.locations || "Not documented")}</td>

        <td>
          <span class="status ${statusClass(status)}">
            ${verificationLabel(status)}
          </span>
        </td>

        <td>
          <button class="action-btn" data-edit="${company.id}">
            Edit
          </button>

          <button class="action-btn delete" data-delete="${company.id}">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");

  $("emptyState").hidden = data.length > 0;

  $("resultCount").textContent =
    `${data.length} of ${companies.length} records`;
}

/* Documentation charts */

function renderCharts() {
  if (typeof Chart === "undefined") return;

  const verified = companies.filter(
    item => item.verificationStatus === "verified"
  ).length;

  const pending = companies.filter(
    item => (item.verificationStatus || "pending") === "pending"
  ).length;

  const followUp = companies.filter(
    item => item.verificationStatus === "follow-up"
  ).length;

  if (statusChart) statusChart.destroy();

  statusChart = new Chart($("statusChart"), {
    type: "doughnut",
    data: {
      labels: ["Verified", "Pending Verification", "Follow-up Required"],
      datasets: [{
        data: [verified, pending, followUp],
        backgroundColor: ["#15966A", "#E9AC3B", "#D94C58"],
        borderWidth: 0,
        hoverOffset: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16
          }
        }
      }
    }
  });

  const categories = {
    "Company Details": companies.length,
    "User Types": companies.filter(item => item.userType).length,
    "Email & Domains": companies.filter(item => item.emailDomain).length,
    "Microsoft Licenses": companies.filter(item => item.microsoftLicense).length,
    "Applications": companies.filter(item => item.application).length,
    "Access Requirements": companies.filter(item => item.accessRequirements).length
  };

  if (departmentChart) departmentChart.destroy();

  departmentChart = new Chart($("departmentChart"), {
    type: "bar",
    data: {
      labels: Object.keys(categories),
      datasets: [{
        label: "Documented Items",
        data: Object.values(categories),
        backgroundColor: "#2364D2",
        borderRadius: 6,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: "#EDF1F7" }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}

/* Related sections */

function renderRelatedTables() {
  const sections = [
    ["userTypesTable", [
      ["Company", "name"],
      ["User Type", "userType"],
      ["Department / Role", "role"],
      ["Company Email Required", "emailRequired"],
      ["Notes", "notes"]
    ]],
    ["emailDomainsTable", [
      ["Company", "name"],
      ["Website", "website"],
      ["Email Domain", "emailDomain"],
      ["Applicable User Types", "userType"],
      ["Verification Status", "verificationStatus"]
    ]],
    ["microsoftLicensesTable", [
      ["Company", "name"],
      ["User Type", "userType"],
      ["Microsoft License", "microsoftLicense"],
      ["Purpose", "licensePurpose"],
      ["Verification Status", "verificationStatus"]
    ]],
    ["applicationsTable", [
      ["Company", "name"],
      ["Application / System", "application"],
      ["Purpose", "applicationPurpose"],
      ["Applicable User Types", "userType"],
      ["Notes", "notes"]
    ]],
    ["accessRequirementsTable", [
      ["Company", "name"],
      ["User Type", "userType"],
      ["System", "application"],
      ["Required Access", "accessRequirements"],
      ["Approval Required", "approvalRequired"]
    ]],
    ["documentationTable", [
      ["Information Item", "name"],
      ["Source / Contact", "source"],
      ["Status", "verificationStatus"],
      ["Last Updated", "lastUpdated"],
      ["Follow-up Notes", "notes"]
    ]]
  ];

  sections.forEach(([tableId, columns]) => {
    const tbody = $(tableId);
    if (!tbody) return;

    const rows = companies.filter(company =>
      columns.some(([, key]) => company[key])
    );

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length}">
            <span class="muted">
              No documented information yet. Add company records
              and verify details with the responsible team.
            </span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(company => `
      <tr>
        ${columns.map(([label, key]) => {
          let value = company[key];

          if (key === "verificationStatus") {
            value = verificationLabel(value || "pending");
          }

          if (key === "emailRequired") {
            value = value || "Not confirmed";
          }

          if (key === "lastUpdated") {
            value = formatDate(value);
          }

          return `<td>${escapeHTML(value || "Not documented")}</td>`;
        }).join("")}
      </tr>
    `).join("");
  });
}

/* Render all page sections */

function renderAll() {
  renderStats();
  renderTable();
  renderCharts();
  renderRelatedTables();
}

/* Add and edit company information */

function openForm(company = null) {
  $("licenseForm").reset();

  $("licenseId").value = company?.id ?? "";
  $("programName").value = company?.name ?? "";
  $("department").value = company?.website ?? "";
  $("seats").value = company?.locations ?? "";
  $("startDate").value = company?.emailDomain ?? "";
  $("licenseType").value = company?.category ?? "company";
  $("renewalStatus").value =
    company?.verificationStatus ?? "pending";
  $("source").value = company?.source ?? "";
  $("notes").value = company?.notes ?? "";

  $("dialogTitle").textContent = company
    ? "Edit Company Information"
    : "Add Company Information";

  $("formError").hidden = true;
  $("licenseDialog").showModal();
}

function saveCompany(event) {
  event.preventDefault();

  const id = $("licenseId").value;

  const name = $("programName").value.trim();
  const website = $("department").value.trim();
  const locations = $("seats").value.trim();
  const emailDomain = $("startDate").value.trim();

  const error = $("formError");

  if (!name) {
    error.textContent = "Please enter a company name.";
    error.hidden = false;
    return;
  }

  if (website) {
    try {
      const url = new URL(website);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      error.textContent =
        "Enter a valid website URL, including https://.";
      error.hidden = false;
      return;
    }
  }

  const existing = id
    ? companies.find(item => item.id === Number(id))
    : null;

  const company = {
    ...existing,
    id: id ? Number(id) : Date.now(),
    name,
    website,
    locations,
    emailDomain,
    category: $("licenseType").value,
    verificationStatus: $("renewalStatus").value,
    source: $("source").value.trim(),
    notes: $("notes").value.trim(),
    lastUpdated: new Date().toISOString().slice(0, 10)
  };

  if (id) {
    companies = companies.map(item =>
      item.id === Number(id) ? company : item
    );
  } else {
    companies.unshift(company);
  }

  saveData();
  renderAll();
  $("licenseDialog").close();

  showToast(id ? "Company information updated." : "Company added.");
}

/* Delete company */

function deleteCompany(id) {
  const company = companies.find(item => item.id === Number(id));
  if (!company) return;

  if (!confirm(`Delete the record for "${company.name}"?`)) return;

  companies = companies.filter(item => item.id !== Number(id));

  saveData();
  renderAll();
  showToast("Company record deleted.");
}

/* Export visible company records to CSV */

function exportCSV() {
  const headers = [
    "Company Name",
    "Website",
    "Locations / Branches",
    "Email Domain",
    "Information Category",
    "Verification Status",
    "Source / Contact",
    "Notes",
    "Last Updated"
  ];

  const rows = getFilteredData().map(company => [
    company.name,
    company.website,
    company.locations,
    company.emailDomain,
    company.category,
    verificationLabel(company.verificationStatus),
    company.source,
    company.notes,
    company.lastUpdated
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(","))
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    { type: "text/csv;charset=utf-8;" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "company-it-requirements.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast("Company data exported.");
}

/* Event listeners */

$("addBtn").addEventListener("click", () => openForm());

$("closeDialog").addEventListener("click", () => {
  $("licenseDialog").close();
});

$("cancelDialog").addEventListener("click", () => {
  $("licenseDialog").close();
});

$("licenseForm").addEventListener("submit", saveCompany);

$("searchInput").addEventListener("input", renderTable);
$("statusFilter").addEventListener("change", renderTable);
$("exportBtn").addEventListener("click", exportCSV);

$("chooseUploadBtn").addEventListener("click", () => {
  $("documentFileInput").click();
});

$("documentFileInput").addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  showToast(`Selected ${files.length} file(s).`);
  event.target.value = "";
});
$("licenseTable").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const company = companies.find(
      item => item.id === Number(editButton.dataset.edit)
    );

    if (company) openForm(company);
  }

  if (deleteButton) {
    deleteCompany(deleteButton.dataset.delete);
  }
});

$("currentYear").textContent = new Date().getFullYear();

/* Dark Mode */
const THEME_KEY = "company-it-theme";
const themeToggle = $("themeToggle");

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light"
  );

  if (themeToggle) {
    themeToggle.textContent = isDark
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";

    themeToggle.setAttribute("aria-pressed", String(isDark));
  }

  try {
    localStorage.setItem(
      THEME_KEY,
      isDark ? "dark" : "light"
    );
  } catch (error) {}
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem(THEME_KEY) || "light";
} catch (error) {}

applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme");

    applyTheme(currentTheme === "dark" ? "light" : "dark");
  });
}

renderAll();