document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const item = card.dataset.item;
      window.location.href = `item.html?item=${item}`;
    });
  });
  