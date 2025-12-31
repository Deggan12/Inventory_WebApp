// js/medicine-subcategories.js
import { supabase } from "./supabase.js";

const params = new URLSearchParams(window.location.search);
const category = params.get("category");
let isAdmin = false;
let medicineItemId = null;

const categoryNames = {
  "vitamins": "Vitamins",
  "vaccine": "Vaccine",
  "medicine": "Medicine",
  "anti-stress": "Anti-Stress",
  "anti-parasite": "Anti-Parasite"
};

async function init() {
  if (!category) {
    window.location.href = "medicine-categories.html";
    return;
  }

  document.getElementById("category-name").textContent = categoryNames[category];
  document.getElementById("page-title").textContent = `${categoryNames[category]} - Subcategories`;

  await checkAdmin();
  await getMedicineId();
  await loadSubcategories();

  if (isAdmin) {
    setupAddSubcategoryForm();
  }
}

async function checkAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return;

  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (data) {
    isAdmin = true;
    document.getElementById("add-subcategory-section").classList.remove("hidden");
  }
}

async function getMedicineId() {
  const { data, error } = await supabase
    .from("items")
    .select("id")
    .eq("name", "medicine")
    .single();

  if (error) {
    console.error("Error getting medicine ID:", error);
    return;
  }

  medicineItemId = data.id;
}

async function loadSubcategories() {
  if (!medicineItemId) return;

  const { data: subcategories, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("item_id", medicineItemId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading subcategories:", error);
    return;
  }

  // Filter by category prefix
  const filtered = subcategories.filter(sub => 
    sub.name.toLowerCase().startsWith(category)
  );

  displaySubcategories(filtered);
}

function displaySubcategories(subcategories) {
  const grid = document.getElementById("subcategories-grid");
  grid.innerHTML = "";

  if (subcategories.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">
        <p>No subcategories yet. ${isAdmin ? "Add one using the form above!" : ""}</p>
      </div>
    `;
    return;
  }

  subcategories.forEach(sub => {
    const card = document.createElement("div");
    card.className = "category-card subcategory-card";
    card.dataset.subcategoryId = sub.id;

    // Remove category prefix from display name
    const displayName = sub.name.replace(new RegExp(`^${category}-`, 'i'), '');

    card.innerHTML = `
      <h3>${displayName}</h3>
      <p class="stock-info">${sub.stock} kg</p>
      <p class="min-info">Min: ${sub.minimum} kg</p>
      ${isAdmin ? `<button class="delete-btn" onclick="deleteSubcategory('${sub.id}')">×</button>` : ''}
    `;

    if (sub.stock <= sub.minimum) {
      card.classList.add("low-stock-card");
    }

    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("delete-btn")) {
        window.location.href = `medicine-item.html?subcategory=${sub.id}`;
      }
    });

    grid.appendChild(card);
  });
}

function setupAddSubcategoryForm() {
  const form = document.getElementById("add-subcategory-form");
  
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("subcategory-name").value.trim();
    const minimum = parseInt(document.getElementById("subcategory-minimum").value) || 50;

    // Add category prefix to name
    const fullName = `${category}-${name}`;

    const { error } = await supabase
      .from("subcategories")
      .insert({
        item_id: medicineItemId,
        name: fullName,
        stock: 0,
        minimum: minimum
      });

    if (error) {
      console.error("Error adding subcategory:", error);
      alert("Error adding subcategory: " + error.message);
      return;
    }

    form.reset();
    await loadSubcategories();
  });
}

// Make deleteSubcategory global so button onclick can access it
window.deleteSubcategory = async function(subcategoryId) {
  if (!confirm("Are you sure you want to delete this subcategory? All entries will be lost.")) {
    return;
  }

  const { error } = await supabase
    .from("subcategories")
    .delete()
    .eq("id", subcategoryId);

  if (error) {
    console.error("Error deleting subcategory:", error);
    alert("Error deleting subcategory: " + error.message);
    return;
  }

  await loadSubcategories();
};

init();