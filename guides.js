const guideCards = [...document.querySelectorAll("[data-guide-card]")];
const searchForm = document.querySelector("#guides-search-form");
const searchInput = document.querySelector("#guides-search-input");
const filterButtons = [...document.querySelectorAll("[data-filter]")];
const resultCount = document.querySelector("#guides-result-count");
const noResults = document.querySelector("#guides-no-results");

let activeFilter = "all";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function categoryMatches(cardCategory, filter) {
  if (filter === "all") return true;

  const category = normalize(cardCategory);

  if (filter === "beginner") {
    return category.includes("beginner") || category.includes("getting started");
  }

  if (filter === "air") {
    return (
      category.includes("air") ||
      category.includes("consumable") ||
      category.includes("gas")
    );
  }

  if (filter === "testing") {
    return (
      category.includes("testing") ||
      category.includes("calibration") ||
      category.includes("cut chart")
    );
  }

  if (filter === "quality") {
    return (
      category.includes("quality") ||
      category.includes("troubleshooting") ||
      category.includes("dross") ||
      category.includes("bevel")
    );
  }

  return category.includes(filter);
}

function updateGuides() {
  const query = normalize(searchInput.value);
  let visibleCount = 0;

  guideCards.forEach((card) => {
    const searchText = normalize(card.dataset.search);
    const category = normalize(card.dataset.category);

    const matchesSearch = !query || searchText.includes(query);
    const matchesCategory = categoryMatches(category, activeFilter);
    const visible = matchesSearch && matchesCategory;

    card.hidden = !visible;

    if (visible) visibleCount += 1;
  });

  resultCount.textContent =
    visibleCount === 1 ? "1 guide shown" : `${visibleCount} guides shown`;

  noResults.hidden = visibleCount !== 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    updateGuides();
  });
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  updateGuides();
});

searchInput.addEventListener("input", updateGuides);

updateGuides();
