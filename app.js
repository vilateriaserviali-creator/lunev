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

  let accountMode = "signup";
  let recoveryMode = false;


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
      accountNote.innerHTML = "Вспомнил пароль? <button type="button" class="account-link" data-action="show-login">Войти</button>";
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
    let code = "LUNA";
    for (let i = 0; i < 2; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const savedRooms = () => JSON.parse(localStorage.getItem("luneviaRooms") || "{}");

  function openRoom(mode) {
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    createForm.hidden = mode !== "create";
    joinForm.hidden = mode !== "join";
    roomResult.hidden = true;
    roomTitle.textContent = mode === "create" ? "Создать комнату" : "Войти в комнату";
    setTimeout(() => (mode === "create" ? roomName : joinCode).focus(), 80);
  }

  function closeRoom() {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function handleAction(action, button) {
    if (!action) return;

    if (action === "create") openRoom("create");
    else if (action === "join") openRoom("join");
    else if (action === "login") openAccount("login");
    else if (action === "show-login") openAccount("login");
    else if (action === "show-signup") openAccount("signup");
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
      const name = roomName.value.trim() || "Твой вечер";
      const code = randomCode();
      const room = { name, code, avatar: selectedAvatar, frame: selectedFrame, private: privateRoom.checked, createdAt: Date.now() };
      const rooms = savedRooms();
      rooms[code] = room;
      localStorage.setItem("luneviaRooms", JSON.stringify(rooms));
      createForm.hidden = true;
      joinForm.hidden = true;
      roomResult.hidden = false;
      roomTitle.textContent = "Комната готова";
      resultName.textContent = name;
      resultAvatar.textContent = selectedAvatar;
      roomCode.textContent = code;
      resultAvatar.className = "result-orb frame-" + selectedFrame;
    } else if (action === "join-room") {
      const code = joinCode.value.trim().toUpperCase();
      const room = savedRooms()[code];
      if (!room) {
        joinCode.classList.add("input-error");
        joinCode.setCustomValidity("Комната с таким кодом не найдена.");
        joinCode.reportValidity();
        setTimeout(() => joinCode.classList.remove("input-error"), 500);
        return;
      }
      joinCode.setCustomValidity("");
      createForm.hidden = true;
      joinForm.hidden = true;
      roomResult.hidden = false;
      roomTitle.textContent = "Добро пожаловать";
      resultName.textContent = room.name;
      resultAvatar.textContent = room.avatar;
      roomCode.textContent = room.code;
      resultAvatar.className = "result-orb frame-" + room.frame;
    } else if (action === "copy-code") {
      navigator.clipboard?.writeText(roomCode.textContent);
      if (button) {
        const original = button.textContent;
        button.textContent = "Код скопирован ✓";
        setTimeout(() => (button.textContent = original), 1800);
      }
    } else if (action === "open-room") {
      alert("Следующим этапом здесь появится сама кинозал-комната ✦");
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (button) {
      event.preventDefault();
      handleAction(button.dataset.action, button);
    }
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

  if (supabase) supabase.auth.getSession().then(({ data }) => {
    updateNav(data.session?.user || null);
    if (data.session) document.body.classList.add("has-account");
    if (window.location.hash.includes("access_token=")) {
      openAccount("recovery");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  });

  if (supabase) supabase.auth.onAuthStateChange((event, session) => {
    document.body.classList.toggle("has-account", Boolean(session));
    updateNav(session?.user || null);
    if (event === "PASSWORD_RECOVERY") {
      openAccount("recovery");
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
    joinCode.value = joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    joinCode.setCustomValidity("");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeRoom();
    if (event.key === "Escape" && accountOverlay.classList.contains("is-open")) closeAccount();
  });
});