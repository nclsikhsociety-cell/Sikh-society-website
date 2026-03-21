/* Minimal helpers for static CMS rendering (Markdown + Events)
   Ensure functions exist on window for inline usage */
(function () {
  async function fetchText(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error("Fetch failed: " + path);
    return await res.text();
  }

  function markdownToHtml(md) {
    // Very small markdown to HTML converter for basic content
    return md
      .replace(/^---[\s\S]*?---\s*/m, "") // strip front-matter
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/gim, "<em>$1</em>")
      .replace(/\n$/gim, "<br />");
  }

  async function loadMarkdown(path, targetId) {
    try {
      const md = await fetchText(path);
      const html = markdownToHtml(md);
      const el = document.getElementById(targetId);
      if (el) el.innerHTML = html;
    } catch (e) {
      console.warn("Failed to load markdown:", path, e);
    }
  }

  async function loadEventsList(folder, targetId, pageSize = 5) {
    try {
      const target = document.getElementById(targetId);
      if (!target) return;

      // Fetch index.json for events
      const idxRes = await fetch(folder + "/index.json", { cache: "no-store" });
      if (!idxRes.ok) {
        target.innerHTML = "<p>Events index not found.</p>";
        return;
      }
      const idx = await idxRes.json();
      const items = Array.isArray(idx.items) ? idx.items.slice() : [];

      // Sort: dated events (newest → oldest), then "To Be Decided" by title
      const normStatus = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
      const isTBD = (it) => normStatus(it.status) === "to be decided";

      const dated = items.filter((it) => !isTBD(it) && it.date);
      dated.sort((a, b) => (a.date < b.date ? 1 : -1));

      const tbd = items.filter((it) => isTBD(it));
      tbd.sort((a, b) => {
        const at = (a.title || "").toLowerCase();
        const bt = (b.title || "").toLowerCase();
        return at < bt ? -1 : at > bt ? 1 : 0;
      });

      const sorted = dated.concat(tbd);

      // Pagination via query param ?page=
      const qs = new URLSearchParams(location.search);
      const page = Math.max(1, parseInt(qs.get("page") || "1", 10));
      const total = sorted.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      const pageItems = sorted.slice(start, start + pageSize);

      // Render list
      target.innerHTML = pageItems
        .map((it) => {
          const normStatus = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
          const isTBD = normStatus(it.status) === "to be decided";
          const dateStr = it.date ? new Date(it.date).toDateString() : "";
          const dateHTML = isTBD
            ? `<span class="event-date event-status-tbd">To Be Decided</span>`
            : `<span class="event-date">${dateStr}</span>`;
          const loc = it.location ? `<div class="event-loc">${it.location}</div>` : "";
          const excerpt = it.excerpt ? `<p class="event-excerpt">${it.excerpt}</p>` : "";

          return `
            <article class="card event-card">
              ${it.image ? `<img class="event-cover" src="${it.image}" alt="${(it.title || 'Event').replace(/"/g, '&quot;')}" loading="lazy" style="width:100%;height:auto;display:block;aspect-ratio:16/9;object-fit:cover;background:#f2f4f7;border-bottom:1px solid var(--border);" />` : ""}
              <div class="card-body event-body">
                <h3 class="event-title">${it.title || "Event"}</h3>
                <div class="event-meta">
                  ${dateHTML}
                  ${loc}
                </div>
                ${excerpt}
                <p><a class="btn btn-outline" href="${it.path}" target="_blank" rel="noopener">Read more</a></p>
              </div>
            </article>
          `;
        })
        .join("");

      // Render pagination
      const pagEl = document.getElementById("events-pagination");
      if (pagEl) {
        // expose for inline scripts
        if (typeof window !== 'undefined') window.loadEventsList = loadEventsList;
        const makeLink = (p) => {
          const url = new URL(location.href);
          url.searchParams.set("page", String(p));
          return url.pathname + url.search;
        };
        let html = `<nav class="pagination" aria-label="Events pages">`;
        html += `<a class="page-btn" href="${makeLink(Math.max(1, page - 1))}" aria-label="Previous" ${page === 1 ? 'aria-disabled="true"' : ""}>« Prev</a>`;
        for (let p = 1; p <= totalPages; p++) {
          html += `<a class="page-link ${p === page ? "is-active" : ""}" href="${makeLink(p)}">${p}</a>`;
        }
        html += `<a class="page-btn" href="${makeLink(Math.min(totalPages, page + 1))}" aria-label="Next" ${page === totalPages ? 'aria-disabled="true"' : ""}>Next »</a>`;
        html += `</nav>`;
        pagEl.innerHTML = html;
      }
    } catch (e) {
      console.warn("Failed to load events:", e);
    }
  }

  function setActiveNav() {
    const links = document.querySelectorAll("#nav-list a");
    const path = location.pathname.split("/").pop() || "index.html";
    links.forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.endsWith(path)) {
        a.setAttribute("aria-current", "page");
      } else {
        a.removeAttribute("aria-current");
      }
    });
  }

  function setupTheme() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const dark = document.body.getAttribute("data-theme") === "dark";
      document.body.setAttribute("data-theme", dark ? "light" : "dark");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setActiveNav();
    setupTheme();

    const mdPath = document.body && document.body.getAttribute("data-md");
    if (mdPath) {
      loadMarkdown(mdPath, "content");
    }

    const homeCaption = document.getElementById("home-caption");
    if (homeCaption && !document.body.getAttribute("data-md")) {
      loadMarkdown("content/home.md", "home-caption");
    }

    const eventsGrid = document.getElementById("events-list");
    if (eventsGrid && eventsGrid.children.length === 0) {
      loadEventsList("content/events", "events-list");
    }
  });

  // expose
  window.loadMarkdown = loadMarkdown;
  window.loadEventsList = loadEventsList;
  window.setActiveNav = setActiveNav;
  window.setupTheme = setupTheme;

  // Branding override: apply primary and secondary names site-wide
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const el = document.getElementById('site-title');
      if (el) el.innerHTML = 'NCLSikhSoc <small style="font-weight:500;color:var(--muted);">— North East Sikh Soc</small>';
      if (document.title && document.title.indexOf('Sociology Society') !== -1) {
        document.title = document.title.replace('Sociology Society', 'NCLSikhSoc — North East Sikh Soc');
      }
      const footer = document.querySelector('.site-footer .container');
      if (footer && footer.textContent && footer.textContent.indexOf('Sociology Society') !== -1) {
        footer.textContent = footer.textContent.replace('Sociology Society', 'NCLSikhSoc');
      }
    } catch (_) {}
  });
})();