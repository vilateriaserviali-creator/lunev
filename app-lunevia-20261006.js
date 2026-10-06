document.addEventListener("DOMContentLoaded", () => {
  const accountModal = document.getElementById("accountModal");
  const roomModal = document.getElementById("roomModal");
  const loginButton = document.getElementById("loginButton");
  const joinButton = document.getElementById("joinButton");
  const createButton = document.getElementById("createButton");
  const accountForm = document.getElementById("accountForm");
  const accountMessage = document.getElementById("accountMessage");
  const roomContinue = document.getElementById("roomContinue");

  const open = (modal) => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const close = (modal) => {
    modal.hidden = true;
    if (accountModal.hidden && roomModal.hidden) document.body.classList.remove("modal-open");
  };

  loginButton.addEventListener("click", () => open(accountModal));
  joinButton.addEventListener("click", () => open(roomModal));
  createButton.addEventListener("click", () => open(roomModal));

  document.querySelectorAll("[data-close]").forEach((element) => {
    element.addEventListener("click", () => {
      if (element.dataset.close === "account") close(accountModal);
      if (element.dataset.close === "room") close(roomModal);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!accountModal.hidden) close(accountModal);
    if (!roomModal.hidden) close(roomModal);
  });

  accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    accountMessage.textContent = "Авторизацию подключим следующим этапом.";
  });

  roomContinue.addEventListener("click", () => {
    roomContinue.textContent = "Готово ✦";
  });
});