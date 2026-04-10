import { supabase } from "./supabase.js";

let isAdmin = false;

const params = new URLSearchParams(window.location.search);
const item = params.get("item");

const itemTitles = {
  oilcakes: "Oil Cakes",
  nyjerseed: "Nyjer Seeds"
};

document.getElementById("item-title").textContent =
  (itemTitles[item] || (item.charAt(0).toUpperCase() + item.slice(1))) + " Inventory";

const form = document.getElementById("entry-form");
const tableBody = document.getElementById("table-body");
const alertBox = document.getElementById("alert-box");

const receivedInput = document.getElementById("received");
const dispatchedInput = document.getElementById("dispatched");
const lostInput = document.getElementById("lost");
const remarksInput = document.getElementById("remarks");

const MIN_STOCK = {
  maize: 500,
  bran: 400,
  premix: 200,
  oilcakes: 300,
  limestone: 250,
  medicine: 100,
  nyjerseed: 100
};

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    disableForm();
    return;
  }

  const userId = session.user.id;

  const [{ data: adminRow }, { data: employeeRow }] = await Promise.all([
    supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase.from("employees").select("user_id").eq("user_id", userId).maybeSingle()
  ]);

  if (adminRow || employeeRow) {
    isAdmin = true;
    enableForm();
  } else {
    disableForm();
  }
}

function enableForm() {
  if (!form) return;
  form.style.display = "grid";

  const msgs = document.querySelectorAll(".content > p");
  msgs.forEach(msg => {
    if (msg.textContent.includes("view-only")) msg.remove();
  });
}

function disableForm() {
  if (!form) return;
  form.style.display = "none";

  const existingMsg = Array.from(document.querySelectorAll(".content > p"))
    .find(p => p.textContent.includes("view-only"));

  if (existingMsg) return;

  const msg = document.createElement("p");
  msg.textContent = "This inventory is view-only.";
  msg.style.color = "#999";
  msg.style.marginTop = "15px";
  msg.style.marginBottom = "15px";
  form.parentNode.insertBefore(msg, form);
}

// Get the true current stock by computing from last entry
async function getCurrentStock(itemId, fallbackStock) {
  const { data: lastEntry } = await supabase
    .from("entries")
    .select("opening, received, dispatched, lost")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEntry) {
    return lastEntry.opening + lastEntry.received - lastEntry.dispatched - lastEntry.lost;
  }
  return fallbackStock;
}

async function loadEntries() {
  tableBody.innerHTML = "";

  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .select("id, stock")
    .eq("name", item)
    .maybeSingle();

  if (itemError) {
    console.error("Error loading item:", itemError);
    tableBody.innerHTML = `<tr><td colspan="7">Error loading data. Please refresh the page.</td></tr>`;
    return;
  }

  if (!itemRow) {
    console.error("Item not found:", item);
    tableBody.innerHTML = `<tr><td colspan="7">Item "${item}" not found in database</td></tr>`;
    return;
  }

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("item_id", itemRow.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading entries:", error);
    return;
  }

  if (!entries.length) {
    tableBody.innerHTML = `<tr><td colspan="7">No entries yet</td></tr>`;
    checkLowStock(itemRow.stock);
    return;
  }

  entries.forEach(addRow);

  // Use last entry's computed ending as the real stock for the alert
  const trueStock = await getCurrentStock(itemRow.id, itemRow.stock);
  checkLowStock(trueStock);
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!isAdmin) {
    alert("You do not have permission to add entries.");
    return;
  }

  const received = Number(receivedInput.value);
  const dispatched = Number(dispatchedInput.value);
  const lost = Number(lostInput.value);
  const remarks = remarksInput.value;

  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .select("id, stock")
    .eq("name", item)
    .maybeSingle();

  if (itemError || !itemRow) {
    console.error("Error fetching item:", itemError);
    alert("Error: Could not find item");
    return;
  }

  // Always compute opening from the last entry's ending balance
  const opening = await getCurrentStock(itemRow.id, itemRow.stock);
  const ending = opening + received - dispatched - lost;

  if (ending < 0) {
    alert(`❌ Invalid entry: this would result in negative stock.\n\nCurrent stock: ${opening} kg\nAfter this entry: ${ending} kg\n\nPlease check your Dispatched and Lost values.`);
    return;
  }

  if (ending === 0) {
    const confirmed = confirm(`⚠️ Warning: this entry will set stock to 0 kg.\n\nAre you sure you want to continue?`);
    if (!confirmed) return;
  }

  const { error: insertError } = await supabase.from("entries").insert({
    item_id: itemRow.id,
    opening,
    received,
    dispatched,
    lost,
    remarks
  });

  if (insertError) {
    console.error("Error inserting entry:", insertError);
    alert("Error adding entry: " + insertError.message);
    return;
  }

  const { error: updateError } = await supabase
    .from("items")
    .update({ stock: ending })
    .eq("id", itemRow.id);

  if (updateError) {
    console.error("Error updating stock:", updateError);
    alert("Error updating stock: " + updateError.message);
    return;
  }

  form.reset();
  loadEntries();
});

function addRow(entry) {
  const row = document.createElement("tr");
  const ending = entry.opening + entry.received - entry.dispatched - entry.lost;

  if (ending <= MIN_STOCK[item]) {
    row.classList.add("low-stock");
  }

  row.innerHTML = `
    <td>${new Date(entry.created_at).toLocaleDateString()}</td>
    <td>${entry.opening}</td>
    <td>${entry.received}</td>
    <td>${entry.dispatched}</td>
    <td>${entry.lost}</td>
    <td><strong>${ending}</strong></td>
    <td>${entry.remarks || ""}</td>
  `;

  tableBody.appendChild(row);
}

function checkLowStock(stock) {
  if (stock <= MIN_STOCK[item]) {
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

async function init() {
  await new Promise(resolve => setTimeout(resolve, 300));
  await checkAdmin();
  await loadEntries();
}

init();