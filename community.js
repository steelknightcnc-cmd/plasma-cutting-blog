(() => {
  const cfg = window.PLASMA_FEEDBACK_CONFIG || {};
  const url = String(cfg.supabaseUrl || "").replace(/\/+$/, "");
  const key = String(cfg.supabasePublishableKey || "");

  if (!window.supabase || !url || !key) {
    console.error("Community Supabase configuration is missing.");
    return;
  }

  const db = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const $ = (selector) => document.querySelector(selector);
  const state = { session: null, profile: null, questions: [], current: null, reportType: null, reportId: null };

  const el = {
    login: $("#community-login-form"), email: $("#community-email"), authMsg: $("#auth-message"),
    authTitle: $("#auth-title"), authDescription: $("#auth-description"),
    userPanel: $("#community-user-panel"), signedEmail: $("#signed-in-email"), signOut: $("#sign-out-button"),
    profileCard: $("#profile-card"), profileForm: $("#profile-form"), displayName: $("#display-name"), profileMsg: $("#profile-message"),
    askCard: $("#ask-question-card"), toggleQuestion: $("#toggle-question-form"), questionForm: $("#question-form"),
    questionTitle: $("#question-title"), questionBody: $("#question-body"), questionWarning: $("#question-wording-warning"),
    questionMsg: $("#question-message"), search: $("#community-search-input"), list: $("#question-list"),
    detail: $("#question-detail"), back: $("#back-to-questions"), detailStatus: $("#detail-status"),
    detailTitle: $("#detail-title"), detailMeta: $("#detail-meta"), detailBody: $("#detail-body"),
    reportQuestion: $("#report-question"), answerCount: $("#answer-count"), answerList: $("#answer-list"),
    answerCard: $("#answer-form-card"), answerForm: $("#answer-form"), answerBody: $("#answer-body"),
    answerWarning: $("#answer-wording-warning"), answerMsg: $("#answer-message"),
    reportModal: $("#report-modal"), reportForm: $("#report-form"), reportMsg: $("#report-message")
  };

  const blocked = ["fuck","fucking","shit","bullshit","bitch","asshole","cunt","motherfucker","dickhead"];

  function flagged(text) {
    const normalized = String(text || "").toLowerCase()
      .replace(/[@4]/g,"a").replace(/[!1|]/g,"i").replace(/0/g,"o")
      .replace(/3/g,"e").replace(/[$5]/g,"s");
    return blocked.some((term) => new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, "i").test(normalized));
  }

  function setMessage(node, text, type = "") {
    if (!node) return;
    node.textContent = text;
    node.className = `community-form-message ${type}`.trim();
  }

  function dateText(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" :
      new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(date);
  }

  function plural(count, word) {
    return `${Number(count).toLocaleString()} ${Number(count) === 1 ? word : `${word}s`}`;
  }

  function updateAuth() {
    const signed = Boolean(state.session?.user);
    el.login.hidden = signed;
    el.userPanel.hidden = !signed;
    el.profileCard.hidden = !signed || Boolean(state.profile?.display_name);
    el.askCard.hidden = !signed || !state.profile?.display_name;
    el.answerCard.hidden = !signed || !state.profile?.display_name || !state.current || state.current.status !== "open";
    el.reportQuestion.hidden = !signed || !state.current;

    if (signed) {
      el.signedEmail.textContent = state.session.user.email || "Member";
      el.authTitle.textContent = "You are signed in";
      el.authDescription.textContent = state.profile?.display_name
        ? `Participating as ${state.profile.display_name}.`
        : "Choose a public display name before posting.";
    } else {
      el.authTitle.textContent = "Sign in to participate";
      el.authDescription.textContent = "Reading is public. Sign in with a one-time email link to ask questions, answer members, and report content.";
    }
  }

  async function loadProfile() {
    state.profile = null;
    if (!state.session?.user) return updateAuth();

    const { data, error } = await db.from("community_profiles")
      .select("display_name").eq("user_id", state.session.user.id).maybeSingle();

    if (error) console.error(error);
    state.profile = data || null;
    if (data?.display_name) el.displayName.value = data.display_name;
    updateAuth();
  }

  async function sendLink(event) {
    event.preventDefault();
    setMessage(el.authMsg, "Sending sign-in link…");
    const redirect = `${window.location.origin}/community/`;
    const { error } = await db.auth.signInWithOtp({
      email: el.email.value.trim(),
      options: { emailRedirectTo: redirect }
    });
    if (error) return setMessage(el.authMsg, error.message, "error");
    el.login.reset();
    setMessage(el.authMsg, "Check your email and open the one-time sign-in link.", "success");
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage(el.profileMsg, "Saving display name…");
    const { data, error } = await db.rpc("set_community_display_name", {
      p_display_name: el.displayName.value.trim()
    });
    if (error) return setMessage(el.profileMsg, error.message, "error");
    state.profile = { display_name: data };
    setMessage(el.profileMsg, "Display name saved.", "success");
    updateAuth();
  }

  async function loadQuestions() {
    const { data, error } = await db.rpc("get_community_questions");
    if (error) {
      console.error(error);
      el.list.innerHTML = '<p class="comments-error">Community questions could not be loaded.</p>';
      return;
    }
    state.questions = Array.isArray(data) ? data : [];
    renderQuestions();

    const requested = new URLSearchParams(location.search).get("question");
    if (requested) openQuestion(requested, false);
  }

  function renderQuestions() {
    const search = el.search.value.trim().toLowerCase();
    const rows = state.questions.filter((q) =>
      q.title.toLowerCase().includes(search) ||
      q.body.toLowerCase().includes(search) ||
      q.author_name.toLowerCase().includes(search)
    );

    el.list.replaceChildren();
    if (!rows.length) {
      const p = document.createElement("p");
      p.className = "comments-empty";
      p.textContent = search ? "No questions match that search." : "No community questions yet. Sign in and ask the first one.";
      el.list.append(p);
      return;
    }

    rows.forEach((q) => {
      const article = document.createElement("article");
      article.className = "question-card";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "question-card-button";

      const top = document.createElement("div");
      top.className = "question-card-topline";
      const status = document.createElement("span");
      status.className = `question-status ${q.status}`;
      status.textContent = q.status;
      const time = document.createElement("span");
      time.textContent = dateText(q.created_at);
      top.append(status, time);

      const title = document.createElement("h3");
      title.textContent = q.title;
      const body = document.createElement("p");
      body.textContent = q.body.length > 260 ? `${q.body.slice(0,260)}…` : q.body;

      const meta = document.createElement("div");
      meta.className = "question-card-meta";
      const author = document.createElement("span");
      author.textContent = `Asked by ${q.author_name}`;
      const count = document.createElement("strong");
      count.textContent = plural(q.answer_count || 0, "answer");
      meta.append(author, count);

      button.append(top, title, body, meta);
      button.addEventListener("click", () => openQuestion(q.id));
      article.append(button);
      el.list.append(article);
    });
  }

  async function postQuestion(event) {
    event.preventDefault();
    const title = el.questionTitle.value.trim();
    const body = el.questionBody.value.trim();
    const hasFlag = flagged(`${title} ${body}`);
    el.questionWarning.hidden = !hasFlag;
    if (hasFlag) return setMessage(el.questionMsg, "Please rewrite the question respectfully before posting.", "error");

    setMessage(el.questionMsg, "Posting question…");
    const { data, error } = await db.rpc("submit_community_question", { p_title: title, p_body: body });
    if (error) {
      const wording = /wording|vulgar|abusive/i.test(error.message);
      el.questionWarning.hidden = !wording;
      return setMessage(el.questionMsg, wording ? "Please reconsider the wording before posting." : error.message, "error");
    }

    el.questionForm.reset();
    el.questionForm.hidden = true;
    el.questionWarning.hidden = true;
    setMessage(el.questionMsg, "Question posted.", "success");
    await loadQuestions();
    await openQuestion(data);
  }

  async function openQuestion(id, updateUrl = true) {
    const { data, error } = await db.rpc("get_community_question", { p_question_id: id });
    if (error || !data?.length) return console.error(error || "Question not found");

    state.current = data[0];
    el.list.hidden = true;
    el.detail.hidden = false;
    el.detailStatus.className = `question-status ${state.current.status}`;
    el.detailStatus.textContent = state.current.status;
    el.detailTitle.textContent = state.current.title;
    el.detailMeta.textContent = `Asked by ${state.current.author_name} on ${dateText(state.current.created_at)}`;
    el.detailBody.textContent = state.current.body;

    if (updateUrl) {
      const currentUrl = new URL(location.href);
      currentUrl.searchParams.set("question", id);
      history.pushState({}, "", currentUrl);
    }

    updateAuth();
    await loadAnswers(id);
    el.detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeQuestion() {
    state.current = null;
    el.detail.hidden = true;
    el.list.hidden = false;
    const currentUrl = new URL(location.href);
    currentUrl.searchParams.delete("question");
    history.pushState({}, "", currentUrl);
    updateAuth();
  }

  async function loadAnswers(id) {
    el.answerList.innerHTML = '<p class="comments-loading">Loading answers…</p>';
    const { data, error } = await db.rpc("get_community_answers", { p_question_id: id });
    if (error) {
      console.error(error);
      el.answerList.innerHTML = '<p class="comments-error">Answers could not be loaded.</p>';
      return;
    }

    const answers = Array.isArray(data) ? data : [];
    el.answerCount.textContent = plural(answers.length, "answer");
    el.answerList.replaceChildren();

    if (!answers.length) {
      const p = document.createElement("p");
      p.className = "comments-empty";
      p.textContent = "No answers yet. Sign in and share what you know.";
      el.answerList.append(p);
      return;
    }

    answers.forEach((a) => {
      const article = document.createElement("article");
      article.className = "community-answer-card";
      const header = document.createElement("header");
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = a.author_name;
      const time = document.createElement("time");
      time.textContent = dateText(a.created_at);
      info.append(name, time);
      header.append(info);

      if (state.session?.user) {
        const report = document.createElement("button");
        report.type = "button";
        report.className = "text-button";
        report.textContent = "Report";
        report.addEventListener("click", () => openReport("answer", a.id));
        header.append(report);
      }

      const body = document.createElement("p");
      body.textContent = a.body;
      article.append(header, body);
      el.answerList.append(article);
    });
  }

  async function postAnswer(event) {
    event.preventDefault();
    const body = el.answerBody.value.trim();
    const hasFlag = flagged(body);
    el.answerWarning.hidden = !hasFlag;
    if (hasFlag) return setMessage(el.answerMsg, "Please rewrite the answer respectfully before posting.", "error");

    setMessage(el.answerMsg, "Posting answer…");
    const { error } = await db.rpc("submit_community_answer", {
      p_question_id: state.current.id, p_body: body
    });
    if (error) {
      const wording = /wording|vulgar|abusive/i.test(error.message);
      el.answerWarning.hidden = !wording;
      return setMessage(el.answerMsg, wording ? "Please reconsider the wording before posting." : error.message, "error");
    }

    el.answerForm.reset();
    el.answerWarning.hidden = true;
    setMessage(el.answerMsg, "Answer posted.", "success");
    await loadAnswers(state.current.id);
    await loadQuestions();
  }

  function openReport(type, id) {
    state.reportType = type;
    state.reportId = id;
    el.reportForm.reset();
    setMessage(el.reportMsg, "");
    el.reportModal.showModal();
  }

  async function submitReport(event) {
    event.preventDefault();
    const form = new FormData(el.reportForm);
    setMessage(el.reportMsg, "Submitting report…");
    const { error } = await db.rpc("submit_community_report", {
      p_target_type: state.reportType,
      p_target_id: state.reportId,
      p_reason: String(form.get("reason") || ""),
      p_details: String(form.get("details") || "")
    });
    if (error) return setMessage(el.reportMsg, error.message, "error");
    setMessage(el.reportMsg, "Report submitted. Thank you.", "success");
    setTimeout(() => el.reportModal.close(), 900);
  }

  el.login?.addEventListener("submit", sendLink);
  el.signOut?.addEventListener("click", () => db.auth.signOut());
  el.profileForm?.addEventListener("submit", saveProfile);
  el.toggleQuestion?.addEventListener("click", () => { el.questionForm.hidden = !el.questionForm.hidden; });
  el.questionForm?.addEventListener("submit", postQuestion);
  el.search?.addEventListener("input", renderQuestions);
  el.back?.addEventListener("click", closeQuestion);
  el.answerForm?.addEventListener("submit", postAnswer);
  el.reportQuestion?.addEventListener("click", () => state.current && openReport("question", state.current.id));
  el.reportForm?.addEventListener("submit", submitReport);

  [el.questionTitle, el.questionBody].forEach((node) => node?.addEventListener("input", () => {
    el.questionWarning.hidden = !flagged(`${el.questionTitle.value} ${el.questionBody.value}`);
  }));
  el.answerBody?.addEventListener("input", () => {
    el.answerWarning.hidden = !flagged(el.answerBody.value);
  });

  db.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    loadProfile();
  });

  (async () => {
    const { data } = await db.auth.getSession();
    state.session = data.session;
    await loadProfile();
    await loadQuestions();
  })();
})();
