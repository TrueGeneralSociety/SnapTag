// Login + signup forms. There's no backend route for accounts yet, so this
// only stops the page from posting and shows a note. When the API exists,
// send the form data here (e.g. fetch("/api/login", { method: "POST", ... })).
const form = document.querySelector("[data-auth-form]");
const status = document.querySelector("[data-auth-status]");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = "Accounts aren't connected yet. This form is display only for now.";
});
