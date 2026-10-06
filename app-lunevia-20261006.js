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

  // Main-page controls: explicit bindings keep the hero/header buttons responsive.
  const bindMainAction = (selector, action) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (button.dataset.luneviaMainBound === "1") return;
      button.dataset.luneviaMainBound = "1";
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          await handleAction(action, button);
        } catch (error) {
          console.error("LUNEVIA main action error:", error);
        }
      });
    });
  };

  bindMainAction("[data-action='create']", "create");
  bindMainAction("[data-action='join']", "join");

  // Direct room-create binding: this button must work even if another document-level handler interferes.
  const createRoomButton = document.querySelector("[data-action='create-room']");
  if (createRoomButton) {
    createRoomButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        await handleAction("create-room", createRoomButton);
      } catch (error) {
        console.error("LUNEVIA create-room error:", error);
        createRoomButton.disabled = false;
        createRoomButton.innerHTML = "Создать комнату <span>✦</span>";
        showRoomError(error?.message || "Не удалось создать комнату. Попробуй ещё раз.");
      }
    }, true);
  }


  // Global action bridge: keep buttons responsive even if an optional init block fails later.
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (!action) return;
    event.preventDefault();
    try {
      await handleAction(action, button);
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
  const accountNavButton = document.getElementById("accountNavButton");

  // Верхняя кнопка «Войти»: отдельная прямая привязка, чтобы её не перехватывали другие обработчики.
  if (accountNavButton && !accountNavButton.dataset.luneviaLoginBound) {
    accountNavButton.dataset.luneviaLoginBound = "1";
    accountNavButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await handleAction(accountNavButton.dataset.action || "login", accountNavButton);
      } catch (error) {
        console.error("LUNEVIA account button error:", error);
      }
    }, true);
  }
  const profileOverlay = document.getElementById("profileOverlay");
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

  window.luneviaOpenLogin = () => openAccount("login");
  window.luneviaOpenSignup = () => openAccount("signup");

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
      // Гость выбирает имя прямо в интерфейсе LUNEVIA.
      const guestNamePanel = document.getElementById("guestNamePanel");
      const guestNameInput = document.getElementById("guestNameInput");
      const guestNameConfirm = document.getElementById("guestNameConfirm");
      const guestNameCancel = document.getElementById("guestNameCancel");
      const savedGuestNickname = localStorage.getItem("lunevia_guest_nickname") || "";

      if (!guestNamePanel || !guestNameInput || !guestNameConfirm) {
        throw new Error("Не удалось открыть форму имени гостя.");
      }

      guestNamePanel.hidden = false;
      guestNameInput.value = savedGuestNickname;
      guestNameInput.focus();
      guestNameInput.select();

      const guestNickname = await new Promise((resolve, reject) => {
        const cleanup = () => {
          guestNameConfirm.removeEventListener("click", confirm);
          guestNameCancel?.removeEventListener("click", cancel);
          guestNameInput.removeEventListener("keydown", keydown);
        };
        const cancel = () => {
          cleanup();
          guestNamePanel.hidden = true;
          reject(new Error("Вход отменён."));
        };
        const confirm = () => {
          const value = guestNameInput.value.trim().replace(/\\s+/g, " ").slice(0, 24);
          if (!value) {
            guestNameInput.focus();
            return;
          }
          cleanup();
          guestNamePanel.hidden = true;
          localStorage.setItem("lunevia_guest_nickname", value);
          resolve(value);
        };
        const keydown = (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            confirm();
          } else if (event.key === "Escape") {
            cancel();
          }
        };
        guestNameConfirm.addEventListener("click", confirm);
        guestNameCancel?.addEventListener("click", cancel);
        guestNameInput.addEventListener("keydown", keydown);
      });

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
        options: { data: { full_name: guestNickname, guest_nickname: guestNickname } }
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
    // load-source is handled by the dedicated cinema click handler below.
    // Keeping it out of this generic bridge prevents the video from loading twice.
    else if (action === "load-source") return;
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
        // Code entry must use the exact same room/guest flow as an invite link.
        // Keep the entered code so the account dialog can offer guest entry.
        pendingInviteCode = code;
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
      const code = normalizeRoomCode(roomCode.textContent);
      if (!code) {
        showRoomError("Код комнаты не найден. Создай или выбери комнату ещё раз.");
        return;
      }

      if (!supabase) {
        closeRoom();
        openAccount("login");
        return;
      }

      const original = button?.innerHTML;
      if (button) {
        button.disabled = true;
        button.innerHTML = "Открываем… <span>→</span>";
      }

      try {
        await openCinema(code);
        closeRoom();
      } catch (error) {
        console.error("LUNEVIA: open room error", error);
        cinemaSyncStatus.textContent = "Не удалось открыть комнату ✦";
        showRoomError(error?.message || "Не удалось открыть комнату. Попробуй ещё раз.");
      } finally {
        if (button) {
          button.disabled = false;
          button.innerHTML = original || "Открыть комнату <span>→</span>";
        }
      }
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
    const roomCodeWidget = document.getElementById("roomCodeWidget");

  let cinemaRoom = null;
  let cinemaUser = null;
  let cinemaChannel = null;
  let cinemaPresenceKey = null;
  let browserPresenceId = "";
  // A participant is a TAB/CONNECTION, not an account.
  // Never persist this ID: every open tab/window must be a separate viewer,
  // even when both tabs use the same browser and the same logged-in account.
  try {
    browserPresenceId = crypto?.randomUUID?.() || ("tab-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  } catch {
    browserPresenceId = "tab-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }
  const presenceInstanceId = browserPresenceId;
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
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (!["youtube.com", "youtu.be", "m.youtube.com"].includes(host)) return null;
      let id = host === "youtu.be"
        ? parsed.pathname.split("/").filter(Boolean)[0]
        : parsed.searchParams.get("v");
      if (!id && /^\/shorts\//i.test(parsed.pathname)) id = parsed.pathname.split("/")[2];
      if (!id && /^\/embed\//i.test(parsed.pathname)) id = parsed.pathname.split("/")[2];
      return id ? id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) : null;
    } catch {
      return null;
    }
  }

  function youtubeEmbed(url) {
    const id = youtubeVideoId(url);
    return id
      ? `https://www.youtube.com/embed/${id}?enablejsapi=1&controls=1&rel=0&playsinline=1&fs=1&disablekb=0&cc_load_policy=0&origin=${encodeURIComponent(window.location.origin)}`
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

  function handleProviderMessage(event) {
    if (!cinemaRoom || !cinemaUser || !event?.data) return;
    let payload = event.data;
    if (typeof payload === "string") {
      try { payload = JSON.parse(payload); } catch { return; }
    }
    if (!payload || typeof payload !== "object") return;
    if (payload.type === "player:changeState" && payload.data?.state === "stopped") {
      hideProviderRecommendations();
      broadcast({
        type: "ended",
        position: Number(rutubeDuration) || Number(cinemaState.position_seconds) || 0,
        source: "rutube",
        updated_at: new Date().toISOString()
      });
    }
  }

  window.addEventListener("message", handleProviderMessage);

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

  let vkPlayer = null;
  let vkPlayerReady = false;
  let vkPlayerUrl = null;
  let lastVkPosition = 0;
  let vkDuration = 0;

  function loadVKApi() {
    if (window.VK?.VideoPlayer) return Promise.resolve(window.VK);
    if (window.__luneviaVKApiPromise) return window.__luneviaVKApiPromise;
    window.__luneviaVKApiPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-lunevia-vk-api]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.VK), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://vk.com/js/api/videoplayer.js";
      script.async = true;
      script.dataset.luneviaVkApi = "1";
      script.onload = () => window.VK?.VideoPlayer ? resolve(window.VK) : reject(new Error("VK Video API unavailable"));
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.__luneviaVKApiPromise;
  }

  async function initVKPlayer(url) {
    if (cinemaVideoProvider !== "vk" || !cinemaFrame) return null;
    vkPlayerReady = false;
    vkPlayerUrl = url;
    try {
      await Promise.race([
        loadVKApi(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("VK Video API timeout")), 7000))
      ]);
    } catch (error) {
      console.warn("LUNEVIA: VK Video API unavailable.", error);
      return null;
    }

    try { vkPlayer?.destroy?.(); } catch {}
    vkPlayer = null;

    try {
      vkPlayer = window.VK.VideoPlayer(cinemaFrame);
    } catch (error) {
      console.warn("LUNEVIA: VK VideoPlayer init failed.", error);
      return null;
    }

    vkPlayerReady = true;
    const updateFromVK = (state) => {
      const position = Number(state?.time) || 0;
      const duration = Number(state?.duration) || 0;
      if (duration > 0) vkDuration = duration;
      lastVkPosition = position;
      updateRoomPlaybackWidget();
      return position;
    };

    const onStarted = (state) => {
      updateFromVK(state);
      if (applyingRemotePlayback) return;
      cinemaState.is_playing = true;
      cinemaState.position_seconds = lastVkPosition;
      cinemaState.updated_at = new Date().toISOString();
      persistRoomState({ force: true });
      broadcast({ type: "play", position: lastVkPosition, source: "vk", updated_at: cinemaState.updated_at });
      cinemaSyncStatus.textContent = "Смотрим вместе ✦";
    };
    const onResumed = onStarted;
    const onPaused = (state) => {
      updateFromVK(state);
      if (applyingRemotePlayback) return;
      cinemaState.is_playing = false;
      cinemaState.position_seconds = lastVkPosition;
      cinemaState.updated_at = new Date().toISOString();
      persistRoomState({ force: true });
      broadcast({ type: "pause", position: lastVkPosition, source: "vk", updated_at: cinemaState.updated_at });
      cinemaSyncStatus.textContent = "Пауза у всех ✦";
    };
    const onEnded = (state) => {
      updateFromVK(state);
      cinemaState.is_playing = false;
      cinemaState.position_seconds = lastVkPosition;
      cinemaState.updated_at = new Date().toISOString();
      persistRoomState({ force: true });
      broadcast({ type: "ended", position: lastVkPosition, source: "vk", updated_at: cinemaState.updated_at });
      hideProviderRecommendations();
    };

    try {
      vkPlayer.on("inited", async () => {
        vkPlayerReady = true;
        applyVKState(cinemaState);
        if (pendingRemotePlayback) {
          const command = pendingRemotePlayback;
          pendingRemotePlayback = null;
          await applyPlaybackCommand(command);
        }
      });
      vkPlayer.on("timeupdate", updateFromVK);
      vkPlayer.on("started", onStarted);
      vkPlayer.on("resumed", onResumed);
      vkPlayer.on("paused", onPaused);
      vkPlayer.on("ended", onEnded);
    } catch {}

    return vkPlayer;
  }

  function applyVKState(state) {
    if (!vkPlayerReady || !vkPlayer) return;
    const basePosition = Number(state?.position_seconds) || 0;
    const elapsed = state?.is_playing && state?.updated_at
      ? Math.max(0, (Date.now() - new Date(state.updated_at).getTime()) / 1000)
      : 0;
    const position = basePosition + elapsed;
    applyingRemotePlayback = true;
    try {
      vkPlayer.seek(position);
      if (state?.is_playing) {
        if (playbackUnlocked) vkPlayer.play();
      } else {
        vkPlayer.pause();
      }
    } catch {}
    setTimeout(() => { applyingRemotePlayback = false; }, 500);
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
    try {
      await Promise.race([
        loadYouTubeApi(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("YouTube API timeout")), 7000))
      ]);
    } catch (error) {
      console.warn("LUNEVIA: YouTube API unavailable; iframe mode remains active.", error);
      return null;
    }

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
          onApiChange: () => {
            disableYouTubeCaptions();
          },
          onReady: () => {
            // Force captions off. YouTube otherwise follows the viewer's saved caption preference.
            disableYouTubeCaptions();
            setTimeout(disableYouTubeCaptions, 250);
            setTimeout(disableYouTubeCaptions, 1000);
            youtubePlayerReady = true;
            lastYouTubePosition = youtubePlayer.getCurrentTime?.() || 0;
            updateRoomPlaybackWidget();
            startYouTubeSyncMonitor();
            resolve(youtubePlayer);
            if (pendingRemotePlayback) {
              const command = pendingRemotePlayback;
              pendingRemotePlayback = null;
              await applyPlaybackCommand(command);
            }
          },
          onStateChange: (event) => {
            if (!cinemaRoom || !cinemaUser || !youtubePlayerReady || applyingRemotePlayback) return;
            const state = event.data;
            if (state === YT.PlayerState.PLAYING) {
              const position = youtubePlayer.getCurrentTime() || 0;
              cinemaState.is_playing = true;
              cinemaState.position_seconds = position;
              persistRoomState({ force: true });
              broadcast({ type: "play", position, source: "youtube", updated_at: new Date().toISOString() });
              cinemaSyncStatus.textContent = "Смотрим вместе ✦";
            } else if (state === YT.PlayerState.ENDED) {
              cinemaState.is_playing = false;
              cinemaState.position_seconds = youtubePlayer.getDuration?.() || youtubePlayer.getCurrentTime?.() || cinemaState.position_seconds || 0;
              persistRoomState({ force: true });
              broadcast({ type: "ended", position: cinemaState.position_seconds, source: "youtube", updated_at: new Date().toISOString() });
              hideProviderRecommendations();
            } else if (state === YT.PlayerState.PAUSED) {
              const position = youtubePlayer.getCurrentTime() || 0;
              cinemaState.is_playing = false;
              cinemaState.position_seconds = position;
              persistRoomState({ force: true });
              broadcast({ type: "pause", position, source: "youtube", updated_at: new Date().toISOString() });
              cinemaSyncStatus.textContent = "Пауза у всех ✦";
            }
          }
        }
      });
    });
  }

  function disableYouTubeCaptions() {
    if (!youtubePlayer) return;
    try { youtubePlayer.unloadModule?.("captions"); } catch {}
    try {
      const options = youtubePlayer.getOptions?.("captions") || [];
      if (options.length) youtubePlayer.setOption?.("captions", "reload", false);
    } catch {}
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
    const basePosition = Number(state.position_seconds) || 0;
    const elapsed = state.is_playing && state.updated_at
      ? Math.max(0, (Date.now() - new Date(state.updated_at).getTime()) / 1000)
      : 0;
    const position = basePosition + elapsed;
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

  function hideProviderRecommendations(message = "Видео закончилось ✦") {
    if (cinemaFrame) {
      cinemaFrame.hidden = true;
      cinemaFrame.src = "";
    }
    if (cinemaVideo) {
      cinemaVideo.pause();
      cinemaVideo.hidden = true;
    }
    screenEmpty.hidden = false;
    const emptyText = screenEmpty.querySelector("span");
    const emptySmall = screenEmpty.querySelector("small");
    if (emptyText) emptyText.textContent = message;
    if (emptySmall) emptySmall.textContent = "Рекомендации видеохостинга здесь не показываются.";
    cinemaSyncStatus.textContent = message;
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
    return base + elapsed;
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
    if (cinemaVideoProvider === "vk" && vkDuration > 0) {
      return vkDuration;
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
    const playbackTimeEl = roomViewerWidget || document.getElementById("roomViewerWidget");
    if (!playbackTimeEl) return;
    const current = formatPlaybackTime(getDisplayPlaybackPosition());
    const duration = getPlaybackDuration();
    playbackTimeEl.textContent = duration ? current + " / " + formatPlaybackTime(duration) : current;

    const count = cinemaMembers.size;
    if (roomViewerMeta) {
      roomViewerMeta.textContent = count <= 1 ? "Только ты" : count === 2 ? "Вы вдвоём" : `Вместе · ${count}`;
    }

  }

  let playbackWidgetTimer = null;

  function startPlaybackWidgetTimer() {
    clearInterval(playbackWidgetTimer);
    updateRoomPlaybackWidget();
    playbackWidgetTimer = setInterval(() => {
      updateRoomPlaybackWidget();
    }, 500);
  }

  function stopPlaybackWidgetTimer() {
    clearInterval(playbackWidgetTimer);
    playbackWidgetTimer = null;
  }

  async function trackCinemaPresence() {
    if (!cinemaChannel || !cinemaUser || cinemaChannelStatus !== "SUBSCRIBED") return false;
    const presence = {
      client_id: browserPresenceId,
      instance_id: presenceInstanceId,
      name: getPresenceName(cinemaUser),
      user_id: cinemaUser.id,
      is_anonymous: Boolean(cinemaUser.is_anonymous),
      ready: true,
      position: getLocalPosition(),
      position_at: new Date().toISOString(),
      is_playing: false
    };
    try {
      const result = await cinemaChannel.track(presence);
      const ok = result === "ok" || result === "success" || result == null;
      refreshCinemaPresence();
      return ok;
    } catch (error) {
      console.warn("LUNEVIA: presence track failed", error);
      refreshCinemaPresence();
      return false;
    }
  }

  function getLocalPresencePayload() {
    return {
      client_id: browserPresenceId,
      instance_id: presenceInstanceId,
      name: getPresenceName(cinemaUser),
      guest_nickname: cinemaUser?.is_anonymous ? String(cinemaUser.user_metadata?.guest_nickname || cinemaUser.user_metadata?.full_name || "Лунный гость").trim() : null,
      user_id: cinemaUser?.id || null,
      is_anonymous: Boolean(cinemaUser?.is_anonymous),
      ready: true,
      position: getLocalPosition(),
      position_at: new Date().toISOString(),
      is_playing: false
    };
  }

  async function announceCinemaPresence(type = "hello") {
    if (!cinemaChannel || cinemaChannelStatus !== "SUBSCRIBED") return;
    try {
      await broadcast({
        type: "presence-" + type,
        participant: getLocalPresencePayload()
      });
    } catch (error) {
      console.warn("LUNEVIA: participant announce failed", error);
    }
  }

  function upsertBroadcastParticipant(participant) {
    if (!participant?.client_id || participant.client_id === browserPresenceId) return;
    const key = "broadcast:" + participant.client_id;
    cinemaMembers.set(key, [participant]);
    updateMembers();
  }

  function removeBroadcastParticipant(clientId) {
    if (!clientId) return;
    cinemaMembers.delete("broadcast:" + clientId);
    updateMembers();
  }

  function refreshCinemaPresence() {
    if (!cinemaChannel) return;
    const state = cinemaChannel.presenceState();
    // Keep one entry per actual Presence key. A Presence key may contain
    // multiple metadata records during reconciliation, so never merge their
    // names into one label.
    const broadcastMembers = new Map(
      Array.from(cinemaMembers.entries()).filter(([key]) => key.startsWith("broadcast:"))
    );
    cinemaMembers = new Map(
      Object.entries(state).map(([key, values]) => [
        key,
        Array.isArray(values) ? [values[values.length - 1] || {}] : [{}]
      ])
    );

    // Broadcast is only a temporary fallback for a participant whose
    // Presence entry has not arrived yet. Never keep both records for the
    // same client: that would make one person count as two participants.
    const presenceClientIds = new Set(
      Array.from(cinemaMembers.values())
        .map((values) => values?.[0]?.client_id)
        .filter(Boolean)
    );
    for (const [key, values] of broadcastMembers) {
      const participant = values?.[0] || {};
      if (!presenceClientIds.has(participant.client_id)) {
        cinemaMembers.set(key, values);
      }
    }
    // Presence can take a moment to appear after subscribe. Keep this client
    // visible immediately.
    if (cinemaPresenceKey && !cinemaMembers.has(cinemaPresenceKey)) {
      cinemaMembers.set(cinemaPresenceKey, [{
        name: getPresenceName(cinemaUser),
        guest_nickname: cinemaUser?.is_anonymous ? String(cinemaUser.user_metadata?.guest_nickname || cinemaUser.user_metadata?.full_name || "Лунный гость").trim() : null,
        client_id: browserPresenceId,
        instance_id: presenceInstanceId,
        user_id: cinemaUser?.id || null,
        is_anonymous: Boolean(cinemaUser?.is_anonymous),
        position: getLocalPosition(),
        position_at: new Date().toISOString(),
        is_playing: false,
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
    if (user.is_anonymous) {
      const nickname = String(user.user_metadata?.guest_nickname || user.user_metadata?.full_name || "").trim();
      return nickname || "Лунный гость";
    }
    return user.user_metadata?.full_name || user.email?.split("@")[0] || "Профиль";
  }

  function getPresenceLabel(presence) {
    if (presence?.is_anonymous === true) {
      const guestId = String(presence.user_id || presence.client_id || "").slice(0, 6).toUpperCase();
      return guestId ? "Гость · " + guestId : "Гость";
    }
    const userName = String(presence?.name || "Пользователь").trim();
    return userName;
  }

  function getPresenceIdentity(presence) {
    if (presence?.is_anonymous === true) {
      return "guest:" + String(presence.user_id || presence.client_id || "");
    }
    return "user:" + String(presence?.user_id || presence?.client_id || "");
  }

  function getUniquePresenceLabel(presence, allPresences) {
    const base = getPresenceLabel(presence);
    const identity = getPresenceIdentity(presence);
    const sameIdentity = allPresences.filter((item) => getPresenceIdentity(item) === identity);
    if (sameIdentity.length <= 1) return base;
    const connection = String(presence?.client_id || "").slice(0, 4).toUpperCase();
    return connection ? base + " · " + connection : base;
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
    // One account can have several browser connections. For the participant
    // list we show each real connection, but never confuse account type:
    // registered users stay "пользователь", anonymous sessions stay "гость".
    const entries = Array.from(cinemaMembers.entries()).slice(0, 5);
    const allPresences = Array.from(cinemaMembers.values()).map((values) => values?.[0] || {});
    entries.forEach(([key, values]) => {
      const presence = values?.[0] || {};
      const name = getUniquePresenceLabel(presence, allPresences);
      const row = document.createElement("span");
      row.className = "cinema-person";
      row.style.cssText = "display:inline-flex;align-items:center;gap:6px;width:auto;min-width:0;padding:5px 9px;border-radius:999px;white-space:nowrap;";

      const avatar = document.createElement("span");
      avatar.textContent = (name.trim()[0] || "☾").toUpperCase();
      avatar.style.cssText = "display:grid;place-items:center;flex:0 0 auto;width:22px;height:22px;border-radius:50%;";

      const label = document.createElement("span");
      label.style.cssText = "max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      label.textContent = name;

      row.title = name;
      row.append(avatar, label);
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
    cinemaFrame.style.display = iframeSource ? "block" : "none";
    cinemaVideo.style.display = iframeSource ? "none" : "block";
    cinemaFrame.style.width = "100%";
    cinemaFrame.style.height = "100%";
    cinemaVideo.style.width = "100%";
    cinemaVideo.style.height = "100%";
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
      cinemaFrame.removeAttribute("src");
      cinemaFrame.src = youtube;
      cinemaFrame.hidden = false;
      cinemaFrame.style.display = "block";
      cinemaFrame.style.width = "100%";
      cinemaFrame.style.height = "100%";
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
      cinemaFrame.style.display = "block";
      cinemaFrame.style.width = "100%";
      cinemaFrame.style.height = "100%";
      cinemaFrame.src = iframeSource;
      cinemaSyncStatus.textContent = rutube
        ? "RUTUBE-видео загружено в LUNEVIA ✦"
        : "VK-видео загружено в LUNEVIA ✦";
      if (rutube) {
        setTimeout(() => rutubeCommand("player:hideControls"), 350);
      } else if (vk) {
        initVKPlayer(url).then(async () => {
          if (cinemaState.video_url !== url || !vkPlayerReady || !vkPlayer) return;
          try {
            vkPlayer.play();
            cinemaState.is_playing = true;
            cinemaState.position_seconds = Number(vkPlayer.getCurrentTime?.()) || 0;
            cinemaState.updated_at = new Date().toISOString();
            await persistRoomState({ force: true });
            await broadcast({
              type: "play",
              position: cinemaState.position_seconds,
              source: "vk",
              updated_at: cinemaState.updated_at
            });
            cinemaSyncStatus.textContent = "Запускаем у всех ✦";
          } catch {
            cinemaSyncStatus.textContent = "VK готов — нажми ▶ ✦";
          }
        }).catch(() => {});
      }
    } else if (isDirectVideo(url)) {
      cinemaFrame.src = "";
      cinemaVideo.hidden = false;
      cinemaVideo.style.display = "block";
      cinemaVideo.style.width = "100%";
      cinemaVideo.style.height = "100%";
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

  async function loadCinemaSource() {
    if (!cinemaRoom || !cinemaUser || !cinemaSourceInput) return false;

    const url = cinemaSourceInput.value.trim();
    if (!url) {
      cinemaSourceInput.focus();
      cinemaSyncStatus.textContent = "Вставь ссылку на видео ✦";
      return false;
    }

    let parsed;
    try {
      parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("unsupported");
    } catch {
      cinemaSyncStatus.textContent = "Нужна корректная ссылка на видео ✦";
      cinemaSourceInput.focus();
      return false;
    }

    const supported = youtubeEmbed(url) || rutubeEmbed(url) || vkEmbed(url) || isDirectVideo(url);
    if (!supported) {
      cinemaSyncStatus.textContent = "Эта ссылка пока не поддерживается ✦";
      return false;
    }

    const loaded = showVideo(url);
    if (!loaded) return false;

    cinemaState.video_url = url;
    cinemaState.position_seconds = 0;
    cinemaState.is_playing = false;
    cinemaState.updated_at = new Date().toISOString();

    const saved = await persistRoomState({ force: true });
    await broadcast({
      type: "source",
      url,
      position: 0,
      updated_at: cinemaState.updated_at
    });

    cinemaSyncStatus.textContent = saved === false
      ? "Видео открыто только локально ✦"
      : "Видео открыто для всех ✦";

    // The source button is a direct user action. Start the local player
    // when the provider API is ready, without forcing autoplay on remote users.
    if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
      applyingRemotePlayback = true;
      try {
        await cinemaVideo.play();
        cinemaState.is_playing = true;
        cinemaState.updated_at = new Date().toISOString();
        await persistRoomState({ force: true });
        await broadcast({
          type: "play",
          position: cinemaVideo.currentTime || 0,
          source: "direct",
          updated_at: cinemaState.updated_at
        });
      } catch {
        cinemaSyncStatus.textContent = "Видео открыто — нажми ▶ в плеере ✦";
      } finally {
        setTimeout(() => { applyingRemotePlayback = false; }, 300);
      }
    } else if (cinemaVideoProvider === "youtube") {
      if (youtubePlayerReady && youtubePlayer) {
        applyingRemotePlayback = true;
        try {
          youtubePlayer.playVideo();
          cinemaState.is_playing = true;
          cinemaState.position_seconds = youtubePlayer.getCurrentTime?.() || 0;
          cinemaState.updated_at = new Date().toISOString();
          await persistRoomState({ force: true });
          await broadcast({
            type: "play",
            position: cinemaState.position_seconds,
            source: "youtube",
            updated_at: cinemaState.updated_at
          });
          cinemaSyncStatus.textContent = "Запускаем у всех ✦";
        } finally {
          setTimeout(() => { applyingRemotePlayback = false; }, 350);
        }
      } else {
        cinemaSyncStatus.textContent = "Видео готовится… ✦";
      }
    } else if (cinemaVideoProvider === "rutube") {
      setTimeout(() => rutubeCommand("player:play"), 700);
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
  let pendingRemotePlayback = null;

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
    const playing = Boolean(payload.playing);
    const updatedAt = payload.updated_at || new Date().toISOString();
    const basePosition = Number(payload.position) || 0;
    const elapsed = playing
      ? Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 1000)
      : 0;
    const position = basePosition + elapsed;

    cinemaState.position_seconds = position;
    cinemaState.is_playing = playing;
    cinemaState.updated_at = updatedAt;

    if (playing && (
      (cinemaVideoProvider === "youtube" && !youtubePlayerReady) ||
      (cinemaVideoProvider === "vk" && !vkPlayerReady)
    )) {
      pendingRemotePlayback = payload;
      updateRoomPlaybackWidget();
      return;
    }

    applyingRemotePlayback = true;
    try {
      if (cinemaVideoProvider === "youtube") {
        if (youtubePlayerReady && youtubePlayer) {
          youtubePlayer.seekTo(position, true);
          if (playing) {
            if (!playbackUnlocked) youtubePlayer.mute?.();
            youtubePlayer.playVideo();
          } else youtubePlayer.pauseVideo();
        } else {
          youtubePostCommand("seekTo", [position, true]);
          if (playing) {
            if (!playbackUnlocked) youtubePostCommand("mute");
            youtubePostCommand("playVideo");
          } else youtubePostCommand("pauseVideo");
        }
      } else if (cinemaVideoProvider === "rutube" && rutubeReady) {
        rutubeCommand("player:setCurrentTime", { time: position });
        if (playing && playbackUnlocked) rutubeCommand("player:play");
        else if (!playing) rutubeCommand("player:pause");
      } else if (cinemaVideoProvider === "vk" && vkPlayerReady && vkPlayer) {
        try {
          vkPlayer.seek(position);
          if (playing) {
            if (!playbackUnlocked) vkPlayer.setVolume?.(0);
            vkPlayer.play();
          } else vkPlayer.pause();
        } catch {}
      } else if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
        try { cinemaVideo.currentTime = position; } catch {}
        if (playing) {
          if (!playbackUnlocked) cinemaVideo.muted = true;
          await cinemaVideo.play().catch(() => {});
        } else cinemaVideo.pause();
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
        broadcast({ type: "play", position, source: "rutube", updated_at: new Date().toISOString() });
        cinemaSyncStatus.textContent = "Смотрим вместе ✦";
      } else if (state === "paused") {
        cinemaState.is_playing = false;
        cinemaState.position_seconds = position;
        cinemaState.updated_at = new Date().toISOString();
        persistRoomState({ force: true });
        broadcast({ type: "pause", position, source: "rutube", updated_at: new Date().toISOString() });
        cinemaSyncStatus.textContent = "Пауза у всех ✦";
      }
    }
  });


  function getLocalPosition() {
    if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
      return Number(cinemaVideo.currentTime) || Number(cinemaState.position_seconds) || 0;
    }
    if (cinemaVideoProvider === "vk" && vkPlayerReady && vkPlayer?.getCurrentTime) {
      return Number(vkPlayer.getCurrentTime()) || Number(cinemaState.position_seconds) || 0;
    }
    return getSharedPosition();
  }

  function getDisplayPlaybackPosition() {
    // YouTube: показываем фактическую позицию самого плеера.
    if (cinemaVideoProvider === "youtube" && youtubePlayerReady && youtubePlayer?.getCurrentTime) {
      return Number(youtubePlayer.getCurrentTime()) || 0;
    }
    if (cinemaVideoProvider === "direct" && !cinemaVideo.hidden) {
      return Number(cinemaVideo.currentTime) || Number(cinemaState.position_seconds) || 0;
    }
    const base = Number(cinemaState.position_seconds) || 0;
    if (!cinemaState.is_playing || !cinemaState.updated_at) return base;
    const elapsed = Math.max(0, (Date.now() - new Date(cinemaState.updated_at).getTime()) / 1000);
    return base + elapsed;
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
          (cinemaVideoProvider === "rutube" && cinemaState.is_playing) ||
          (cinemaVideoProvider === "vk" && cinemaState.is_playing)
        );
        const ownEntry = cinemaMembers.get(cinemaPresenceKey)?.[0];
        if (ownEntry) {
          ownEntry.position = position;
          ownEntry.position_at = positionAt;
          ownEntry.is_playing = isPlaying;
        }

        // Do not call Presence.track() here: position is high-frequency data.
        // Presence is only the online-participant state; position is sent by Broadcast.
        await broadcast({
          type: "position",
          position,
          position_at: positionAt,
          is_playing: isPlaying,
          user_id: cinemaUser.id,
          client_id: browserPresenceId
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
      } else if (cinemaVideoProvider === "vk" && vkPlayerReady && vkPlayer) {
        try {
          const target = getSharedPosition();
          vkPlayer.seek(target);
          if (cinemaState.is_playing && playbackUnlocked) vkPlayer.play();
          else if (!cinemaState.is_playing) vkPlayer.pause();
        } catch {}
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
    } else if (cinemaVideoProvider === "vk" && vkPlayerReady && vkPlayer) {
      try {
        vkPlayer.seek(target);
        if (cinemaState.is_playing && playbackUnlocked) vkPlayer.play();
        else if (!cinemaState.is_playing) vkPlayer.pause();
      } catch {}
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
        const stateElapsed = cinemaState.is_playing && cinemaState.updated_at
          ? Math.max(0, (Date.now() - new Date(cinemaState.updated_at).getTime()) / 1000)
          : 0;
        const targetPosition = Number(cinemaState.position_seconds) + Math.min(stateElapsed, 8);
        const setPosition = () => { try { cinemaVideo.currentTime = Math.max(0, targetPosition); } catch {} };
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

    // Never leave an older Realtime channel alive when reopening the same room.
    if (cinemaChannel) {
      try { await supabase.removeChannel(cinemaChannel); } catch {}
      cinemaChannel = null;
    }
    cinemaMembers.clear();
    cinemaPresenceKey = "tab:" + presenceInstanceId;
    cinemaChannelStatus = "CLOSED";
    // Room access is checked above through room_members. Keep the Realtime
    // transport public so Presence is reliable for registered and anonymous guests.
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.access_token) {
      try { await supabase.realtime.setAuth(currentSession.session.access_token); } catch {}
    }
    cinemaChannel = supabase.channel(`lunevia-room-${room.id}`, {
      config: {
        private: false,
        presence: { enabled: true, key: cinemaPresenceKey },
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
        if (payload.type === "presence-hello") {
          upsertBroadcastParticipant(payload.participant);
          await announceCinemaPresence("reply");
          return;
        }
        if (payload.type === "presence-reply") {
          upsertBroadcastParticipant(payload.participant);
          return;
        }
        if (payload.type === "presence-leave") {
          removeBroadcastParticipant(payload.client_id);
          return;
        }
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
        if (payload.type === "ended") {
          cinemaState.position_seconds = Number(payload.position) || cinemaState.position_seconds || 0;
          cinemaState.is_playing = false;
          hideProviderRecommendations();
          return;
        }
        if (payload.type === "play" || payload.type === "pause") {
          const command = {
            position: Number(payload.position) || 0,
            playing: payload.type === "play",
            updated_at: payload.updated_at || new Date().toISOString()
          };
          // The source may still be initializing on the remote browser.
          // Keep the command until YouTube/VK reports that its player is ready.
          pendingRemotePlayback = command;
          await applyPlaybackCommand(command);
          cinemaSyncStatus.textContent = payload.type === "play" ? "Запускаем у всех ✦" : "Пауза у всех ✦";
          return;
        }
        if (payload.type === "clock") {
          await applySharedClock(payload);
          return;
        }
        if (payload.type === "position") {
          for (const values of cinemaMembers.values()) {
            const entry = values?.[0];
            if (entry?.user_id === payload.user_id && (!payload.client_id || entry.client_id === payload.client_id)) {
              entry.position = Number(payload.position) || 0;
              entry.position_at = payload.position_at || new Date().toISOString();
              entry.is_playing = Boolean(payload.is_playing);
            }
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
      .subscribe(async (status, error) => {
        cinemaChannelStatus = status;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.error("LUNEVIA Realtime channel status:", status, error || "");
          cinemaSyncStatus.textContent = "Не удалось подключить участников ✦";
        }
        if (status === "SUBSCRIBED") {
          const tracked = await trackCinemaPresence();
          await announceCinemaPresence("hello");
          if (!tracked) {
            cinemaSyncStatus.textContent = "Подключаем участников… ✦";
          }
          await new Promise(resolve => setTimeout(resolve, 220));
          refreshCinemaPresence();
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
    if (cinemaChannelStatus === "SUBSCRIBED") {
      broadcast({ type: "presence-leave", client_id: browserPresenceId }).catch(() => {});
    }
    cinemaPresenceKey = null;
    cinemaChannel?.untrack();
    if (cinemaChannel) supabase.removeChannel(cinemaChannel);
    cinemaChannelStatus = "CLOSED";
    cinemaChannel = null;
    stopYouTubeSyncMonitor();
    try { vkPlayer?.destroy?.(); } catch {}
    vkPlayer = null;
    vkPlayerReady = false;
    vkPlayerUrl = null;
    lastVkPosition = 0;
    vkDuration = 0;
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
    if (action === "load-source") {
      event.preventDefault();
      if (button.disabled) return;
      button.disabled = true;
      const originalLabel = button.innerHTML;
      button.innerHTML = "Открываем… <span>✦</span>";
      try {
        await loadCinemaSource();
      } catch (error) {
        console.error("LUNEVIA: video source load error", error);
        cinemaSyncStatus.textContent = "Не удалось открыть видео ✦";
      } finally {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
      return;
    }
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
    broadcast({ type:"play", position: cinemaState.position_seconds, updated_at: new Date().toISOString() });
  });

  cinemaVideo.addEventListener("pause", async () => {
    if (!cinemaRoom || !cinemaUser || applyingRemotePlayback || cinemaVideo.seeking) return;
    cinemaState.is_playing = false;
    cinemaState.position_seconds = cinemaVideo.currentTime || 0;
    await persistRoomState({ force: true });
    broadcast({ type:"pause", position: cinemaState.position_seconds, updated_at: new Date().toISOString() });
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
      // An invite must NOT overwrite an already authenticated account.
      // Registered users keep their identity; only a browser without a
      // session is offered guest entry.
      if (data.session?.user && !data.session.user.is_anonymous) {
        document.body.classList.add("has-account");
        setTimeout(() => openCinema(inviteRoomCode), 0);
      } else if (data.session?.user?.is_anonymous) {
        document.body.classList.add("has-account");
        setTimeout(() => openCinema(inviteRoomCode), 0);
      } else {
        setTimeout(() => openAccount("login"), 0);
      }
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
  // Cinema player provider buttons
  const playerSourceButtons = document.querySelectorAll(".player-source-button");
  const playerSourcePlaceholders = {
    youtube: "Вставь ссылку на YouTube…",
    vk: "Вставь ссылку на VK Видео…",
    rutube: "Вставь ссылку на RUTUBE…",
    direct: "Вставь прямую ссылку на видео (.mp4, .webm)…"
  };
  playerSourceButtons.forEach((sourceButton) => {
    sourceButton.addEventListener("click", () => {
      playerSourceButtons.forEach((button) => button.classList.remove("active"));
      sourceButton.classList.add("active");
      if (cinemaSourceInput) {
        const type = sourceButton.dataset.playerSource || "youtube";
        cinemaSourceInput.placeholder = playerSourcePlaceholders[type] || "Вставь ссылку на видео…";
        cinemaSourceInput.focus();
      }
    });
  });

  // LUNEVIA universal fullscreen control
  const luneviaScreen = document.querySelector(".screen-wrap");
  const fullscreenButton = document.querySelector("[data-action='cinema-fullscreen']");
  if (luneviaScreen && fullscreenButton) {
    const updateFullscreenButton = () => {
      const active = document.fullscreenElement === luneviaScreen;
      fullscreenButton.classList.toggle("is-fullscreen", active);
      fullscreenButton.innerHTML = active
        ? "<span class=\"fullscreen-icon\">⤢</span><span class=\"fullscreen-label\">Выйти из полного экрана</span>"
        : "<span class=\"fullscreen-icon\">⛶</span><span class=\"fullscreen-label\">На весь экран</span>";
      fullscreenButton.setAttribute("aria-label", active ? "Выйти из полного экрана" : "На весь экран");
      fullscreenButton.title = active ? "Выйти из полного экрана" : "На весь экран";
    };

    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);

    window.luneviaToggleFullscreen = async () => {
      try {
        if (document.fullscreenElement === luneviaScreen) {
          await document.exitFullscreen?.();
        } else if (luneviaScreen.requestFullscreen) {
          await luneviaScreen.requestFullscreen({ navigationUI: "hide" });
        } else if (luneviaScreen.webkitRequestFullscreen) {
          luneviaScreen.webkitRequestFullscreen();
        }
      } catch (error) {
        console.warn("LUNEVIA fullscreen unavailable:", error);
      }
      updateFullscreenButton();
    };

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='cinema-fullscreen']");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      window.luneviaToggleFullscreen?.();
    }, true);

    updateFullscreenButton();
  }

});