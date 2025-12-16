const today = new Date().toLocaleDateString();

const items = ["maize", "bran", "premix", "oilcakes", "limestone", "medicine"];

let totalStock = 0;
let receivedToday = 0;
let dispatchedToday = 0;
let lostToday = 0;

const stockPerItem = [];

items.forEach(item => {
  const data = JSON.parse(localStorage.getItem(item)) || [];

  let itemStock = 0;

  data.forEach(entry => {
    itemStock += entry.ending;

    if (entry.date === today) {
      receivedToday += entry.received;
      dispatchedToday += entry.dispatched;
      lostToday += entry.lost;
    }
  });

  stockPerItem.push(itemStock);
  totalStock += itemStock;
});

// UPDATE STATS CARDS
document.querySelectorAll(".stat-card p")[0].textContent = totalStock + " kg";
document.querySelectorAll(".stat-card p")[1].textContent = receivedToday + " kg";
document.querySelectorAll(".stat-card p")[2].textContent = dispatchedToday + " kg";
document.querySelectorAll(".stat-card p")[3].textContent = lostToday + " kg";

// BAR CHART — stock per item
new Chart(document.getElementById("barChart"), {
    type: "bar",
    data: {
      labels: ["Maize", "Bran", "Premix", "Oil Cakes", "Limestone", "Medicine"],
      datasets: [{
        label: "Current Stock (kg)",
        data: stockPerItem,
        backgroundColor: "#DD3326"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
  
  // DOUGHNUT CHART — distribution
  new Chart(document.getElementById("doughnutChart"), {
    type: "doughnut",
    data: {
      labels: ["Maize", "Bran", "Premix", "Oil Cakes", "Limestone", "Medicine"],
      datasets: [{
        data: stockPerItem,
        backgroundColor: [
          "#DD3326",
          "#f4b4ae",
          "#f7d1cd",
          "#f1a29a",
          "#e56b60",
          "#c92a1d"
        ]
      }]
    }
  });
  
  // LINE CHART — daily movement (simplified)
  new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: ["Received", "Dispatched", "Lost"],
      datasets: [{
        label: "Today (kg)",
        data: [receivedToday, dispatchedToday, lostToday],
        borderColor: "#DD3326",
        backgroundColor: "rgba(221,51,38,0.2)",
        fill: true,
        tension: 0.4
      }]
    }
  });