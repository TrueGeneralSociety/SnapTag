// Shared SnapTag navbar. Include it where the header should appear:
//   <script src="scripts/navbar.js"></script>
// It replaces its own <script> tag with the header, so the page never shows
// without a navbar. To add a page, add it to LINKS.
(function () {
  const LINKS = [
    { href: "login.html", label: "Sign in", also: ["signup.html"] },
    { href: "index.html", label: "Home", also: [""] },
    { href: "gallery.html", label: "Gallery" },
  ];

  const page = location.pathname.split("/").pop();
  const isCurrent = (link) =>
    link.href === page || (link.also || []).includes(page);

  const items = LINKS.map(
    (link) =>
      `<li><a href="${link.href}"${
        isCurrent(link) ? ' aria-current="page"' : ""
      }>${link.label}</a></li>`,
  ).join("");

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <a class="brand" href="index.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
      <span>SnapTag</span>
    </a>
    <nav aria-label="Main"><ul>${items}</ul></nav>`;

  document.currentScript.replaceWith(header);
})();
