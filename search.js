(() => {
  const queryParameters = new URLSearchParams(window.location.search);
  const rawQuery = String(queryParameters.get("q") || "").trim().slice(0, 100);
  const globalInputs = [...document.querySelectorAll("[data-global-search-input]")];

  const titleTarget = document.querySelector("#search-results-title");
  const statusTarget = document.querySelector("#search-results-status");
  const resultsTarget = document.querySelector("#global-search-results");
  const startPanel = document.querySelector("#search-start-panel");
  const emptyPanel = document.querySelector("#search-empty-panel");
  const filterButtons = [...document.querySelectorAll("[data-search-filter]")];

  const countTargets = {
    all: document.querySelector("#search-count-all"),
    article: document.querySelector("#search-count-article"),
    guide: document.querySelector("#search-count-guide"),
    machine: document.querySelector("#search-count-machine"),
    community: document.querySelector("#search-count-community")
  };

  let activeFilter = "all";
  let allItems = [];
  let matchedItems = [];
  let communityUnavailable = false;

  globalInputs.forEach((input) => {
    input.value = rawQuery;
  });

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.+#-]+/g, " ")
      .trim();
  }

  function tokens(value) {
    return [...new Set(normalize(value).split(/\s+/).filter(Boolean))];
  }

  function readableDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function textForItem(item) {
    return normalize([
      item.title,
      item.description,
      item.category,
      item.keywords,
      item.author_name,
      item.status,
      item.group
    ].join(" "));
  }

  function scoreItem(item, query) {
    const normalizedQuery = normalize(query);
    const queryTokens = tokens(query);
    const title = normalize(item.title);
    const description = normalize(item.description);
    const category = normalize(item.category);
    const searchable = textForItem(item);

    if (!normalizedQuery || !queryTokens.length) return 0;

    const allTokensMatch = queryTokens.every((token) => searchable.includes(token));
    if (!allTokensMatch) return 0;

    let score = 10;

    if (title === normalizedQuery) score += 140;
    if (title.includes(normalizedQuery)) score += 80;
    if (description.includes(normalizedQuery)) score += 35;
    if (category.includes(normalizedQuery)) score += 22;

    queryTokens.forEach((token) => {
      if (title.startsWith(token)) score += 24;
      else if (title.includes(token)) score += 18;

      if (category.includes(token)) score += 9;
      if (description.includes(token)) score += 6;
    });

    if (item.type === "machine" && item.supported) score += 4;

    return score;
  }

  function staticMachineItems() {
    return (window.PLASMA_MACHINE_PROFILES || []).map((profile) => {
      const status = !profile.supported
        ? "Coming soon"
        : profile.referenceOnly
          ? "Reference profile"
          : "Available profile";

      return {
        type: "machine",
        title: profile.label.replace(/\s+—\s+chart coming soon$/i, ""),
        description: profile.help,
        url: `/?profile=${encodeURIComponent(profile.id)}#calculator`,
        category: `${profile.group} • ${profile.defaultMaxAmps} A`,
        keywords: [
          profile.id,
          profile.group,
          profile.label,
          profile.defaultMaxAmps,
          profile.help,
          status
        ].join(" "),
        status,
        supported: Boolean(profile.supported),
        referenceOnly: Boolean(profile.referenceOnly)
      };
    });
  }

  async function loadStaticIndex() {
    const response = await fetch("/search-index.json?v=1", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Search index request failed with ${response.status}.`);
    }

    const payload = await response.json();
    return Array.isArray(payload.items) ? payload.items : [];
  }

  async function loadCommunityItems() {
    const config = window.PLASMA_FEEDBACK_CONFIG || {};
    const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
    const publishableKey = String(config.supabasePublishableKey || "");

    const configured =
      projectUrl.startsWith("https://") &&
      !projectUrl.includes("YOUR-PROJECT") &&
      publishableKey.length > 20 &&
      !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

    if (!configured) {
      communityUnavailable = true;
      return [];
    }

    const response = await fetch(
      `${projectUrl}/rest/v1/rpc/get_community_questions`,
      {
        method: "POST",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${publishableKey}`,
          "Content-Type": "application/json"
        },
        body: "{}"
      }
    );

    if (!response.ok) {
      communityUnavailable = true;
      throw new Error(`Community search request failed with ${response.status}.`);
    }

    const rows = await response.json();

    return (Array.isArray(rows) ? rows : []).map((question) => ({
      type: "community",
      title: question.title,
      description: question.body,
      url: `/community/?question=${encodeURIComponent(question.id)}`,
      category: `${question.status || "open"} discussion`,
      keywords: [
        question.title,
        question.body,
        question.author_name,
        question.status
      ].join(" "),
      author_name: question.author_name,
      answer_count: Number(question.answer_count || 0),
      date: question.created_at,
      status: question.status
    }));
  }

  function itemTypeLabel(item) {
    switch (item.type) {
      case "article":
        return "Article";
      case "guide":
        return "Guide";
      case "machine":
        return "Machine Profile";
      case "community":
        return "Community Discussion";
      default:
        return "Resource";
    }
  }

  function itemMeta(item) {
    if (item.type === "article") {
      return [item.category, readableDate(item.date), item.reading_time]
        .filter(Boolean)
        .join(" • ");
    }

    if (item.type === "guide") {
      return item.category || "Guide";
    }

    if (item.type === "machine") {
      return [item.category, item.status].filter(Boolean).join(" • ");
    }

    if (item.type === "community") {
      const answers = `${item.answer_count || 0} ${
        Number(item.answer_count || 0) === 1 ? "answer" : "answers"
      }`;

      return [
        item.author_name ? `Asked by ${item.author_name}` : "",
        readableDate(item.date),
        answers
      ].filter(Boolean).join(" • ");
    }

    return item.category || "";
  }

  function createResultCard(item) {
    const article = document.createElement("article");
    article.className = `global-search-card search-type-${item.type}`;

    const link = document.createElement("a");
    link.href = item.url;

    const topLine = document.createElement("div");
    topLine.className = "global-search-card-topline";

    const type = document.createElement("span");
    type.className = "global-search-type";
    type.textContent = itemTypeLabel(item);

    topLine.append(type);

    if (item.type === "machine") {
      const status = document.createElement("span");
      status.className = `global-search-machine-status ${
        item.supported ? (item.referenceOnly ? "reference" : "available") : "coming"
      }`;
      status.textContent = item.status;
      topLine.append(status);
    }

    const heading = document.createElement("h3");
    heading.textContent = item.title;

    const description = document.createElement("p");
    description.textContent =
      item.description.length > 310
        ? `${item.description.slice(0, 310).trim()}…`
        : item.description;

    const footer = document.createElement("div");
    footer.className = "global-search-card-footer";

    const meta = document.createElement("span");
    meta.textContent = itemMeta(item);

    const action = document.createElement("strong");
    action.textContent =
      item.type === "machine"
        ? item.supported
          ? "Open profile →"
          : "View calculator listing →"
        : item.type === "community"
          ? "Open discussion →"
          : "Open resource →";

    footer.append(meta, action);
    link.append(topLine, heading, description, footer);
    article.append(link);

    return article;
  }

  function updateCounts() {
    const counts = {
      all: matchedItems.length,
      article: matchedItems.filter((item) => item.type === "article").length,
      guide: matchedItems.filter((item) => item.type === "guide").length,
      machine: matchedItems.filter((item) => item.type === "machine").length,
      community: matchedItems.filter((item) => item.type === "community").length
    };

    Object.entries(counts).forEach(([key, value]) => {
      if (countTargets[key]) countTargets[key].textContent = String(value);
    });
  }

  function renderResults() {
    const visibleItems =
      activeFilter === "all"
        ? matchedItems
        : matchedItems.filter((item) => item.type === activeFilter);

    resultsTarget.replaceChildren();

    visibleItems.forEach((item) => {
      resultsTarget.append(createResultCard(item));
    });

    emptyPanel.hidden = visibleItems.length !== 0;

    const unavailableText = communityUnavailable
      ? " Community discussions could not be reached during this search."
      : "";

    statusTarget.textContent =
      `${visibleItems.length} ${
        visibleItems.length === 1 ? "result" : "results"
      } shown.${unavailableText}`;
  }

  function searchItems() {
    const query = rawQuery;

    matchedItems = allItems
      .map((item) => ({
        ...item,
        searchScore: scoreItem(item, query)
      }))
      .filter((item) => item.searchScore > 0)
      .sort((first, second) => {
        if (second.searchScore !== first.searchScore) {
          return second.searchScore - first.searchScore;
        }

        return String(first.title).localeCompare(String(second.title));
      });

    updateCounts();
    renderResults();
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.searchFilter || "all";

      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });

      renderResults();
    });
  });

  async function initialize() {
    if (!rawQuery) {
      startPanel.hidden = false;
      emptyPanel.hidden = true;
      return;
    }

    startPanel.hidden = true;
    titleTarget.textContent = `Results for “${rawQuery}”`;
    statusTarget.textContent = "Searching articles, guides, machines, and Community discussions…";

    const [staticResult, communityResult] = await Promise.allSettled([
      loadStaticIndex(),
      loadCommunityItems()
    ]);

    const staticItems =
      staticResult.status === "fulfilled" ? staticResult.value : [];

    if (staticResult.status === "rejected") {
      console.error(staticResult.reason);
    }

    const communityItems =
      communityResult.status === "fulfilled" ? communityResult.value : [];

    if (communityResult.status === "rejected") {
      console.error(communityResult.reason);
      communityUnavailable = true;
    }

    allItems = [
      ...staticItems,
      ...staticMachineItems(),
      ...communityItems
    ];

    searchItems();
  }

  initialize();
})();
