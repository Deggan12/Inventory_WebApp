import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const entryForm = document.getElementById("entry-form");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // NOT LOGGED IN
  if (!session) {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";

    // 🔒 HIDE ADD ENTRY FORM
    if (entryForm) entryForm.style.display = "none";
    return;
  }

  // LOGGED IN
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-block";

  if (entryForm) entryForm.style.display = "grid";

  logoutBtn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/index.html";
  });
});
