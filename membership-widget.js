(() => {
  "use strict";

  const widgets = [...document.querySelectorAll("[data-membership-widget]")];
  if (!widgets.length) return;

  const AUTO_COLLAPSE_MS = 15000;
  const LEAVE_COLLAPSE_MS = 700;

  widgets.forEach((widget) => {
    const toggle = widget.querySelector("[data-membership-toggle]");
    const panel = widget.querySelector("[data-membership-panel]");

    if (!toggle || !panel) return;

    let autoTimer = null;
    let leaveTimer = null;

    function setExpanded(expanded) {
      widget.classList.toggle("is-expanded", expanded);
      widget.classList.toggle("is-collapsed", !expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute(
        "aria-label",
        expanded
          ? "Hide Plasma Cut Forge membership options"
          : "Open Plasma Cut Forge membership options"
      );
    }

    function startAutoCollapse() {
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => {
        if (!widget.matches(":hover") && !widget.contains(document.activeElement)) {
          setExpanded(false);
        }
      }, AUTO_COLLAPSE_MS);
    }

    function scheduleCollapse() {
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => {
        if (!widget.matches(":hover") && !widget.contains(document.activeElement)) {
          setExpanded(false);
        }
      }, LEAVE_COLLAPSE_MS);
    }

    function openWidget() {
      window.clearTimeout(leaveTimer);
      setExpanded(true);
    }

    widget.addEventListener("mouseenter", openWidget);
    widget.addEventListener("mouseleave", scheduleCollapse);

    widget.addEventListener("focusin", openWidget);
    widget.addEventListener("focusout", scheduleCollapse);

    toggle.addEventListener("click", () => {
      const expanded = widget.classList.contains("is-expanded");
      setExpanded(!expanded);

      if (!expanded) {
        window.clearTimeout(autoTimer);
      }
    });

    // Start open on every page, then collapse after 15 seconds.
    setExpanded(true);
    startAutoCollapse();
  });
})();
