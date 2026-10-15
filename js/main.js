/* =========================================================
   MARTEGANI — interacciones y movimiento (versión 05)
   Scroll vertical normal. El contenido siempre es legible;
   el movimiento sólo acomoda. Respeta prefers-reduced-motion.
   ========================================================= */
(function () {
  "use strict";

  var reducedQuery = window.matchMedia("(prefers-reduced-motion:reduce)");
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var easeOut = function (v) { return 1 - Math.pow(1 - v, 3); };
  var smooth = function (v) { return v * v * (3 - 2 * v); };

  /* ----- Menú mobile ----- */
  var toggle = document.querySelector(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----- Header: sólido al bajar del hero ----- */
  var header = document.querySelector(".site-header");
  var hero = document.querySelector(".hero");
  function headerState() {
    if (!header) return;
    var limit = hero ? hero.offsetHeight - 90 : 60;
    header.classList.toggle("is-stuck", window.scrollY > limit);
  }

  /* ----- FAQ acordeón ----- */
  document.querySelectorAll(".faq__q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".faq__item");
      var ans = item.querySelector(".faq__a");
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq__item.open").forEach(function (o) {
        if (o !== item) {
          o.classList.remove("open");
          o.querySelector(".faq__a").style.maxHeight = null;
          o.querySelector(".faq__q").setAttribute("aria-expanded", "false");
        }
      });
      if (isOpen) {
        item.classList.remove("open"); ans.style.maxHeight = null;
        q.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("open"); ans.style.maxHeight = ans.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ----- Pasos del método: cambian explicación e imagen ----- */
  var stepText = document.querySelector("[data-step-text]");
  var stepImg = document.querySelector("[data-step-img]");
  var stepCap = document.querySelector("[data-step-cap]");
  document.querySelectorAll(".step").forEach(function (step) {
    step.addEventListener("click", function () {
      document.querySelectorAll(".step").forEach(function (s) { s.classList.remove("is-active"); });
      step.classList.add("is-active");
      if (stepText && step.dataset.text) stepText.textContent = step.dataset.text;
      if (stepImg && step.dataset.img) stepImg.setAttribute("src", step.dataset.img);
      if (stepCap && step.dataset.cap) stepCap.textContent = step.dataset.cap;
    });
  });

  /* ----- Filtro de propiedades ----- */
  var chips = document.querySelectorAll(".filters .chip");
  var cards = document.querySelectorAll(".props-track .card[data-city]");
  function applyFilter(city) {
    cards.forEach(function (card) {
      var c = (card.getAttribute("data-city") || "").toLowerCase();
      card.style.display = (city === "todas" || c === city) ? "" : "none";
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (x) { x.classList.remove("is-active"); });
      chip.classList.add("is-active");
      applyFilter((chip.getAttribute("data-filter") || "todas").toLowerCase());
      if (typeof relayout === "function") relayout();
    });
  });

  /* ----- "Más filtros" (comprar, móvil) ----- */
  var moreBtn = document.querySelector(".search__more");
  if (moreBtn) {
    moreBtn.addEventListener("click", function () {
      var form = moreBtn.closest(".search");
      form.querySelectorAll(".field--extra").forEach(function (f) { f.style.display = "flex"; });
      moreBtn.style.display = "none";
    });
  }

  /* ----- Formulario de búsqueda (comprar) ----- */
  var searchForm = document.querySelector("[data-search]");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var city = (searchForm.querySelector("[name=ciudad]").value || "todas").toLowerCase();
      var target = city.indexOf("corrientes") > -1 ? "corrientes"
        : city.indexOf("resistencia") > -1 ? "resistencia" : "todas";
      chips.forEach(function (x) {
        x.classList.toggle("is-active", (x.getAttribute("data-filter") || "").toLowerCase() === target);
      });
      applyFilter(target);
      if (typeof relayout === "function") relayout();
      var sec = document.getElementById("propiedades");
      if (sec) sec.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ----- WhatsApp: arma el mensaje según los selects ----- */
  var WA_NUMBER = "5493794000000"; // número de demostración
  function buildWhats() {
    document.querySelectorAll("[data-whatsapp]").forEach(function (btn) {
      var scope = btn.closest("[data-wa-scope]") || document;
      var quiero = scope.querySelector("[name=quiero]");
      var ciudad = scope.querySelector("[name=ciudad-wa]");
      var msg = "Hola Martegani, " + (quiero ? quiero.value : "quiero hacer una consulta");
      if (ciudad && ciudad.value) msg += " en " + ciudad.value;
      btn.setAttribute("href", "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg + "."));
    });
  }
  buildWhats();
  document.querySelectorAll("[name=quiero],[name=ciudad-wa]").forEach(function (el) {
    el.addEventListener("change", buildWhats);
  });
  // Botón flotante de WhatsApp
  var waFloat = document.querySelector("[data-whatsapp-float]");
  if (waFloat) {
    waFloat.setAttribute("href", "https://wa.me/" + WA_NUMBER +
      "?text=" + encodeURIComponent("Hola Martegani, quería hacer una consulta."));
  }

  /* =======================================================
     MOVIMIENTO — un único coordinador por scroll (rAF)
     ======================================================= */
  var heroBg = document.querySelector(".hero__bg");
  var hero2 = document.querySelector(".hero");
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  reveals.forEach(function (el, i) { el.style.zIndex = String(i + 1); });
  var closing = document.querySelector(".closing");
  var track = document.querySelector("[data-props-track]");
  var ticking = false;

  /* Carrusel automático: duplica las tarjetas visibles y las hace correr
     en bucle continuo (corre solo, no depende del scroll). Con "movimiento
     reducido" queda como carrusel que se desliza con el dedo. */
  function clearClones() {
    if (track) track.querySelectorAll("[data-clone]").forEach(function (n) { n.remove(); });
  }
  function configCarousel() {
    if (!track) return;
    clearClones();
    track.classList.remove("is-marquee");
    track.style.animationDuration = "";
    if (reducedQuery.matches) return; // fallback: swipe (CSS)
    var originals = [].slice.call(track.children).filter(function (c) { return c.style.display !== "none"; });
    if (!originals.length) return;
    // clon del set para que el bucle sea continuo y sin salto
    originals.forEach(function (c) {
      var cl = c.cloneNode(true);
      cl.setAttribute("aria-hidden", "true");
      cl.setAttribute("data-clone", "");
      cl.querySelectorAll("a,button").forEach(function (el) { el.tabIndex = -1; });
      if (cl.tagName === "A") cl.tabIndex = -1;
      track.appendChild(cl);
    });
    // velocidad constante → duración según el ancho de un set
    var mr = 26, oneSet = 0;
    originals.forEach(function (c) { oneSet += c.getBoundingClientRect().width + mr; });
    var speed = window.innerWidth <= 980 ? 72 : 88; // px por segundo
    track.style.animationDuration = Math.max(10, oneSet / speed).toFixed(1) + "s";
    track.classList.add("is-marquee");
  }
  function relayout() { configCarousel(); }

  /* Entrada de secciones: activa .in cuando el bloque entra en pantalla.
     Mejora progresiva: sólo con JS, y el contenido nunca se oculta. */
  if (!reducedQuery.matches) {
    document.documentElement.classList.add("js-motion");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }
  }

  function frame() {
    ticking = false;
    var reduced = reducedQuery.matches;
    var vh = window.innerHeight;
    var mobile = window.innerWidth <= 980;

    headerState();

    // Parallax del hero: la foto se mueve más lento que el scroll (sólo escritorio).
    if (heroBg) {
      var heroH = hero2 ? hero2.offsetHeight : vh;
      var y = window.scrollY;
      if (reduced || mobile) {
        heroBg.style.transform = "";
      } else if (y <= heroH) {
        heroBg.style.transform = "translate3d(0," + (y * 0.28).toFixed(1) + "px,0)";
      }
    }

    // (El carrusel corre solo con animación CSS; ver configCarousel.)

    // Cierre: formación blanco → cielo → ciudad → plano oscuro
    if (closing) {
      if (reduced) {
        closing.style.setProperty("--arrival-sky", "1");
        closing.style.setProperty("--arrival-photo", "1");
      } else {
        var cr = closing.getBoundingClientRect();
        var val = clamp((vh * 0.95 - cr.top) / (vh * 0.78));
        closing.style.setProperty("--arrival-sky", smooth(clamp(val / 0.35)).toFixed(4));
        closing.style.setProperty("--arrival-photo", smooth(clamp((val - 0.22) / 0.68)).toFixed(4));
      }
    }
  }
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  function tick() { configCarousel(); schedule(); }
  var resizeT;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", function () { clearTimeout(resizeT); resizeT = setTimeout(tick, 150); });
  reducedQuery.addEventListener("change", tick);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(tick);
  window.addEventListener("load", tick);
  configCarousel();
  schedule();
})();
