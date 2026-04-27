const QRCode = require('qrcode');

async function generateInvoiceHTML(order, items) {
  const qrData = JSON.stringify({
    order_id: order.id,
    total: order.total_price_sar,
    vat: order.vat_amount,
    created_at: order.created_at,
  });
  const qr = await QRCode.toDataURL(qrData);

  const rows = items.map((item) => `
    <tr>
      <td>${item.name_ar}</td>
      <td>${item.quantity}</td>
      <td>SAR ${item.unit_price_sar}</td>
      <td>SAR ${(item.unit_price_sar * item.quantity).toFixed(2)}</td>
    </tr>`).join('');

  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>فاتورة #${order.id}</title></head>
  <body style="font-family:Tajawal,Arial;padding:24px;direction:rtl">
    <h2>فاتورة الطلب #${order.id}</h2>
    <p>الحالة: ${order.order_status} | الدفع: ${order.payment_status}</p>
    <table border="1" cellpadding="8" cellspacing="0" width="100%">
      <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <h3>المجموع قبل الضريبة: SAR ${(order.total_price_sar - order.vat_amount).toFixed(2)}</h3>
    <h3>ضريبة القيمة المضافة (15%): SAR ${Number(order.vat_amount).toFixed(2)}</h3>
    <h2>الإجمالي: SAR ${Number(order.total_price_sar).toFixed(2)}</h2>
    <p>الرقم الضريبي: ${process.env.VAT_REGISTRATION_NUMBER || '300000000000003'}</p>
    <img src="${qr}" width="120" height="120" alt="qr"/>
  </body></html>`;
}

module.exports = { generateInvoiceHTML };
