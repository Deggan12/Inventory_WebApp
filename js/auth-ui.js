// js/auth-ui.js
import { supabase } from "./supabase.js";

async function setupAuthUI() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  const entryForm = document.getElementById("entry-form");
  const loginHint = document.getElementById("login-hint");

  const burgerBtn = document.getElementById("burger-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  function closeMobileMenu() {
    if (mobileMenu) mobileMenu.classList.remove("open");
  }

  if (burgerBtn && mobileMenu) {
    burgerBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("open");
    });

    mobileMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A" || e.target.tagName === "BUTTON") closeMobileMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) closeMobileMenu();
    });
  }

  async function applyUIFromSession() {
    const { data } = await supabase.auth.getSession();
    const isLoggedIn = !!data.session;

    // Check admin status
    let isAdmin = false;
    if (isLoggedIn) {
      const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      isAdmin = !!adminRow;
    }

    // Top nav buttons
    if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";

    // Item page: hide Add Entry form if NOT logged in
    if (entryForm) entryForm.style.display = isLoggedIn ? "flex" : "none";
    if (loginHint) loginHint.style.display = isLoggedIn ? "none" : "block";

    // Mobile menu buttons (if present)
    const mLogin = document.getElementById("m-login-btn");
    const mLogout = document.getElementById("m-logout-btn");
    if (mLogin) mLogin.style.display = isLoggedIn ? "none" : "block";
    if (mLogout) mLogout.style.display = isLoggedIn ? "block" : "none";

    // Egg Tracker nav link — admin only
    document.querySelectorAll(".admin-only").forEach(el => {
      el.style.display = isAdmin ? "inline-flex" : "none";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.replace("login.html");
    });
  }

  if (document.getElementById("m-logout-btn")) {
    document.getElementById("m-logout-btn").addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.replace("login.html");
    });
  }

  await applyUIFromSession();

  supabase.auth.onAuthStateChange(async () => {
    await applyUIFromSession();
  });
}

setupAuthUI();