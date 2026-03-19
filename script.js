/*
  Sociology Society - Site Script v6
  - Navigation (active state, mobile hamburger)
  - Theme toggle with persistence and prefers-color-scheme
  - Markdown loader (Decap CMS compatibility)
  - Events loader (card grid from content/events)
  - Image optimization (lazy/loading priority/responsive sizes)
*/

/* Utility: current year */
(function () {
  try {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  } catch (_) {}
})();

/* Mobile nav setup - collapses to hamburger on small screens */
function setupMobileNav() {
  try {
    const nav = document.getElementById("site-nav");
    const toggle = document.getElementById("nav-toggle");
    const list = document.getElementById("nav-list");
    if (!nav || !toggle || !list) return;

    const closeNav = () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    };

    const openNav = () => {
      nav.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
      if (nav.classList.contains("open")) closeNav();
      else openNav();
    });

    // Close on link click
    list.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => closeNav());
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });

    // Reset on resize: show menu on desktop, collapsed on mobile
    const mq = window.matchMedia("(max-width: 700px)");
    const handleResize = () => {
      if (!mq.matches) {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    };
    mq.addEventListener("change", handleResize);
    handleResize();
  } catch (_) {}
}

/* Active nav highlight */
function setActiveNav() {
  try {
    const links = document.querySelectorAll(".nav-list a, .nav-links a");
    const path = location.pathname.replace(/\/+$/, "");
    const current = path.split("/").pop() || "index.html";
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;
      const linkFile = href.split("/").pop();
      if (linkFile === current || (current === "" && linkFile === "index.html")) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    });
  } catch (_) {}
}

/* Fetch text helper */
async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

/* Frontmatter + Markdown parsing */
function parseFrontMatter(md) {
  let fm = {};
  let body = md;
  if (md.startsWith("---")) {
    const end = md.indexOf("\n---", 3);
    if (end !== -1) {
      const raw = md.substring(3, end).trim();
      body = md.substring(end + 4).trim();
      fm = parseYaml(raw);
    }
  }
  return { frontmatter: fm, body };
}

function parseYaml(text) {
  const obj = {};
  const lines = text.split("\n");
  lines.forEach((line) => {
    const m = line.match(/^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)\s*$/);
    if (m) {
      let key = m[1];
      let val = m[2];
      if (val === "true") val = true;
      else if (val === "false") val = false;
      else if (!isNaN(Date.parse(val))) {
        // keep dates as strings
      } else if (!isNaN(Number(val))) val = Number(val);
      obj[key] = val;
    }
  });
  return obj;
}

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* Basic Markdown parser */
function markdownToHtml(md) {
  // Fenced code blocks ```
  md = md.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${escapeHtml(code)}</code></pre>`);

  // Headings
  md = md.replace(/^######\s?(.*)$/gm, "<h6>$1</h6>");
  md = md.replace(/^#####\s?(.*)$/gm, "<h5>$1</h5>");
  md = md.replace(/^####\s?(.*)$/gm, "<h4>$1</h4>");
  md = md.replace(/^###\s?(.*)$/gm, "<h3>$1</h3>");
  md = md.replace(/^##\s?(.*)$/gm, "<h2>$1</h2>");
  md = md.replace(/^#\s?(.*)$/gm, "<h1>$1</h1>");

  // Blockquotes
  md = md.replace(/^\>\s?(.*)$/gm, "<blockquote>$1</blockquote>");

  // Images ![alt](src)
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" class="event-image">');

  // Links [text](url)
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Bold, italics, inline code
  md = md.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  md = md.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  md = md.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Ordered lists
  md = md.replace(/(^\d+\.\s.*(?:\n\d+\.\s.*)*)/gm, (block) => {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^\d+\.\s(.*)$/, "<li>$1</li>"))
      .join("");
    return `<ol>${items}</ol>`;
  });

  // Unordered lists
  md = md.replace(/(^[-*]\s.*(?:\n[-*]\s.*)*)/gm, (block) => {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^[-*]\s(.*)$/, "<li>$1</li>"))
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Paragraphs (wrap lines separated by blank lines)
  const parts = md.split(/\n{2,}/).map((p) => {
    if (/^\s*<(h\d|ul|ol|pre|blockquote|img)/.test(p)) return p;
    return `<p>${p.replace(/\n/g, " ")}</p>`;
  });
  return parts.join("\n");
}

/* Load markdown into a container */
async function loadMarkdown(path, containerId) {
  try {
    const raw = await fetchText(path);
    const { frontmatter, body } = parseFrontMatter(raw);
    const html = markdownToHtml(body);
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
    if (frontmatter && frontmatter.title) {
      document.title = `Sociology Society | ${frontmatter.title}`;
    }
  } catch (err) {
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = `<p class="note">Content could not be loaded. Please try again later.</p>`;
    }
    console.error(err);
  }
}

/* Load events (cards) from content folder */
async function loadEventsList(folder, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  let files = [];
  // Optional index.json listing
  try {
    const idx = await fetch(`${folder}/index.json`);
    if (idx.ok) {
      files = await idx.json();
    }
  } catch (_) {}

  if (!files || files.length === 0) {
    files = ["example-event.md"];
  }

  const cards = [];
  for (const file of files) {
    try {
      const raw = await fetchText(`${folder}/${file}`);
      const { frontmatter, body } = parseFrontMatter(raw);
      const title = frontmatter.title || "Untitled Event";
      const date = frontmatter.date ? new Date(frontmatter.date).toLocaleDateString() : "";
      const img = frontmatter.image || "";
      const descHtml = markdownToHtml(body);

      const card = document.createElement("article");
      card.className = "event-card";

      if (img) {
        const imageEl = document.createElement("img");
        imageEl.className = "event-image";
        imageEl.src = img;
        imageEl.alt = title;
        card.appendChild(imageEl);
      }

      const bodyEl = document.createElement("div");
      bodyEl.className = "event-body";
      bodyEl.innerHTML = `
        <h3 class="event-title">${title}</h3>
        ${date ? `<div class="event-meta">Date: ${date}</div>` : ""}
        <div class="markdown">${descHtml}</div>
      `;
      card.appendChild(bodyEl);

      cards.push(card);
    } catch (err) {
      console.error("Failed to load event", file, err);
    }
  }

  target.innerHTML = "";
  if (cards.length === 0) {
    target.innerHTML = '<p class="note">No events available yet. Please check back soon.</p>';
  } else {
    cards.forEach((c) => target.appendChild(c));
  }
}

/* Theme toggle: use :root[data-theme] + body.dark for legacy selectors */
function setupTheme() {
  const root = document.documentElement;
  const body = document.body;
  const btn = document.getElementById("theme-toggle");

  if (window.__themeInitialized) {
    const current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
    if (body) body.classList.toggle("dark", current === "dark");
    if (btn) {
      btn.textContent = current === "dark" ? "Light Mode" : "Dark Mode";
      btn.setAttribute("aria-pressed", current === "dark" ? "true" : "false");
    }
    return;
  }
  window.__themeInitialized = true;

  let stored = null;
  try {
    stored = localStorage.getItem("theme");
  } catch (_) {}

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = stored || (prefersDark ? "dark" : "light");

  const applyTheme = (mode) => {
    root.setAttribute("data-theme", mode);
    if (body) body.classList.toggle("dark", mode === "dark");
    if (btn) {
      btn.textContent = mode === "dark" ? "Light Mode" : "Dark Mode";
      btn.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
    }
    try { localStorage.setItem("theme", mode); } catch (_) {}
  };

  applyTheme(initial);

  if (btn) {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  // Sync with system preference changes
  if (window.matchMedia) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", (e) => {
      const saved = (function(){ try { return localStorage.getItem("theme"); } catch(_) { return null; } })();
      if (!saved) applyTheme(e.matches ? "dark" : "light");
    });
  }
}

/* Image optimization: lazy-loading and responsive sizes/srcset */
(function () {
  if (typeof document === "undefined") return;
  document.addEventListener("DOMContentLoaded", function () {
    try {
      var imgs = Array.prototype.slice.call(document.images || []);
      if (!imgs.length) return;
      var header = document.querySelector("header");
      var nav = document.querySelector("nav");
      var hero = document.querySelector(".hero, #hero");

      imgs.forEach(function (img, idx) {
        var inHeader = header && header.contains(img);
        var inNav = nav && nav.contains(img);
        var inHero = hero && hero.contains(img);
        var critical = inHeader || inNav || inHero || idx === 0 || img.getAttribute("data-critical") === "true";

        // Loading strategy
        if (critical) {
          img.loading = "eager";
          img.fetchPriority = "high";
        } else {
          if (!img.hasAttribute("loading")) img.loading = "lazy";
          if (!img.hasAttribute("fetchpriority")) img.fetchPriority = "auto";
        }
        img.decoding = "async";

        // Intrinsic size to reduce layout shift (if available post-load)
        if (!img.hasAttribute("width") && img.naturalWidth) {
          img.setAttribute("width", img.naturalWidth);
        }
        if (!img.hasAttribute("height") && img.naturalHeight) {
          img.setAttribute("height", img.naturalHeight);
        }

        // Responsive sizes
        var isLogo = img.classList.contains("logo");
        var isFull = img.classList.contains("full-bleed") || img.classList.contains("hero-image");
        var isGrid = img.classList.contains("grid-image") || !!(img.closest(".grid") || img.closest(".cards") || img.closest(".gallery"));

        if (!img.hasAttribute("sizes")) {
          if (isLogo) {
            img.setAttribute("sizes", "(max-width: 640px) 40vw, 20vw");
          } else if (isFull) {
            img.setAttribute("sizes", "100vw");
          } else if (isGrid) {
            img.setAttribute("sizes", "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw");
          } else {
            img.setAttribute("sizes", "(max-width: 640px) 100vw, 60vw");
          }
        }

        // Provide basic srcset if missing (uses same src as 1x to satisfy attribute presence)
        if (!img.hasAttribute("srcset")) {
          var src = img.getAttribute("src");
          if (src) {
            img.setAttribute("srcset", src + " 1x");
          }
        }
      });
    } catch (err) {
      console.warn("Image optimization script error:", err);
    }
  });
})();

/* Bootstrap on DOM ready */
document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();
  setupMobileNav();
  setupTheme();

  // Markdown pages
  const mdPath = document.body && document.body.getAttribute("data-md");
  if (mdPath) {
    loadMarkdown(mdPath, "content");
  }

  // Events grid if present and empty (avoid double-loading)
  const eventsGrid = document.getElementById("events-list");
  if (eventsGrid && eventsGrid.children.length === 0) {
    loadEventsList("content/events", "events-list");
  }

  // Auto-load homepage caption if #home-caption exists and no body[data-md] set
  const homeCaption = document.getElementById("home-caption");
  if (homeCaption && !document.body.getAttribute("data-md")) {
    loadMarkdown("content/home.md", "home-caption");
  }
});

/* Ensure functions are accessible on window for inline scripts */
if (typeof window !== "undefined") {
  try { if (!window.setActiveNav) window.setActiveNav = setActiveNav; } catch (_) {}
  try { if (!window.setupMobileNav) window.setupMobileNav = setupMobileNav; } catch (_) {}
  try { if (!window.setupTheme) window.setupTheme = setupTheme; } catch (_) {}
  try { if (!window.loadMarkdown) window.loadMarkdown = loadMarkdown; } catch (_) {}
  try { if (!window.loadEventsList) window.loadEventsList = loadEventsList; } catch (_) {}
}