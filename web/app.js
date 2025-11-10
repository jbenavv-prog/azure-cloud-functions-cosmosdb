const API_LIST = "https://studentsf.azurewebsites.net/api/list";
const API_SEARCH_BY_ID = "https://studentsf.azurewebsites.net/api/search/by-id";

let state = {
  mode: "list",     // "list" | "search"
  lastId: "",
  page: 1,
  pageSize: 25,
  total: undefined,
  loading: false
};

const el = {
  pageSize: document.getElementById("pageSize"),
  reload: document.getElementById("reload"),
  status: document.getElementById("status"),
  thead: document.querySelector("#dataTable thead"),
  tbody: document.querySelector("#dataTable tbody"),
  prev: document.getElementById("prevBtn"),
  next: document.getElementById("nextBtn"),
  pageInfo: document.getElementById("pageInfo"),

  // búsqueda
  searchForm: document.getElementById("searchForm"),
  idInput: document.getElementById("idInput"),
  searchBtn: document.getElementById("searchBtn"),
  clearBtn: document.getElementById("clearBtn")
};

function setStatus(msg) { el.status.textContent = msg; }
function setLoading(on) {
  state.loading = on;
  setStatus(on ? "Cargando..." : "Listo");
  el.reload.disabled = on;
  // en modo search no hay paginación
  const isSearch = state.mode === "search";
  el.prev.disabled = on || isSearch || state.page <= 1;
  const hasMore = state.total ? (state.page * state.pageSize) < state.total : false;
  el.next.disabled = on || isSearch || (state.total ? !hasMore : false);
}

function pretty(v) {
  if (v && typeof v === "object") {
    if (v.$oid) return v.$oid;
    if (v.$date) return new Date(v.$date).toISOString();
  }
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "true" : "false";
  return v == null ? "" : String(v);
}

function buildColumns(items) {
  if (!items || !items.length) return [];
  const keys = new Set(Object.keys(items[0]));
  const cols = [];
  if (keys.has("_id")) { cols.push("_id"); keys.delete("_id"); }
  for (const k of keys) cols.push(k);
  return cols;
}

function renderTable(items, total) {
  el.thead.innerHTML = "";
  el.tbody.innerHTML = "";

  if (!items || !items.length) {
    el.thead.innerHTML = "<tr><th>Sin datos</th></tr>";
    el.pageInfo.textContent = state.mode === "search"
      ? `Búsqueda por ID: “${state.lastId}” • 0 filas`
      : `Página ${state.page} • 0 filas`;
    return;
  }

  const cols = buildColumns(items);
  el.thead.innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;

  const rowsHtml = items.map(row =>
    `<tr>${cols.map(c => `<td>${pretty(row[c])}</td>`).join("")}</tr>`
  ).join("");
  el.tbody.innerHTML = rowsHtml;

  if (state.mode === "search") {
    el.pageInfo.textContent = `Búsqueda por ID: “${state.lastId}” • ${items.length} fila(s)`;
  } else {
    if (typeof total === "number") {
      const start = (state.page - 1) * state.pageSize + 1;
      const end = Math.min(state.page * state.pageSize, total);
      el.pageInfo.textContent = `Página ${state.page} • ${start}–${end} de ${total}`;
    } else {
      el.pageInfo.textContent = `Página ${state.page}`;
    }
  }

  // botones pager
  const isSearch = state.mode === "search";
  el.prev.disabled = isSearch || state.page <= 1;
  if (!isSearch) {
    el.next.disabled = typeof total === "number" ? state.page * state.pageSize >= total : false;
  } else {
    el.next.disabled = true;
  }
}

async function loadListPage() {
  setLoading(true);
  try {
    const url = new URL(API_LIST);
    url.searchParams.set("page", String(state.page));
    url.searchParams.set("pageSize", String(state.pageSize));
    url.searchParams.set("includeTotal", "true");

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    const data = await res.json();
    state.total = data.total;
    renderTable(data.items || [], data.total);
    setStatus("Listo");
  } catch (err) {
    console.error(err);
    setStatus("Error al cargar");
    el.thead.innerHTML = "<tr><th>Error</th></tr>";
    el.tbody.innerHTML = `<tr><td>${(err && err.message) || err}</td></tr>`;
    el.pageInfo.textContent = "";
  } finally {
    setLoading(false);
  }
}

async function searchById(id) {
  setLoading(true);
  try {
    const url = new URL(API_SEARCH_BY_ID);
    url.searchParams.set("id", id);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      // 404 => no encontrado, u otro error
      const txt = await res.text();
      renderTable([], 0);
      throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    const data = await res.json();

    // Soportar distintos formatos posibles: {item}, {document}, o el doc directamente
    let doc = data?.item ?? data?.document ?? data;
    let items = Array.isArray(doc) ? doc : (doc ? [doc] : []);
    state.total = items.length;

    renderTable(items, items.length);
    setStatus("Listo");
  } catch (err) {
    console.error(err);
    setStatus("Error al buscar");
  } finally {
    setLoading(false);
  }
}

// --- eventos UI ---
el.pageSize.addEventListener("change", () => {
  state.pageSize = parseInt(el.pageSize.value, 10) || 25;
  state.page = 1;
  if (state.mode === "list") loadListPage();
});

el.reload.addEventListener("click", () => {
  if (state.mode === "list") loadListPage();
  else if (state.mode === "search" && state.lastId) searchById(state.lastId);
});

el.prev.addEventListener("click", () => {
  if (state.mode !== "list") return;
  if (state.page > 1) { state.page--; loadListPage(); }
});
el.next.addEventListener("click", () => {
  if (state.mode !== "list") return;
  state.page++; loadListPage();
});

// Buscar por ID
el.searchForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const id = (el.idInput.value || "").trim();
  if (!id) return;
  state.mode = "search";
  state.lastId = id;
  searchById(id);
});
el.searchBtn.addEventListener("click", (ev) => {
  ev.preventDefault();
  el.searchForm.requestSubmit();
});
el.clearBtn.addEventListener("click", () => {
  el.idInput.value = "";
  state.mode = "list";
  state.lastId = "";
  state.page = 1;
  loadListPage();
});

// inicio
loadListPage();