import { supabase } from "./supabase.js";

/* ===============================
   GLOBALS
================================ */
let isAdmin = false;

/* ===============================
   GET ITEM FROM URL
================================ */
const params = new URLSearchParams(window.location.search);
const item = params.get("item");

document.getElementById("item-title").textContent =
  item.charAt(0).toUpperCase() + item.slice(1) + " Inventory";

/* ===============================
   ELEMENT REFERENCES
================================ */
const form = document.getElementById("entry-form");
const tableBody = document.getElementById("table-body");
const alertBox = document.getElementById("alert-box");

/* INPUTS */
const openingInput = document.getElementById("opening");
const receivedInput = document.getElementById("received");
const dispatchedInput = document.getElementById("dispatched");
const lostInput = document.getElementById("lost");
const remarksInput = document.getElementById("remarks");

/* ===============================
   MINIMUM STOCK LEVELS
================================ */
const MIN_STOCK = {
  maize: 500,
  bran: 400,
  premix: 200,
  oilcakes: 300,
  limestone: 250,
  medicine: 100
};

/* ===============================
   ADMIN CHECK
================================ */
async function checkAdmin() {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    disableForm();
    hideAdminButton();
    return;
  }

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!error && data) {
    isAdmin = true;
  } else {
    disableForm();
    hideAdminButton();
  }
}

/* ===============================
   DISABLE FORM (READ ONLY)
================================ */
function disableForm() {
  if (!form) return;

  form.style.opacity = "0.5";
  form.querySelectorAll("input, button").forEach(el => {
    el.disabled = true;
  });

  const note = document.createElement("p");
  note.style.marginTop = "10px";
  note.style.color = "#999";
  note.textContent = "Admin access required to add entries.";
  form.prepend(note);
}

/* ===============================
   HIDE ADMIN BUTTON
================================ */
function hideAdminButton() {
  const adminBtn = document.querySelector(".admin-btn");
  if (adminBtn) adminBtn.style.display = "none";
}

/* ===============================
   LOAD ENTRIES (PUBLIC)
================================ */
async function loadEntries() {
  tableBody.innerHTML = "";

  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .select("id, stock")
    .eq("name", item)
    .single();

  if (itemError) {
    console.error(itemError);
    return;
  }

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("item_id", itemRow.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  if (!entries.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">No entries yet</td>
      </tr>
    `;
    checkLowStock(itemRow.stock);
    return;
  }

  entries.forEach(addRow);
  checkLowStock(itemRow.stock);
}

/* ===============================
   FORM SUBMIT (ADMIN ONLY)
================================ */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!isAdmin) {
    alert("You do not have permission to add entries.");
    return;
  }

  const opening = Number(openingInput.value);
  const received = Number(receivedInput.value);
  const dispatched = Number(dispatchedInput.value);
  const lost = Number(lostInput.value);
  const remarks = remarksInput.value;

  const ending = opening + received - dispatched - lost;

  const { data: itemRow } = await supabase
    .from("items")
    .select("id")
    .eq("name", item)
    .single();

  await supabase.from("entries").insert({
    item_id: itemRow.id,
    opening,
    received,
    dispatched,
    lost,
    remarks
  });

  await supabase
    .from("items")
    .update({ stock: ending })
    .eq("id", itemRow.id);

  form.reset();
  loadEntries();
});

/* ===============================
   ADD TABLE ROW
================================ */
function addRow(entry) {
  const row = document.createElement("tr");
  const ending =
    entry.opening + entry.received - entry.dispatched - entry.lost;

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

/* ===============================
   LOW STOCK ALERT
================================ */
function checkLowStock(stock) {
  if (stock <= MIN_STOCK[item]) {
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

/* ===============================
   INIT
================================ */
(async () => {
  await checkAdmin();
  loadEntries();
})();

/* ===============================
   HIDE "ADD ENTRY" FOR NON ADMINS
================================ */

const { data: { session } } = await supabase.auth.getSession();

if (!session || !isAdmin) {
  form.style.display = "none";

  const msg = document.createElement("p");
  msg.textContent = "This inventory is view-only.";
  msg.style.color = "#999";
  msg.style.marginTop = "15px";
  form.parentNode.insertBefore(msg, form);
}

