document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "join") {
        alert("Комната скоро откроется ✦");
      }
      if (action === "create") {
        alert("Создание комнаты скоро откроется ✦");
      }
    });
  });
});