// js/cows.js
import { supabase } from "./supabase.js";

let isAdmin = false;
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let monthEntries = [];

async function init() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = !!adminRow;
  }

  if (!isAdmin) {
    document.getElementById("access-denied").classList.remove("hidden");
    return;
  }

  document.getElementById("entry-panel").classList.remove("hidden");

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("entry-date").value = today;

  setupMonthNav();
  setupLiveCalc();
  document.getElementById("save-entry-btn").addEventListener("click", saveEntry);

  await loadMonth();
}

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

function setupLiveCalc() {
  const revenueIds = ["entry-revenue"];
  const expenseIds = ["entry-feed", "entry-medicine", "entry-labour", "entry-other"];
  const allIds = [...revenueIds, ...expenseIds];

  allIds.forEach(id => {
    document.getElementById(id).addEventListener("input", updateLiveCalc);
  });
}

function updateLiveCalc() {
  const revenue   = parseFloat(document.getElementById("entry-revenue").value)  || 0;
  const feed      = parseFloat(document.getElementById("entry-feed").value)      || 0;
  const medicine  = parseFloat(document.getElementById("entry-medicine").value)  || 0;
  const labour    = parseFloat(document.getElementById("entry-labour").value)    || 0;
  const other     = parseFloat(document.getElementById("entry-other").value)     || 0;

  const totalExpenses = feed + medicine + labour + other;
  const net = revenue - totalExpenses;

  document.getElementById("calc-total-revenue").textContent  = fmtCurrency(revenue);
  document.getElementById("calc-total-expenses").textContent = fmtCurrency(totalExpenses);
  document.getElementById("calc-net-income").textContent     = fmtCurrency(net);
  document.getElementById("calc-net-income").style.color     = net >= 0 ? "#2A9D8F" : "#dd3326";
}

function monthLabel() {
  return new Date(currentYear, currentMonth, 1)
    .toLocaleString("default", { month: "long", year: "numeric" });
}

async function loadMonth() {
  document.getElementById("month-label").textContent     = monthLabel();
  document.getElementById("table-heading").textContent   = `Entries — ${monthLabel()}`;

  const mm      = String(currentMonth + 1).padStart(2, "0");
  const from    = `${currentYear}-${mm}-01`;
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const to      = `${currentYear}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("cow_entries")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) { console.error(error); return; }

  monthEntries = data || [];
  renderSummary();
  renderTable();
}

function renderSummary() {
  let milk = 0, sold = 0, revenue = 0, expenses = 0;

  monthEntries.forEach(r => {
    milk     += r.milk_produced    || 0;
    sold     += r.milk_sold        || 0;
    revenue  += Number(r.milk_revenue    || 0);
    expenses += Number(r.expense_feed    || 0)
              + Number(r.expense_medicine || 0)
              + Number(r.expense_labour   || 0)
              + Number(r.expense_other    || 0);
  });

  const net = revenue - expenses;

  document.getElementById("sum-milk").textContent     = milk.toLocaleString() + " L";
  document.getElementById("sum-sold").textContent     = sold.toLocaleString() + " L";
  document.getElementById("sum-revenue").textContent  = fmtCurrency(revenue);
  document.getElementById("sum-expenses").textContent = fmtCurrency(expenses);
  document.getElementById("sum-net").textContent      = fmtCurrency(net);
  document.getElementById("sum-net").style.color      = net >= 0 ? "#2A9D8F" : "#dd3326";
}

function renderTable() {
  const tbody = document.getElementById("entries-tbody");

  if (!monthEntries.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="tracker-no-entries">No entries for this month yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = monthEntries.map(r => {
    const totalExpenses = Number(r.expense_feed     || 0)
                        + Number(r.expense_medicine || 0)
                        + Number(r.expense_labour   || 0)
                        + Number(r.expense_other    || 0);
    const net = Number(r.milk_revenue || 0) - totalExpenses;

    return `
      <tr>
        <td>${fmtDate(r.date)}</td>
        <td>${r.milk_produced ?? 0} L</td>
        <td>${r.milk_sold ?? 0} L</td>
        <td>${fmtCurrency(r.milk_revenue || 0)}</td>
        <td>${fmtCurrency(r.expense_feed || 0)}</td>
        <td>${fmtCurrency(r.expense_medicine || 0)}</td>
        <td>${fmtCurrency(r.expense_labour || 0)}</td>
        <td>${fmtCurrency(r.expense_other || 0)}</td>
        <td>${fmtCurrency(totalExpenses)}</td>
        <td style="color:${net >= 0 ? '#2A9D8F' : '#dd3326'}; font-weight:700;">${fmtCurrency(net)}</td>
        <td class="tracker-dim">${r.remarks || "—"}</td>
      </tr>
    `;
  }).join("");
}

async function saveEntry() {
  const btn  = document.getElementById("save-entry-btn");
  const date = document.getElementById("entry-date").value;

  if (!date) { showMsg("Please select a date.", "error"); return; }

  const milk_produced    = parseFloat(document.getElementById("entry-milk-produced").value) || 0;
  const milk_sold        = parseFloat(document.getElementById("entry-milk-sold").value)      || 0;
  const milk_revenue     = parseFloat(document.getElementById("entry-revenue").value)        || 0;
  const expense_feed     = parseFloat(document.getElementById("entry-feed").value)           || 0;
  const expense_medicine = parseFloat(document.getElementById("entry-medicine").value)       || 0;
  const expense_labour   = parseFloat(document.getElementById("entry-labour").value)         || 0;
  const expense_other    = parseFloat(document.getElementById("entry-other").value)          || 0;
  const remarks          = document.getElementById("entry-remarks").value.trim();

  const { data: { user } } = await supabase.auth.getUser();

  btn.disabled = true;

  const { error } = await supabase.from("cow_entries").insert({
    date,
    milk_produced,
    milk_sold,
    milk_revenue,
    expense_feed,
    expense_medicine,
    expense_labour,
    expense_other,
    remarks: remarks || null,
    user_id: user?.id ?? null
  });

  btn.disabled = false;

  if (error) {
    console.error(error);
    showMsg("Error: " + error.message, "error");
    return;
  }

  showMsg("Entry saved ✓", "success");

  ["entry-milk-produced", "entry-milk-sold", "entry-revenue",
   "entry-feed", "entry-medicine", "entry-labour", "entry-other", "entry-remarks"]
    .forEach(id => document.getElementById(id).value = "");

  updateLiveCalc();
  await loadMonth();
}

function showMsg(text, type) {
  const el = document.getElementById("form-msg");
  el.textContent = text;
  el.className = `tracker-form-msg ${type}`;
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

init();