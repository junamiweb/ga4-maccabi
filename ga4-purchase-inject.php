<?php
/**
 * GA4 Purchase - Server-Injected JSON (Enterprise)
 * 
 * Injects purchase data from WooCommerce order into the page as JSON.
 * JS reads window.ga4PurchaseData and pushes to dataLayer - no DOM scraping.
 * 
 * Add to functions.php or include in your theme/plugin.
 */

if (!defined('ABSPATH')) exit;

/**
 * Build GA4 purchase payload from WooCommerce order
 */
function ga4_build_purchase_payload($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return null;

    $items = [];
    $value = 0;
    $index = 0;

    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if (!$product) continue;

        $product_id = $product->get_id();
        $variation_id = $item->get_variation_id();
        $item_id = $variation_id ? (string) $variation_id : (string) $product_id;
        
        // Prefer SKU as item_id per GA4 spec; fallback to product/variation ID
        $sku = $product->get_sku();
        if ($sku) $item_id = $sku;

        $qty = (int) $item->get_quantity();
        $line_total = (float) $item->get_total();
        $line_subtotal = (float) $item->get_subtotal();
        $discount = max(0, $line_subtotal - $line_total);
        $unit_price = $qty > 0 ? $line_total / $qty : 0;

        $cats = [];
        $terms = get_the_terms($variation_id ? wp_get_post_parent_id($product_id) : $product_id, 'product_cat');
        if ($terms && !is_wp_error($terms)) {
            $cats = array_values(array_map(function ($t) { return $t->name; }, $terms));
        }

        $items[] = [
            'item_id'         => $item_id,
            'item_name'       => $item->get_name(),
            'item_variant'    => $item->get_variation_attributes() ? implode(' / ', $item->get_variation_attributes()) : '',
            'price'           => round($unit_price, 2),
            'quantity'        => $qty,
            'discount'        => round($discount, 2),
            'item_brand'      => '', // Add if you have brand taxonomy
            'item_category'   => $cats[0] ?? '',
            'item_category2'  => $cats[1] ?? '',
            'item_category3'  => $cats[2] ?? '',
            'item_list_id'    => '',
            'item_list_name'  => '',
            'coupon'          => '',
        ];
        $value += $line_total;
        $index++;
    }

    $coupon_codes = $order->get_coupon_codes();
    $coupon = !empty($coupon_codes) ? implode(', ', $coupon_codes) : '';

    return [
        'transaction_id' => (string) $order->get_order_number(),
        'value'          => round($value, 2),
        'currency'       => $order->get_currency(),
        'tax'            => round((float) $order->get_total_tax(), 2),
        'shipping'       => round((float) $order->get_shipping_total(), 2),
        'coupon'         => $coupon,
        'items'          => $items,
    ];
}

/**
 * Inject ga4PurchaseData on thank-you page (before GTM / ga4-tracking.js)
 */
add_action('wp_head', 'ga4_inject_purchase_data', 1);

function ga4_inject_purchase_data() {
    if (!function_exists('is_wc_endpoint_url')) return;
    if (!is_wc_endpoint_url('order-received')) return;

    $order_id = absint(get_query_var('order-received'));
    if (!$order_id) return;

    // Optional: verify order key for security
    $order_key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
    $order = wc_get_order($order_id);
    if (!$order || ($order_key && !$order->key_is_valid($order_key))) return;

    $payload = ga4_build_purchase_payload($order_id);
    if (!$payload) return;

    $lang = getCurrentLanguageForGa4();
    $payload['website_language'] = $lang;

    // Add website_language to each item
    foreach ($payload['items'] as $i => $item) {
        $payload['items'][$i]['website_language'] = $lang;
        $payload['items'][$i]['index'] = $i;
    }

    ?>
    <script>
    window.ga4PurchaseData = <?php echo wp_json_encode($payload); ?>;
    </script>
    <?php
}

function getCurrentLanguageForGa4() {
    $lang = apply_filters('wpml_current_language', get_locale());
    if (empty($lang)) $lang = get_locale();
    $lang = strtolower($lang);
    if (strpos($lang, 'en') === 0) return 'english';
    if (strpos($lang, 'he') === 0) return 'hebrew';
    return 'hebrew';
}
