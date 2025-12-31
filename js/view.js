document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".card");
    if (!cards.length) return;
  
    cards.forEach(card => {
      card.addEventListener("click", () => {
        const item = card.dataset.item;
        
        // Medicine goes to categories page
        if (item === "medicine") {
          window.location.href = "medicine-categories.html";
        } else {
          // Other items go to regular item page
          window.location.href = `item.html?item=${item}`;
        }
      });
    });
  });