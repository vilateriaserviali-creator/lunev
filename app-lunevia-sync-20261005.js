document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("roomOverlay");
  const createForm = document.getElementById("createForm");
  const joinForm = document.getElementById("joinForm");
  const roomResult = document.getElementById("roomResult");
  const roomTitle = document.getElementById("roomTitle");
  const roomName = document.getElementById("roomName");
  const joinCode = document.getElementById("joinCode");
  const privateRoom = document.getElementById("privateRoom");
  const resultName = document.getElementById("resultName");
  const resultAvatar = document.getElementById("resultAvatar");
  const roomCode = document.getElementById("roomCode");

  let selectedAvatar = "✧";
  const SUPABASE_URL = "https://scseelymkhpmclrcetiz.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_p2FjF7oNh9mbzqCtc8Ii4w_cFwVy6Uy";
  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) || null;

  // Global action bridge: keep buttons responsive even if an optional init block fails later.
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    event.preventDefault();
    try {
      await handleAction(button.dataset.action, button);
    } catch (error) {
      console.error("LUNEVIA action error:", error);
      if (button.dataset.action === "create-room") {
        button.disabled = false;
        button.innerHTML = "Создать комнату <span>✦</span>";
        showRoomError(error?.message || "Не удалось создать комнату. Попробуй ещё раз.");
      }
    }
  });

  const accountOverlay = document.getElementById("accountOverlay");
  const profileOverlay = document.getElementById("profileOverlay");
  const accountNavButton = document.getElementById("accountNavButton");
  const profileEmail = document.getElementById("profileEmail");
  const profileOrb = document.getElementById("profileOrb");
  const profileMessage = document.getElementById("profileMessage");
  const registerForm = document.getElementById("registerForm");
  const accountSuccess = document.getElementById("accountSuccess");
  const accountTitle = document.getElementById("accountTitle");
  const accountSubtitle = accountOverlay.querySelector(".account-subtitle");
  const accountNote = accountOverlay.querySelector(".account-note");
  const registerName = document.getElementById("registerName");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const registerAgree = document.getElementById("registerAgree");
  const accountSubmit = accountOverlay.querySelector(".account-submit");
  const accountSuccessName = document.getElementById("accountSuccessName");
  const guestEntry = document.getElementById("guestEntry");

  let accountMode = "signup";
  let recoveryMode = false;
  let pendingInviteCode = "";


  function openProfile(user) {
    const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Лунный гость";
    profileOrb.textContent = (name.trim()[0] || "☾").toUpperCase();
    profileEmail.textContent = user.email || "";
    profileOverlay.classList.add("is-open");
    profileOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeProfile() {
    profileOverlay.classList.remove("is-open");
    profileOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function updateNav(user) {
    if (!accountNavButton) return;
    if (user) {
      if (user.is_anonymous) {
        accountNavButton.innerHTML = "Войти <span>↗</span>";
        accountNavButton.dataset.action = "login";
        accountNavButton.title = "Войти в аккаунт";
        return;
      }
      const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Профиль";
      accountNavButton.innerHTML = `${name.slice(0, 14)} <span>✦</span>`;
      accountNavButton.dataset.action = "profile";
      accountNavButton.title = "Открыть профиль";
    } else {
      accountNavButton.innerHTML = "Войти <span>↗</span>";
      accountNavButton.dataset.action = "login";
      accountNavButton.title = "";
    }
  }

  function showAccountMessage(message, isError = true) {
    let box = document.getElementById("accountMessage");
    if (!box) {
      box = document.createElement("p");
      box.id = "accountMessage";
      box.style.cssText = "margin:14px 0 0;color:#d7b8c5;font-size:11px;line-height:1.6;";
      accountSubmit.insertAdjacentElement("afterend", box);
    }
    box.textContent = message;
    box.style.color = isError ? "#d9b6c5" : "#b8d9d1";
  }

  function clearAccountMessage() {
    const box = document.getElementById("accountMessage");
    if (box) box.textContent = "";
  }

  function renderAccountMode() {
    const signup = accountMode === "signup";
    const pendingInvite = pendingInviteCode || normalizeRoomCode(new URLSearchParams(window.location.search).get("room")) || getActiveRoom();
    if (guestEntry) {
      guestEntry.hidden = signup || recoveryMode || !pendingInvite;
      guestEntry.disabled = false;
      guestEntry.innerHTML = "Войти как гость <span>✦</span>";
    }
    const recovery = accountMode === "recovery";
    if (forgotPasswordLink) forgotPasswordLink.hidden = signup || recovery;
    if (recovery) {
      accountTitle.textContent = "Новый пароль";
      accountSubtitle.textContent = "Придумай новый пароль и снова возвращайся в свою киновселенную.";
      registerName.parentElement.hidden = true;
      registerAgree.parentElement.hidden = true;
      registerName.required = false;
      registerAgree.required = false;
      registerEmail.parentElement.hidden = true;
      registerPassword.parentElement.hidden = false;
      registerEmail.required = false;
      registerPassword.required = true;
      accountSubmit.innerHTML = "Сохранить новый пароль <span>✦</span>";
      accountNote.innerHTML = 'Вспомнил пароль? <button type="button" class="account-link" data-action="show-login">Войти</button>';
      accountNote.querySelector(".account-link").addEventListener("click", () => {
        accountMode = "login";
        recoveryMode = false;
        registerForm.reset();
        clearAccountMessage();
        renderAccountMode();
        registerEmail.focus();
      });
      return;
    }
    accountTitle.textContent = signup ? "Создать аккаунт" : "Войти в LUNEVIA";
    accountSubtitle.textContent = signup
      ? "Оставь своё имя в этой вселенной — и возвращайся к своим вечерам."
      : "Вернись в свою киновселенную и продолжи свой вечер.";
    registerName.parentElement.hidden = !signup;
    registerAgree.parentElement.hidden = !signup;
    registerEmail.parentElement.hidden = false;
    registerPassword.parentElement.hidden = false;
    registerName.required = signup;
    registerAgree.required = signup;
    registerEmail.required = true;
    registerPassword.required = true;
    accountSubmit.innerHTML = signup
      ? "Создать аккаунт <span>✦</span>"
      : "Войти <span>→</span>";
    accountNote.innerHTML = signup
      ? 'Уже есть аккаунт? <button type="button" class="account-link" data-action="show-login">Войти</button>'
      : 'Ещё нет аккаунта? <button type="button" class="account-link" data-action="show-signup">Создать аккаунт</button>';
    accountNote.querySelector(".account-link").addEventListener("click", () => {
      accountMode = signup ? "login" : "signup";
      registerForm.reset();
      clearAccountMessage();
      renderAccountMode();
      (accountMode === "signup" ? registerName : registerEmail).focus();
    });
  }

  async function openAccount(mode = "signup") {
    accountMode = mode;
    recoveryMode = mode === "recovery";
    accountOverlay.classList.add("is-open");
    accountOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    registerForm.hidden = false;
    accountSuccess.hidden = true;
    registerForm.reset();
    clearAccountMessage();
    renderAccountMode();
    setTimeout(() => (mode === "signup" ? registerName : registerEmail).focus(), 80);
  }

  function closeAccount() {
    accountOverlay.classList.remove("is-open");
    accountOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  async function openForgotPassword() {
    accountMode = "login";
    recoveryMode = false;
    registerForm.hidden = false;
    accountSuccess.hidden = true;
    renderAccountMode();
    clearAccountMessage();
    const email = registerEmail.value.trim().toLowerCase();
    if (!email) {
      showAccountMessage("Сначала введи почту, на которую зарегистрирован аккаунт.");
      registerEmail.focus();
      return;
    }
    if (!supabase) {
      showAccountMessage("Авторизация временно недоступна. Обнови страницу и попробуй ещё раз.");
      return;
    }
    accountSubmit.disabled = true;
    accountSubmit.innerHTML = "Отправляем письмо… <span>✦</span>";
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    accountSubmit.disabled = false;
    accountSubmit.innerHTML = "Войти <span>→</span>";
    if (error) {
      showAccountMessage("Не удалось отправить письмо. Проверь почту и попробуй ещё раз.");
      return;
    }
    showAccountMessage("Письмо для восстановления отправлено. Проверь почту — ссылка вернёт тебя в LUNEVIA.", false);
  }


  let selectedFrame = "silver";

  const randomCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const values = new Uint32Array(4);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(values);
    } else {
      for (let i = 0; i < values.length; i++) {
        values[i] = Math.floor(Math.random() * 0xffffffff);
      }
    }
    return "LUNE-" + Array.from(values, (value) => chars[value % chars.length]).join("");
  };

  function showRoomError(message) {
    let box = document.getElementById("roomError");
    if (!box) {
      box = document.createElement("p");
      box.id = "roomError";
      box.className = "room-error";
      roomResult.parentElement.insertBefore(box, roomResult);
    }
    box.textContent = message;
    box.hidden = false;
  }

  function clearRoomError() {
    const box = document.getElementById("roomError");
    if (box) {
      box.textContent = "";
      box.hidden = true;
    }
  }

  async function copyText(text) {
    if (!text || text === "—" || text === "КОД НЕ СОЗДАН") {
      throw new Error("Код комнаты ещё не создан.");
    }

    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    helper.style.top = "0";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      helper.remove();
    }

    if (!copied) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(roomCode);
      selection.removeAllRanges();
      selection.addRange(range);
      roomCode.scrollIntoView({ block: "center", behavior: "smooth" });
      throw new Error("Автоматическое копирование заблокировано браузером.");
    }

    return true;
  }

  function getRoomInviteUrl(code) {
    const normalized = normalizeRoomCode(code);
    if (!normalized) return "";
    return "https://vilateriaserviali-creator.github.io/lunev/?room=" + encodeURIComponent(normalized);
  }

  function normalizeRoomCode(value) {
    const code = String(value || "").trim().toUpperCase();
    return /^LUNE-[A-Z0-9]{4}$/.test(code) ? code : "";
  }

  async function shareRoomInvite(room) {
    const url = getRoomInviteUrl(room?.code);
    if (!url) return;
    const shareData = {
      title: "LUNEVIA · " + (room.name || "Кинокомната"),
      text: "Присоединяйся к моей кинокомнате «" + (room.name || "Твой вечер") + "» в LUNEVIA ✦",
      url
    };
    if (navigator.share) {
      try { await navigator.share(shareData); return; }
      catch (error) { if (error?.name === "AbortError") return; }
    }
    await copyText(url);
  }

  function updateRoomInvite(room) {
    const inviteUrl = getRoomInviteUrl(room?.code);
    const inviteLink = document.getElementById("roomInviteLink");
    if (inviteLink) {
      const safeUrl = inviteUrl || "https://vilateriaserviali-creator.github.io/lunev/?room=" + (room?.code || "");
      inviteLink.href = safeUrl;
      inviteLink.textContent = safeUrl;
    }
  }

  function showRoomResult(room, title = "Комната готова") {
    createForm.hidden = true;
    joinForm.hidden = true;
    roomResult.hidden = false;
    roomTitle.textContent = title;
    resultName.textContent = room.name;
    resultAvatar.textContent = room.avatar;
    roomCode.textContent = room.code || "КОД НЕ СОЗДАН";
    resultAvatar.className = "result-orb frame-" + room.frame;
    updateRoomInvite(room);
  }

  function openRoom(mode) {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    createForm.hidden = mode !== "create";
    joinForm.hidden = mode !== "join";
    roomResult.hidden = true;
    clearRoomError();
    roomTitle.textContent = mode === "create" ? "Создать комнату" : "Войти в комнату";
    setTimeout(() => (mode === "create" ? roomName : joinCode).focus(), 80);
  }

  function closeRoom() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  async function joinAsGuest() {
    if (!supabase) {
      showAccountMessage("Гостевой вход временно недоступен. Обнови страницу и попробуй ещё раз.");
      return;
    }
    const pendingCode = pendingInviteCode || normalizeRoomCode(new URLSearchParams(window.location.search).get("room")) || getActiveRoom();
    if (!pendingCode) {
      showAccountMessage("Ссылка на комнату не найдена. Открой приглашение ещё раз.");
      return;
    }
    const guestEntryButton = document.getElementById("guestEntry");
    if (guestEntryButton) {
      guestEntryButton.disabled = true;
      guestEntryButton.innerHTML = "Входим в комнату… <span>✦</span>";
    }
    try {
      // Supabase хранит одну auth-сессию на браузер. Если здесь уже
      // есть зарегистрированный пользователь, signInAnonymously может
      // продолжить текущую identity. Для приглашения сначала полностью
      // освобождаем текущую сессию, затем создаём НОВОГО anonymous user.
      switchingToGuestSession = true;
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        await supabase.auth.signOut();
      }
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: "Лунный гость" } }
      });
      switchingToGuestSession = false;
      if (error || !data?.user || !data?.session) {
        const message = error?.message || "";
        if (/anonymous|disabled|enable/i.test(message)) {
          throw new Error("Гостевой вход не включён в настройках LUNEVIA. В Supabase открой Authentication → Providers → Anonymous Sign-Ins и включи его.");
        }
        throw new Error(message || "Не удалось создать отдельную гостевую сессию.");
      }
      const user = data.user;

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name, avatar, frame")
        .eq("code", pendingCode)
        .maybeSingle();
      if (roomError || !room) throw new Error("Комната по этой ссылке не найдена.");

      const { error: memberError } = await supabase
        .from("room_members")
        .upsert({ room_id: room.id, user_id: user.id }, { onConflict: "room_id,user_id", ignoreDuplicates: true });
      if (memberError) throw new Error("Не удалось добавить гостя в комнату. Попробуй открыть приглашение ещё раз.");

      saveActiveRoom(room.code);
      pendingInviteCode = room.code;
      closeAccount();
      updateNav(user);
      document.body.classList.add("has-account");
      await openCinema(room.code);
    } catch (error) {
      switchingToGuestSession = false;
      if (guestEntryButton) {
        guestEntryButton.disabled = false;
        guestEntryButton.innerHTML = "Войти как гость <span>✦</span>";
      }
      showAccountMessage(error?.message || "Не удалось войти как гость. Попробуй ещё раз.");
    }
  }

  async function handleAction(action, button) {
    if (!action) return;

    if (action === "create") openRoom("create");
    else if (action === "join") openRoom("join");
    else if (action === "login") openAccount("login");
    else if (action === "show-login") openAccount("login");
    else if (action === "show-signup") openAccount("signup");
    else if (action === "guest-entry") joinAsGuest();
    else if (action === "forgot-password") openForgotPassword();
    else if (action === "close-account") closeAccount();
    else if (action === "close-profile") closeProfile();
    else if (action === "close-room") closeRoom();
    else if (action === "profile") {
      if (supabase) supabase.auth.getUser().then(({ data }) => data.user && openProfile(data.user));
    } else if (action === "logout") {
      if (supabase) supabase.auth.signOut().then(() => { closeProfile(); updateNav(null); });
    } else if (action === "profile-rooms") {
      profileMessage.textContent = "Раздел комнат подключим следующим шагом ✦";
    } else if (action === "profile-settings") {
      profileMessage.textContent = "Настройки профиля скоро появятся здесь ✦";
    } else if (action === "create-room") {
      if (!supabase) {
        openAccount("login");
        return;
      }
      const name = roomName.value.trim() || "Твой вечер";
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user?.is_anonymous) {
        button.disabled = false;
        button.innerHTML = "Создать комнату <span>✦</span>";
        showRoomError("Создание комнат доступно только после регистрации. По приглашению можно войти как гость ✦");
        return;
      }
      if (!user) {
        closeRoom();
        openAccount("login");
        return;
      }

      button.disabled = true;
      button.innerHTML = "Создаём… <span>✦</span>";

      let room = null;
      let error = null;

      for (let attempt = 0; attempt < 3 && !room; attempt++) {
        const code = randomCode();
        const response = await supabase
          .from("rooms")
          .insert({
            code,
            name,
            owner_id: user.id,
            avatar: selectedAvatar,
            frame: selectedFrame,
            is_private: privateRoom.checked
          })
          .select("id, code, name, avatar, frame, is_private, created_at")
          .single();

        if (!response.error) {
          room = response.data;
          break;
        }

        error = response.error;
        if (response.error.code !== "23505") break;
      }

      if (!room) {
        button.disabled = false;
        button.innerHTML = "Создать комнату <span>✦</span>";
        showRoomError(error?.message || "Не удалось создать комнату. Попробуй ещё раз.");
        return;
      }

      const { error: memberError } = await supabase
        .from("room_members")
        .insert({ room_id: room.id, user_id: user.id });

      button.disabled = false;
      button.innerHTML = "Создать комнату <span>✦</span>";

      if (memberError) {
        await supabase.from("rooms").delete().eq("id", room.id);
        showRoomError(memberError.message || "Комната создалась, но не удалось открыть доступ. Попробуй ещё раз.");
        return;
      }

      saveActiveRoom(room.code);
      showRoomResult(room);
    } else if (action === "join-room") {
      if (!supabase) {
        openAccount("login");
        return;
      }

      const code = joinCode.value.trim().toUpperCase();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        closeRoom();
        openAccount("login");
        return;
      }

      button.disabled = true;
      button.innerHTML = "Ищем комнату… <span>✦</span>";

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name, avatar, frame, is_private, created_at")
        .eq("code", code)
        .maybeSingle();

      if (roomError || !room) {
        button.disabled = false;
        button.innerHTML = "Войти в комнату <span>→</span>";
        joinCode.classList.add("input-error");
        joinCode.setCustomValidity("Комната с таким кодом не найдена.");
        joinCode.reportValidity();
        setTimeout(() => joinCode.classList.remove("input-error"), 500);
        return;
      }

      const { error: memberError } = await supabase
        .from("room_members")
        .upsert({ room_id: room.id, user_id: user.id }, { onConflict: "room_id,user_id", ignoreDuplicates: true });

      button.disabled = false;
      button.innerHTML = "Войти в комнату <span>→</span>";

      if (memberError) {
        showAccountMessage("Не удалось войти в комнату. Попробуй ещё раз.");
        return;
      }

      joinCode.setCustomValidity("");
      showRoomResult(room, "Добро пожаловать");
    } else if (action === "copy-code") {
      const code = roomCode.textContent.trim();
      const original = button?.innerHTML;

      try {
        await copyText(code);
        if (button) {
          button.innerHTML = "Код скопирован ✓";
          setTimeout(() => (button.innerHTML = original), 1800);
        }
      } catch (error) {
        if (button) {
          button.innerHTML = "Код выделен — Ctrl+C";
          setTimeout(() => (button.innerHTML = original), 2200);
        }
      }
    } else if (action === "copy-room-link") {
      const url = getRoomInviteUrl(roomCode.textContent.trim());
      const original = button?.innerHTML;
      if (!url) return;
      try {
        await copyText(url);
        if (button) { button.innerHTML = "Ссылка скопирована ✓"; setTimeout(() => (button.innerHTML = original), 1800); }
      } catch (error) {
        const inviteInput = document.getElementById("roomInviteLink");
        inviteInput?.focus(); inviteInput?.select();
        if (button) { button.innerHTML = "Ссылка выделена — Ctrl+C"; setTimeout(() => (button.innerHTML = original), 2200); }
      }
    } else if (action === "share-room") {
      const code = roomCode.textContent.trim();
      if (!code || code === "—") return;
      const original = button?.innerHTML;
      try {
        await shareRoomInvite({ code, name: resultName.textContent.trim() });
        if (button) { button.innerHTML = navigator.share ? "Отправлено ✓" : "Ссылка скопирована ✓"; setTimeout(() => (button.innerHTML = original), 1800); }
      } catch (error) {
        const inviteInput = document.getElementById("roomInviteLink");
        inviteInput?.focus(); inviteInput?.select();
        if (button) { button.innerHTML = "Ссылка выделена — Ctrl+C"; setTimeout(() => (button.innerHTML = original), 2200); }
      }
    } else if (action === "open-room") {
      closeRoom();
      if (window.LuneviaCinema?.open) window.LuneviaCinema.open(roomCode.textContent);
    }
  }





  const cinemaOverlay = document.getElementById("cinemaOverlay");
  const cinemaTitle = document.getElementById("cinemaTitle");
  const cinemaCode = document.getElementById("cinemaCode");
  const cinemaInviteLink = document.getElementById("cinemaInviteLink");
  const cinemaFrame = document.getElementById("cinemaFrame");
  const cinemaVideo = document.getElementById("cinemaVideo");
  const screenEmpty = document.getElementById("screenEmpty");
  const cinemaSourceInput = document.getElementById("cinemaSourceInput");
  const cinemaSyncStatus = document.getElementById("cinemaSyncStatus");
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const cinemaMemberCount = document.getElementById("cinemaMemberCount");
  const cinemaPeople = document.getElementById("cinemaPeople");
  const chatEmpty = document.getElementById("chatEmpty");
  const roomSyncWidget = document.getElementById("roomSyncWidget");
  const roomViewerWidget = document.getElementById("roomViewerWidget");
  const roomViewerMeta = document.getElementById("roomViewerMeta");
  const roomWidgetParticipants = document.getElementById("roomWidgetParticipants");
  const roomCodeWidget = document.getElementById("roomCodeWidget");

  let cinemaRoom = null;
  let cinemaUser = null;
  let cinemaChannel = null;
  let cinemaPresenceKey = null;
  let cinemaMembers = new Map();
  let cinemaState = { video_url: null, position_seconds: 0, is_playing: false, updated_at: null };
  let applyingRemotePlayback = false;
  let lastStatePersistAt = 0;
  let sharedClockTimer = null;
  let presencePositionTimer = null;
  let lastSharedClockAt = 0;
  let roomLeaderId = null;
  let switchingToGuestSession = false;
  let presenceNoticeTimer = null;

  const ACTIVE_ROOM_KEY = "lunevia_active_room";

  function saveActiveRoom(code) {
    if (!code || code === "—") return;
    try {
      localStorage.setItem(ACTIVE_ROOM_KEY, code);
    } catch {}
  }

  function getActiveRoom() {
    try {
      return localStorage.getItem(ACTIVE_ROOM_KEY) || "";
    } catch {
      return "";
    }
  }

  function clearActiveRoom() {
    try {
      localStorage.removeItem(ACTIVE_ROOM_KEY);
    } catch {}
  }

  let restoringActiveRoom = false;

  async function restoreActiveRoom() {
    const code = getActiveRoom();
    if (!code || !supabase || restoringActiveRoom) return;

    if (cinemaRoom?.code === code && cinemaOverlay.classList.contains("is-open")) {
      return;
    }

    restoringActiveRoom = true;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, name, avatar, frame")
        .eq("code", code)
        .maybeSingle();

      if (roomError || !room) {
        clearActiveRoom();
        return;
      }

      const { data: membership, error: membershipError } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (membershipError || !membership) {
        clearActiveRoom();
        return;
      }

      await openCinema(room.code);
    } finally {
      restoringActiveRoom = false;
    }
  }

  function scheduleRoomRestore() {
    if (!supabase || !getActiveRoom()) return;
    [150, 700, 1800].forEach((delay) => {
      setTimeout(() => {
        if (!cinemaOverlay.classList.contains("is-open")) {
          restoreActiveRoom();
        }
      }, delay);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
  }

  let youtubePlayer = null;
  let youtubePlayerReady = false;
  let cinemaVideoProvider = "none";
  let rutubeReady = false;
  let lastRutubePosition = 0;
  let rutubeDuration = 0;
  let youtubePlayerUrl = "";
  let youtubeApiPromise = null;

  function youtubeVideoId(url) {
    try {
      const parsed = new URL(url);
      if (!["youtube.com","www.youtube.com","youtu.be","m.youtube.com"].includes(parsed.hostname)) return null;
      let id = parsed.hostname === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
      if (!id && parsed.pathname.startsWith("/shorts/")) id = parsed.pathname.split("/")[2];
      return id || null;
    } catch {
      return null;
    }
  }

  function youtubeEmbed(url) {
    const id = youtubeVideoId(url);
    return id
      ? `https://www.youtube.com/embed/${id}?enablejsapi=1&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
      : null;
  }

  function rutubeVideoId(url) {
    try {
      const parsed = new URL(url);
      if (!["rutube.ru", "www.rutube.ru"].includes(parsed.hostname)) return null;
      const match = parsed.pathname.match(/\/(?:video|shorts)\/([a-zA-Z0-9]+)/);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }

  function rutubeEmbed(url) {
    const id = rutubeVideoId(url);
    return id ? `https://rutube.ru/play/embed/${id}?getPlayOptions=duration` : null;
  }

  function rutubeCommand(type, data = {}) {
    if (!cinemaFrame?.contentWindow) return;
    try {
      cinemaFrame.contentWindow.postMessage(JSON.stringify({ type, data }), "https://rutube.ru");
    } catch {}
  }

  function applyRutubeState(state) {
    if (!rutubeReady) return;
    const position = Number(state.position_seconds) || 0;
    rutubeCommand("player:setCurrentTime", { time: position });
    if (state.is_playing) rutubeCommand("player:play");
    else rutubeCommand("player:pause");
  }


  function vkVideoIds(url) {
    try {
      const parsed = new URL(url);
      if (!["vk.com", "www.vk.com", "vk.ru", "www.vk.ru", "vkvideo.ru", "www.vkvideo.ru"].includes(parsed.hostname)) return null;
      const sources = [
        parsed.pathname.match(/\/video(-?\d+)_(-?\d+)/),
        parsed.searchParams.get("z")?.match(/video(-?\d+)_(-?\d+)/)
      ];
      const match = sources.find(Boolean);
      return match ? { oid: match[1], id: match[2] } : null;
    } catch {
      return null;
    }
  }

  function vkEmbed(url) {
    const ids = vkVideoIds(url);
    return ids
      ? `https://vkvideo.ru/video_ext.php?oid=${encodeURIComponent(ids.oid)}&id=${encodeURIComponent(ids.id)}&hd=2&js_api=1`
      : null;
  }

  function loadYouTubeApi() {
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve) => {
      if (window.YT?.Player) {
        resolve(window.YT);
        return;
      }
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
    return youtubeApiPromise;
  }

  async function initYouTubePlayer(url) {
    const id = youtubeVideoId(url);
    if (!id) return null;
    youtubePlayerReady = false;
    youtubePlayerUrl = url;
    await loadYouTubeApi();

    if (youtubePlayer?.destroy) {
      try { youtubePlayer.destroy(); } catch {}
      youtubePlayer = null;
    }

    return new Promise((resolve) => {
      youtubePlayer = new YT.Player("cinemaFrame", {
        videoId: id,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: () => {
            youtubePlayerReady = true;
            lastYouTubePosition = youtubePlayer.getCurrentTime?.() || 0;
            updateRoomPlaybackWidget();
            startYouTubeSyncMonitor();
            resolve(youtubePlayer);
          },
          onStateChange: (event) => {
            if (!cinemaRoom || !cinemaUser || !youtubePlayerReady || applyingRemotePlayback) return;
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
              const position = youtubePlayer.getCurrentTime() || 0;
              cinemaState.is_playing = true;
              cinemaState.position_seconds = position;
              persistRoomState({ force: true });
              broadcast({ type: "play", position, source: "youtube" });
              cinemaSyncStatus.textContent = "Смотрим вместе ✦";
            } else if (state === YT.PlayerState.PAUSED) {
              const position = youtubePlayer.getCurrentTime() || 0;
              cinemaState.is_playing = false;
              cinemaState.position_seconds = position;
              persistRoomState({ force: true });
              broadcast({ type: "pause", position, source: "youtube" });
              cinemaSyncStatus.textContent = "Пауза у всех ✦";
            }
          }
        }
      });
    });
  }

  function youtubeCurrentTime() {
    return youtubePlayerReady && youtubePlayer?.getCurrentTime
      ? youtubePlayer.getCurrentTime() || 0
      : 0;
  }

  let lastYouTubePosition = 0;
  let youtubeSyncTimer = null;

  function startYouTubeSyncMonitor() {
    clearInterval(youtubeSyncTimer);
    youtubeSyncTimer = setInterval(async () => {
      if (!youtubePlayerReady || !youtubePlayer || !cinemaRoom || !cinemaUser || applyingRemotePlayback) return;
      const playing = youtubePlayer.getPlayerState?.() === YT.PlayerState.PLAYING;
      const position = youtubeCurrentTime();
      const jump = Math.abs(position - lastYouTubePosition);
      lastYouTubePosition = position;

      if (jump > 1.5) {
        cinemaState.position_seconds = position;
        await persistRoomState({ force: true });
        broadcast({ type: "seek", position, source: "youtube" });
      } else if (playing) {
        cinemaState.position_seconds = position;
        if (Date.now() - lastStatePersistAt >= 3000) await persistRoomState();
      }
    }, 500);
  }

  function stopYouTubeSyncMonitor() {
    clearInterval(youtubeSyncTimer);
    youtubeSyncTimer = null;
  }

  async function applyYouTubeState(state) {
    if (!youtubePlayerReady || !youtubePlayer) return;
    const position = Number(state.position_seconds) || 0;
    applyingRemotePlayback = true;
    try {
      youtubePlayer.seekTo(position, true);
      if (state.is_playing) {
        youtubePlayer.playVideo();
        cinemaSyncStatus.textContent = "Смотрим вместе ✦";
      } else {
        youtubePlayer.pauseVideo();
        cinemaSyncStatus.textContent = "Пауза у всех ✦";
      }
    } finally {
      setTimeout(() => { applyingRemotePlayback = false; }, 250);
    }
  }

  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
  }

  function formatMessageTime(value) {
    try {
      return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch {
      return "";
    }
  }

  function renderChatMessage(message, mine = false) {
    if (message?.id) {
      const existing = chatMessages?.querySelector('[data-message-id="' + CSS.escape(String(message.id)) + '"]');
      if (existing) return;
    }
    if (chatEmpty) chatEmpty.hidden = true;
    const row = document.createElement("div");
    if (message?.id) row.dataset.messageId = String(message.id);
    row.className = "chat-message" + (mine ? " mine" : "");
    const initial = (message.name || "☾").trim()[0] || "☾";
    const time = formatMessageTime(message.created_at);
    row.innerHTML = `<span class="chat-avatar">${escapeHtml(initial)}</span><div class="chat-bubble"><div class="chat-meta"><b>${escapeHtml(message.name || "Лунный гость")}</b><time>${escapeHtml(time)}</time></div><p>${escapeHtml(message.message)}</p></div>`;
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function loadChat() {
    chatMessages.innerHTML = "";
    if (chatEmpty) {
      chatMessages.appendChild(chatEmpty);
      chatEmpty.hidden = false;
    }
    const { data, error } = await supabase.from("room_messages")
      .select("id, message, created_at, user_id")
      .eq("room_id", cinemaRoom.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      cinemaSyncStatus.textContent = "Чат временно недоступен";
      return;
    }
    const name = cinemaUser.user_metadata?.full_name || cinemaUser.email?.split("@")[0] || "Лунный гость";
    data.forEach((item) => renderChatMessage({
      id: item.id,
      message: item.message,
      name: item.user_id === cinemaUser.id ? name : "Участник",
      created_at: item.created_at
    }, item.user_id === cinemaUser.id));
  }

  function getRoomLeaderId() {
    const ids = Array.from(cinemaMembers.keys());
    if (cinemaPresenceKey && !ids.includes(cinemaPresenceKey)) ids.push(cinemaPresenceKey);
    return ids.sort()[0] || cinemaPresenceKey || null;
  }

  function isRoomLeader() {
    return Boolean(cinemaPresenceKey && roomLeaderId === cinemaPresenceKey);
  }

  function getSharedPosition(state = cinemaState) {
    const base = Number(state.position_seconds) || 0;
    if (!state.is_playing || !state.updated_at) return base;
    const elapsed = Math.max(0, (Date.now() - new Date(state.updated_at).getTime()) / 1000);
    return base + Math.min(elapsed, 30);
  }

  function formatPlaybackTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) {
      return String(hours) + ":" + String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
    return String(minutes).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function getPlaybackDuration() {
    if (youtubePlayerReady && youtubePlayer?.getDuration) {
      const duration = Number(youtubePlayer.getDuration()) || 0;
      return duration > 0 ? duration : null;
    }
    if (cinemaVideoProvider === "rutube" && rutubeDuration > 0) {
      return rutubeDuration;
    }
    if (cinemaVideoProvider === "direct" && Number.isFinite(cinemaVideo.duration) && cinemaVideo.duration > 0) {
      return cinemaVideo.duration;
    }
    return null;
  }

  function getPresencePlaybackPosition(presence) {
    const base = Number(presence?.position) || 0;
    if (!presence?.is_playing || !presence?.position_at) return base;
    const elapsed = Math.max(0, (Date.now() - new Date(presence.position_at).getTime()) / 1000);
    return base + Math.min(elapsed, 5);
  }

  function updateRoomPlaybackWidget() {
    if (!roomViewerWidget) return;
    const current = formatPlaybackTime(getLocalPosition());
    const duration = getPlaybackDuration();
    roomViewerWidget.textContent = duration ? current + " / " + formatPlaybackTime(duration) : current;

    const count = cinemaMembers.size;
    if (roomViewerMeta) {
      roomViewerMeta.textContent = count <= 1 ? "Только ты" : count === 2 ? "Вы вдвоём" : `Вместе · ${count}`;
    }

    if (roomWidgetParticipants) {
      roomWidgetParticipants.innerHTML = "";
      roomWidgetParticipants.style.display = "flex";
      roomWidgetParticipants.style.flexDirection = "column";
      roomWidgetParticipants.style.gap = "6px";
      roomWidgetParticipants.style.marginTop = "10px";
      roomWidgetParticipants.style.width = "100%";

      Array.from(cinemaMembers.entries()).slice(0, 5).forEach(([, values]) => {
        const member = values?.[0] || {};
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;min-width:0;";

        const avatar = document.createElement("span");
        avatar.className = "room-widget-participant";
        const memberName = member.name || getPresenceLabel(member) || "Лунный гость";
        avatar.textContent = memberName.trim().charAt(0).toUpperCase();
        avatar.title = memberName;
        avatar.style.cssText = "flex:0 0 auto;display:grid;place-items:center;width:29px;height:29px;border-radius:50%;";

        const info = document.createElement("span");
        info.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-width:0;font-size:10px;line-height:1.2;";

        const name = document.createElement("span");
        name.textContent = memberName;
        name.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.78;";

        const time = document.createElement("b");
        time.textContent = formatPlaybackTime(getPresencePlaybackPosition(member));
        time.style.cssText = "flex:0 0 auto;font-variant-numeric:tabular-nums;font-weight:600;opacity:.95;";

        info.append(name, time);
        row.append(avatar, info);
        roomWidgetParticipants.appendChild(row);
      });
    }
  }

  let playbackWidgetTimer = null;

  function startPlaybackWidgetTimer() {
    clearInterval(playbackWidgetTimer);
    updateRoomPlaybackWidget();
    playbackWidgetTimer = setInterval(() => {
      if (cinemaOverlay?.classList.contains("is-open")) updateRoomPlaybackWidget();
    }, 500);
  }

  function stopPlaybackWidgetTimer() {
    clearInterval(playbackWidgetTimer);
    playbackWidgetTimer = null;
  }

  function refreshCinemaPresence() {
    if (!cinemaChannel) return;
    const state = cinemaChannel.presenceState();
    cinemaMembers = new Map(Object.entries(state));
    // Presence sync may arrive before our own track is visible. Keep the
    // current browser in the room immediately and refresh once Supabase
    // confirms the track.
    if (cinemaPresenceKey && !cinemaMembers.has(cinemaPresenceKey)) {
      cinemaMembers.set(cinemaPresenceKey, [{
        name: getPresenceName(cinemaUser),
        user_id: cinemaUser?.id || null,
        is_anonymous: Boolean(cinemaUser?.is_anonymous),
        position: getLocalPosition(),
        ready: true
      }]);
    }
    updateMembers();
  }

  function showPresenceNotice(text) {
    if (!cinemaSyncStatus) return;
    clearTimeout(presenceNoticeTimer);
    cinemaSyncStatus.textContent = text;
    cinemaSyncStatus.classList.add("cinema-presence-notice");
    presenceNoticeTimer = setTimeout(() => {
      cinemaSyncStatus.classList.remove("cinema-presence-notice");
      cinemaSyncStatus.textContent = cinemaMembers.size > 1 ? "Смотрим вместе ✦" : "Ждём участника ✦";
    }, 4500);
  }

  function getPresenceName(user) {
    if (!user) return "Лунный гость";
    if (user.is_anonymous) return "Гость · " + String(user.id || "").slice(0, 4).toUpperCase();
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "Профиль";
  }

  function getPresenceLabel(presence) {
    if (presence?.is_anonymous && presence?.user_id) {
      return "Гость · " + String(presence.user_id).slice(0, 4).toUpperCase();
    }
    return presence?.name || "Участник";
  }

  function updateMembers() {
    const count = cinemaMembers.size;
    roomLeaderId = getRoomLeaderId();
    cinemaMemberCount.textContent = count === 0
      ? "Подключаемся…"
      : count === 1
        ? "Только ты"
        : count === 2
          ? "Вы вдвоём"
          : `Вместе · ${count}`;
    updateRoomPlaybackWidget();
    if (roomCodeWidget && cinemaRoom) roomCodeWidget.textContent = cinemaRoom.code;
    if (roomSyncWidget) {
      roomSyncWidget.textContent = "Идеально";
      roomSyncWidget.className = "cinema-sync-good";
    }

    if (!cinemaPeople) return;
    cinemaPeople.innerHTML = "";
    const entries = Array.from(cinemaMembers.entries()).slice(0, 5);
    entries.forEach(([key, values]) => {
      const presence = values?.[0] || {};
      const name = getPresenceLabel(presence);
      const row = document.createElement("span");
      row.className = "cinema-person";
      row.style.cssText = "display:inline-flex;align-items:center;gap:6px;width:auto;min-width:0;padding:5px 9px;border-radius:999px;white-space:nowrap;";

      const avatar = document.createElement("span");
      avatar.textContent = (name.trim()[0] || "☾").toUpperCase();
      avatar.style.cssText = "display:grid;place-items:center;flex:0 0 auto;width:22px;height:22px;border-radius:50%;";

      const label = document.createElement("span");
      label.style.cssText = "max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      label.textContent = name;

      const time = document.createElement("b");
      time.className = "cinema-person-time";
      time.style.cssText = "font-variant-numeric:tabular-nums;font-weight:700;";
      time.textContent = formatPlaybackTime(getPresencePlaybackPosition(presence));

      row.title = name + " · " + time.textContent;
      row.append(avatar, label, time);
      cinemaPeople.appendChild(row);
    });
    if (count > 5) {
      const more = document.createElement("span");
      more.className = "cinema-person cinema-person-more";
      more.textContent = `+${count - 5}`;
      cinemaPeople.appendChild(more);
    }
  }

  function showVideo(url) {
    const youtube = youtubeEmbed(url);
    const rutube = rutubeEmbed(url);
    const vk = vkEmbed(url);
    const iframeSource = youtube || rutube || vk;
    cinemaSourceInput.value = url;
    screenEmpty.hidden = true;
    cinemaFrame.hidden = !iframeSource;
    cinemaVideo.hidden = Boolean(iframeSource);
    cinemaVideoProvider = youtube ? "youtube" : rutube ? "rutube" : vk ? "vk" : isDirectVideo(url) ? "direct" : "none";
    rutubeReady = false;
    rutubeDuration = 0;
    lastRutubePosition = 0;
    if (youtube) {
      cinemaVideo.hidden = true;
      cinemaFrame.hidden = false;
      // Сначала всегда показываем обычный YouTube iframe.
      // API синхронизации подключается отдельно и больше не может
      // заблокировать отображение самого видео.
      cinemaFrame.src = youtube;
      cinemaFrame.hidden = false;
      cinemaVideo.hidden = true;
      cinemaSyncStatus.textContent = "Загружаем YouTube… ✦";

      const frame = cinemaFrame;
      frame.onload = () => {
        if (cinemaState.video_url !== url) return;
        cinemaSyncStatus.textContent = "YouTube открыт для всех ✦";
      };
      frame.onerror = () => {
        if (cinemaState.video_url !== url) return;
        cinemaSyncStatus.textContent = "YouTube не удалось загрузить ✦";
      };

      // Синхронизация запускается отдельно. Ошибка API не должна
      // мешать пользователю увидеть плеер.
      initYouTubePlayer(url)
        .then(() => {
          if (cinemaState.video_url === url) applyYouTubeState(cinemaState);
        })
        .catch((error) => {
          console.warn("LUNEVIA: YouTube sync API unavailable", error);
        });
    } else if (rutube || vk) {
      stopYouTubeSyncMonitor();
      if (youtubePlayer?.destroy) {
        try { youtubePlayer.destroy(); } catch {}
        youtubePlayer = null;
      }
      youtubePlayerReady = false;
      cinemaFrame.hidden = false;
      cinemaFrame.src = iframeSource;
      cinemaSyncStatus.textContent = rutube
        ? "RUTUBE открыт для всех ✦"
        : "VK Видео открыт для всех ✦";
    } else if (isDirectVideo(url)) {
      cinemaFrame.src = "";
      cinemaVideo.src = url;
      cinemaVideo.load();
      cinemaVideo.addEventListener("loadedmetadata", updateRoomPlaybackWidget, { once: true });
      cinemaVideo.addEventListener("durationchange", updateRoomPlaybackWidget);
      cinemaSyncStatus.textContent = "Прямое видео готово ✦";
    } else {
      cinemaFrame.src = "";
      cinemaVideo.removeAttribute("src");
      cinemaVideo.load();
      screenEmpty.hidden = false;
      cinemaFrame.hidden = true;
      cinemaVideo.hidden = true;
      cinemaSyncStatus.textContent = "Эта ссылка пока не поддерживается как видео";
      return false;
    }
    return true;
  }

  let cinemaChannelStatus = "CLOSED";

  async function waitForCinemaChannel(timeout = 5000) {
    const started = Date.now();
    while (cinemaChannel && cinemaChannelStatus !== "SUBSCRIBED" && Date.now() - started < timeout) {
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    return Boolean(cinemaChannel && cinemaChannelStatus === "SUBSCRIBED");
  }

  async function broadcast(event) {
    if (!cinemaChannel) return false;
    const ready = await waitForCinemaChannel();
    if (!ready) {
      console.warn("LUNEVIA: Realtime channel is not subscribed; broadcast skipped.", event?.type);
      return false;
    }
    try {
      await cinemaChannel.send({ type:"broadcast", event:"cinema", payload:event });
      return true;
    } catch (error) {
      console.error("LUNEVIA broadcast error:", error);
      return false;
    }
  }
  let playbackUnlocked = false;

  function unlockLocalPlayback() {
    playbackUnlocked = true;
    if (cinemaRoom && cinemaState?.is_playing) {
      if (youtubePlayerReady && youtubePlayer?.playVideo) {
        applyingRemotePlayback = true;
        youtubePlayer.playVideo();
        setTimeout(() => { applyingRemotePlayback = false; }, 500);
      } else if (cinemaVideoProvider === "rutube" && rutubeReady) {
        rutubeCommand("player:play");
      } else if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
        applyingRemotePlayback = true;
        cinemaVideo.play().catch(() => {});
        setTimeout(() => { applyingRemotePlayback = false; }, 500);
      }
    }
  }

  ["pointerdown", "touchstart", "keydown"].forEach((eventName) => {
    window.addEventListener(eventName, unlockLocalPlayback, { passive: true });
  });

  async function applyPlaybackCommand(payload) {
    if (!payload) return;
    const position = Number(payload.position) || 0;
    const playing = Boolean(payload.playing);
    cinemaState.position_seconds = position;
    cinemaState.is_playing = playing;
    cinemaState.updated_at = payload.updated_at || new Date().toISOString();

    applyingRemotePlayback = true;
    try {
      if (cinemaVideoProvider === "youtube") {
        if (youtubePlayerReady && youtubePlayer) {
          youtubePlayer.seekTo(position, true);
          if (playing && playbackUnlocked) youtubePlayer.playVideo();
          else if (!playing) youtubePlayer.pauseVideo();
        } else {
          youtubePostCommand("seekTo", [position, true]);
          if (playing && playbackUnlocked) youtubePostCommand("playVideo");
          else if (!playing) youtubePostCommand("pauseVideo");
        }
      } else if (cinemaVideoProvider === "rutube" && rutubeReady) {
        rutubeCommand("player:setCurrentTime", { time: position });
        if (playing && playbackUnlocked) rutubeCommand("player:play");
        else if (!playing) rutubeCommand("player:pause");
      } else if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
        try { cinemaVideo.currentTime = position; } catch {}
        if (playing && playbackUnlocked) await cinemaVideo.play().catch(() => {});
        else if (!playing) cinemaVideo.pause();
      }
    } finally {
      setTimeout(() => { applyingRemotePlayback = false; }, 500);
    }
    updateRoomPlaybackWidget();
  }


  window.addEventListener("message", (event) => {
    if (event.origin !== "https://rutube.ru" || cinemaVideoProvider !== "rutube") return;
    let message;
    try { message = typeof event.data === "string" ? JSON.parse(event.data) : event.data; } catch { return; }
    if (!message?.type || !cinemaRoom || !cinemaUser) return;

    if (message.type === "player:ready" || message.type === "player:init") {
      rutubeReady = true;
      applyRutubeState(cinemaState);
      return;
    }

    if (message.type === "player:durationChange" || message.type === "player:playOptionsLoaded" || message.type === "player:playOptionLoaded") {
      const duration = Number(message.data?.duration) || 0;
      if (duration > 0) {
        rutubeDuration = duration;
        updateRoomPlaybackWidget();
      }
      return;
    }

    if (message.type === "player:currentTime") {
      lastRutubePosition = Number(message.data?.time) || 0;
      updateRoomPlaybackWidget();
      return;
    }

    if (applyingRemotePlayback) return;

    if (message.type === "player:changeState") {
      const state = message.data?.state;
      const position = lastRutubePosition;
      if (state === "playing") {
        cinemaState.is_playing = true;
        cinemaState.position_seconds = position;
        cinemaState.updated_at = new Date().toISOString();
        persistRoomState({ force: true });
        broadcast({ type: "play", position, source: "rutube" });
        cinemaSyncStatus.textContent = "Смотрим вместе ✦";
      } else if (state === "paused") {
        cinemaState.is_playing = false;
        cinemaState.position_seconds = position;
        cinemaState.updated_at = new Date().toISOString();
        persistRoomState({ force: true });
        broadcast({ type: "pause", position, source: "rutube" });
        cinemaSyncStatus.textContent = "Пауза у всех ✦";
      }
    }
  });


  function getLocalPosition() {
    if (youtubePlayerReady) return youtubeCurrentTime();
    if (cinemaVideoProvider === "rutube") return lastRutubePosition;
    if (cinemaVideoProvider === "vk") return getSharedPosition();
    if (!cinemaVideo.hidden) return cinemaVideo.currentTime || 0;
    return getSharedPosition();
  }

  async function startPresencePositionSync() {
    clearInterval(presencePositionTimer);
    if (!cinemaChannel || !cinemaUser) return;
    // Presence is only for stable online membership. Position updates use Broadcast.
    const publish = async () => {
      try {
        const position = getLocalPosition();
        const positionAt = new Date().toISOString();
        const isPlaying = Boolean(
          (youtubePlayerReady && youtubePlayer?.getPlayerState?.() === YT.PlayerState.PLAYING) ||
          (cinemaVideoProvider === "direct" && !cinemaVideo.paused) ||
          (cinemaVideoProvider === "rutube" && cinemaState.is_playing)
        );
        const ownEntry = cinemaMembers.get(cinemaPresenceKey)?.[0];
        if (ownEntry) {
          ownEntry.position = position;
          ownEntry.position_at = positionAt;
          ownEntry.is_playing = isPlaying;
        }

        // Keep the live position inside Supabase Presence itself.
        // This is the source of truth for the participant list, so it
        // continues to work even when Broadcast is delayed or blocked.
        await cinemaChannel.track({
          name: getPresenceName(cinemaUser),
          user_id: cinemaUser.id,
          is_anonymous: Boolean(cinemaUser.is_anonymous),
          ready: true,
          position,
          position_at: positionAt,
          is_playing: isPlaying
        });

        await broadcast({
          type: "position",
          position,
          position_at: positionAt,
          is_playing: isPlaying,
          user_id: cinemaUser.id
        });
      } catch {}
      updateRoomPlaybackWidget();
    };
    await publish();
    presencePositionTimer = setInterval(publish, 1200);
  }

  function stopPresencePositionSync() {
    clearInterval(presencePositionTimer);
    presencePositionTimer = null;
  }

  async function startSharedClock() {
    clearInterval(sharedClockTimer);
    sharedClockTimer = setInterval(async () => {
      if (!cinemaRoom || !cinemaUser || !isRoomLeader()) return;
      const playing = youtubePlayerReady
        ? youtubePlayer.getPlayerState?.() === YT.PlayerState.PLAYING
        : cinemaVideoProvider === "rutube"
          ? cinemaState.is_playing
          : cinemaVideoProvider === "vk"
            ? cinemaState.is_playing
            : !cinemaVideo.hidden && !cinemaVideo.paused;
      const position = getLocalPosition();
      const now = Date.now();
      if (now - lastSharedClockAt < 800) return;
      lastSharedClockAt = now;

      cinemaState.is_playing = playing;
      cinemaState.position_seconds = position;
      cinemaState.updated_at = new Date().toISOString();
      broadcast({
        type: "clock",
        position,
        is_playing: playing,
        updated_at: cinemaState.updated_at,
        source: youtubePlayerReady ? "youtube" : cinemaVideoProvider === "rutube" ? "rutube" : cinemaVideoProvider === "vk" ? "vk" : "direct"
      });

      if (now - lastStatePersistAt >= 3000) await persistRoomState();
    }, 900);
  }

  function stopSharedClock() {
    clearInterval(sharedClockTimer);
    sharedClockTimer = null;
  }

  async function applySharedClock(payload) {
    if (!payload || payload.updated_at && cinemaState.updated_at && new Date(payload.updated_at) < new Date(cinemaState.updated_at)) return;
    cinemaState.position_seconds = Number(payload.position) || 0;
    cinemaState.is_playing = Boolean(payload.is_playing);
    cinemaState.updated_at = payload.updated_at || new Date().toISOString();

    const target = getSharedPosition(cinemaState);
    const local = getLocalPosition();
    const drift = target - local;
    updateRoomPlaybackWidget();

    if (roomSyncWidget) {
      const seconds = Math.abs(drift);
      roomSyncWidget.textContent = seconds < 0.75 ? "Идеально" : seconds < 2 ? "Выравниваем…" : "Синхронизируем…";
      roomSyncWidget.className = seconds < 0.75 ? "cinema-sync-good" : "cinema-sync-warn";
    }
    if (Math.abs(drift) < 0.75) {
      // Даже при минимальном рассинхроне состояние play/pause должно совпадать.
      // Иначе участник мог продолжать смотреть, пока комната уже поставлена на паузу.
      if (youtubePlayerReady && youtubePlayer) {
        const ytPlaying = youtubePlayer.getPlayerState?.() === YT.PlayerState.PLAYING;
        if (cinemaState.is_playing && !ytPlaying) {
          applyingRemotePlayback = true;
          youtubePlayer.playVideo();
          setTimeout(() => { applyingRemotePlayback = false; }, 300);
        } else if (!cinemaState.is_playing && ytPlaying) {
          applyingRemotePlayback = true;
          youtubePlayer.pauseVideo();
          setTimeout(() => { applyingRemotePlayback = false; }, 300);
        }
      } else if (cinemaVideoProvider === "rutube") {
        if (cinemaState.is_playing && playbackUnlocked) rutubeCommand("player:play");
        else rutubeCommand("player:pause");
      } else if (cinemaVideoProvider === "vk") {
        // VK iframe is controlled independently; keep the shared room state authoritative.
      } else if (!cinemaVideo.hidden) {
        if (cinemaState.is_playing && cinemaVideo.paused) {
          applyingRemotePlayback = true;
          cinemaVideo.play().catch(() => {});
          setTimeout(() => { applyingRemotePlayback = false; }, 150);
        } else if (!cinemaState.is_playing && !cinemaVideo.paused) {
          applyingRemotePlayback = true;
          cinemaVideo.pause();
          setTimeout(() => { applyingRemotePlayback = false; }, 150);
        }
      }
      updateRoomPlaybackWidget();
      return;
    }

    applyingRemotePlayback = true;
    if (youtubePlayerReady) {
      youtubePlayer.seekTo(target, true);
      if (cinemaState.is_playing && playbackUnlocked) youtubePlayer.playVideo();
      else youtubePlayer.pauseVideo();
    } else if (cinemaVideoProvider === "rutube") {
      rutubeCommand("player:setCurrentTime", { time: target });
      if (cinemaState.is_playing && playbackUnlocked) rutubeCommand("player:play");
      else rutubeCommand("player:pause");
    } else if (cinemaVideoProvider === "vk") {
      // VK keeps its iframe state; the room clock remains authoritative.
    } else if (!cinemaVideo.hidden) {
      try { cinemaVideo.currentTime = target; } catch {}
      if (cinemaState.is_playing && playbackUnlocked) cinemaVideo.play().catch(() => {});
      else cinemaVideo.pause();
    }
    cinemaSyncStatus.textContent = Math.abs(drift) > 1.5
      ? "Синхронизируем вечер ✦"
      : "Смотрим вместе ✦";
    setTimeout(() => { applyingRemotePlayback = false; }, 300);
  }

  async function persistRoomState(patch = {}) {
    if (!cinemaRoom || !cinemaUser || !supabase) return;
    cinemaState = { ...cinemaState, ...patch };
    const now = Date.now();
    if (now - lastStatePersistAt < 700 && !patch.force) return;
    lastStatePersistAt = now;
    const { error } = await supabase.from("room_state").upsert({
      room_id: cinemaRoom.id,
      video_url: cinemaState.video_url,
      position_seconds: Number.isFinite(cinemaState.position_seconds) ? cinemaState.position_seconds : 0,
      is_playing: Boolean(cinemaState.is_playing),
      updated_by: cinemaUser.id,
      updated_at: new Date().toISOString()
    }, { onConflict: "room_id" });
    if (error) console.warn("LUNEVIA room state:", error.message);
  }

  async function applyRoomState(state, fromRemote = false) {
    if (!state) return;
    cinemaState = {
      video_url: state.video_url || null,
      position_seconds: Number(state.position_seconds) || 0,
      is_playing: Boolean(state.is_playing),
      updated_at: state.updated_at || null
    };
    if (cinemaState.video_url) {
      const changedSource = cinemaSourceInput.value.trim() !== cinemaState.video_url;
      if (changedSource) showVideo(cinemaState.video_url);
      if (!cinemaVideo.hidden) {
        const setPosition = () => { try { cinemaVideo.currentTime = Math.max(0, cinemaState.position_seconds); } catch {} };
        if (cinemaVideo.readyState >= 1) setPosition();
        else cinemaVideo.addEventListener("loadedmetadata", setPosition, { once: true });
        applyingRemotePlayback = true;
        if (cinemaState.is_playing) {
          cinemaVideo.play().catch(() => {});
          cinemaSyncStatus.textContent = fromRemote ? "Смотрим вместе ✦" : "Видео восстановлено ✦";
        } else {
          cinemaVideo.pause();
          cinemaSyncStatus.textContent = fromRemote ? "Пауза у всех ✦" : "Видео восстановлено на паузе ✦";
        }
        setTimeout(() => { applyingRemotePlayback = false; }, 120);
      } else {
        cinemaSyncStatus.textContent = "Видео восстановлено для комнаты ✦";
      }
    }
  }

  async function loadRoomState() {
    if (!cinemaRoom || !supabase) return;
    const { data, error } = await supabase.from("room_state")
      .select("room_id, video_url, position_seconds, is_playing, updated_by, updated_at")
      .eq("room_id", cinemaRoom.id)
      .maybeSingle();
    if (!error && data) await applyRoomState(data);
  }

  async function openCinema(code) {
    if (!supabase) {
      openAccount("login");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    cinemaUser = authData?.user;
    if (!cinemaUser) {
      openAccount("login");
      return;
    }
    const { data: room, error } = await supabase.from("rooms")
      .select("id, code, name, avatar, frame")
      .eq("code", code)
      .maybeSingle();
    if (error || !room) {
      showAccountMessage("Комната больше не найдена.");
      return;
    }
    const { data: membership, error: membershipError } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("room_id", room.id)
      .eq("user_id", cinemaUser.id)
      .maybeSingle();

    if (membershipError || !membership) {
      showAccountMessage("У тебя больше нет доступа к этой комнате.");
      clearActiveRoom();
      return;
    }

    cinemaRoom = room;
    saveActiveRoom(room.code);
    cinemaCode.textContent = room.code;
    if (cinemaInviteLink) {
      const inviteUrl = getRoomInviteUrl(room.code);
      cinemaInviteLink.href = inviteUrl || "#";
      cinemaInviteLink.textContent = inviteUrl || "Ссылка недоступна";
    }
    cinemaTitle.textContent = room.name;
    cinemaOverlay.classList.add("is-open");
    cinemaOverlay.setAttribute("aria-hidden","false");
    document.body.classList.add("modal-open");

    cinemaPresenceKey = `${room.id}:${cinemaUser.id}`;
    cinemaChannel = supabase.channel(`lunevia-room-${room.id}`, {
      config: {
        presence: { key: cinemaPresenceKey },
        broadcast: { self: false, ack: true }
      }
    });
    cinemaChannel
      .on("presence", { event:"sync" }, () => {
        refreshCinemaPresence();
        startSharedClock();
      })
      .on("presence", { event:"join" }, ({ key, newPresences }) => {
        refreshCinemaPresence();
        const joined = getPresenceLabel(newPresences?.[0]);
        if (key !== cinemaPresenceKey) showPresenceNotice(joined + " вошёл в комнату ✦");
      })
      .on("presence", { event:"leave" }, ({ key, leftPresences }) => {
        const left = getPresenceLabel(leftPresences?.[0]);
        refreshCinemaPresence();
        if (key !== cinemaPresenceKey) showPresenceNotice(left + " вышел из комнаты");
      })
      .on("broadcast", { event:"cinema" }, async ({ payload }) => {
        if (!payload) return;
        if (payload.type === "sync-request") {
          const position = getLocalPosition();
          const playing = youtubePlayerReady
            ? youtubePlayer.getPlayerState?.() === YT.PlayerState.PLAYING
            : cinemaVideoProvider === "rutube"
              ? cinemaState.is_playing
              : cinemaVideoProvider === "vk"
                ? cinemaState.is_playing
                : !cinemaVideo.hidden && !cinemaVideo.paused;
          await broadcast({
            type: "sync-state",
            video_url: cinemaState.video_url,
            position,
            is_playing: playing,
            updated_at: new Date().toISOString(),
            source: youtubePlayerReady ? "youtube" : cinemaVideoProvider
          });
          return;
        }
        if (payload.type === "sync-state") {
          if (payload.video_url && cinemaSourceInput.value.trim() !== payload.video_url) {
            cinemaState.video_url = payload.video_url;
            showVideo(payload.video_url);
          }
          cinemaState.position_seconds = Number(payload.position) || 0;
          cinemaState.is_playing = Boolean(payload.is_playing);
          cinemaState.updated_at = payload.updated_at || new Date().toISOString();
          if (cinemaState.video_url) await applyRoomState(cinemaState, true);
          return;
        }
        if (payload.type === "source" && payload.url) {
          cinemaState.video_url = payload.url;
          cinemaState.position_seconds = Number(payload.position) || 0;
          cinemaState.is_playing = false;
          cinemaState.updated_at = payload.updated_at || new Date().toISOString();
          await applyRoomState(cinemaState, true);
          return;
        }
        if (payload.type === "play" || payload.type === "pause") {
          await applyPlaybackCommand({
            position: Number(payload.position) || 0,
            playing: payload.type === "play",
            updated_at: payload.updated_at || new Date().toISOString()
          });
          cinemaSyncStatus.textContent = payload.type === "play" ? "Смотрим вместе ✦" : "Пауза у всех ✦";
          return;
        }
        if (payload.type === "clock") {
          await applySharedClock(payload);
          return;
        }
        if (payload.type === "position") {
          const entry = cinemaMembers.get(`${room.id}:${payload.user_id}`);
          if (entry?.[0]) {
            entry[0].position = Number(payload.position) || 0;
            entry[0].position_at = payload.position_at || new Date().toISOString();
            entry[0].is_playing = Boolean(payload.is_playing);
          }
          updateRoomPlaybackWidget();
          return;
        }
        if (payload.type === "seek") {
          cinemaState.position_seconds = Number(payload.position) || 0;
          if (payload.source === "youtube" && youtubePlayerReady) {
            applyingRemotePlayback = true;
            youtubePlayer.seekTo(cinemaState.position_seconds, true);
            setTimeout(() => { applyingRemotePlayback = false; }, 250);
          } else if (!cinemaVideo.hidden) {
            applyingRemotePlayback = true;
            try { cinemaVideo.currentTime = cinemaState.position_seconds; } catch {}
            setTimeout(() => { applyingRemotePlayback = false; }, 120);
          }
        }
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "room_state",
        filter: "room_id=eq." + room.id
      }, async (payload) => {
        if (!payload.new || payload.new.updated_by === cinemaUser.id) return;
        await applyRoomState(payload.new, true);
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "room_messages",
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        if (!payload.new || payload.new.user_id === cinemaUser.id) return;
        renderChatMessage({
          id: payload.new.id,
          message: payload.new.message,
          name: "Участник",
          created_at: payload.new.created_at
        }, false);
      })
      .subscribe(async (status) => {
        cinemaChannelStatus = status;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("LUNEVIA Realtime channel status:", status);
        }
        if (status === "SUBSCRIBED") {
          await cinemaChannel.track({
            name: getPresenceName(cinemaUser),
            user_id: cinemaUser.id,
            is_anonymous: Boolean(cinemaUser.is_anonymous),
            ready: true,
            position: getLocalPosition()
          });
          await new Promise(resolve => setTimeout(resolve, 180));
          await broadcast({ type: "sync-request", requester: cinemaUser.id });
          await new Promise(resolve => setTimeout(resolve, 250));
          refreshCinemaPresence();
          updateMembers();
          startPlaybackWidgetTimer();
          startSharedClock();
          startPresencePositionSync();
        }
      });

    await loadChat();
    await loadRoomState();
    updateRoomPlaybackWidget();
  }

  function closeCinema() {
    clearActiveRoom();
    cinemaPresenceKey = null;
    cinemaChannel?.untrack();
    if (cinemaChannel) supabase.removeChannel(cinemaChannel);
    cinemaChannelStatus = "CLOSED";
    cinemaChannel = null;
    stopYouTubeSyncMonitor();
    stopPlaybackWidgetTimer();
    stopSharedClock();
    stopPresencePositionSync();
    roomLeaderId = null;
    cinemaRoom = null;
    cinemaUser = null;
    cinemaMembers.clear();
    cinemaState = { video_url: null, position_seconds: 0, is_playing: false, updated_at: null };
    rutubeDuration = 0;
    lastRutubePosition = 0;
    lastStatePersistAt = 0;
    cinemaOverlay.classList.remove("is-open");
    cinemaOverlay.setAttribute("aria-hidden","true");
    document.body.classList.remove("modal-open");
    cinemaFrame.src = "";
    cinemaVideo.pause();
    cinemaVideo.removeAttribute("src");
    cinemaVideo.load();
    screenEmpty.hidden = false;
    cinemaFrame.hidden = true;
    cinemaVideo.hidden = true;
    chatMessages.innerHTML = "";
  }

  window.LuneviaCinema = { open: openCinema };

  document.getElementById("chatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message || !cinemaRoom || !cinemaUser) return;
    const { data: savedMessage, error } = await supabase.from("room_messages").insert({
      room_id: cinemaRoom.id,
      user_id: cinemaUser.id,
      message
    }).select("id, message, created_at, user_id").single();
    if (error) return;
    const name = cinemaUser.user_metadata?.full_name || cinemaUser.email?.split("@")[0] || "Лунный гость";
    renderChatMessage({ id: savedMessage?.id, message, name, created_at: savedMessage?.created_at }, true);
    chatInput.value = "";
  });

document.addEventListener("click", async (event) => {
    const emojiTrigger = event.target.closest("#chatEmojiButton");
    const emojiPicker = document.getElementById("chatEmojiPicker");
    const emojiChoice = event.target.closest("#chatEmojiPicker [data-emoji]");

    if (emojiTrigger) {
      event.preventDefault();
      event.stopPropagation();
      if (emojiPicker) emojiPicker.hidden = !emojiPicker.hidden;
      return;
    }

    if (emojiChoice) {
      event.preventDefault();
      event.stopPropagation();
      const chatInputEl = document.getElementById("chatInput");
      if (chatInputEl) {
        const emoji = emojiChoice.dataset.emoji || "";
        const start = chatInputEl.selectionStart ?? chatInputEl.value.length;
        const end = chatInputEl.selectionEnd ?? chatInputEl.value.length;
        chatInputEl.value = chatInputEl.value.slice(0, start) + emoji + chatInputEl.value.slice(end);
        const caret = start + emoji.length;
        chatInputEl.focus();
        chatInputEl.setSelectionRange(caret, caret);
      }
      if (emojiPicker) emojiPicker.hidden = true;
      return;
    }

    if (emojiPicker && !emojiPicker.hidden && !event.target.closest("#chatEmojiPicker") && !emojiTrigger) {
      emojiPicker.hidden = true;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "close-cinema") closeCinema();
    if (action === "cinema-theater") {
      cinemaOverlay.classList.toggle("cinema-theater-mode");
      const theaterButton = event.target.closest("[data-action='cinema-theater']");
      if (theaterButton) {
        theaterButton.innerHTML = cinemaOverlay.classList.contains("cinema-theater-mode")
          ? "⤢ Обычный вид"
          : "⛶ Театр";
      }
    }
    if (action === "cinema-copy-link") {
      const url = getRoomInviteUrl(cinemaCode.textContent.trim());
      const button = event.target.closest("[data-action='cinema-copy-link']");
      const original = button?.innerHTML;
      if (!url) return;
      copyText(url).then(() => {
        if (button) {
          button.innerHTML = "Ссылка скопирована ✓";
          setTimeout(() => (button.innerHTML = original), 1800);
        }
      }).catch(() => {
        if (button) {
          button.innerHTML = "Скопируй ссылку выше";
          setTimeout(() => (button.innerHTML = original), 2200);
        }
      });
    }
    if (action === "cinema-copy") {
      const button = event.target.closest("[data-action='cinema-copy']");
      const original = button?.innerHTML;
      copyText(cinemaCode.textContent.trim())
        .then(() => {
          if (button) {
            button.innerHTML = "Код скопирован ✓";
            setTimeout(() => (button.innerHTML = original), 1800);
          }
        })
        .catch(() => {
          if (button) {
            button.innerHTML = "Выдели код выше";
            setTimeout(() => (button.innerHTML = original), 2200);
          }
        });
    }
    if (button.dataset.source) {
      cinemaSourceInput.value = button.dataset.source;
      cinemaSourceInput.focus();
    }
  });

  const cinemaLoadSourceButton = document.querySelector("[data-action='load-source']");
  if (cinemaLoadSourceButton) {
    cinemaLoadSourceButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!cinemaRoom || !cinemaUser) {
        cinemaSyncStatus.textContent = "Сначала войди в комнату ✦";
        return;
      }
      const url = cinemaSourceInput.value.trim();
      if (!url) {
        cinemaSyncStatus.textContent = "Вставь ссылку на видео ✦";
        cinemaSourceInput.focus();
        return;
      }
      cinemaLoadSourceButton.disabled = true;
      try {
        const opened = showVideo(url);
        if (!opened) return;
        cinemaState = {
          video_url: url,
          position_seconds: 0,
          is_playing: false,
          updated_at: new Date().toISOString()
        };
        await persistRoomState({ force: true });
        await broadcast({
          type: "source",
          url,
          position: 0,
          is_playing: false,
          updated_at: cinemaState.updated_at
        });
        cinemaSyncStatus.textContent = "Видео открыто для комнаты ✦";
      } catch (error) {
        console.error("LUNEVIA: open video error", error);
        cinemaSyncStatus.textContent = "Не удалось открыть видео ✦";
      } finally {
        cinemaLoadSourceButton.disabled = false;
      }
    });
  }

  function youtubePostCommand(command, args = []) {
    if (!cinemaFrame?.contentWindow) return false;
    try {
      cinemaFrame.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func: command,
        args
      }), "https://www.youtube.com");
      return true;
    } catch {
      return false;
    }
  }

  async function waitForPlaybackReady(timeout = 7000) {
    // Direct video is ready immediately.
    if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) return true;

    // YouTube iframe can be controlled through postMessage even while
    // the JS API player object is still initializing.
    if (cinemaVideoProvider === "youtube" && !cinemaFrame.hidden) return true;

    // RUTUBE needs its player bridge to report ready.
    const started = Date.now();
    while (cinemaVideoProvider === "rutube" && Date.now() - started < timeout) {
      if (rutubeReady) return true;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  }

  if (cinemaSourceInput) {
    cinemaSourceInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      const button = document.querySelector("[data-action='load-source']");
      if (button && !button.disabled) button.click();
    });
  }

  cinemaVideo.addEventListener("play", async () => {
    if (!cinemaRoom || !cinemaUser || applyingRemotePlayback) return;
    cinemaState.is_playing = true;
    cinemaState.position_seconds = cinemaVideo.currentTime || 0;
    await persistRoomState({ force: true });
    broadcast({ type:"play", position: cinemaState.position_seconds });
  });

  cinemaVideo.addEventListener("pause", async () => {
    if (!cinemaRoom || !cinemaUser || applyingRemotePlayback || cinemaVideo.seeking) return;
    cinemaState.is_playing = false;
    cinemaState.position_seconds = cinemaVideo.currentTime || 0;
    await persistRoomState({ force: true });
    broadcast({ type:"pause", position: cinemaState.position_seconds });
  });

  cinemaVideo.addEventListener("seeked", async () => {
    updateRoomPlaybackWidget();
    if (!cinemaRoom || !cinemaUser || applyingRemotePlayback) return;
    cinemaState.position_seconds = cinemaVideo.currentTime || 0;
    await persistRoomState({ force: true });
    broadcast({ type:"seek", position: cinemaState.position_seconds });
  });

  cinemaVideo.addEventListener("timeupdate", async () => {
    updateRoomPlaybackWidget();
    if (!cinemaRoom || !cinemaUser || applyingRemotePlayback || cinemaVideo.paused) return;
    cinemaState.position_seconds = cinemaVideo.currentTime || 0;
    if (Date.now() - lastStatePersistAt >= 3000) await persistRoomState();
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAccountMessage();

    const email = registerEmail.value.trim().toLowerCase();
    const password = registerPassword.value;

    if (accountMode === "recovery") {
      if (!supabase) {
        showAccountMessage("Авторизация временно недоступна. Обнови страницу и попробуй ещё раз.");
        return;
      }
      if (password.length < 6) {
        showAccountMessage("Пароль должен содержать минимум 6 символов.");
        return;
      }
      accountSubmit.disabled = true;
      accountSubmit.innerHTML = "Сохраняем… <span>✦</span>";
      const { error } = await supabase.auth.updateUser({ password });
      accountSubmit.disabled = false;
      accountSubmit.innerHTML = "Сохранить новый пароль <span>✦</span>";
      if (error) {
        showAccountMessage("Не получилось изменить пароль. Открой ссылку из письма ещё раз.");
        return;
      }
      registerForm.hidden = true;
      accountSuccess.hidden = false;
      accountSuccessName.textContent = "Пароль обновлён ✦";
      accountSuccess.querySelector("span").textContent = "Готово";
      accountSuccess.querySelector("p").textContent = "Теперь можно войти в LUNEVIA с новым паролем.";
      return;
    }

    if (accountMode === "signup") {
      if (!supabase) {
        showAccountMessage("Авторизация временно недоступна. Обнови страницу и попробуй ещё раз.");
        return;
      }
      const name = registerName.value.trim();
      if (!name || !email || password.length < 6 || !registerAgree.checked) return;

      accountSubmit.disabled = true;
      accountSubmit.innerHTML = "Создаём твой мир… <span>✦</span>";

      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: name }
        }
      });

      accountSubmit.disabled = false;
      accountSubmit.innerHTML = "Создать аккаунт <span>✦</span>";

      if (error) {
        showAccountMessage(error.message);
        return;
      }

      registerForm.hidden = true;
      accountSuccess.hidden = false;
      accountSuccessName.textContent = name + " — ты в LUNEVIA";
      accountSuccess.querySelector("p").textContent =
        data.session ? "Аккаунт создан. Ты уже вошёл в LUNEVIA." : "Проверь почту и подтверди адрес, чтобы завершить регистрацию.";
      return;
    }

    if (!email || password.length < 6) return;
    if (!supabase) {
      showAccountMessage("Авторизация временно недоступна. Обнови страницу и попробуй ещё раз.");
      return;
    }

    accountSubmit.disabled = true;
    accountSubmit.innerHTML = "Входим… <span>→</span>";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    accountSubmit.disabled = false;
    accountSubmit.innerHTML = "Войти <span>→</span>";

    if (error) {
      showAccountMessage("Не получилось войти. Проверь почту и пароль.");
      return;
    }

    const name = data.user?.user_metadata?.full_name || email.split("@")[0];
    registerForm.hidden = true;
    accountSuccess.hidden = false;
    accountSuccessName.textContent = name + " — ты в LUNEVIA";
    accountSuccess.querySelector("span").textContent = "С возвращением";
    accountSuccess.querySelector("p").textContent = "Ты снова внутри своей киновселенной.";
  });

  const inviteRoomCode = normalizeRoomCode(new URLSearchParams(window.location.search).get("room"));
  pendingInviteCode = inviteRoomCode;

  if (inviteRoomCode) {
    saveActiveRoom(inviteRoomCode);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("room");
    history.replaceState(null, "", cleanUrl.pathname + (cleanUrl.searchParams.toString() ? "?" + cleanUrl.searchParams.toString() : "") + cleanUrl.hash);
  }

  if (supabase) supabase.auth.getSession().then(async ({ data }) => {
    updateNav(data.session?.user || null);

    if (inviteRoomCode && !window.location.hash.includes("access_token=")) {
      // An invitation is a guest entry point. Even if this browser has a
      // registered session from an earlier test, do not reuse that identity.
      // Supabase keeps one auth session per client, so replace the current
      // session with a fresh anonymous identity for this invitation.
      setTimeout(() => joinAsGuest(), 0);
    } else if (data.session) {
      document.body.classList.add("has-account");
      scheduleRoomRestore();
    }

    if (window.location.hash.includes("access_token=")) {
      openAccount("recovery");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  });

  if (supabase) supabase.auth.onAuthStateChange((event, session) => {
    document.body.classList.toggle("has-account", Boolean(session));
    updateNav(session?.user || null);

    if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
      if (session && !window.location.hash.includes("access_token=")) {
        scheduleRoomRestore();
      }
    }

    if (event === "PASSWORD_RECOVERY") {
      openAccount("recovery");
    }

    if (event === "SIGNED_OUT") {
      if (!switchingToGuestSession) {
        clearActiveRoom();
        closeCinema();
      }
    }
  });

  document.querySelectorAll(".avatar-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      selectedAvatar = button.dataset.avatar;
    });
  });

  document.querySelectorAll(".frame-option").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".frame-option").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      selectedFrame = button.dataset.frame;
    });
  });

  joinCode.addEventListener("input", () => {
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9);
    joinCode.setCustomValidity("");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeRoom();
    if (event.key === "Escape" && accountOverlay.classList.contains("is-open")) closeAccount();
  });
});