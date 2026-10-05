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
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

  const accountOverlay = document.getElementById("accountOverlay");
  const registerForm = document.getElementById("registerForm");
  const accountSuccess = document.getElementById("accountSuccess");
  const accountTitle = document.getElementById("accountTitle");
  const accountSubtitle = accountOverlay.querySelector(".account-subtitle");
  const accountNote = accountOverlay.querySelector(".account-note");
  const registerName = document.getElementById("registerName");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerAgree = document.getElementById("registerAgree");
  const accountSubmit = accountOverlay.querySelector(".account-submit");
  const accountSuccessName = document.getElementById("accountSuccessName");

  let accountMode = "signup";

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
    accountTitle.textContent = signup ? "Создать аккаунт" : "Войти в LUNEVIA";
    accountSubtitle.textContent = signup
      ? "Оставь своё имя в этой вселенной — и возвращайся к своим вечерам."
      : "Вернись в свою киновселенную и продолжи свой вечер.";
    registerName.parentElement.hidden = !signup;
    registerAgree.parentElement.hidden = !signup;
    registerName.required = signup;
    registerAgree.required = signup;
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

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "create") openRoom("create");
      if (action === "login") openAccount("login");
      if (action === "show-login") openAccount("login");
      if (action === "close-account") closeAccount();
      if (action === "show-signup") openAccount("signup");
      if (action === "join") openRoom("join");
      if (action === "close-room") closeRoom();

      if (action === "create-room") {
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
      }

      if (action === "join-room") {
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
      }

      if (action === "copy-code") {
        navigator.clipboard?.writeText(roomCode.textContent);
        button.textContent = "Код скопирован ✓";
        setTimeout(() => (button.textContent = "Скопировать код"), 1800);
      }

      if (action === "open-room") {
        alert("Следующим этапом здесь появится сама кинозал-комната ✦");
      }
    });
  });


  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAccountMessage();

    const email = registerEmail.value.trim().toLowerCase();
    const password = registerPassword.value;

    if (accountMode === "signup") {
      const name = registerName.value.trim();
      if (!name || !email || password.length < 6 || !registerAgree.checked) return;

      accountSubmit.disabled = true;
      accountSubmit.innerHTML = "Создаём твой мир… <span>✦</span>";

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
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

  supabase.auth.getSession().then(({ data }) => {
    if (data.session) document.body.classList.add("has-account");
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    document.body.classList.toggle("has-account", Boolean(session));
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