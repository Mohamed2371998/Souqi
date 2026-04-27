function calculateVatInclusive(total, vatRate = Number(process.env.VAT_RATE || 0.15)) {
  const subtotal = Number((total / (1 + vatRate)).toFixed(2));
  const vat = Number((total - subtotal).toFixed(2));
  return { subtotal, vat, total: Number(total.toFixed(2)) };
}

function addVatExclusive(subtotal, vatRate = Number(process.env.VAT_RATE || 0.15)) {
  const vat = Number((subtotal * vatRate).toFixed(2));
  return { subtotal, vat, total: Number((subtotal + vat).toFixed(2)) };
}

module.exports = { calculateVatInclusive, addVatExclusive };
