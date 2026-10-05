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
  });
});