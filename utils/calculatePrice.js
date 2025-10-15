// utils/calculatePrice.js
const calculatePrice = (item, product) => {
  let price = product.price;

  if (item.selectedSize === "128GB") price += 250;
  if (item.selectedSize === "256GB") price += 500;
  if (item.selectedSize === "32GB") price -= 200;

  if (item.selectedRam === "16GB") price += 200;
  if (item.selectedRam === "4GB") price -= 200;

  return price;
};

module.exports = calculatePrice;
