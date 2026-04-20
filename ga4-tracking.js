/* GA4 Tracking: סקריפט אחיד לכל האיוונטים + item_id יציב + Debug Mode */
(function (jQuery) {
  var $ = jQuery;

  if (window.__ga4TrackingLoaded) return;
  window.__ga4TrackingLoaded = true;

  window.dataLayer = window.dataLayer || [];

  /* -----------------------------
   * Debug Mode
   * ?ga4debug=1 or localStorage.ga4debug = "1"
   * ----------------------------- */
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
      '  <div style="padding:8px 12px;background:#16213e;display:flex;justify-content:space-between;align-items:center;cursor:move;">',
      '    <strong style="color:#00d9ff;">GA4 Debug</strong>',
      '    <span style="color:#888;font-size:10px;">' + (document.querySelectorAll("#ga4-debug-panel .ga4-debug-row").length || 0) + ' events</span>',
      '    <button id="ga4-debug-clear" style="background:#0f3460;color:#00d9ff;border:none;padding:2px 8px;border-radius:4px;cursor:pointer;">Clear</button>',
      '    <button id="ga4-debug-close" style="background:transparent;color:#888;border:none;cursor:pointer;">×</button>',
      '  </div>',
      '  <div id="ga4-debug-list" style="flex:1;overflow-y:auto;padding:4px;max-height:300px;"></div>',
      '</div>'
    ].join("");
    document.body.appendChild(panel);

    document.getElementById("ga4-debug-close").onclick = function() {
      panel.style.display = "none";
    };
    document.getElementById("ga4-debug-clear").onclick = function() {
      document.getElementById("ga4-debug-list").innerHTML = "";
    };
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
    if (payload.search_term) summary.push('"' + payload.search_term + '"');

    var row = document.createElement("div");
    row.className = "ga4-debug-row";
    row.style.cssText = "margin:4px 0;padding:6px 8px;background:#0f3460;border-radius:4px;border-left:3px solid #00d9ff;";
    row.innerHTML = [
      '<div style="color:#00d9ff;font-weight:bold;">' + eventName + '</div>',
      summary.length ? '<div style="color:#aaa;font-size:10px;margin-top:2px;">' + summary.join(" · ") + '</div>' : "",
      '<details style="margin-top:4px;"><summary style="cursor:pointer;color:#888;">JSON</summary><pre style="margin:4px 0 0;font-size:9px;overflow:auto;max-height:80px;">' + JSON.stringify(payload || {}).substring(0, 400) + '</pre></details>'
    ].join("");
    list.appendChild(row);
    list.scrollTop = list.scrollHeight;
  }

  /* -----------------------------
   * Helpers
   * ----------------------------- */

  function log() {
    try { console.log.apply(console, arguments); } catch (e) {}
  }

  function pushEvent(eventName, params) {
    try {
      var payload = $.extend(true, { event: eventName }, params || {});
      window.dataLayer.push(payload);
      log("%cGA4 push:", "font-weight:bold", payload);
      ga4DebugLog(eventName, payload);
    } catch (e) {
      log("GA4 push error:", e);
    }
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

  function normalizeSpaces(str) {
    return (str || "").replace(/\s+/g, " ").trim();
  }

  function extractNumberFromText(text) {
    var t = (text || "").toString().replace(/[^\d.,]/g, "").replace(",", ".");
    var n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  function getCleanItemName($ctx) {
    var name =
      normalizeSpaces($ctx.find(".product-title, .woocommerce-loop-product__title, .product-title a").first().text()) ||
      normalizeSpaces($ctx.find("a").first().text()) ||
      normalizeSpaces($ctx.text());
    name = name.replace(/edit options/ig, "").replace(/בחר אפשרויות/ig, "").replace(/תצוגה מהירה/ig, "").trim();
    return name;
  }

  function getSkuFromContext($ctx) {
    var sku = ($ctx.attr("data-product_sku") || "") || ($ctx.data("product_sku") || "") ||
      ($ctx.find("[data-product_sku]").attr("data-product_sku") || "");
    if (!sku) sku = normalizeSpaces($(".product .sku").first().text());
    if (!sku) sku = ($ctx.attr("data-sku") || "") || ($ctx.data("sku") || "");
    return (sku || "").toString().trim();
  }

  function getProductIdsFromContext($ctx) {
    var productId =
      ($ctx.attr("data-product_id") || "") || ($ctx.data("product_id") || "") ||
      ($ctx.attr("data-productid") || "") || ($ctx.data("productid") || "") ||
      ($ctx.find("[data-product_id]").attr("data-product_id") || "") ||
      ($ctx.find(".remove, .remove_from_cart_button").attr("data-product_id") || "");
    var variationId =
      ($ctx.attr("data-variation_id") || "") || ($ctx.data("variation_id") || "") ||
      ($ctx.find("[data-variation_id]").attr("data-variation_id") || "") ||
      ($ctx.find("[name='variation_id']").val() || "");
    return { productId: parseInt(productId, 10) || 0, variationId: parseInt(variationId, 10) || 0 };
  }

  function getFinalAndRegularPrice($ctx) {
    var finalPrice = 0, regularPrice = 0;
    var $ins = $ctx.find(".price ins .amount, .price ins bdi").first();
    var $del = $ctx.find(".price del .amount, .price del bdi").first();
    if ($ins.length) finalPrice = extractNumberFromText($ins.text());
    if ($del.length) regularPrice = extractNumberFromText($del.text());
    if (!finalPrice) {
      var $amount = $ctx.find(".price .amount, .price bdi, .woocommerce-Price-amount").first();
      if ($amount.length) finalPrice = extractNumberFromText($amount.text());
    }
    if (!regularPrice) regularPrice = finalPrice;
    var $varPrice = $(".single-product .woocommerce-variation-price .amount, .single-product .woocommerce-variation-price bdi").first();
    if ($varPrice.length) {
      var vFinal = extractNumberFromText($varPrice.text());
      if (vFinal) {
        finalPrice = vFinal;
        regularPrice = finalPrice;
        var $varDel = $(".single-product .woocommerce-variation-price del .amount").first();
        var $varIns = $(".single-product .woocommerce-variation-price ins .amount").first();
        if ($varIns.length) finalPrice = extractNumberFromText($varIns.text()) || finalPrice;
        if ($varDel.length) regularPrice = extractNumberFromText($varDel.text()) || regularPrice;
      }
    }
    return { finalPrice: finalPrice || 0, regularPrice: regularPrice || 0 };
  }

  function getDiscount(regular, final) {
    regular = Number(regular) || 0;
    final = Number(final) || 0;
    return regular > final ? Math.round((regular - final) * 100) / 100 : 0;
  }

  function getCategoriesByProductId(productId, $contextEl) {
    productId = (productId || "").toString();
    var cats = [];
    if (window.productCategories && window.productCategories[productId]) {
      cats = window.productCategories[productId];
    }
    if ((!cats || !cats.length) && $contextEl && $contextEl.length) {
      var $catEl = $contextEl.find("[data-category]").first();
      if ($catEl.length) {
        cats = [$catEl.attr("data-category"), $catEl.attr("data-category2"), $catEl.attr("data-category3")].filter(Boolean);
      }
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
      discount: getDiscount(regularPrice, finalPrice),
      item_category: cats.item_category,
      item_category2: cats.item_category2,
      item_category3: cats.item_category3,
      item_sku: itemSku
    };
  }

  function getListNameFromContainer($container) {
    var name = ($container.attr("data-list-name") || "").trim();
    if (name) return name;
    var $heading = $container.closest("section, .elementor-section, .wp-block-group, .vc_row, .wd-section").find("h1,h2,h3,h4").first();
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
      var itemName = getCleanItemName($card);
      var priceObj = getFinalAndRegularPrice($card);
      var sku = getSkuFromContext($card);
      if (!ids.productId) {
        var $btn = $card.find("a.add_to_cart_button, a.product_type_simple, a.product_type_variable, a.ajax_add_to_cart, a.button").first();
        if ($btn.length) {
          var btnIds = getProductIdsFromContext($btn);
          if (btnIds.productId) ids.productId = btnIds.productId;
          if (btnIds.variationId) ids.variationId = btnIds.variationId;
          if (!sku) sku = getSkuFromContext($btn);
        }
      }
      if (!ids.productId && !ids.variationId) return;
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: "", priceObj: priceObj, quantity: 1, itemSku: sku, $ctx: $card });
      item.index = i + 1;
      item.item_list_name = item.item_list_id = listName;
      items.push(item);
    });
    return items;
  }

  function isElementInViewport(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    return rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0;
  }

  /* -----------------------------
   * Ecommerce Events
   * ----------------------------- */

  function fireViewItemIfProductPage() {
    if (!$("body").hasClass("single-product")) return;
    var $product = $(".single-product .product").first();
    if (!$product.length) return;
    var ids = getProductIdsFromContext($product);
    var baseName = normalizeSpaces($(".single-product .product_title").first().text());
    var baseSku = getSkuFromContext($product) || getSkuFromContext($("body"));
    var lastVariationId = 0;

    function fire(idsToUse) {
      var item = buildItem({
        ids: idsToUse,
        itemName: baseName,
        itemVariant: getSelectedVariationLabel(),
        priceObj: getFinalAndRegularPrice($product),
        quantity: 1,
        itemSku: baseSku,
        $ctx: $product
      });
      pushEvent("view_item", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: item.price, items: [item] } });
    }
    function getSelectedVariationLabel() {
      var parts = [];
      $(".single-product form.variations_form select[name^='attribute_']").each(function () { var v = $(this).val(); if (v) parts.push(v); });
      return parts.join(" / ");
    }
    fire(ids);
    $(document.body).on("found_variation", function (event, variation) {
      try {
        var vid = parseInt(variation && variation.variation_id, 10) || 0;
        if (vid && vid !== lastVariationId) { lastVariationId = vid; fire({ productId: ids.productId || 0, variationId: vid }); }
      } catch (e) {}
    });
  }

  var firedLists = {};
  function fireViewItemListForContainer($container, $cards) {
    var listName = getListNameFromContainer($container);
    var key = listName + "::" + ($container.get(0) ? $container.get(0).className : "");
    if (firedLists[key]) return;
    var items = collectItemsFromProductCards($cards, listName);
    if (!items.length) return;
    firedLists[key] = true;
    pushEvent("view_item_list", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), item_list_name: listName, item_list_id: listName, items: items } });
  }

  function initViewItemListObservers() {
    var $grids = $(".products, .wd-products, .woocommerce ul.products");
    $grids.each(function () {
      var $grid = $(this);
      var $cards = $grid.find("li.product, .product-grid-item, .product").filter(function () {
        return $(this).find("a.woocommerce-LoopProduct-link, a.woocommerce-loop-product__link, a.product-link, a").length > 0;
      });
      if (!$cards.length) return;
      var el = $grid.get(0);
      if (!("IntersectionObserver" in window)) { if (isElementInViewport(el)) fireViewItemListForContainer($grid, $cards); return; }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { fireViewItemListForContainer($grid, $cards); obs.disconnect(); }
        });
      }, { threshold: 0.2 });
      obs.observe(el);
    });
    var $owl = $(".owl-carousel");
    $owl.each(function () {
      var $carousel = $(this);
      var el = $carousel.get(0);
      if (!el) return;
      function collectActiveCards() {
        var $active = $carousel.find(".owl-item.active li.product, .owl-item.active .product");
        if ($active.length) fireViewItemListForContainer($carousel, $active);
      }
      if (!("IntersectionObserver" in window)) { if (isElementInViewport(el)) collectActiveCards(); return; }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            collectActiveCards();
            $carousel.on("changed.owl.carousel", collectActiveCards);
            obs.disconnect();
          }
        });
      }, { threshold: 0.2 });
      obs.observe(el);
    });
  }

  $(document).on("click", "li.product a, .product-grid-item a, .products .product a", function () {
    var $a = $(this);
    if ($a.is(".add_to_cart_button, .ajax_add_to_cart, .product_type_simple, .product_type_variable, .button")) return;
    if ($a.closest(".quick-view, .wd-quick-view, .quickview-btn, .wd-quick-view-btn").length) return;
    var $card = $a.closest("li.product, .product-grid-item, .product");
    if (!$card.length) return;
    var ids = getProductIdsFromContext($card);
    if (!ids.productId && !ids.variationId) return;
    var listName = getListNameFromContainer($card.closest(".products, .owl-carousel, .wd-products, ul.products"));
    var item = buildItem({ ids: ids, itemName: getCleanItemName($card), itemVariant: "", priceObj: getFinalAndRegularPrice($card), quantity: 1, itemSku: getSkuFromContext($card), $ctx: $card });
    item.item_list_name = item.item_list_id = listName;
    pushEvent("select_item", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), item_list_name: listName, item_list_id: listName, items: [item] } });
  });

  $(document.body).on("added_to_cart", function (event, fragments, cart_hash, $button) {
    try {
      if (!$button || !$button.length) return;
      var ids = getProductIdsFromContext($button);
      var $card = $button.closest("li.product, .product, .product-grid-item").first();
      var $ctx = $card.length ? $card : $button;
      if (!ids.productId && $("body").hasClass("single-product")) ids = getProductIdsFromContext($(".single-product .product").first());
      var itemName = $card.length ? getCleanItemName($card) : normalizeSpaces($(".single-product .product_title").first().text());
      var sku = getSkuFromContext($ctx) || getSkuFromContext($(".single-product .product").first());
      var qty = parseInt(($("body").hasClass("single-product") ? $(".single-product form.cart input.qty").val() : $button.attr("data-quantity")) || "1", 10) || 1;
      var priceObj = $card.length ? getFinalAndRegularPrice($card) : getFinalAndRegularPrice($(".single-product .product").first());
      var item = buildItem({ ids: ids, itemName: itemName, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $ctx });
      pushEvent("add_to_cart", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: Math.round((item.price * item.quantity) * 100) / 100, items: [item] } });
    } catch (e) { log("add_to_cart error:", e); }
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

  function fireViewCartFromContext($root, source) {
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
      if (!items.length) return;
      var value = 0;
      items.forEach(function (it) { value += (Number(it.price) || 0) * (Number(it.quantity) || 0); });
      value = Math.round(value * 100) / 100;
      pushEvent("view_cart", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency(), value: value, items: items }, cart_source: source || "" });
    } catch (e) { log("view_cart error:", e); }
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
    fireViewCartFromContext($(document), "begin_checkout_context");
    pushEvent("begin_checkout", { website_language: getCurrentLanguage(), ecommerce: { currency: getCurrency() } });
  });

  $(document).on("change", "input[name^='shipping_method'], input[name='shipping_method[0]']", function () {
    pushEvent("add_shipping_info", { website_language: getCurrentLanguage(), shipping_tier: $(this).val() || "", ecommerce: { currency: getCurrency() } });
  });

  $(document).on("change", "input[name='payment_method']", function () {
    pushEvent("add_payment_info", { website_language: getCurrentLanguage(), payment_type: $(this).val() || "", ecommerce: { currency: getCurrency() } });
  });

  /* -----------------------------
   * Purchase: Server-injected first, DOM fallback
   * ----------------------------- */
  function firePurchase() {
    // 1) Enterprise: use server-injected JSON if available
    if (window.ga4PurchaseData && window.ga4PurchaseData.transaction_id) {
      var data = window.ga4PurchaseData;
      pushEvent("purchase", {
        website_language: data.website_language || getCurrentLanguage(),
        ecommerce: {
          transaction_id: data.transaction_id,
          value: data.value,
          currency: data.currency,
          tax: data.tax,
          shipping: data.shipping,
          coupon: data.coupon || "",
          items: data.items || []
        }
      });
      return;
    }

    // 2) Fallback: DOM parse (thank-you page)
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
      var it = buildItem({ ids: ids, itemName: name, itemVariant: "", priceObj: priceObj, quantity: qty, itemSku: sku, $ctx: $r });
      items.push(it);
    });
    if (!items.length) return;
    pushEvent("purchase", {
      website_language: getCurrentLanguage(),
      ecommerce: { transaction_id: transactionId || "", value: value || 0, currency: getCurrency(), tax: tax || 0, shipping: shipping || 0, items: items }
    });
  }

  /* -----------------------------
   * Engagement / Custom Events
   * ----------------------------- */
  $(document).on("submit", "form.woocommerce-product-search, form.searchform, form[role='search']", function () {
    var q = normalizeSpaces($(this).find("input[name='s'], input[type='search']").val());
    if (q) pushEvent("search", { website_language: getCurrentLanguage(), search_term: q });
  });

  $(document).on("submit", "form.woocommerce-form-login", function () {
    pushEvent("login", { website_language: getCurrentLanguage(), user_id: (window.wpVars && window.wpVars.currentUserId) ? String(window.wpVars.currentUserId) : "" });
  });
  $(document).on("submit", "form.woocommerce-form-register", function () {
    pushEvent("sign_up", { website_language: getCurrentLanguage(), user_id: (window.wpVars && window.wpVars.currentUserId) ? String(window.wpVars.currentUserId) : "" });
  });

  $(document).on("click", ".wpml-ls-item a", function () {
    pushEvent("change_language_click", { website_language: getCurrentLanguage(), target_language_label: normalizeSpaces($(this).text()) });
  });

  $(document).on("click", "nav a, .main-nav a, .wd-nav a, .menu a", function () {
    var label = normalizeSpaces($(this).text());
    if (label) pushEvent("menu_click", { website_language: getCurrentLanguage(), menu_item: label });
  });

  function initBannerTracking() {
    $("[data-ga4-banner]").each(function () {
      var el = this, $el = $(el), name = ($el.attr("data-ga4-banner") || "").trim();
      if (!name || !("IntersectionObserver" in window)) return;
      var seen = false;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!seen && entry.isIntersecting) { seen = true; pushEvent("banner_view", { website_language: getCurrentLanguage(), banner_name: name }); obs.disconnect(); }
        });
      }, { threshold: 0.4 });
      obs.observe(el);
    });
    $(document).on("click", "[data-ga4-banner]", function () {
      var name = ($(this).attr("data-ga4-banner") || "").trim();
      if (name) pushEvent("banner_click", { website_language: getCurrentLanguage(), banner_name: name });
    });
  }

  document.addEventListener("wpcf7mailsent", function () {
    try { pushEvent("generate_lead", { website_language: getCurrentLanguage(), form_id: "" }); } catch (err) {}
  });

  /* -----------------------------
   * Init
   * ----------------------------- */
  $(function () {
    initDebugPanel();
    initViewItemListObservers();
    initBannerTracking();
    fireViewItemIfProductPage();
    firePurchase();
  });

})(jQuery);
