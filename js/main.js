/* =========================================================
   MARTEGANI — interacciones
   ========================================================= */
(function () {
  "use strict";

  /* ----- Menú mobile ----- */
  var toggle = document.querySelector(".menu-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      document.body.classList.toggle("menu-open");
      var open = document.body.classList.contains("menu-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // cerrar al tocar un link del menú
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ----- Sombra del header al hacer scroll ----- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ----- FAQ acordeón ----- */
  document.querySelectorAll(".faq__q").forEach(function (q) {
    q.addEventListener("click", function () {
      var item = q.closest(".faq__item");
      var ans = item.querySelector(".faq__a");
      var isOpen = item.classList.contains("open");
      // cerrar los demás
      document.querySelectorAll(".faq__item.open").forEach(function (o) {
        if (o !== item) {
          o.classList.remove("open");
          o.querySelector(".faq__a").style.maxHeight = null;
          o.querySelector(".faq__q").setAttribute("aria-expanded", "false");
        }
      });
      if (isOpen) {
        item.classList.remove("open");
        ans.style.maxHeight = null;
        q.setAttribute("aria-expanded", "false");
      } else {
        item.classList.add("open");
        ans.style.maxHeight = ans.scrollHeight + "px";
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ----- Pasos del criterio (activar al tocar) ----- */
  document.querySelectorAll(".step").forEach(function (step) {
    step.addEventListener("click", function () {
      document.querySelectorAll(".step").forEach(function (s) {
        s.classList.remove("is-active");
      });
      step.classList.add("is-active");
    });
  });

  /* ----- Filtro de propiedades (chips Todas / Corrientes / Resistencia) ----- */
  var chips = document.querySelectorAll(".filters .chip");
  var cards = document.querySelectorAll(".cards .card");
  function applyFilter(city) {
    cards.forEach(function (card) {
      var c = (card.getAttribute("data-city") || "").toLowerCase();
      var show = city === "todas" || c === city;
      card.style.display = show ? "" : "none";
    });
  }
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (x) { x.classList.remove("is-active"); });
      chip.classList.add("is-active");
      applyFilter((chip.getAttribute("data-filter") || "todas").toLowerCase());
    });
  });

  /* ----- Formulario de búsqueda (Comprar) ----- */
  var searchForm = document.querySelector("[data-search]");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var city = (searchForm.querySelector("[name=ciudad]").value || "todas").toLowerCase();
      // sincronizar con los chips de la sección propiedades
      var target = "todas";
      if (city.indexOf("corrientes") > -1) target = "corrientes";
      else if (city.indexOf("resistencia") > -1) target = "resistencia";
      chips.forEach(function (x) {
        var match = (x.getAttribute("data-filter") || "").toLowerCase() === target;
        x.classList.toggle("is-active", match);
      });
      applyFilter(target);
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
      var msg = "Hola Martegani, ";
      msg += quiero ? quiero.value : "quiero hacer una consulta";
      if (ciudad && ciudad.value) msg += " en " + ciudad.value;
      msg += ".";
      btn.setAttribute("href", "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg));
    });
  }
  buildWhats();
  document.querySelectorAll("[name=quiero],[name=ciudad-wa]").forEach(function (el) {
    el.addEventListener("change", buildWhats);
  });
})();
