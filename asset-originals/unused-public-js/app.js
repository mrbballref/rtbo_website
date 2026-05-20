const storedTheme = localStorage.getItem("rtbo-theme");
const preferredTheme = storedTheme || "dark";

function applyTheme(theme) {
  const normalized = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalized;
  document.body?.setAttribute("data-theme", normalized);
  document.body?.classList.toggle("theme-light", normalized === "light");
  document.body?.classList.toggle("theme-dark", normalized === "dark");
  localStorage.setItem("rtbo-theme", normalized);

  const nextTheme = normalized === "light" ? "Dark" : "Light";
  const labelText = nextTheme;

  document.querySelectorAll("[data-theme-label]").forEach((label) => {
    label.textContent = labelText;
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.setAttribute("aria-label", `Switch to ${nextTheme.toLowerCase()} theme`);
    button.setAttribute("aria-checked", normalized === "light" ? "true" : "false");
  });
}

applyTheme(preferredTheme);

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });
});

const navHeader = document.querySelector(".rtbo-header");
const navToggle = document.querySelector("[data-nav-toggle]");
const navScrim = document.querySelector("[data-nav-scrim]");
const publicNav = document.querySelector("[data-public-nav]");

function setNavOpen(isOpen) {
  navHeader?.classList.toggle("nav-open", isOpen);
  navToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

navToggle?.addEventListener("click", () => {
  const isOpen = navHeader?.classList.contains("nav-open") || false;
  setNavOpen(!isOpen);
});

navScrim?.addEventListener("click", () => setNavOpen(false));

document.addEventListener("pointerdown", (event) => {
  if (!navHeader?.classList.contains("nav-open")) return;

  const target = event.target;
  if (!(target instanceof Node)) return;
  if (publicNav?.contains(target) || navToggle?.contains(target)) return;

  setNavOpen(false);
});

publicNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavOpen(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNavOpen(false);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1100) setNavOpen(false);
});

const actionModals = document.querySelectorAll(".rtbo-action-modal");
let lastActionModalTrigger = null;

function closeActionModals() {
  actionModals.forEach((modal) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
  lastActionModalTrigger?.focus?.();
}

function openActionModal(modalId, trigger = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  lastActionModalTrigger = trigger;
  actionModals.forEach((item) => {
    const isTarget = item === modal;
    item.classList.toggle("is-open", isTarget);
    item.setAttribute("aria-hidden", isTarget ? "false" : "true");
  });
  setNavOpen(false);
  document.body.classList.add("modal-open");
  modal.querySelector("input, select, textarea, button")?.focus();
}

function modalIdForLink(link) {
  const href = link.getAttribute("href") || "";
  if (href.endsWith("signup.php") || href.endsWith("register.php")) return "signup-modal";
  if (href.endsWith("signin.php")) return "signin-modal";
  if (href.endsWith("contact.php")) return "contact-modal";
  return "";
}

document.querySelectorAll('a[href$="signup.php"], a[href$="register.php"], a[href$="signin.php"], a[href$="contact.php"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const modalId = modalIdForLink(link);
    if (!modalId || !document.getElementById(modalId)) return;

    event.preventDefault();
    openActionModal(modalId, link);
  });
});

document.querySelectorAll("[data-modal-switch]").forEach((button) => {
  button.addEventListener("click", () => openActionModal(button.dataset.modalSwitch || "", button));
});

document.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeActionModals);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.querySelector(".rtbo-action-modal.is-open")) {
    closeActionModals();
  }
});

const tracks = document.querySelectorAll(".carousel-content");

tracks.forEach((track) => {
  if (track.dataset.duplicated === "true") return;

  const cards = [...track.children];

  for (const card of cards) {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    if (clone instanceof HTMLImageElement) clone.setAttribute("alt", "");
    track.appendChild(clone);
  }

  const updateCarouselShift = () => {
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const originalWidth = cards.reduce((total, card) => total + card.getBoundingClientRect().width, 0);
    const shift = originalWidth + gap * cards.length;
    track.style.setProperty("--carousel-shift", `${shift}px`);
  };

  requestAnimationFrame(updateCarouselShift);
  window.addEventListener("resize", updateCarouselShift);
  track.dataset.duplicated = "true";
});

const guestTriggers = document.querySelectorAll("[data-guest-name]");

if (guestTriggers.length) {
  const modal = document.createElement("div");
  modal.className = "guest-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <button class="guest-modal-backdrop" type="button" data-guest-close aria-label="Close guest profile"></button>
    <div class="guest-modal-panel" role="document">
      <button class="guest-modal-close" type="button" data-guest-close aria-label="Close guest profile">&times;</button>
      <img class="guest-modal-image" src="" alt="">
      <div class="guest-modal-content">
        <p class="eyebrow">Guest Profile</p>
        <h2></h2>
        <p class="guest-modal-role"></p>
        <p class="guest-modal-bio"></p>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalImage = modal.querySelector(".guest-modal-image");
  const modalName = modal.querySelector("h2");
  const modalRole = modal.querySelector(".guest-modal-role");
  const modalBio = modal.querySelector(".guest-modal-bio");
  let lastGuestTrigger = null;

  function closeGuestModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    lastGuestTrigger?.focus();
  }

  function openGuestModal(trigger) {
    lastGuestTrigger = trigger;
    const name = trigger.dataset.guestName || "";
    const role = trigger.dataset.guestRole || "";
    const image = trigger.dataset.guestImage || "";
    const bio = trigger.dataset.guestBio || "";

    modalImage.src = image;
    modalImage.alt = `${name} guest card`;
    modalName.textContent = name;
    modalRole.textContent = role;
    modalBio.textContent = bio;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modal.querySelector(".guest-modal-close")?.focus();
  }

  guestTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openGuestModal(trigger));
  });

  modal.querySelectorAll("[data-guest-close]").forEach((button) => {
    button.addEventListener("click", closeGuestModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeGuestModal();
    }
  });
}

const revealTargets = document.querySelectorAll(
  ".rtbo-section, .rtbo-band, .page-hero, .rtbo-offer, .school-grid article, .service-list article, .solution-grid article, .pricing-card, .curriculum-grid article, .tuition-strip, .contact-form"
);

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
} else if ("IntersectionObserver" in window) {
  revealTargets.forEach((element, index) => {
    element.classList.add("rtbo-animate");
    element.style.setProperty("--rtbo-delay", `${Math.min((index % 6) * 0.055, 0.275)}s`);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12,
    }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));
} else {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
}

const sessionBoxes = document.querySelectorAll('input[name="sessions[]"]');
const sessionCount = document.querySelector("[data-session-count]");
const tuitionTotal = document.querySelector("[data-tuition-total]");
const registerForm = document.querySelector("[data-registration-form]");

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function updateTuition() {
  const count = [...sessionBoxes].filter((box) => box.checked).length;
  const total = count === 1 ? 225 : count === 2 ? 400 : count >= 3 ? 550 : 0;

  if (sessionCount) sessionCount.textContent = count;
  if (tuitionTotal) tuitionTotal.textContent = money(total);
}

sessionBoxes.forEach((box) => box.addEventListener("change", updateTuition));
updateTuition();

registerForm?.addEventListener("submit", (event) => {
  const selectedSessions = [...sessionBoxes].filter((box) => box.checked);

  if (!selectedSessions.length) {
    event.preventDefault();
    alert("Please select at least one school session.");
    return;
  }

  if (!registerForm.checkValidity()) {
    event.preventDefault();
    registerForm.reportValidity();
  }
});
