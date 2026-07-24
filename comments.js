(() => {
  const section = document.querySelector(".comments-section");

  if (!section) {
    return;
  }

  const form = document.querySelector("#comment-form");
  const message = document.querySelector("#comment-form-message");
  const commentsList = document.querySelector("#comments-list");
  const commentCount = document.querySelector("#comment-count");
  const submitButton = form?.querySelector('button[type="submit"]');
  const postSlug = section.dataset.postSlug;
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");

  const configured =
    projectUrl.startsWith("https://") &&
    !projectUrl.includes("YOUR-PROJECT") &&
    publishableKey.length > 20 &&
    !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

  function apiHeaders(includeJson = false) {
    const headers = {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`
    };

    if (includeJson) {
      headers["Content-Type"] = "application/json";
    }

    return headers;
  }

  function formatCommentCount(count) {
    return `${count.toLocaleString()} ${count === 1 ? "comment" : "comments"}`;
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function createCommentCard(comment) {
    const article = document.createElement("article");
    article.className = "comment-card";

    const header = document.createElement("header");
    header.className = "comment-card-header";

    const name = document.createElement("strong");
    name.textContent = comment.name;

    const time = document.createElement("time");
    time.dateTime = comment.created_at;
    time.textContent = formatDate(comment.created_at);

    const body = document.createElement("p");
    body.textContent = comment.comment;

    header.append(name, time);
    article.append(header, body);

    return article;
  }

  function renderComments(comments) {
    commentsList.replaceChildren();
    commentCount.textContent = formatCommentCount(comments.length);

    if (comments.length === 0) {
      const empty = document.createElement("p");
      empty.className = "comments-empty";
      empty.textContent =
        "No published comments yet. Be the first to join the discussion.";
      commentsList.appendChild(empty);
      return;
    }

    comments.forEach((comment) => {
      commentsList.appendChild(createCommentCard(comment));
    });
  }

  async function loadComments() {
    if (!configured) {
      commentsList.innerHTML =
        '<p class="comments-error">Comments are not connected yet. Check supabase-config.js.</p>';
      return;
    }

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/rpc/get_approved_blog_comments`,
        {
          method: "POST",
          headers: apiHeaders(true),
          body: JSON.stringify({
            p_post_slug: postSlug
          })
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Could not load comments: ${response.status} ${details}`
        );
      }

      const comments = await response.json();
      renderComments(Array.isArray(comments) ? comments : []);
    } catch (error) {
      console.error(error);
      commentsList.innerHTML =
        '<p class="comments-error">Comments could not be loaded right now.</p>';
    }
  }

  async function submitComment(event) {
    event.preventDefault();

    if (!configured) {
      message.textContent =
        "Comments are not connected yet. Check supabase-config.js.";
      message.className = "comment-form-message error";
      return;
    }

    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const comment = String(data.get("comment") || "").trim();

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";
    message.textContent = "";

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/rpc/submit_blog_comment`,
        {
          method: "POST",
          headers: apiHeaders(true),
          body: JSON.stringify({
            p_post_slug: postSlug,
            p_name: name,
            p_email: email,
            p_comment: comment
          })
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(
          `Could not submit comment: ${response.status} ${details}`
        );
      }

      form.reset();
      message.textContent =
        "Thank you. Your comment was submitted and is awaiting approval.";
      message.className = "comment-form-message success";
    } catch (error) {
      console.error(error);
      message.textContent =
        "Your comment could not be submitted. Please check the fields and try again.";
      message.className = "comment-form-message error";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Submit comment";
    }
  }

  form?.addEventListener("submit", submitComment);
  loadComments();
})();
