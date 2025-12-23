document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".card");
    if (!cards.length) return;
  
    cards.forEach(card => {
      card.addEventListener("click", () => {
        const item = card.dataset.item;
        window.location.href = `item.html?item=${item}`;
      });
    });
  });
  