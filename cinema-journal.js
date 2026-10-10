document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://scseelymkhpmclrcetiz.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_p2FjF7oNh9mbzqCtc8Ii4w_cFwVy6Uy";
  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;

  const categories = {
    want: { label: "Хочу посмотреть", icon: "✧", emptyTitle: "Список ждёт первую историю", emptyText: "Сохрани фильм, который давно откладываешь на потом." },
    watching: { label: "Смотрю", icon: "◷", emptyTitle: "Пока ничего не смотрится", emptyText: "Добавь фильм или сериал, который смотришь сейчас." },
    favorites: { label: "Любимые фильмы", icon: "♡", emptyTitle: "Твои любимые ещё впереди", emptyText: "Собери истории, к которым хочется возвращаться." },
    together: { label: "Посмотреть вместе", icon: "☾", emptyTitle: "Планируем следующий вечер?", emptyText: "Добавь фильмы, которые хочется посмотреть с друзьями." }
  };
  let currentUser = null;
  let entries = [];
  let friends = [];
  let activeCategory = "want";
  let editingId = null;
  let shareMode = "list";
  let shareFilm = null;
  let isLoading = false;

  const $ = (id) => document.getElementById(id);
  const gate = $("journalGate");
  const content = $("journalContent");
  const grid = $("journalGrid");
  const loading = $("journalLoading");
  const empty = $("journalEmpty");
  const notice = $("journalNotice");
  const entryModal = $("entryModal");
  const shareModal = $("shareModal");
  const entryForm = $("entryForm");
  const shareSelect = $("shareFriendSelect");
  const sendButton = $("sendShareButton");

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function httpUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
    } catch (_error) {
      return "";
    }
  }

  function showNotice(message, isError = false) {
    notice.textContent = message || "";
    notice.classList.toggle("is-error", Boolean(isError));
  }

  function openModal(modal) {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("journal-modal-open");
  }

  function closeModal(modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".journal-modal:not([hidden])")) {
      document.body.classList.remove("journal-modal-open");
    }
  }

  function visibleEntries() {
    const query = $("journalSearch").value.trim().toLocaleLowerCase("ru-RU");
    return entries.filter((entry) => {
      if (entry.category !== activeCategory) return false;
      if (!query) return true;
      return [entry.title, entry.year, entry.note, entry.kind === "series" ? "сериал" : "фильм"]
        .filter(Boolean).join(" ").toLocaleLowerCase("ru-RU").includes(query);
    });
  }

  function renderStats() {
    const count = (category) => entries.filter((entry) => entry.category === category).length;
    $("statTotal").textContent = String(entries.length);
    $("statWant").textContent = String(count("want"));
    $("statFavorites").textContent = String(count("favorites"));
    $("countWant").textContent = String(count("want"));
    $("countWatching").textContent = String(count("watching"));
    $("countFavorites").textContent = String(count("favorites"));
    $("countTogether").textContent = String(count("together"));
  }

  function renderCards() {
    grid.innerHTML = "";
    const list = visibleEntries();
    $("visibleCount").textContent = list.length + (list.length === 1 ? " история" : list.length >= 2 && list.length <= 4 ? " истории" : " историй");
    list.forEach((entry) => {
      const card = document.createElement("article");
      card.className = "journal-card";
      const poster = httpUrl(entry.poster_url);
      const watchUrl = httpUrl(entry.watch_url);
      const years = entry.year ? String(entry.year) : "";
      const kind = entry.kind === "series" ? "Сериал" : "Фильм";
      const categoriesOptions = Object.entries(categories).map(([value, item]) =>
        '<option value="' + value + '"' + (value === entry.category ? " selected" : "") + '>' + escapeHtml(item.label) + "</option>"
      ).join("");
      card.innerHTML =
        '<div class="journal-card-visual">' +
          (poster
            ? '<img class="journal-card-poster" src="' + escapeHtml(poster) + '" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="journal-card-chip">' + escapeHtml(kind) + '</span>'
            : '<span class="journal-card-symbol">' + escapeHtml(categories[entry.category]?.icon || "☾") + '</span><span class="journal-card-chip">' + escapeHtml(kind) + '</span>') +
        '</div><div class="journal-card-body">' +
          '<div class="journal-card-meta">' + escapeHtml(kind) + (years ? '<span class="dot">·</span>' + escapeHtml(years) : "") + '</div>' +
          '<h3 class="journal-card-title">' + escapeHtml(entry.title) + '</h3>' +
          '<p class="journal-card-note">' + escapeHtml(entry.note || "") + '</p>' +
          (watchUrl ? '<a class="journal-card-link" href="' + escapeHtml(watchUrl) + '" target="_blank" rel="noopener noreferrer">Ссылка для просмотра ↗</a>' : "") +
          '<div class="journal-card-bottom">' +
            '<select class="journal-card-move" aria-label="Переместить «' + escapeHtml(entry.title) + '»" data-move-id="' + escapeHtml(entry.id) + '">' + categoriesOptions + '</select>' +
            '<div class="journal-card-actions">' +
              '<button type="button" data-card-action="invite" data-entry-id="' + escapeHtml(entry.id) + '">Позвать друга</button>' +
              '<button type="button" data-card-action="edit" data-entry-id="' + escapeHtml(entry.id) + '">Изменить</button>' +
              '<button type="button" class="delete-entry" data-card-action="delete" data-entry-id="' + escapeHtml(entry.id) + '" aria-label="Удалить ' + escapeHtml(entry.title) + '">×</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      const posterImage = card.querySelector(".journal-card-poster");
      if (posterImage) {
        posterImage.addEventListener("error", () => {
          const visual = posterImage.parentElement;
          posterImage.remove();
          const mark = document.createElement("span");
          mark.className = "journal-card-symbol";
          mark.textContent = categories[entry.category]?.icon || "☾";
          visual.prepend(mark);
        }, { once: true });
      }
      grid.appendChild(card);
    });
    const hasItems = list.length > 0;
    empty.hidden = hasItems || isLoading;
    grid.hidden = !hasItems;
    if (!hasItems && !isLoading) {
      $("emptyTitle").textContent = categories[activeCategory].emptyTitle;
      $("emptyDescription").textContent = categories[activeCategory].emptyText;
    }
    $("shareListButton").disabled = entries.filter((entry) => entry.category === activeCategory).length === 0;
  }

  function render() {
    renderStats();
    renderCards();
    document.querySelectorAll(".journal-tab").forEach((tab) => {
      const active = tab.dataset.category === activeCategory;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  async function loadEntries() {
    if (!supabase || !currentUser) return;
    isLoading = true;
    loading.hidden = false;
    empty.hidden = true;
    grid.hidden = true;
    showNotice("");
    const { data, error } = await supabase.from("cinema_journal_entries")
      .select("id,user_id,title,year,kind,category,poster_url,watch_url,note,created_at,updated_at")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false })
      .limit(500);
    isLoading = false;
    loading.hidden = true;
    if (error) {
      console.error("LUNEVIA cinema journal load failed:", error);
      entries = [];
      render();
      showNotice("Не удалось загрузить кинодневник. Обнови страницу и попробуй ещё раз.", true);
      empty.hidden = true;
      grid.hidden = true;
      return;
    }
    entries = data || [];
    render();
  }

  function fillForm(entry) {
    $("entryTitle").value = entry?.title || "";
    $("entryYear").value = entry?.year || "";
    $("entryKind").value = entry?.kind || "film";
    $("entryCategory").value = entry?.category || activeCategory;
    $("entryPoster").value = entry?.poster_url || "";
    $("entryWatchUrl").value = entry?.watch_url || "";
    $("entryNote").value = entry?.note || "";
    $("entryFormError").textContent = "";
    $("entryModalTitle").textContent = entry ? "Изменить историю" : "Добавить в кинодневник";
    $("saveEntryButton").innerHTML = entry ? "Сохранить изменения <span>✦</span>" : "Сохранить <span>✦</span>";
    editingId = entry?.id || null;
    openModal(entryModal);
    window.setTimeout(() => $("entryTitle").focus(), 30);
  }

  function closeEntryModal() {
    closeModal(entryModal);
    entryForm.reset();
    editingId = null;
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!supabase || !currentUser || currentUser.is_anonymous) {
      $("entryFormError").textContent = "Войди в обычный аккаунт, чтобы сохранять фильмы.";
      return;
    }
    const title = $("entryTitle").value.trim();
    if (!title) {
      $("entryFormError").textContent = "Напиши название фильма или сериала.";
      $("entryTitle").focus();
      return;
    }
    const posterRaw = $("entryPoster").value.trim();
    const watchRaw = $("entryWatchUrl").value.trim();
    const posterUrl = httpUrl(posterRaw);
    const watchUrl = httpUrl(watchRaw);
    if (posterRaw && !posterUrl) {
      $("entryFormError").textContent = "Ссылка на постер должна начинаться с http:// или https://.";
      return;
    }
    if (watchRaw && !watchUrl) {
      $("entryFormError").textContent = "Ссылка на просмотр должна начинаться с http:// или https://.";
      return;
    }
    const yearRaw = $("entryYear").value.trim();
    const year = yearRaw ? Number(yearRaw) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1888 || year > 2200)) {
      $("entryFormError").textContent = "Проверь год выпуска.";
      return;
    }
    const payload = {
      user_id: currentUser.id,
      title: title.slice(0, 160),
      year,
      kind: $("entryKind").value === "series" ? "series" : "film",
      category: categories[$("entryCategory").value] ? $("entryCategory").value : "want",
      poster_url: posterUrl || null,
      watch_url: watchUrl || null,
      note: $("entryNote").value.trim().slice(0, 1000) || null,
      updated_at: new Date().toISOString()
    };
    const save = $("saveEntryButton");
    save.disabled = true;
    save.textContent = "Сохраняем…";
    $("entryFormError").textContent = "";
    let result;
    if (editingId) {
      result = await supabase.from("cinema_journal_entries").update(payload)
        .eq("id", editingId).eq("user_id", currentUser.id).select("id").maybeSingle();
    } else {
      result = await supabase.from("cinema_journal_entries").insert(payload).select("id").maybeSingle();
    }
    save.disabled = false;
    save.innerHTML = editingId ? "Сохранить изменения <span>✦</span>" : "Сохранить <span>✦</span>";
    if (result.error || !result.data) {
      console.error("LUNEVIA cinema journal save failed:", result.error);
      $("entryFormError").textContent = "Не удалось сохранить. Проверь соединение и попробуй ещё раз.";
      return;
    }
    closeEntryModal();
    activeCategory = payload.category;
    $("journalSearch").value = "";
    await loadEntries();
    showNotice(editingId ? "Изменения сохранены ✦" : "Добавлено в твою коллекцию ✦");
  }

  async function moveEntry(entryId, nextCategory) {
    if (!categories[nextCategory]) return;
    const entry = entries.find((item) => item.id === entryId);
    if (!entry || entry.category === nextCategory) return;
    const { error } = await supabase.from("cinema_journal_entries")
      .update({ category: nextCategory, updated_at: new Date().toISOString() })
      .eq("id", entryId).eq("user_id", currentUser.id);
    if (error) {
      console.error("LUNEVIA cinema journal move failed:", error);
      showNotice("Не получилось переместить запись.", true);
      render();
      return;
    }
    activeCategory = nextCategory;
    await loadEntries();
    showNotice("Перемещено в «" + categories[nextCategory].label + "» ✦");
  }

  async function deleteEntry(entryId) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry || !window.confirm("Удалить «" + entry.title + "» из кинодневника?")) return;
    const { error } = await supabase.from("cinema_journal_entries").delete()
      .eq("id", entryId).eq("user_id", currentUser.id);
    if (error) {
      console.error("LUNEVIA cinema journal delete failed:", error);
      showNotice("Не получилось удалить запись.", true);
      return;
    }
    entries = entries.filter((item) => item.id !== entryId);
    render();
    showNotice("История удалена из кинодневника.");
  }

  async function loadFriends() {
    if (!supabase || !currentUser) return [];
    const { data: relations, error } = await supabase.from("friend_requests")
      .select("sender_id,receiver_id")
      .eq("status", "accepted")
      .or("sender_id.eq." + currentUser.id + ",receiver_id.eq." + currentUser.id);
    if (error) {
      console.error("LUNEVIA cinema journal friends failed:", error);
      throw new Error("Не получилось загрузить друзей.");
    }
    const friendIds = [...new Set((relations || []).map((row) => row.sender_id === currentUser.id ? row.receiver_id : row.sender_id))];
    if (!friendIds.length) return [];
    const { data: profiles, error: profileError } = await supabase.from("profiles")
      .select("id,display_name,avatar").in("id", friendIds);
    if (profileError) {
      console.error("LUNEVIA cinema journal friend profiles failed:", profileError);
      throw new Error("Не получилось загрузить профили друзей.");
    }
    return (profiles || []).map((profile) => ({
      id: profile.id,
      name: profile.display_name || "Лунный житель",
      avatar: profile.avatar || "☾"
    })).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  async function openShareModal(mode, entry = null) {
    shareMode = mode;
    shareFilm = entry;
    $("shareFormError").textContent = "";
    $("shareFriendsEmpty").hidden = true;
    $("shareSelect");
    $("shareModalTitle").textContent = mode === "film" ? "Позвать на просмотр" : "Поделиться подборкой";
    $("shareDescription").textContent = mode === "film"
      ? "Отправь другу приглашение на конкретный фильм — оно придёт в личные сообщения."
      : "Выбранный список будет отправлен сообщением. Остальные записи и весь твой профиль останутся приватными.";
    const preview = $("shareFilmPreview");
    if (mode === "film" && entry) {
      preview.hidden = false;
      preview.innerHTML = '<span class="preview-mark">☾</span><span><b>' + escapeHtml(entry.title) + '</b><small>' +
        escapeHtml(entry.year || (entry.kind === "series" ? "Сериал" : "Фильм")) + ' · LUNEVIA</small></span>';
    } else {
      preview.hidden = true;
      preview.innerHTML = "";
    }
    sendButton.disabled = true;
    sendButton.textContent = "Загружаем друзей…";
    shareSelect.innerHTML = '<option value="">Выбери друга…</option>';
    openModal(shareModal);
    try {
      friends = await loadFriends();
      friends.forEach((friend) => {
        const option = document.createElement("option");
        option.value = friend.id;
        option.textContent = friend.avatar + "  " + friend.name;
        shareSelect.appendChild(option);
      });
      $("shareFriendsEmpty").hidden = friends.length > 0;
      shareSelect.disabled = friends.length === 0;
      sendButton.disabled = friends.length === 0;
      sendButton.innerHTML = 'Отправить в сообщения <span>↗</span>';
    } catch (error) {
      $("shareFormError").textContent = error.message || "Не удалось загрузить друзей.";
      sendButton.disabled = true;
      sendButton.textContent = "Не удалось загрузить";
    }
  }

  function composeListMessage() {
    const listEntries = entries.filter((entry) => entry.category === activeCategory);
    if (!listEntries.length) return "";
    const lines = ["🌙 Моя подборка «" + categories[activeCategory].label + "» из LUNEVIA:", ""];
    listEntries.forEach((entry, index) => {
      const title = (index + 1) + ". " + entry.title + (entry.year ? " (" + entry.year + ")" : "");
      lines.push(title);
      if (entry.note) lines.push("   " + entry.note);
      const url = httpUrl(entry.watch_url);
      if (url) lines.push("   Смотреть: " + url);
    });
    lines.push("", "Подборка составлена в моём кинодневнике LUNEVIA ✦");
    let message = lines.join("\n");
    if (message.length > 1900) message = message.slice(0, 1850) + "\n… Остальные записи остались в моём кинодневнике.";
    return message;
  }

  function composeFilmInvite(entry) {
    const lines = ["🎬 Предлагаю посмотреть вместе: " + entry.title + (entry.year ? " (" + entry.year + ")" : "") + "."];
    if (entry.note) lines.push("", entry.note);
    const watchUrl = httpUrl(entry.watch_url);
    if (watchUrl) lines.push("", "Ссылка для просмотра: " + watchUrl);
    const homeUrl = new URL("index.html", window.location.href);
    homeUrl.searchParams.set("film", entry.title.slice(0, 26));
    homeUrl.searchParams.set("startRoom", "1");
    lines.push("", "Открой LUNEVIA, чтобы создать кинокомнату под этот фильм:", homeUrl.href);
    lines.push("", "Написано из моего кинодневника 🌙");
    return lines.join("\n").slice(0, 1900);
  }

  async function sendToFriend() {
    if (!supabase || !currentUser || currentUser.is_anonymous) {
      $("shareFormError").textContent = "Войди в обычный аккаунт, чтобы отправлять приглашения.";
      return;
    }
    const friendId = shareSelect.value;
    if (!friendId || !friends.some((friend) => friend.id === friendId)) {
      $("shareFormError").textContent = "Выбери друга из списка.";
      return;
    }
    const body = shareMode === "film" && shareFilm ? composeFilmInvite(shareFilm) : composeListMessage();
    if (!body) {
      $("shareFormError").textContent = "В этом списке пока нет фильмов.";
      return;
    }
    sendButton.disabled = true;
    sendButton.textContent = "Отправляем…";
    $("shareFormError").textContent = "";
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: currentUser.id,
      receiver_id: friendId,
      body
    });
    sendButton.disabled = false;
    sendButton.innerHTML = 'Отправить в сообщения <span>↗</span>';
    if (error) {
      console.error("LUNEVIA cinema journal share failed:", error);
      $("shareFormError").textContent = error.code === "42501"
        ? "Не удалось отправить. Проверь, что вы всё ещё друзья."
        : "Не получилось отправить сообщение. Попробуй ещё раз.";
      return;
    }
    closeModal(shareModal);
    showNotice(shareMode === "film" ? "Приглашение отправлено в личные сообщения ✦" : "Подборка отправлена в личные сообщения ✦");
  }

  function bindEvents() {
    document.querySelectorAll(".journal-tab").forEach((tab) => tab.addEventListener("click", () => {
      activeCategory = tab.dataset.category;
      $("journalSearch").value = "";
      showNotice("");
      render();
    }));
    $("journalSearch").addEventListener("input", renderCards);
    $("addEntryButton").addEventListener("click", () => fillForm(null));
    $("emptyAddButton").addEventListener("click", () => fillForm(null));
    $("shareListButton").addEventListener("click", () => openShareModal("list"));
    entryForm.addEventListener("submit", saveEntry);
    sendButton.addEventListener("click", sendToFriend);
    shareSelect.addEventListener("change", () => { if (shareSelect.value) $("shareFormError").textContent = ""; });

    document.addEventListener("click", (event) => {
      const closer = event.target.closest("[data-close-modal]");
      if (closer) {
        const modal = $(closer.dataset.closeModal);
        if (modal) closeModal(modal);
        return;
      }
      const button = event.target.closest("[data-card-action]");
      if (!button) return;
      const entryId = button.dataset.entryId;
      const entry = entries.find((item) => item.id === entryId);
      if (!entry) return;
      const action = button.dataset.cardAction;
      if (action === "edit") fillForm(entry);
      else if (action === "delete") deleteEntry(entryId);
      else if (action === "invite") openShareModal("film", entry);
    });

    document.addEventListener("change", (event) => {
      const select = event.target.closest("[data-move-id]");
      if (select) moveEntry(select.dataset.moveId, select.value);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        [entryModal, shareModal].forEach((modal) => { if (!modal.hidden) closeModal(modal); });
      }
    });
  }

  async function init() {
    bindEvents();
    if (!supabase) {
      gate.hidden = false;
      $("journalGate").querySelector("p").textContent = "Не получилось подключиться к сервису аккаунтов. Обнови страницу и попробуй ещё раз.";
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn("LUNEVIA cinema journal session lookup failed:", error);
    currentUser = data?.session?.user || null;
    if (!currentUser || currentUser.is_anonymous) {
      gate.hidden = false;
      content.hidden = true;
      return;
    }
    gate.hidden = true;
    content.hidden = false;
    const accountName = currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "Кинолюбитель";
    $("journalHeading").textContent = "Кинодневник " + accountName;
    $("journalUserLine").textContent = "Твои истории хранятся отдельно от публичного профиля — делись только тем, чем захочешь.";
    await loadEntries();
  }

  init().catch((error) => {
    console.error("LUNEVIA cinema journal initialization failed:", error);
    loading.hidden = true;
    showNotice("Не удалось открыть кинодневник. Обнови страницу и попробуй ещё раз.", true);
  });
});
