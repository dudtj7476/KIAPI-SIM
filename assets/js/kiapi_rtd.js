/* ==========================================================================
   KIAPI Integrated Simulation & V&V Platform — Read the Docs Interactive JS
   Works 100% offline on both file:// and http:// protocols
   ========================================================================== */

(function () {
  "use strict";

  const rootPrefix = window.KIAPI_ROOT_PREFIX || "./";

  // 1. Theme Persistence (Light / Dark Content Area)
  function initTheme() {
    try {
      const saved = localStorage.getItem("kiapi_docs_theme");
      if (saved === "dark") {
        document.body.classList.add("dark-content");
      }
    } catch (_) {}

    document.querySelectorAll("[data-toggle-theme]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.body.classList.toggle("dark-content");
        const isDark = document.body.classList.contains("dark-content");
        try {
          localStorage.setItem("kiapi_docs_theme", isDark ? "dark" : "light");
        } catch (_) {}
      });
    });
  }

  // 2. Mobile Sidebar & Bottom Version Flyout
  function initNavigationChrome() {
    const mobileBtn = document.getElementById("rtd-mobile-toggle");
    const sidebar = document.querySelector(".wy-nav-side");
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
      });
    }

    const verBar = document.querySelector(".rst-versions");
    const verTrigger = document.querySelector(".rst-current-version");
    if (verBar && verTrigger) {
      verTrigger.addEventListener("click", () => {
        verBar.classList.toggle("shift-up");
      });
    }
  }

  // 3. Auto Sub-TOC (H2 headings) under Current Sidebar Page + ScrollSpy
  function initSubTocAndScrollSpy() {
    const currentLi = document.querySelector(".wy-menu-vertical li.toctree-l1.current");
    const h2List = Array.from(document.querySelectorAll(".rst-content h2[id]"));
    if (!currentLi || h2List.length === 0) return;

    let subUl = currentLi.querySelector("ul.subtoc");
    if (!subUl) {
      subUl = document.createElement("ul");
      subUl.className = "subtoc";
      h2List.forEach((h2) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#" + h2.id;
        a.textContent = h2.textContent.replace(/^#\s*/, "");
        li.appendChild(a);
        subUl.appendChild(li);
      });
      currentLi.appendChild(subUl);
    }

    const spyLinks = Array.from(subUl.querySelectorAll("a"));
    function onScroll() {
      const scrollY = window.scrollY + 110;
      let activeIdx = 0;
      for (let i = 0; i < h2List.length; i++) {
        if (h2List[i].offsetTop <= scrollY) {
          activeIdx = i;
        }
      }
      spyLinks.forEach((a, idx) => {
        a.classList.toggle("active-spy", idx === activeIdx);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    // Scroll sidebar so active item is visible
    const sideScroll = document.querySelector(".wy-side-scroll");
    if (sideScroll && currentLi.offsetTop > 260) {
      sideScroll.scrollTop = Math.max(0, currentLi.offsetTop - 180);
    }
  }

  // 4. Instant Offline Search (window.KIAPI_SEARCH_INDEX)
  function initSearch() {
    const input = document.getElementById("rtd-search-input");
    const dropdown = document.getElementById("rtd-search-results");
    if (!input || !dropdown) return;

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function runSearch(q) {
      const query = q.trim().toLowerCase();
      const index = window.KIAPI_SEARCH_INDEX || [];
      if (query.length < 1) {
        dropdown.classList.remove("open");
        dropdown.innerHTML = "";
        return;
      }

      const tokens = query.split(/\s+/).filter(Boolean);
      const scored = [];

      for (const item of index) {
        const titleL = (item.title || "").toLowerCase();
        const catL = (item.category || "").toLowerCase();
        const kwL = (item.keywords || "").toLowerCase();
        const bodyL = (item.body || "").toLowerCase();

        let score = 0;
        let matchedAll = true;
        for (const tk of tokens) {
          let tkScore = 0;
          if (titleL.includes(tk)) tkScore += 12;
          if (kwL.includes(tk)) tkScore += 8;
          if (catL.includes(tk)) tkScore += 4;
          if (bodyL.includes(tk)) tkScore += 2;
          if (tkScore === 0) {
            matchedAll = false;
            break;
          }
          score += tkScore;
        }
        if (matchedAll && score > 0) {
          scored.push({ item, score, bodyL });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, 14);

      if (top.length === 0) {
        dropdown.innerHTML =
          '<div class="search-result-header"><span>검색 결과 0건</span><span>ESC 닫기</span></div>' +
          '<div style="padding:14px;font-size:0.83rem;color:#64748b;">일치하는 문서 항목이 없습니다. (예: <code>ioniq_q</code>, <code>가로등</code>, <code>아파트</code>, <code>KPI</code>, <code>LiDAR</code>, <code>daegu_bus</code>)</div>';
        dropdown.classList.add("open");
        return;
      }

      let html = `<div class="search-result-header"><span>검색 결과 ${scored.length}건 (상위 ${top.length}건)</span><span>ESC 닫기</span></div>`;
      for (const entry of top) {
        const it = entry.item;
        const href = rootPrefix + it.url;
        let snippet = it.summary || "";
        const pos = entry.bodyL.indexOf(tokens[0]);
        if (pos >= 0 && it.body) {
          const s0 = Math.max(0, pos - 36);
          const s1 = Math.min(it.body.length, pos + 110);
          snippet = (s0 > 0 ? "…" : "") + it.body.slice(s0, s1) + (s1 < it.body.length ? "…" : "");
        }
        html += `<a class="search-result-item" href="${escapeHtml(href)}">
          <div class="sr-cat">${escapeHtml(it.category)}</div>
          <div class="sr-title">${escapeHtml(it.title)}</div>
          <div class="sr-snippet">${escapeHtml(snippet)}</div>
        </a>`;
      }
      dropdown.innerHTML = html;
      dropdown.classList.add("open");
    }

    input.addEventListener("input", () => runSearch(input.value));
    input.addEventListener("focus", () => {
      if (input.value.trim().length > 0) runSearch(input.value);
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.remove("open");
      }
    });

    document.addEventListener("keydown", (e) => {
      if ((e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        input.focus();
        input.select();
      } else if (e.key === "Escape") {
        dropdown.classList.remove("open");
        closeLightbox();
      }
    });
  }

  // 5. CARLA-Style Hero Slider (.townslider-container)
  function initSliders() {
    document.querySelectorAll(".townslider-container").forEach((slider) => {
      const slides = Array.from(slider.querySelectorAll(".townslider-slide"));
      const dots = Array.from(slider.querySelectorAll(".ts-dot"));
      const prevBtn = slider.querySelector(".ts-prev");
      const nextBtn = slider.querySelector(".ts-next");
      if (slides.length <= 1) return;

      let idx = 0;
      let timer = null;

      function show(n) {
        idx = (n + slides.length) % slides.length;
        slides.forEach((s, i) => s.classList.toggle("active", i === idx));
        dots.forEach((d, i) => d.classList.toggle("active", i === idx));
      }

      function startAuto() {
        stopAuto();
        timer = setInterval(() => show(idx + 1), 5500);
      }

      function stopAuto() {
        if (timer) clearInterval(timer);
      }

      if (prevBtn) prevBtn.addEventListener("click", () => { show(idx - 1); startAuto(); });
      if (nextBtn) nextBtn.addEventListener("click", () => { show(idx + 1); startAuto(); });
      dots.forEach((d, i) => d.addEventListener("click", () => { show(i); startAuto(); }));

      slider.addEventListener("mouseenter", stopAuto);
      slider.addEventListener("mouseleave", startAuto);
      show(0);
      startAuto();
    });
  }

  // 6. Copy Buttons on Code Blocks
  function initCopyCode() {
    document.querySelectorAll(".rst-content pre").forEach((pre) => {
      if (pre.parentElement && pre.parentElement.classList.contains("code-block-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "code-block-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement("button");
      btn.className = "copy-code-btn";
      btn.type = "button";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        const text = pre.innerText || pre.textContent || "";
        navigator.clipboard?.writeText(text).then(() => {
          btn.textContent = "Copied!";
          setTimeout(() => { btn.textContent = "Copy"; }, 1400);
        });
      });
      wrap.appendChild(btn);
    });
  }

  // 7. Interactive Category + Keyword Filter for Catalogues
  function initCatalogueFilters() {
    document.querySelectorAll("[data-filter-scope]").forEach((scopeEl) => {
      const scopeName = scopeEl.getAttribute("data-filter-scope");
      const buttons = Array.from(scopeEl.querySelectorAll("[data-filter-cat]"));
      const textInput = scopeEl.querySelector("[data-filter-input]");
      const countBadge = scopeEl.querySelector("[data-filter-count]");
      const items = Array.from(document.querySelectorAll(`[data-filter-target="${scopeName}"]`));

      let activeCat = "all";

      function applyFilter() {
        const q = (textInput ? textInput.value : "").trim().toLowerCase();
        let shown = 0;
        items.forEach((el) => {
          const cat = el.getAttribute("data-cat") || "";
          const hay = (el.textContent || "").toLowerCase();
          const catOk = activeCat === "all" || cat.split(/\s+/).includes(activeCat);
          const qOk = !q || hay.includes(q);
          const vis = catOk && qOk;
          el.style.display = vis ? "" : "none";
          if (vis) shown++;
        });
        if (countBadge) {
          countBadge.textContent = `${shown} / ${items.length}`;
        }
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          activeCat = btn.getAttribute("data-filter-cat") || "all";
          buttons.forEach((b) => b.classList.toggle("active", b === btn));
          applyFilter();
        });
      });

      if (textInput) {
        textInput.addEventListener("input", applyFilter);
      }
      applyFilter();
    });
  }

  // 8. Image Lightbox Modal
  let lightboxEl = null;
  function closeLightbox() {
    if (lightboxEl) lightboxEl.classList.remove("open");
  }

  function initLightbox() {
    lightboxEl = document.createElement("div");
    lightboxEl.className = "img-lightbox";
    lightboxEl.innerHTML = `
      <button class="lb-close" type="button" aria-label="Close">&times;</button>
      <img src="" alt="" />
      <div class="lb-caption"></div>
    `;
    document.body.appendChild(lightboxEl);

    const lbImg = lightboxEl.querySelector("img");
    const lbCap = lightboxEl.querySelector(".lb-caption");
    lightboxEl.querySelector(".lb-close").addEventListener("click", closeLightbox);
    lightboxEl.addEventListener("click", (e) => {
      if (e.target === lightboxEl) closeLightbox();
    });

    document.querySelectorAll(".fig-block img, .vehicle-card img, .townslider-slide img").forEach((img) => {
      img.addEventListener("click", () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt || "";
        let cap = img.alt || "";
        const figCap = img.closest(".fig-block")?.querySelector(".fig-caption");
        if (figCap) cap = figCap.textContent;
        lbCap.textContent = cap;
        lightboxEl.classList.add("open");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigationChrome();
    initSubTocAndScrollSpy();
    initSearch();
    initSliders();
    initCopyCode();
    initCatalogueFilters();
    initLightbox();
  });
})();
