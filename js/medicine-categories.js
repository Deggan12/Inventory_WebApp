// js/medicine-categories.js
import { supabase } from "./supabase.js";

const MAIN_CATEGORIES = ["vitamins", "vaccine", "medicine", "anti-stress", "anti-parasite"];
let isAdmin = false;
let medicineItemId = null;

async function init() {
  await checkAdmin();
  await getMedicineId();
  await loadSubcategoryCounts();
  setupCategoryCards();
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
    document.getElementById("add-category-section").classList.remove("hidden");
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

async function loadSubcategoryCounts() {
  if (!medicineItemId) return;

  const { data: subcategories, error } = await supabase
    .from("subcategories")
    .select("*")
    .eq("item_id", medicineItemId);

  if (error) {
    console.error("Error loading subcategories:", error);
    return;
  }

  // Count subcategories for each main category
  const counts = {};
  MAIN_CATEGORIES.forEach(cat => {
    counts[cat] = subcategories.filter(sub => 
      sub.name.toLowerCase().startsWith(cat)
    ).length;
  });

  // Update UI
  document.querySelectorAll(".category-card").forEach(card => {
    const category = card.dataset.category;
    const count = counts[category] || 0;
    const countEl = card.querySelector(".subcategory-count");
    countEl.textContent = count === 0 ? "No items" : `${count} item(s)`;
  });
}

function setupCategoryCards() {
  document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("click", () => {
      const category = card.dataset.category;
      window.location.href = `medicine-subcategories.html?category=${category}`;
    });
  });
}

init();