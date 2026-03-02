import { supabase } from "./supabase.js";

const form = document.getElementById("login-form");
const errorEl = document.getElementById("error");

// If already logged in, skip the login page entirely
const { data } = await supabase.auth.getSession();
if (data.session) {
  window.location.replace("index.html");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errorEl.textContent = error.message;
  } else {
    window.location.replace("index.html");
  }
});