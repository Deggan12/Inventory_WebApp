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
  console.log("Checking admin status...");
  
  // Get the session (not the user) - this is more reliable
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting session:", sessionError);
    disableForm();
    return;
  }

  if (!session) {
    console.log("No session found - user not logged in");
    disableForm();
    return;
  }

  const userId = session.user.id;
  console.log("User ID from session:", userId);

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle(); // Use maybeSingle instead of single to avoid error if no rows

  console.log("Admin query result:", { data, error });

  if (error) {
    console.error("Error checking admin:", error);
    disableForm();
    return;
  }

  if (data) {
    console.log("User IS an admin!");
    isAdmin = true;
    enableForm();
  } else {
    console.log("User is NOT an admin");
    disableForm();
  }
}

/* ===============================
   ENABLE FORM (FOR ADMINS)
================================ */
function enableForm() {
  console.log("Enabling form...");
  if (!form) return;
  
  // Show the form
  form.style.display = "grid";
  
  // Remove any "view-only" messages
  const msgs = document.querySelectorAll(".content > p");
  msgs.forEach(msg => {
    if (msg.textContent.includes("view-only")) {
      msg.remove();
    }
  });
  
  console.log("Form enabled!");
}

/* ===============================
   DISABLE FORM (READ ONLY)
================================ */
function disableForm() {
  console.log("Disabling form...");
  if (!form) return;

  // Hide the form
  form.style.display = "none";

  // Check if message already exists
  const existingMsg = Array.from(document.querySelectorAll(".content > p"))
    .find(p => p.textContent.includes("view-only"));
  
  if (existingMsg) {
    return;
  }

  // Add view-only message
  const msg = document.createElement("p");
  msg.textContent = "This inventory is view-only.";
  msg.style.color = "#999";
  msg.style.marginTop = "15px";
  msg.style.marginBottom = "15px";
  form.parentNode.insertBefore(msg, form);
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
    .maybeSingle(); // Use maybeSingle instead of single

  if (itemError) {
    console.error("Error loading item:", itemError);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">Error loading data. Please refresh the page.</td>
      </tr>
    `;
    return;
  }

  if (!itemRow) {
    console.error("Item not found:", item);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7">Item "${item}" not found in database</td>
      </tr>
    `;
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

  console.log("Submitting entry:", { opening, received, dispatched, lost, ending });

  const { data: itemRow, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("name", item)
    .maybeSingle();

  if (itemError || !itemRow) {
    console.error("Error fetching item:", itemError);
    alert("Error: Could not find item");
    return;
  }

  const { data: entryData, error: insertError } = await supabase.from("entries").insert({
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

  console.log("Entry added successfully!");
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
   INIT - Wait a bit for auth to load
================================ */
async function init() {
  // Small delay to let auth-ui.js set up the session
  await new Promise(resolve => setTimeout(resolve, 300));
  
  await checkAdmin();
  await loadEntries();
}

init();