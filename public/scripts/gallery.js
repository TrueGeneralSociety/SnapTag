// SnapTag gallery: loads photos + tags, renders the grid, search, tag filters and viewer.
//
// Later, when the backend exists, only these changes are needed:
//   DATA_URL   -> "/api/photos"             (Express route, data from DynamoDB)
//   each photo -> { url: "https://...s3..." } (image URL from S3 instead of /gallery_images)
const DATA_URL = "data/photos.json";
const IMAGE_DIR = "gallery_images/";
const INITIAL_TAGS = 10; // how many tag chips show before "Show all tags"

const state = {
  photos: [],
  query: "",
  selected: new Set(), // tags the user clicked; a photo must have ALL of them
  showAllTags: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  grid: $("grid"),
  chips: $("chips"),
  search: $("search"),
  status: $("status"),
  viewer: $("viewer"),
  viewerImg: $("viewer-img"),
  viewerTitle: $("viewer-title"),
  viewerTags: $("viewer-tags"),
  viewerClose: $("viewer-close"),
};

// ---------- helpers ----------
const imageSrc = (p) => p.url || IMAGE_DIR + encodeURIComponent(p.file);

const titleOf = (p) =>
  p.title || (p.file || "photo").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tagCounts() {
  const counts = new Map();
  state.photos.forEach((p) =>
    new Set(p.tags).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)),
  );
  // most common first, then alphabetical
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

function filteredPhotos() {
  const q = state.query.trim().toLowerCase();
  return state.photos.filter((p) => {
    const hasSelected = [...state.selected].every((t) => p.tags.includes(t));
    const matchesQuery =
      !q ||
      p.tags.some((t) => t.includes(q)) ||
      titleOf(p).toLowerCase().includes(q);
    return hasSelected && matchesQuery;
  });
}

function toggleTag(tag) {
  if (state.selected.has(tag)) state.selected.delete(tag);
  else state.selected.add(tag);
  render();
}

function clearFilters() {
  state.selected.clear();
  state.query = "";
  els.search.value = "";
  render();
}

// ---------- rendering ----------
function renderChips() {
  const all = tagCounts();
  const visible = state.showAllTags
    ? all
    : all.filter(([tag], i) => i < INITIAL_TAGS || state.selected.has(tag));

  els.chips.replaceChildren();

  visible.forEach(([tag, count]) => {
    const chip = el("button", "chip");
    chip.type = "button";
    chip.setAttribute("aria-pressed", String(state.selected.has(tag)));
    chip.append(tag, el("span", "count", String(count)));
    chip.addEventListener("click", () => toggleTag(tag));
    els.chips.append(chip);
  });

  if (all.length > INITIAL_TAGS) {
    const more = el(
      "button",
      "chip chip-action",
      state.showAllTags ? "Show fewer tags" : `Show all tags (${all.length})`,
    );
    more.type = "button";
    more.addEventListener("click", () => {
      state.showAllTags = !state.showAllTags;
      renderChips();
    });
    els.chips.append(more);
  }

  if (state.selected.size > 0 || state.query) {
    const clear = el("button", "chip chip-action", "Clear filters");
    clear.type = "button";
    clear.addEventListener("click", clearFilters);
    els.chips.append(clear);
  }
}

function renderGrid() {
  const photos = filteredPhotos();
  els.grid.replaceChildren();

  if (photos.length === 0) {
    const msg = el("div", "message");
    msg.append(
      el("strong", "", "No photos match"),
      "Try a different tag, or clear your filters.",
    );
    els.grid.append(msg);
  }

  photos.forEach((p) => {
    const card = el("button", "card");
    card.type = "button";
    card.setAttribute("aria-label", `View ${titleOf(p)}`);

    const img = el("img");
    img.src = imageSrc(p);
    img.alt = titleOf(p);
    img.loading = "lazy";

    const body = el("div", "card-body");
    body.append(el("p", "card-title", titleOf(p)));

    const list = el("ul", "tags");
    p.tags.slice(0, 3).forEach((t) => list.append(el("li", "tag", t)));
    if (p.tags.length > 3)
      list.append(el("li", "tag", `+${p.tags.length - 3}`));
    body.append(list);

    card.append(img, body);
    card.addEventListener("click", () => openViewer(p));
    els.grid.append(card);
  });

  els.status.textContent = `Showing ${photos.length} of ${state.photos.length} photos`;
}

function render() {
  renderChips();
  renderGrid();
}

function showMessage(html) {
  els.grid.replaceChildren();
  const msg = el("div", "message");
  msg.innerHTML = html; // fixed strings written in this file, never user data
  els.grid.append(msg);
  els.status.textContent = "";
}

// ---------- photo viewer ----------
function openViewer(p) {
  els.viewerImg.src = imageSrc(p);
  els.viewerImg.alt = titleOf(p);
  els.viewerTitle.textContent = titleOf(p);
  els.viewerTags.replaceChildren();

  p.tags.forEach((t) => {
    const li = el("li");
    const btn = el("button", "tag tag-btn", t);
    btn.type = "button";
    btn.title = `Show photos tagged ${t}`;
    btn.addEventListener("click", () => {
      state.selected = new Set([t]); // jump to this tag
      els.viewer.close();
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    li.append(btn);
    els.viewerTags.append(li);
  });

  els.viewer.showModal();
}

els.viewerClose.addEventListener("click", () => els.viewer.close());
els.viewer.addEventListener("click", (e) => {
  if (e.target === els.viewer) els.viewer.close(); // click on the dimmed backdrop
});

// ---------- search ----------
els.search.addEventListener("input", () => {
  state.query = els.search.value;
  render();
});

// ---------- load ----------
async function load() {
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.photos || [];

    state.photos = list.map((p) => ({
      ...p,
      tags: (p.tags || []).map((t) => String(t).trim().toLowerCase()),
    }));

    if (state.photos.length === 0) {
      showMessage(
        "<strong>No photos yet</strong>Add images to <code>public/gallery_images</code>, then run <code>node tools/generate-manifest.js</code>.",
      );
      return;
    }
    render();
  } catch (err) {
    console.error(err);
    showMessage(
      "<strong>Couldn't load the photos</strong>Start the server with <code>node app.js</code> and open <code>http://localhost:3000/gallery.html</code>. Opening the file directly won't work.",
    );
  }
}

load();
