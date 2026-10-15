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

  /* =======================================================
     MOVIMIENTO — un único coordinador por scroll (rAF)
     ======================================================= */
  var heroBg = document.querySelector(".hero__bg");
  var hero2 = document.querySelector(".hero");
  var reveals = [].slice.call(document.querySelectorAll(".reveal"));
  reveals.forEach(function (el, i) { el.style.zIndex = String(i + 1); });
  var closing = document.querySelector(".closing");
  var pin = document.querySelector("[data-props-pin]");
  var track = document.querySelector("[data-props-track]");
  var progressBar = document.querySelector(".props-progress i");
  var ticking = false;

  /* Define la altura del bloque pineado según cuánto debe desplazarse el carrusel. */
  function layoutPin() {
    if (!pin || !track) return;
    var mobile = window.innerWidth <= 980;
    if (mobile || reducedQuery.matches) { pin.style.height = ""; track.style.transform = ""; return; }
    var travel = Math.max(0, track.scrollWidth - track.clientWidth);
    pin.style.height = (window.innerHeight + travel) + "px";
  }
  function relayout() { layoutPin(); schedule(); }

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

    // Carrusel pineado: el scroll vertical mueve las tarjetas de der→izq.
    if (pin && track) {
      if (reduced || mobile) {
        track.style.transform = "";
        if (progressBar) progressBar.parentNode.style.setProperty("--carousel-progress", 0);
      } else {
        var pr = pin.getBoundingClientRect();
        var range = pin.offsetHeight - vh;
        var prog = range > 0 ? clamp(-pr.top / range) : 0;
        var travel = Math.max(0, track.scrollWidth - track.clientWidth);
        track.style.transform = "translate3d(" + (-prog * travel).toFixed(1) + "px,0,0)";
        if (progressBar) progressBar.parentNode.style.setProperty("--carousel-progress", prog.toFixed(3));
      }
    }

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

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", function () { layoutPin(); schedule(); });
  reducedQuery.addEventListener("change", function () { layoutPin(); schedule(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layoutPin(); schedule(); });
  window.addEventListener("load", function () { layoutPin(); schedule(); });
  layoutPin();
  schedule();
})();
