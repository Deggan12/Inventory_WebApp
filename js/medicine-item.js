// js/medicine-item.js
import { supabase } from "./supabase.js";

const params = new URLSearchParams(window.location.search);
const subcategoryId = params.get("subcategory");

let isAdmin = false;
let subcategory = null;
let medicineItemId = null;

const form = document.getElementById("entry-form");
const tableBody = document.getElementById("table-body");
const alertBox = document.getElementById("alert-box");

const openingInput = document.getElementById("opening");
const receivedInput = document.getElementById("received");
const dispatchedInput = document.getElementById("dispatched");
const lostInput = document.getElementById("lost");
const remarksInput = document.getElementById("remarks");

async function init() {
  if (!subcategoryId) {
    window.location.href = "medicine-categories.html";
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 300));
  await checkAdmin();
  await loadSubcategory();
  await loadEntries();
}

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    disableForm();
    return;
  }

  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (data) {
    isAdmin = true;
    enableForm();
  } else {
    disableForm();
  }
}

async function loadSubcategory() {
  const { data, error } = await supabase
    .from("subcategories")
    .select("*, items(name)")
    .eq("id", subcategoryId)
    .single();

  if (error || !data) {
    console.error("Error loading subcategory:", error);
    alert("Subcategory not found");
    window.location.href = "medicine-categories.html";
    return;
  }

  subcategory = data;
  medicineItemId = data.item_id;

  // Extract category from name (e.g., "vitamins-B12" -> "vitamins")
  const nameParts = data.name.split("-");
  const category = nameParts[0];
  const displayName = nameParts.slice(1).join("-");

  // Update page title
  document.getElementById("item-title").textContent = `${displayName} Inventory`;

  // Update breadcrumb
  const categoryNames = {
    "vitamins": "Vitamins",
    "vaccine": "Vaccine",
    "medicine": "Medicine",
    "anti-stress": "Anti-Stress",
    "anti-parasite": "Anti-Parasite"
  };

  document.getElementById("breadcrumb").innerHTML = `
    <a href="index.html">Home</a> › 
    <a href="medicine-categories.html">Medicine</a> › 
    <a href="medicine-subcategories.html?category=${category}">${categoryNames[category]}</a> › 
    <span>${displayName}</span>
  `;

  checkLowStock(data.stock, data.minimum);
}

async function loadEntries() {
  tableBody.innerHTML = "";

  const { data: entries, error } = await supabase
    .from("entries")
    .select("*")
    .eq("subcategory_id", subcategoryId)
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
    return;
  }

  entries.forEach(addRow);
}

function enableForm() {
  if (!form) return;
  form.style.display = "grid";

  const msgs = document.querySelectorAll(".content > p");
  msgs.forEach(msg => {
    if (msg.textContent.includes("view-only")) {
      msg.remove();
    }
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

  const { error: insertError } = await supabase.from("entries").insert({
    item_id: medicineItemId,
    subcategory_id: subcategoryId,
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
    .from("subcategories")
    .update({ stock: ending })
    .eq("id", subcategoryId);

  if (updateError) {
    console.error("Error updating stock:", updateError);
    alert("Error updating stock: " + updateError.message);
    return;
  }

  form.reset();
  await loadSubcategory();
  await loadEntries();
});

function addRow(entry) {
  const row = document.createElement("tr");
  const ending = entry.opening + entry.received - entry.dispatched - entry.lost;

  if (subcategory && ending <= subcategory.minimum) {
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

function checkLowStock(stock, minimum) {
  if (stock <= minimum) {
    alertBox.classList.remove("hidden");
  } else {
    alertBox.classList.add("hidden");
  }
}

init();