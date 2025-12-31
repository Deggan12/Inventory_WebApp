// js/egg-calculator.js

  const DEFAULT_RATIOS = {
    "Maize": 0.75,
    "Oil Cakes": 0.20,
    "Bran": 0.05,
    "Premix": 0.03,
    "Limestone": 0.02
  };
  
  let RATIOS = loadRatios();
  
  function loadRatios() {
    const saved = localStorage.getItem("egg_ratios");
    if (!saved) return { ...DEFAULT_RATIOS };
  
    try {
      const obj = JSON.parse(saved);
      // basic safety: ensure all keys exist
      for (const k of Object.keys(DEFAULT_RATIOS)) {
        if (typeof obj[k] !== "number") obj[k] = DEFAULT_RATIOS[k];
      }
      return obj;
    } catch {
      return { ...DEFAULT_RATIOS };
    }
  }
  
  function saveRatios(ratiosObj) {
    localStorage.setItem("egg_ratios", JSON.stringify(ratiosObj));
    RATIOS = ratiosObj;
  }
  
  
  const calculateBtn = document.getElementById("calculate-btn");
  const resultsSection = document.getElementById("results");
  
  calculateBtn.addEventListener("click", calculate);
  const editBtn = document.getElementById("edit-ratios-btn");
const editor = document.getElementById("ratios-editor");
const saveBtn = document.getElementById("save-ratios-btn");
const resetBtn = document.getElementById("reset-ratios-btn");
const ratioError = document.getElementById("ratio-error");

function fillRatioInputs() {
  document.getElementById("ratio-maize").value = Math.round(RATIOS["Maize"] * 100);
  document.getElementById("ratio-oilcakes").value = Math.round(RATIOS["Oil Cakes"] * 100);
  document.getElementById("ratio-bran").value = Math.round(RATIOS["Bran"] * 100);
  document.getElementById("ratio-premix").value = Math.round(RATIOS["Premix"] * 100);
  document.getElementById("ratio-limestone").value = Math.round(RATIOS["Limestone"] * 100);
  ratioError.textContent = "";
}

editBtn.addEventListener("click", () => {
  editor.classList.toggle("hidden");
  if (!editor.classList.contains("hidden")) fillRatioInputs();
});

saveBtn.addEventListener("click", () => {
  const maize = parseFloat(document.getElementById("ratio-maize").value) || 0;
  const oilcakes = parseFloat(document.getElementById("ratio-oilcakes").value) || 0;
  const bran = parseFloat(document.getElementById("ratio-bran").value) || 0;
  const premix = parseFloat(document.getElementById("ratio-premix").value) || 0;
  const limestone = parseFloat(document.getElementById("ratio-limestone").value) || 0;

  const total = maize + oilcakes + bran + premix + limestone;
  if (total !== 100) {
    ratioError.textContent = `Percentages must add up to 100%. Current total: ${total}%`;
    return;
  }

  const newRatios = {
    "Maize": maize / 100,
    "Oil Cakes": oilcakes / 100,
    "Bran": bran / 100,
    "Premix": premix / 100,
    "Limestone": limestone / 100
  };

  saveRatios(newRatios);
  ratioError.textContent = "";
  editor.classList.add("hidden");
  alert("Saved!");
});

resetBtn.addEventListener("click", () => {
  localStorage.removeItem("egg_ratios");
  RATIOS = { ...DEFAULT_RATIOS };
  fillRatioInputs();
  alert("Reset to default ratios!");
});

  
  function calculate() {
    // Get prices
    const prices = {
      "Maize": parseFloat(document.getElementById("price-maize").value) || 0,
      "Oil Cakes": parseFloat(document.getElementById("price-oilcakes").value) || 0,
      "Bran": parseFloat(document.getElementById("price-bran").value) || 0,
      "Premix": parseFloat(document.getElementById("price-premix").value) || 0,
      "Limestone": parseFloat(document.getElementById("price-limestone").value) || 0
    };
  
    // Get production data
    const totalFeed = parseFloat(document.getElementById("total-feed").value) || 0;
    const overhead = parseFloat(document.getElementById("overhead").value) || 0;
    const totalEggs = parseInt(document.getElementById("total-eggs").value) || 0;
  
    // Validate inputs
    if (totalFeed === 0 || totalEggs === 0) {
      alert("Please fill in all required fields");
      return;
    }
  
    // Calculate quantities and costs
    const quantities = {};
    const costs = {};
    let totalFeedCost = 0;
  
    for (const [ingredient, ratio] of Object.entries(RATIOS)) {
      quantities[ingredient] = ratio * totalFeed;
      costs[ingredient] = quantities[ingredient] * prices[ingredient];
      totalFeedCost += costs[ingredient];
    }
  
    const totalCost = totalFeedCost + overhead;
    const costPerEgg = totalCost / totalEggs;
    const costPerTray = costPerEgg * 30;
  
    // Display results
    displayResults(totalFeedCost, overhead, totalCost, costPerEgg, costPerTray);
    displayBreakdown(quantities, costs);
  
    // Show results section
    resultsSection.classList.remove("hidden");
    
    // Smooth scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  
  function displayResults(feedCost, overhead, total, perEgg, perTray) {
    document.getElementById("result-feed-cost").textContent = `$${feedCost.toFixed(2)}`;
    document.getElementById("result-overhead-cost").textContent = `$${overhead.toFixed(2)}`;
    document.getElementById("result-total-cost").textContent = `$${total.toFixed(2)}`;
    document.getElementById("result-cost-per-egg").textContent = `$${perEgg.toFixed(4)}`;
    document.getElementById("result-cost-per-tray").textContent = `$${perTray.toFixed(2)}`;
  }
  
  function displayBreakdown(quantities, costs) {
    const tbody = document.getElementById("breakdown-body");
    tbody.innerHTML = "";
  
    for (const [ingredient, ratio] of Object.entries(RATIOS)) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${ingredient}</strong></td>
        <td>${(ratio * 100).toFixed(0)}%</td>
        <td>${quantities[ingredient].toFixed(2)}</td>
        <td>$${costs[ingredient].toFixed(2)}</td>
      `;
      tbody.appendChild(row);
    }
  }