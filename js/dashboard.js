import { supabase } from "../js/supabase.js";

/* ===============================
   GLOBALS
================================ */
let items = [];
let entries = [];
let stockPerItem = [];
let lineChartInstance = null;
let barChartInstance = null;
let doughnutChartInstance = null;
let currentItem = null;

/* ===============================
   HELPERS
================================ */
const capitalize = (name) =>
  name === "oilcakes"
    ? "Oil Cakes"
    : name.charAt(0).toUpperCase() + name.slice(1);

/* ===============================
   FETCH DATA
================================ */
async function loadData() {
  const { data: itemsData, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .order("id");

  const { data: entriesData, error: entriesError } = await supabase
    .from("entries")
    .select("*")
    .order("created_at");

  if (itemsError || entriesError) {
    console.error(itemsError || entriesError);
    return;
  }

  items = itemsData;
  entries = entriesData;

  buildDashboard();
}

/* ===============================
   DASHBOARD CORE
================================ */
function buildDashboard() {
  let totalStock = 0;
  let receivedToday = 0;
  let dispatchedToday = 0;
  let lostToday = 0;

  const today = new Date().toLocaleDateString();
  stockPerItem = [];

  items.forEach(item => {
    totalStock += item.stock;
    stockPerItem.push(item.stock);

    entries
      .filter(e => e.item_id === item.id)
      .forEach(e => {
        const entryDate = new Date(e.created_at).toLocaleDateString();
        if (entryDate === today) {
          receivedToday += e.received;
          dispatchedToday += e.dispatched;
          lostToday += e.lost;
        }
      });
  });

  // STAT CARDS
  const stats = document.querySelectorAll(".stat-card p");
  stats[0].textContent = `${totalStock} kg`;
  stats[1].textContent = `${receivedToday} kg`;
  stats[2].textContent = `${dispatchedToday} kg`;
  stats[3].textContent = `${lostToday} kg`;

  buildItemStatus();
  buildLowStockAlert();
  buildCharts();

  if (!currentItem && items.length > 0) {
    currentItem = items[0].name;
    updateLineChart(currentItem);
  }
}

/* ===============================
   ITEM STATUS GRID
================================ */
function buildItemStatus() {
  const grid = document.getElementById("item-status-grid");
  grid.innerHTML = "";

  items.forEach(item => {
    const box = document.createElement("div");
    box.className = "item-status";

    if (item.stock <= item.minimum) {
      box.classList.add("low");
    }

    box.innerHTML = `
      <h5>${capitalize(item.name)}</h5>
      <p>${item.stock} kg</p>
    `;

    grid.appendChild(box);
  });
}

/* ===============================
   LOW STOCK ALERT
================================ */
function buildLowStockAlert() {
  const panel = document.getElementById("low-stock-panel");
  const count = document.getElementById("low-stock-count");
  const list = document.getElementById("low-stock-list");

  list.innerHTML = "";
  panel.classList.add("hidden");

  const lowItems = items.filter(i => i.stock <= i.minimum);

  if (lowItems.length === 0) return;

  panel.classList.remove("hidden");
  count.textContent = `${lowItems.length} item(s) need restocking`;

  lowItems.forEach(i => {
    const li = document.createElement("li");
    li.textContent = `${capitalize(i.name)} – ${i.stock} kg`;
    list.appendChild(li);
  });
}

/* ===============================
   CHARTS
================================ */
function buildCharts() {
  const labels = items.map(i => capitalize(i.name));

  if (barChartInstance) barChartInstance.destroy();
  if (doughnutChartInstance) doughnutChartInstance.destroy();

  // BAR CHART
  barChartInstance = new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: stockPerItem,
        backgroundColor: "#DD3326"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  // DOUGHNUT CHART
  doughnutChartInstance = new Chart(document.getElementById("doughnutChart"), {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: stockPerItem,
        backgroundColor: [
          "#C1121F",
          "#F77F00",
          "#FCBF49",
          "#2A9D8F",
          "#3A5A40",
          "#6C757D"
        ],
        borderColor: "#fff",
        borderWidth: 3
      }]
    },
    options: {
      cutout: "60%",
      plugins: { legend: { position: "top" } }
    }
  });
}

/* ===============================
   LINE CHART
================================ */
function updateLineChart(itemName) {
  const item = items.find(i => i.name === itemName);
  if (!item) return;

  const data = entries
    .filter(e => e.item_id === item.id)
    .slice(-30);

  const dates = data.map(e =>
    new Date(e.created_at).toLocaleDateString()
  );

  if (lineChartInstance) lineChartInstance.destroy();

  lineChartInstance = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: dates.length ? dates : ["No Data"],
      datasets: [
        {
          label: "Received",
          data: data.map(e => e.received),
          borderColor: "#4CAF50",
          tension: 0.4
        },
        {
          label: "Dispatched",
          data: data.map(e => e.dispatched),
          borderColor: "#DD3326",
          tension: 0.4
        },
        {
          label: "Lost",
          data: data.map(e => e.lost),
          borderColor: "#FF9800",
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" }
      }
    }
  });
}

/* ===============================
   TOGGLES
================================ */
document.querySelectorAll("#item-toggles .toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentItem = btn.dataset.item;
    updateLineChart(currentItem);
  });
});

/* ===============================
   INIT
================================ */
loadData();
