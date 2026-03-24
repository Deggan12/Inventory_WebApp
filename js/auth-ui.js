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

    let isAdmin = false;
    let isEmployee = false;

    if (isLoggedIn) {
      const userId = data.session.user.id;

      const [{ data: adminRow }, { data: employeeRow }] = await Promise.all([
        supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("employees").select("user_id").eq("user_id", userId).maybeSingle()
      ]);

      isAdmin = !!adminRow;
      isEmployee = !!employeeRow;
    }

    // Top nav buttons
    if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";

    // Item page: show form if admin OR employee
    if (entryForm) entryForm.style.display = (isAdmin || isEmployee) ? "flex" : "none";
    if (loginHint) loginHint.style.display = (isAdmin || isEmployee) ? "none" : "block";

    // Mobile menu buttons
    const mLogin = document.getElementById("m-login-btn");
    const mLogout = document.getElementById("m-logout-btn");
    if (mLogin) mLogin.style.display = isLoggedIn ? "none" : "block";
    if (mLogout) mLogout.style.display = isLoggedIn ? "block" : "none";

    // Egg Tracker nav — admin only
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