/* הדבק בקונסול (F12) ב-https://shop.maccabi.co.il/ga4/ או בדף קטגוריה */
(function() {
  var $ = window.jQuery;
  if (!$) { console.error("GA4 Check: jQuery לא נטען"); return; }
  var r = [];
  function log(msg, data) { r.push(msg); if (data !== undefined) r.push(data); }

  /* 1. רשתות מוצרים */
  var grids = $(".products, .wd-products, .woocommerce ul.products, ul.products, .wd-shop .products");
  log("רשתות מוצרים:", grids.length);

  /* 2. כרטיסי מוצר */
  var cards = grids.find("li.product, .product-grid-item, .product, .wd-product");
  var cardsFiltered = cards.filter(function() { return $(this).find("a, .wd-product-img-wrap a").length > 0; });
  log("כרטיסי מוצר:", cardsFiltered.length);

  /* 3. מבנה כותרת + שם */
  var samples = [];
  cardsFiltered.slice(0, 5).each(function(i) {
    var $c = $(this);
    var $title = $c.find(".woocommerce-loop-product__title, h2.wd-product-title, h3.wd-product-title").first();
    var nameFromLink = $title.find("> a").first().text().trim();
    var nameFromHeading = $title.text().trim();
    var ids = $c.attr("data-product_id") || $c.find("[data-product_id]").first().attr("data-product_id") || "";
    samples.push({ id: ids, fromLink: nameFromLink, fromHeading: nameFromHeading });
  });
  log("דוגמאות שמות (5 ראשונים):", samples);

  /* 4. body classes */
  log("body classes:", $("body").attr("class"));

  /* 5. dataLayer */
  log("dataLayer length:", (window.dataLayer || []).length);

  console.log("=== GA4 Check ===");
  r.forEach(function(x) { console.log(x); });
  return r;
})();
