import { supabase } from "./supabase.js";

const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

async function setupAuthUI() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

const entryForm = document.getElementById("entry-form");
if (entryForm) entryForm.style.display = session ? "" : "none";


setupAuthUI();
