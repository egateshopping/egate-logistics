// ج. محاولة اصطياد السعر بذكاء (Aggressive Price Hunting) 💲
// نبحث عن أي رقم يأتي بعد علامة الدولار أو قبلها
const priceRegex = /(\$|USD|€|£)\s?([0-9,]+(\.[0-9]{2})?)/i;
const priceMatch = markdown.match(priceRegex);

if (priceMatch) {
  // تنظيف الرقم من الفواصل والرموز
  price = priceMatch[2].replace(/,/g, "");
} else {
  // محاولة أخيرة: البحث عن كلمة Price متبوعة برقم
  const textPriceMatch = markdown.match(/Price.*?([0-9,]+\.[0-9]{2})/i);
  if (textPriceMatch) price = textPriceMatch[1].replace(/,/g, "");
}
