/* GA4 Maccabi Tracking - Plugin */
(function (jQuery) {
  var $ = jQuery;

  if (window.__ga4TrackingLoaded) return;
  window.__ga4TrackingLoaded = true;

  window.dataLayer = window.dataLayer || [];
  var ITEM_BRAND = "Maccabi Tel Aviv";

  var GA4_DEBUG = (function() {
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get("ga4debug") === "1") return true;
      if (window.localStorage && localStorage.getItem("ga4debug") === "1") return true;
    } catch (e) {}
    return false;
  })();

  function initDebugPanel() {
    if (!GA4_DEBUG) return;
    var panel = document.createElement("div");
    panel.id = "ga4-debug-panel";
    panel.innerHTML = [
      '<div style="position:fixed;bottom:0;right:0;width:340px;max-height:50vh;background:#1a1a2e;color:#eee;font-family:monospace;font-size:11px;z-index:999999;border-radius:8px 0 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.4);overflow:hidden;display:flex;flex-direction:column;">',
      '  <div style="padding:8px 12px;background:#16213e;display:flex;justify-content:space-between;align-items:center;">',
      '    <strong style="color:#00d9ff;">GA4 Debug</strong>',
      '    <button id="ga4-debug-clear" style="background:#0f3460;color:#00d9ff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Clear</button>',
      '    <button id="ga4-debug-close" style="background:transparent;color:#888;border:none;cursor:pointer;font-size:18px;">×</button>',
      '  </div>',
      '  <div id="ga4-debug-list" style="flex:1;overflow-y:auto;padding:4px;max-height:300px;"></div>',
      '</div>'
    ].join("");
    document.body.appendChild(panel);
    document.getElementById("ga4-debug-close").onclick = function() { panel.style.display = "none"; };
    document.getElementById("ga4-debug-clear").onclick = function() { document.getElementById("ga4-debug-list").innerHTML = ""; };
  }

  function ga4DebugLog(eventName, payload) {
    if (!GA4_DEBUG) return;
    var list = document.getElementById("ga4-debug-list");
    if (!list) { initDebugPanel(); list = document.getElementById("ga4-debug-list"); }
    if (!list) return;
    var ec = (payload && payload.ecommerce) || {};
    var summary = [];
    if (ec.currency) summary.push(ec.currency);
    if (ec.value != null) summary.push("value:" + ec.value);
    if (ec.items && ec.items.length) summary.push(ec.items.length + " items");
    if (ec.transaction_id) summary.push("tid:" + ec.transaction_id);
    if (payload && payload.search_term) summary.push('"' + payload.search_term + '"');
    var row = document.createElement("div");
    row.className = "ga4-debug-row";
    row.style.cssText = "margin:4px 0;padding:6px 8px;background:#0f3460;border-radius:4px;border-left:3px solid #00d9ff;";
    row.innerHTML = [
      '<div style="color:#00d9ff;font-weight:bold;">' + eventName + '</div>',
      summary.length ? '<div style="color:#aaa;font-size:10px;margin-top:2px;">' + summary.join(" · ") + '</div>' : "",
      '<details style="margin-top:4px;"><summary style="cursor:pointer;color:#888;">JSON</summary><pre style="margin:4px 0 0;font-size:9px;overflow:auto;max-height:80px;">' + (JSON.stringify(payload || {}).substring(0, 400)) + '</pre></details>'
    ].join("");
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  function log() { try { console.log.apply(console, arguments); } catch (e) {} }

  function pushEvent(eventName, params) {
    try {
      var payload = $.extend(true, { event: eventName }, params || {});
      window.dataLayer.push({ event_data: null, ecommerce: null });
      window.dataLayer.push(payload);
      log("%cGA4 push:", "font-weight:bold", payload);
      ga4DebugLog(eventName, payload);
    } catch (e) { log("GA4 push error:", e); }
  }

  function getCurrentLanguage() {
    var htmlLang = ($("html").attr("lang") || "").toLowerCase();
    if (htmlLang.indexOf("en") === 0) return "english";
    if (htmlLang.indexOf("he") === 0) return "hebrew";
    var wpmlAlt = ($(".wpml-ls-current-language img").attr("alt") || "").toLowerCase();
    var wpmlTxt = ($(".wpml-ls-current-language").text() || "").toLowerCase();
    if (wpmlAlt.indexOf("english") !== -1 || wpmlTxt.indexOf("english") !== -1) return "english";
    return "hebrew";
  }

  function getCurrency() {
    var symbol = ($(".woocommerce-Price-currencySymbol").first().text() || "").trim();
    return symbol === "₪" ? "ILS" : "ILS";
  }

  function normalizeSpaces(str) { return (str || "").replace(/\s+/g, " ").trim(); }

  function extractNumberFromText(text) {
    var t = (text || "").toString().replace(/[^\d.,]/g, "").replace(",", ".");
    var n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  function getCleanItemName($ctx) {
    /* Title heading – .woocommerce-loop-product__title is usually h2/h3 with product name */
    var $titleEl = $ctx.find(".woocommerce-loop-product__title, h2.wd-product-title, h3.wd-product-title").first();
    if ($titleEl.length) {
      var $link = $titleEl.find("> a").first();
      if ($link.length) return normalizeSpaces($link.text()).replace(/edit options/ig, "").replace(/בחר אפשרויות/ig, "").replace(/תצוגה מהירה/ig, "").trim();
      return normalizeSpaces($titleEl.text()).replace(/edit options/ig, "").replace(/בחר אפשרויות/ig, "").replace(/תצוגה מהירה/ig, "").trim();
    }
    /* Fallback: link with product URL and longest text (product name vs "תצוגה מהירה" etc) */
    var $links = $ctx.find("a[href*='/product/']").not("[href*='add-to-cart']");
    var best = "";
    $links.each(function() {
      var t = normalizeSpaces($(this).text());
      if (t.length > best.length && t.length > 3 && !/^(תצוגה מהירה|הוסף לרשימת|בחר אפשרויות|הוספה לסל)$/i.test(t)) best = t;
    });
    if (best) return best.replace(/edit options/ig, "").replace(/בחר אפשרויות/ig, "").replace(/תצוגה מהירה/ig, "").trim();
    return "";
  }

  function getSkuFromContext($ctx) {
    var sku = ($ctx.attr("data-product_sku") || "") || ($ctx.data("product_sku") || "") || ($ctx.find("[data-product_sku]").attr("data-product_sku") || "");
    if (!sku) sku = normalizeSpaces($(".product .sku").first().text());
    if (!sku) sku = ($ctx.attr("data-sku") || "") || ($ctx.data("sku") || "");
    return (sku || "").toString().trim();
  }

  function getProductIdsFromContext($ctx) {
    var productId = ($ctx.attr("data-product_id") || "") || ($ctx.data("product_id") || "") || ($ctx.attr("data-productid") || "") || ($ctx.data("productid") || "") || ($ctx.find("[data-product_id]").attr("data-product_id") || "") || ($ctx.find(".remove, .remove_from_cart_button").attr("data-product_id") || "");
    var variationId = ($ctx.attr("data-variation_id") || "") || ($ctx.data("variation_id") || "") || ($ctx.find("[data-variation_id]").attr("data-variation_id") || "") || ($ctx.find("[name='variation_id']").val() || "");
    return { productId: parseInt(productId, 10) || 0, variationId: parseInt(variationId, 10) || 0 };
  }

  function getFinalAndRegularPrice($ctx) {
    var finalPrice = 0, regularPrice = 0;
    var $ins = $ctx.find(".price ins .amount, .price ins bdi").first(), $del = $ctx.find(".price del .amount, .price del bdi").first();
    if ($ins.length) finalPrice = extractNumberFromText($ins.text());
    if ($del.length) regularPrice = extractNumberFromText($del.text());
    if (!finalPrice) { var $amount = $ctx.find(".price .amount, .price bdi, .woocommerce-Price-amount").first(); if ($amount.length) finalPrice = extractNumberFromText($amount.text()); }
    if (!regularPrice) regularPrice = finalPrice;
    var $varPrice = $(".single-product .woocommerce-variation-price .amount, .single-product .woocommerce-variation-price bdi").first();
    if ($varPrice.length) {
      var vFinal = extractNumberFromText($varPrice.text());
      if (vFinal) {
        finalPrice = vFinal; regularPrice = finalPrice;
        var $varIns = $(".single-product .woocommerce-variation-price ins .amount").first(), $varDel = $(".single-product .woocommerce-variation-price del .amount").first();
        if ($varIns.length) finalPrice = extractNumberFromText($varIns.text()) || finalPrice;
        if ($varDel.length) regularPrice = extractNumberFromText($varDel.text()) || regularPrice;
      }
    }
    return { finalPrice: finalPrice || 0, regularPrice: regularPrice || 0 };
  }

  function getDiscount(regular, final) {
    regular = Number(regular) || 0; final = Number(final) || 0;
    return regular > final ? Math.round((regular - final) * 100) / 100 : 0;
  }

  function getCategoriesByProductId(productId, $contextEl) {
    productId = (productId || "").toString();
    var cats = [];
    if (window.productCategories && window.productCategories[productId]) cats = window.productCategories[productId];
    if ((!cats || !cats.length) && $contextEl && $contextEl.length) {
      var $catEl = $contextEl.find("[data-category]").first();
      if ($catEl.length) cats = [$catEl.attr("data-category"), $catEl.attr("data-category2"), $catEl.attr("data-category3")].filter(Boolean);
    }
    return { item_category: cats[0] || "", item_category2: cats[1] || "", item_category3: cats[2] || "" };
  }

  function buildItem(options) {
    var ids = options.ids || { productId: 0, variationId: 0 };
    var productId = ids.productId || 0, variationId = ids.variationId || 0;
    var itemSku = (options.itemSku || "").toString().trim();
    var itemId = itemSku || String(variationId || productId);
    var priceObj = options.priceObj || { finalPrice: 0, regularPrice: 0 };
    var finalPrice = Number(priceObj.finalPrice) || 0, regularPrice = Number(priceObj.regularPrice) || finalPrice;
    var qty = Number(options.quantity) || 1;
    var cats = getCategoriesByProductId(variationId || productId, options.$ctx || $());
    return {
      item_id: itemId,
      item_name: options.itemName || "",
      item_variant: options.itemVariant || "",
      price: finalPrice,
      quantity: qty,
      coupon: options.coupon || "",
      discount: getDiscount(regularPrice, finalPrice),
      item_brand: ITEM_BRAND,
      item_category: cats.item_category,
      item_category2: cats.item_category2,
      item_category3: cats.item_category3,
      item_sku: itemSku,
      website_language: getCurrentLanguage()
    };
  }

  function getListNameFromContainer($container) {
    var name = ($container.attr("data-list-name") || "").trim();
    if (name) return name;
    var $heading = $container.closest("section, .elementor-section, .wp-block-group, .vc_row, .wd-section, .woocommerce").find("h1, .page-title, .woocommerce-products-header__title").first();
    if (!$heading.length) $heading = $container.closest(".wd-shop, .archive").find("h1, .page-title").first();
    name = normalizeSpaces($heading.text());
    if (name) return name;
    if ($("body").hasClass("tax-product_cat")) return "category";
    if ($("body").hasClass("post-type-archive-product") || $("body").hasClass("woocommerce-shop")) return "shop";
    if ($("body").hasClass("single-product")) return "related_products";
    return "product_list";
  }

  function collectItemsFromProductCards($cards, listName) {
    var items = [];
    $cards.each(function (i) {
      var $card = $(this);
      var ids = getProductIdsFromContext($card);
      var itemName = getCleanItemName($card), priceObj = getFinalAndRegularPrice($card), sku = getSkuFromContext($card);
      if (!ids.productId) {
        var $btn = $card.find("a.add_to_cart_button, a.product_type_simple, a.product_type_variable, a.ajax_add_to_cart, a.button").first();
        if ($btn.length) { var btnIds = getProductIdsFromContext($btn); if (btnIds.productId) ids.productId = btnIds.productId; if (btnIds.variationId) ids.variationId = btnIds.variationId; if (!sku) sku = getSkuFromContext($btn); }
      }
      if (!ids.productId && !ids.variationId) return;
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: "", priceObj: priceObj, quantity: 1, itemSku: sku, $ctx: $card });
      item.index = i; item.item_list_name = item.item_list_id = listName;
      items.push(item);
    });
    return items;
  }

  function isElementInViewport(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0;
  }

  function fireViewItemIfProductPage() {
    if (!$("body").hasClass("single-product")) return;
    var $product = $(".single-product .product").first();
    if (!$product.length) return;
    var ids = getProductIdsFromContext($product);
    var baseName = normalizeSpaces($(".single-product .product_title").first().text());
    var baseSku = getSkuFromContext($product) || getSkuFromContext($("body"));
    var lastVariationId = 0;
    function fire(idsToUse) {
      var item = buildItem({ ids: idsToUse, itemName: baseName, itemVariant: getSelectedVariationLabel(), priceObj: getFinalAndRegularPrice($product), quantity: 1, itemSku: baseSku, $ctx: $product });
      pushEvent("view_item", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: item.price, items: [item] } });
    }
    function getSelectedVariationLabel() { var parts = []; $(".single-product form.variations_form select[name^='attribute_']").each(function () { var v = $(this).val(); if (v) parts.push(v); }); return parts.join(" / "); }
    fire(ids);
    $(document.body).on("found_variation", function (event, variation) {
      try { var vid = parseInt(variation && variation.variation_id, 10) || 0; if (vid && vid !== lastVariationId) { lastVariationId = vid; fire({ productId: ids.productId || 0, variationId: vid }); } } catch (e) {}
    });
  }

  var seenListItemsByContainer = {};
  function fireViewItemListForContainer($container, $cards) {
    var listName = getListNameFromContainer($container);
    var key = listName + "::" + ($container.get(0) ? $container.get(0).className : "");
    var items = collectItemsFromProductCards($cards, listName);
    if (!items.length) return;
    if (!seenListItemsByContainer[key]) seenListItemsByContainer[key] = {};
    var unseenItems = [];
    items.forEach(function (item) {
      var uniqueItemKey = String(item.item_id || "") + "::" + String(item.index || "");
      if (!seenListItemsByContainer[key][uniqueItemKey]) {
        seenListItemsByContainer[key][uniqueItemKey] = 1;
        unseenItems.push(item);
      }
    });
    if (!unseenItems.length) return;
    pushEvent("view_item_list", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), item_list_name: listName, item_list_id: listName, items: unseenItems } });
  }

  function initViewItemListObservers() {
    $(".products, .wd-products, .woocommerce ul.products, ul.products, .wd-shop .products, .wd-shop ul.products").each(function () {
      var $grid = $(this);
      var $cards = $grid.find("li.product, .product-grid-item, .product, .wd-product").filter(function () { return $(this).find("a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link, a.product-link, a, .wd-product-img-wrap a").length > 0; });
      if (!$cards.length) return;
      var el = $grid.get(0);
      if (!("IntersectionObserver" in window)) { if (isElementInViewport(el)) fireViewItemListForContainer($grid, $cards); return; }
      var obs = new IntersectionObserver(function (entries) { entries.forEach(function (entry) { if (entry.isIntersecting) { fireViewItemListForContainer($grid, $cards); obs.disconnect(); } }); }, { threshold: 0.2 });
      obs.observe(el);
    });
    $(".owl-carousel").each(function () {
      var $carousel = $(this), el = $carousel.get(0);
      if (!el) return;
      function collectActiveCards() { var $active = $carousel.find(".owl-item.active li.product, .owl-item.active .product"); if ($active.length) fireViewItemListForContainer($carousel, $active); }
      if (!("IntersectionObserver" in window)) { if (isElementInViewport(el)) collectActiveCards(); return; }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { collectActiveCards(); $carousel.on("changed.owl.carousel", collectActiveCards); obs.disconnect(); }
        });
      }, { threshold: 0.2 });
      obs.observe(el);
    });
  }

  $(document).on("click", "li.product a, .product-grid-item a, .products .product a, .wd-product a", function () {
    var $a = $(this);
    if ($a.is(".add_to_cart_button, .ajax_add_to_cart, .product_type_simple, .product_type_variable, .button")) return;
    if ($a.closest(".quick-view, .wd-quick-view, .quickview-btn, .wd-quick-view-btn").length) return;
    var $card = $a.closest("li.product, .product-grid-item, .product, .wd-product");
    if (!$card.length) return;
    var ids = getProductIdsFromContext($card);
    if (!ids.productId && !ids.variationId) return;
    var listName = getListNameFromContainer($card.closest(".products, .owl-carousel, .wd-products, ul.products, .wd-shop"));
    var item = buildItem({ ids: ids, itemName: getCleanItemName($card), itemVariant: "", priceObj: getFinalAndRegularPrice($card), quantity: 1, itemSku: getSkuFromContext($card), $ctx: $card });
    item.item_list_name = item.item_list_id = listName;
    pushEvent("select_item", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), item_list_name: listName, item_list_id: listName, items: [item] } });
  });

  /* AJAX add-to-cart (WooCommerce) */
  $(document.body).on("added_to_cart", function (event, fragments, cart_hash, $button) {
    try {
      if (!$button || !$button.length) return;
      var ids = getProductIdsFromContext($button);
      var $card = $button.closest("li.product, .product, .product-grid-item, .wd-product").first();
      var $ctx = $card.length ? $card : $button;
      if (!ids.productId && $("body").hasClass("single-product")) ids = getProductIdsFromContext($(".single-product .product").first());
      var itemName = $card.length ? getCleanItemName($card) : normalizeSpaces($(".single-product .product_title").first().text());
      var sku = getSkuFromContext($ctx) || getSkuFromContext($(".single-product .product").first());
      var qty = parseInt(($("body").hasClass("single-product") ? $(".single-product form.cart input.qty").val() : $button.attr("data-quantity")) || "1", 10) || 1;
      var priceObj = $card.length ? getFinalAndRegularPrice($card) : getFinalAndRegularPrice($(".single-product .product").first());
      var selectedVariant = $("body").hasClass("single-product") ? $(".single-product form.variations_form select[name^='attribute_']").map(function () { return $(this).val(); }).get().filter(Boolean).join(" / ") : "";
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: selectedVariant, priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $ctx });
      pushEvent("add_to_cart", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: Math.round((item.price * item.quantity) * 100) / 100, items: [item] } });
    } catch (e) { log("add_to_cart error:", e); }
  });

  /* Link add-to-cart (redirect) – "הוספה לסל" without AJAX – fires before redirect */
  $(document).on("click", "a[href*='add-to-cart']", function () {
    try {
      var $a = $(this);
      if ($a.hasClass("ajax_add_to_cart")) return; /* AJAX – let added_to_cart handle it */
      var m = ($a.attr("href") || "").match(/add-to-cart=(\d+)/);
      var productId = m ? parseInt(m[1], 10) : 0;
      if (!productId) return;
      var $card = $a.closest("li.product, .product, .product-grid-item, .wd-product, .product-type-simple").first();
      var ids = $card.length ? getProductIdsFromContext($card) : { productId: productId, variationId: 0 };
      if (!ids.productId) ids.productId = productId;
      var qtyM = ($a.attr("href") || "").match(/quantity=(\d+)/);
      var qty = qtyM ? parseInt(qtyM[1], 10) : 1;
      var itemName = $card.length ? getCleanItemName($card) : "";
      var sku = $card.length ? getSkuFromContext($card) : "";
      var priceObj = $card.length ? getFinalAndRegularPrice($card) : { finalPrice: 0, regularPrice: 0 };
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $card.length ? $card : $a });
      pushEvent("add_to_cart", { website_language: getCurrentLanguage(), add_to_cart_method: "redirect", ecommerce: { currency: getCurrency(), value: Math.round((item.price * item.quantity) * 100) / 100, items: [item] } });
    } catch (e) { log("add_to_cart (link) error:", e); }
  });

  $(document).on("click", ".remove_from_cart_button, a.remove", function () {
    try {
      var $btn = $(this);
      var ids = getProductIdsFromContext($btn);
      if (!ids.productId) ids.productId = parseInt($btn.attr("data-product_id") || "0", 10) || 0;
      var $row = $btn.closest(".cart_item, li.mini_cart_item, .woocommerce-mini-cart-item");
      var $ctx = $row.length ? $row : $btn;
      var itemName = $row.length ? normalizeSpaces($row.find(".product-name, .woocommerce-mini-cart-item__title, a").first().text()) : getCleanItemName($ctx);
      var sku = getSkuFromContext($ctx);
      var qty = $row.find("input.qty").length ? parseInt($row.find("input.qty").val() || "1", 10) || 1 : 1;
      var priceObj = getFinalAndRegularPrice($row.length ? $row : $ctx);
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $ctx });
      pushEvent("remove_from_cart", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: Math.round((item.price * item.quantity) * 100) / 100, items: [item] } });
    } catch (e) { log("remove_from_cart error:", e); }
  });

  function fireViewCartFromContext($root, source, onlyCollect) {
    try {
      var items = [];
      $root.find(".cart_item").each(function () {
        var $row = $(this);
        var ids = getProductIdsFromContext($row);
        if (!ids.productId) ids.productId = parseInt($row.find(".remove").attr("data-product_id") || "0", 10) || 0;
        var name = normalizeSpaces($row.find(".product-name a, .product-name").first().text());
        var sku = getSkuFromContext($row);
        var qty = parseInt($row.find("input.qty").val() || "1", 10) || 1;
        var priceObj = getFinalAndRegularPrice($row);
        if (!ids.productId && !ids.variationId) return;
        items.push(buildItem({ ids: ids, itemName: name, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $row }));
      });
      if (!items.length) {
        $root.find("li.mini_cart_item, li.woocommerce-mini-cart-item, .woocommerce-mini-cart-item").each(function () {
          var $it = $(this);
          var ids = getProductIdsFromContext($it);
          var name = normalizeSpaces($it.find(".woocommerce-mini-cart-item__title, a").first().text());
          var sku = getSkuFromContext($it);
          var qty = 1;
          var m = ($it.find(".quantity").first().text() || "").match(/×\s*(\d+)/);
          if (m && m[1]) qty = parseInt(m[1], 10) || 1;
          var priceObj = getFinalAndRegularPrice($it);
          if (!ids.productId && !ids.variationId) return;
          items.push(buildItem({ ids: ids, itemName: name, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $it }));
        });
      }
      if (!items.length) return { items: [], value: 0 };
      var value = 0;
      items.forEach(function (it) { value += (Number(it.price) || 0) * (Number(it.quantity) || 0); });
      value = Math.round(value * 100) / 100;
      if (!onlyCollect) {
        pushEvent("view_cart", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: value, items: items }, cart_source: source || "" });
      }
      return { items: items, value: value };
    } catch (e) {
      log("view_cart error:", e);
      return { items: [], value: 0 };
    }
  }

  $(function () { if ($("body").hasClass("woocommerce-cart")) fireViewCartFromContext($(document), "cart_page"); });

  var sideCartSeen = false;
  function tryFireSideCart() {
    var $side = $(".cart-widget-side, .wd-side-cart, .wd-side-cart-opened");
    if ($side.length && $side.is(":visible")) { fireViewCartFromContext($side, "side_cart"); sideCartSeen = true; }
  }
  $(document).on("click", "a[href*='cart'], .wd-tools-cart, .cart-icon, .wd-header-cart, .header-cart", function () { setTimeout(tryFireSideCart, 400); });
  $(document.body).on("wc_fragments_loaded wc_fragments_refreshed", function () { if (sideCartSeen) setTimeout(tryFireSideCart, 300); });

  $(document).on("click", "a.checkout-button, .checkout-button, a[href*='checkout']", function () {
    var data = fireViewCartFromContext($(document), "begin_checkout_context", true) || { items: [], value: 0 };
    var couponCode = normalizeSpaces($("input[name='coupon_code']").first().val()) || "";
    pushEvent("begin_checkout", {
      website_language: getCurrentLanguage(),
      ecommerce: {
        currency: getCurrency(),
        value: data.value || 0,
        coupon: couponCode,
        items: data.items || []
      }
    });
  });

  $(document).on("change", "input[name^='shipping_method'], input[name='shipping_method[0]']", function () {
    var data = fireViewCartFromContext($(document), "shipping_info_context", true) || { items: [], value: 0 };
    pushEvent("add_shipping_info", {
      website_language: getCurrentLanguage(),
      shipping_tier: $(this).val() || "",
      ecommerce: { currency: getCurrency(), value: data.value || 0, items: data.items || [] }
    });
  });

  $(document).on("change", "input[name='payment_method']", function () {
    var data = fireViewCartFromContext($(document), "payment_info_context", true) || { items: [], value: 0 };
    pushEvent("add_payment_info", {
      website_language: getCurrentLanguage(),
      payment_type: $(this).val() || "",
      ecommerce: { currency: getCurrency(), value: data.value || 0, items: data.items || [] }
    });
  });

  function firePurchase() {
    if (window.ga4PurchaseData && window.ga4PurchaseData.transaction_id) {
      var data = window.ga4PurchaseData;
      pushEvent("purchase", {
        website_language: data.website_language || getCurrentLanguage(),
        ecommerce: { transaction_id: data.transaction_id, value: data.value, currency: data.currency, tax: data.tax, shipping: data.shipping, coupon: data.coupon || "", items: data.items || [] }
      });
      return;
    }
    if (!$("body").hasClass("woocommerce-order-received")) return;
    var transactionId = normalizeSpaces($(".woocommerce-order-overview__order strong").first().text()) || normalizeSpaces($(".order strong").first().text());
    var value = extractNumberFromText($(".woocommerce-order-overview__total strong, .order-total .amount, .woocommerce-Price-amount").first().text());
    var tax = extractNumberFromText($(".tax-total .amount").first().text());
    var shipping = extractNumberFromText($(".shipping .amount, .shipping td .amount").first().text());
    var items = [];
    $(".woocommerce-table--order-details tbody tr, .order_details tbody tr").filter(function () { return $(this).find(".product-name").length; }).each(function () {
      var $r = $(this);
      var name = normalizeSpaces($r.find(".product-name").clone().children().remove().end().text()) || normalizeSpaces($r.find(".product-name").text());
      var qty = 1;
      var m = ($r.find(".product-quantity").first().text() || "").match(/×\s*(\d+)/);
      if (m && m[1]) qty = parseInt(m[1], 10) || 1;
      var ids = getProductIdsFromContext($r);
      var sku = getSkuFromContext($r);
      var priceObj = getFinalAndRegularPrice($r);
      if (!ids.productId && !ids.variationId) return;
      items.push(buildItem({ ids: ids, itemName: name, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $r }));
    });
    if (!items.length) return;
    pushEvent("purchase", { website_language: getCurrentLanguage(), ecommerce: { transaction_id: transactionId || "", value: value || 0, currency: getCurrency(), tax: tax || 0, shipping: shipping || 0, items: items } });
  }

  $(document).on("submit", "form.woocommerce-product-search, form.searchform, form[role='search']", function () {
    var q = normalizeSpaces($(this).find("input[name='s'], input[type='search']").val());
    if (q) pushEvent("search", { website_language: getCurrentLanguage(), search_term: q });
  });

  $(document).on("submit", "form.woocommerce-form-login", function () {
    var userId = (window.wpVars && window.wpVars.currentUserId) ? String(window.wpVars.currentUserId) : "";
    var accountId = (window.wpVars && window.wpVars.accountId) ? String(window.wpVars.accountId) : "";
    pushEvent("login", {
      website_language: getCurrentLanguage(),
      user_id: userId,
      account_id: accountId,
      action_status: "success"
    });
  });
  $(document).on("submit", "form.woocommerce-form-register", function () {
    var userId = (window.wpVars && window.wpVars.currentUserId) ? String(window.wpVars.currentUserId) : "";
    var accountId = (window.wpVars && window.wpVars.accountId) ? String(window.wpVars.accountId) : "";
    pushEvent("sign_up", {
      website_language: getCurrentLanguage(),
      user_id: userId,
      account_id: accountId,
      action_status: "success"
    });
  });

  $(document).on("click", ".wpml-ls-item a", function () {
    var $link = $(this);
    var currentLang = getCurrentLanguage();
    var label = normalizeSpaces($link.text()).toLowerCase();
    var chosen = currentLang === "hebrew" ? "english" : "hebrew";
    if (label.indexOf("english") !== -1 || label.indexOf("eng") !== -1) chosen = "english";
    if (label.indexOf("עבר") !== -1 || label.indexOf("heb") !== -1) chosen = "hebrew";
    var location = $link.closest("footer, .site-footer, #colophon").length ? "footer" : "header";
    pushEvent("change_language_click", {
      website_language: currentLang,
      website_language_chosen: chosen,
      click_location: location
    });
  });

  $(document).on("click", "nav a, .main-nav a, .wd-nav a, .menu a", function () {
    var $a = $(this);
    var label = normalizeSpaces($a.text());
    if (!label) return;
    var location = $a.closest("footer, .site-footer, #colophon").length ? "footer" : "header";
    var $li = $a.closest("li.menu-item");
    var $parents = $li.parents("li.menu-item");
    var $top = $parents.length ? $parents.last() : $li;
    var category = "";
    var subcategory = "";
    if ($top && $top.length) {
      category = normalizeSpaces($top.children("a").first().text());
    }
    if ($top && $top.length && $top.get(0) !== $li.get(0)) {
      subcategory = label;
    }
    pushEvent("menu_click", {
      website_language: getCurrentLanguage(),
      click_text: label,
      click_category: category || "",
      click_subcategory: subcategory || "",
      click_location: location
    });
  });

  function initBannerTracking() {
    if (!($("body").hasClass("home") || $("body").hasClass("front-page"))) return;
    $("[data-ga4-banner]").each(function () {
      var el = this, $el = $(el), name = ($el.attr("data-ga4-banner") || "").trim();
      if (!name || !("IntersectionObserver" in window)) return;
      var bannerIndex = parseInt($el.attr("data-ga4-banner-index") || "0", 10) || 0;
      var bannerValue = ($el.attr("data-ga4-banner-value") || "").trim() || name;
      var seen = false;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!seen && entry.isIntersecting) {
            seen = true;
            pushEvent("banner_view", {
              website_language: getCurrentLanguage(),
              banner_name: name,
              banner_value: bannerValue,
              index: String(bannerIndex)
            });
            obs.disconnect();
          }
        });
      }, { threshold: 0.4 });
      obs.observe(el);
    });
    $(document).on("click", "[data-ga4-banner]", function () {
      var $el = $(this);
      var name = ($el.attr("data-ga4-banner") || "").trim();
      if (!name) return;
      var bannerIndex = parseInt($el.attr("data-ga4-banner-index") || "0", 10) || 0;
      var bannerValue = ($el.attr("data-ga4-banner-value") || "").trim() || name;
      pushEvent("banner_click", {
        website_language: getCurrentLanguage(),
        banner_name: name,
        banner_value: bannerValue,
        index: String(bannerIndex)
      });
    });
  }

  document.addEventListener("wpcf7mailsent", function (event) {
    try {
      var formId = "";
      if (event && event.detail && event.detail.contactFormId) {
        formId = String(event.detail.contactFormId);
      }
      pushEvent("generate_lead", {
        website_language: getCurrentLanguage(),
        action_status: "success",
        form_id: formId
      });
    } catch (err) {}
  });

  $(document).on("click", ".owl-prev, .owl-next, .slick-prev, .slick-next", function () {
    try {
      var $btn = $(this);
      var dir = $btn.is(".owl-next, .slick-next") ? "right" : "left";
      var $container = $btn.closest(".owl-carousel, .wd-products, .products");
      var listName = getListNameFromContainer($container.length ? $container : $(document));
      pushEvent("navigate_click", {
        website_language: getCurrentLanguage(),
        click_text: dir,
        click_category: listName
      });
    } catch (e) { log("navigate_click error:", e); }
  });

  $(function () {
    initDebugPanel();
    initViewItemListObservers();
    initBannerTracking();
    fireViewItemIfProductPage();
    firePurchase();
  });

})(jQuery);
