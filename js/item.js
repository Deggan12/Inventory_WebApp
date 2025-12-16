const params = new URLSearchParams(window.location.search);
const item = params.get("item");

document.getElementById("item-title").textContent =
  item.charAt(0).toUpperCase() + item.slice(1) + " Inventory";

const form = document.getElementById("entry-form");
const tableBody = document.getElementById("table-body");

// INPUT REFERENCES (THIS WAS MISSING)
const openingInput = document.getElementById("opening");
const receivedInput = document.getElementById("received");
const dispatchedInput = document.getElementById("dispatched");
const lostInput = document.getElementById("lost");
const remarksInput = document.getElementById("remarks");

// LOAD SAVED DATA
const saved = JSON.parse(localStorage.getItem(item)) || [];
saved.forEach(addRow);

form.addEventListener("submit", e => {
  e.preventDefault();

  const opening = Number(openingInput.value);
  const received = Number(receivedInput.value);
  const dispatched = Number(dispatchedInput.value);
  const lost = Number(lostInput.value);
  const remarks = remarksInput.value;

  const ending = opening + received - dispatched - lost;
  const date = new Date().toLocaleDateString();

  const entry = { date, opening, received, dispatched, lost, ending, remarks };
  saved.push(entry);

  localStorage.setItem(item, JSON.stringify(saved));
  addRow(entry);
  form.reset();
});

function addRow(entry) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${entry.date}</td>
    <td>${entry.opening}</td>
    <td>${entry.received}</td>
    <td>${entry.dispatched}</td>
    <td>${entry.lost}</td>
    <td><strong>${entry.ending}</strong></td>
    <td>${entry.remarks}</td>
  `;
  tableBody.appendChild(row);
}