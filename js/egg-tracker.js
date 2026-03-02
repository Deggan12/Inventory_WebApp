// js/egg-tracker.js
import { supabase } from "./supabase.js";

/* ─────────────────────────────────────
   STATE
───────────────────────────────────── */
let isAdmin      = false;
let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let monthEntries = [];

/* ─────────────────────────────────────
   INIT
───────────────────────────────────── */
async function init() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single();
    isAdmin = !!adminRow;
  }

  // Show/hide form vs auth notice using the existing .hidden class
  if (isAdmin) {
    document.getElementById("entry-panel").classList.remove("hidden");
  } else {
    document.getElementById("auth-gate").classList.remove("hidden");
  }

  // Hide logout btn by default (auth-ui.js handles it, but just in case)
  document.getElementById("logout-btn").classList.add("hidden");

  setupMonthNav();
  setupSaleRows();
  document.getElementById("save-entry-btn").addEventListener("click", saveEntry);

  await loadMonth();
}

/* ─────────────────────────────────────
   MONTH NAVIGATION
───────────────────────────────────── */
function setupMonthNav() {
  document.getElementById("prev-month").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    loadMonth();
  });
  document.getElementById("next-month").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    loadMonth();
  });
}

function monthLabel() {
  return new Date(currentYear, currentMonth, 1)
    .toLocaleString("default", { month: "long", year: "numeric" });
}

/* ─────────────────────────────────────
   LOAD MONTH
───────────────────────────────────── */
async function loadMonth() {
  document.getElementById("month-label").textContent   = monthLabel();
  document.getElementById("table-heading").textContent = `Entries — ${monthLabel()}`;

  const mm      = String(currentMonth + 1).padStart(2, "0");
  const from    = `${currentYear}-${mm}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const to      = `${currentYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("egg_entries")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) { console.error(error); return; }

  monthEntries = data || [];

  renderSummary();
  renderTable();
  renderChart();

  if (isAdmin) {
    await prefillOpening();
    setDefaultDate();
  }
}

/* ─────────────────────────────────────
   SUMMARY CARDS
───────────────────────────────────── */
function renderSummary() {
  let produced = 0, sold = 0, revenue = 0, lost = 0;

  monthEntries.forEach(r => {
    produced += r.eggs_produced || 0;
    sold     += r.eggs_sold     || 0;
    revenue  += Number(r.revenue || 0);
    lost     += r.eggs_lost     || 0;
  });

  const lastEntry = monthEntries[monthEntries.length - 1];
  const stock     = lastEntry ? (lastEntry.closing_balance ?? "—") : "—";

  document.getElementById("sum-produced").textContent = produced.toLocaleString();
  document.getElementById("sum-sold").textContent     = sold.toLocaleString();
  document.getElementById("sum-revenue").textContent  = fmtCurrency(revenue);
  document.getElementById("sum-lost").textContent     = lost.toLocaleString();
  document.getElementById("sum-stock").textContent    =
    stock === "—" ? "—" : Number(stock).toLocaleString();
}

/* ─────────────────────────────────────
   TABLE
───────────────────────────────────── */
function renderTable() {
  const tbody = document.getElementById("entries-tbody");

  if (!monthEntries.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="tracker-no-entries">No entries for this month yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = monthEntries.map(r => `
    <tr>
      <td>${fmtDate(r.date)}</td>
      <td>${r.opening_balance ?? 0}</td>
      <td>${r.eggs_produced   ?? 0}</td>
      <td>${r.eggs_sold       ?? 0}</td>
      <td>${r.eggs_lost       ?? 0}</td>
      <td>${r.closing_balance ?? 0}</td>
      <td>${fmtCurrency(r.revenue || 0)}</td>
      <td class="tracker-dim">${r.remarks || "—"}</td>
      <td>${isAdmin
        ? `<button class="tracker-del-btn" data-id="${r.id}" title="Delete">✕</button>`
        : ""}</td>
    </tr>
  `).join("");

  if (isAdmin) {
    tbody.querySelectorAll(".tracker-del-btn").forEach(btn =>
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this entry?")) return;
        const { error } = await supabase
          .from("egg_entries")
          .delete()
          .eq("id", btn.dataset.id);
        if (!error) loadMonth();
        else alert("Error: " + error.message);
      })
    );
  }
}

let chartInstance = null;

/* ─────────────────────────────────────
   CHART
───────────────────────────────────── */
function renderChart() {
  document.getElementById("chart-heading").textContent = `Monthly Overview — ${monthLabel()}`;

  const labels   = monthEntries.map(r => fmtDate(r.date));
  const produced = monthEntries.map(r => r.eggs_produced  || 0);
  const sold     = monthEntries.map(r => r.eggs_sold      || 0);
  const lost     = monthEntries.map(r => r.eggs_lost      || 0);
  const stock    = monthEntries.map(r => r.closing_balance || 0);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(document.getElementById("egg-chart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Produced",
          data: produced,
          backgroundColor: "#dd3326",
          borderRadius: 6
        },
        {
          label: "Sold",
          data: sold,
          backgroundColor: "#F77F00",
          borderRadius: 6
        },
        {
          label: "Lost / Given",
          data: lost,
          backgroundColor: "#FCBF49",
          borderRadius: 6
        },
        {
          label: "Closing Stock",
          data: stock,
          backgroundColor: "#2A9D8F",
          borderRadius: 6,
          type: "line",
          borderColor: "#2A9D8F",
          borderWidth: 2,
          pointBackgroundColor: "#2A9D8F",
          fill: false,
          tension: 0.3,
          yAxisID: "y"
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}


async function prefillOpening() {
  const input = document.getElementById("entry-opening");
  const hint  = document.getElementById("opening-hint");

  // Use last closing balance in current month if entries exist
  if (monthEntries.length > 0) {
    const last = monthEntries[monthEntries.length - 1];
    const val  = last.closing_balance ?? 0;
    input.placeholder = `${val}`;
    input.value = "";
    hint.textContent  = `Last closing balance: ${val} eggs. Edit if needed.`;
    return;
  }

  // Otherwise look at most recent past entry
  const mm = String(currentMonth + 1).padStart(2, "0");
  const { data } = await supabase
    .from("egg_entries")
    .select("closing_balance, date")
    .lt("date", `${currentYear}-${mm}-01`)
    .order("date", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const val = data[0].closing_balance ?? 0;
    input.placeholder = `${val}`;
    input.value = "";
    hint.textContent  = `Auto-filled from ${fmtDate(data[0].date)}: ${val} eggs. Edit if needed.`;
  } else {
    input.placeholder = "0";
    input.value = "";
    hint.textContent  = "No previous entry found — enter opening balance manually.";
  }
}

function setDefaultDate() {
  const input = document.getElementById("entry-date");
  const today = new Date();
  if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
    input.value = today.toISOString().split("T")[0];
  } else {
    const mm = String(currentMonth + 1).padStart(2, "0");
    input.value = `${currentYear}-${mm}-01`;
  }
}

/* ─────────────────────────────────────
   SALE ROWS
───────────────────────────────────── */
function setupSaleRows() {
  addSaleRow();
  document.getElementById("add-sale-btn").addEventListener("click", addSaleRow);
}

function addSaleRow() {
  const container = document.getElementById("sales-container");
  const div = document.createElement("div");
  div.className = "tracker-sale-row";
  div.innerHTML = `
    <input type="number" placeholder="Number of eggs sold" min="0" class="sale-qty" />
    <input type="number" placeholder="Price per egg (e.g. 0.50)" min="0" step="0.01" class="sale-price" />
    <button class="tracker-remove-sale" type="button" title="Remove row">✕</button>
  `;
  div.querySelector(".tracker-remove-sale").addEventListener("click", () => {
    if (document.querySelectorAll(".tracker-sale-row").length > 1) div.remove();
  });
  container.appendChild(div);
}

function collectSales() {
  let totalSold = 0, totalRevenue = 0;
  document.querySelectorAll(".tracker-sale-row").forEach(row => {
    const qty   = parseFloat(row.querySelector(".sale-qty").value)   || 0;
    const price = parseFloat(row.querySelector(".sale-price").value) || 0;
    totalSold    += qty;
    totalRevenue += qty * price;
  });
  return { totalSold, totalRevenue };
}

/* ─────────────────────────────────────
   SAVE ENTRY
───────────────────────────────────── */
async function saveEntry() {
  const btn      = document.getElementById("save-entry-btn");
  const date     = document.getElementById("entry-date").value;
  const produced = parseInt(document.getElementById("entry-produced").value) || 0;
  const lost     = parseInt(document.getElementById("entry-lost").value)     || 0;
  const remarks  = document.getElementById("entry-remarks").value.trim();

  // Opening: typed value or fall back to placeholder number
  const openingInput = document.getElementById("entry-opening");
  const opening = openingInput.value !== ""
    ? parseInt(openingInput.value)
    : (parseInt(openingInput.placeholder) || 0);

  if (!date) { showMsg("Please select a date.", "error"); return; }

  const { totalSold, totalRevenue } = collectSales();
  const closing = opening + produced - totalSold - lost;

  const { data: { user } } = await supabase.auth.getUser();

  btn.disabled = true;

  const { error } = await supabase.from("egg_entries").insert({
    date,
    opening_balance: opening,
    eggs_produced:   produced,
    eggs_sold:       totalSold,
    eggs_lost:       lost,
    revenue:         parseFloat(totalRevenue.toFixed(2)),
    closing_balance: closing,
    remarks:         remarks || null,
    user_id:         user?.id ?? null
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    showMsg("Error: " + error.message, "error");
    return;
  }

  showMsg("Entry saved ✓", "success");

  // Reset form
  document.getElementById("entry-produced").value = "";
  document.getElementById("entry-opening").value  = "";
  document.getElementById("entry-lost").value     = "";
  document.getElementById("entry-remarks").value  = "";
  document.getElementById("sales-container").innerHTML = "";
  addSaleRow();

  await loadMonth();
}

/* ─────────────────────────────────────
   HELPERS
───────────────────────────────────── */
function showMsg(text, type) {
  const el = document.getElementById("form-msg");
  el.textContent = text;
  el.className   = `tracker-form-msg ${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

function fmtCurrency(n) {
  return "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${parseInt(d)}/${parseInt(m)}/${y}`;
}

/* ─────────────────────────────────────
   START
───────────────────────────────────── */
init();