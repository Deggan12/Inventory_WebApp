// js/egg-calculator.js

// ── Helpers ──────────────────────────────────────────────
function storageKey(month) {
  return `egg_calc_${month}`; // e.g. "egg_calc_2025-03"
}

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getInputs() {
  return {
    feed:        parseFloat(document.getElementById("price-feed").value)       || 0,
    salary:      parseFloat(document.getElementById("cost-salary").value)      || 0,
    utility:     parseFloat(document.getElementById("cost-utility").value)     || 0,
    fuel:        parseFloat(document.getElementById("cost-fuel").value)        || 0,
    maintenance: parseFloat(document.getElementById("cost-maintenance").value) || 0,
    overhead:    parseFloat(document.getElementById("overhead").value)         || 0,
    totalEggs:   parseInt(document.getElementById("total-eggs").value)         || 0,
  };
}

function setInputs(data) {
  document.getElementById("price-feed").value       = data.feed        ?? "";
  document.getElementById("cost-salary").value      = data.salary      ?? "";
  document.getElementById("cost-utility").value     = data.utility     ?? "";
  document.getElementById("cost-fuel").value        = data.fuel        ?? "";
  document.getElementById("cost-maintenance").value = data.maintenance ?? "";
  document.getElementById("overhead").value         = data.overhead    ?? "";
  document.getElementById("total-eggs").value       = data.totalEggs   ?? "";
}

function clearInputs() {
  ["price-feed","cost-salary","cost-utility","cost-fuel","cost-maintenance","overhead","total-eggs"]
    .forEach(id => document.getElementById(id).value = "");
  document.getElementById("results").classList.add("hidden");
}

// ── On page load: set month picker to current month ──────
const monthSelect = document.getElementById("month-select");
monthSelect.value = getCurrentMonth();

// ── Load month data ───────────────────────────────────────
document.getElementById("load-month-btn").addEventListener("click", () => {
  const month = monthSelect.value;
  if (!month) { alert("Please select a month."); return; }

  const saved = localStorage.getItem(storageKey(month));
  if (saved) {
    setInputs(JSON.parse(saved));
    document.getElementById("month-status").textContent = `✅ Loaded data for ${month}`;
    calculate(); // auto-show results
  } else {
    clearInputs();
    document.getElementById("month-status").textContent = `No data saved for ${month} yet.`;
  }
});

// ── Save month data ───────────────────────────────────────
document.getElementById("save-month-btn").addEventListener("click", () => {
  const month = monthSelect.value;
  if (!month) { alert("Please select a month first."); return; }

  const data = getInputs();
  localStorage.setItem(storageKey(month), JSON.stringify(data));
  document.getElementById("month-status").textContent = `💾 Saved for ${month}`;
});

// ── Calculate ─────────────────────────────────────────────
document.getElementById("calculate-btn").addEventListener("click", calculate);

function calculate() {
  const { feed, salary, utility, fuel, maintenance, overhead, totalEggs } = getInputs();

  if (totalEggs === 0) {
    alert("Please enter the total eggs produced.");
    return;
  }

  const totalOtherCosts = salary + utility + fuel + maintenance + overhead;
  const totalCost       = feed + totalOtherCosts;
  const costPerEgg      = totalCost / totalEggs;
  const costPerTray     = costPerEgg * 30;

  // Display
  document.getElementById("result-feed-cost").textContent    = `$${feed.toFixed(2)}`;
  document.getElementById("result-salary").textContent       = `$${salary.toFixed(2)}`;
  document.getElementById("result-utility").textContent      = `$${utility.toFixed(2)}`;
  document.getElementById("result-fuel").textContent         = `$${fuel.toFixed(2)}`;
  document.getElementById("result-maintenance").textContent  = `$${maintenance.toFixed(2)}`;
  document.getElementById("result-overhead").textContent     = `$${overhead.toFixed(2)}`;
  document.getElementById("result-total-cost").textContent   = `$${totalCost.toFixed(2)}`;
  document.getElementById("result-cost-per-egg").textContent = `$${costPerEgg.toFixed(4)}`;
  document.getElementById("result-cost-per-tray").textContent= `$${costPerTray.toFixed(2)}`;

  const results = document.getElementById("results");
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "nearest" });
}