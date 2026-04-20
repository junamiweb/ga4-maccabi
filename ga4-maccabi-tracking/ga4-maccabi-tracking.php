<?php
/**
 * Plugin Name: GA4 Maccabi Tracking
 * Plugin URI: https://shop.maccabi.co.il
 * Description: GA4 dataLayer events for WooCommerce + server-injected purchase + debug mode
 * Version: 1.0.1
 * Author: Maccabi / Junami
 * Author URI: https://shop.maccabi.co.il
 * Text Domain: ga4-maccabi-tracking
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 */

if (!defined('ABSPATH')) exit;

define('GA4_MACCABI_VERSION', '1.0.1');

define('GA4_MACCABI_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GA4_MACCABI_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Enqueue ga4-tracking.js + wpVars
 */
add_action('wp_enqueue_scripts', 'ga4_maccabi_enqueue_scripts');

function ga4_maccabi_enqueue_scripts() {
    wp_enqueue_script(
        'ga4-maccabi-tracking',
        GA4_MACCABI_PLUGIN_URL . 'assets/js/ga4-tracking.js',
        array('jquery'),
        GA4_MACCABI_VERSION,
        true
    );

    wp_localize_script('ga4-maccabi-tracking', 'wpVars', array(
        'currentUserId' => is_user_logged_in() ? (string) get_current_user_id() : '',
        'accountId'     => is_user_logged_in() ? (string) get_user_meta(get_current_user_id(), 'account_id', true) : '',
        'ajaxUrl'       => admin_url('admin-ajax.php'),
        'ga4Nonce'      => wp_create_nonce('ga4_nonce'),
    ));
}

/**
 * Server-injected purchase data (thank-you page)
 */
add_action('wp_head', 'ga4_maccabi_inject_purchase_data', 1);

function ga4_maccabi_inject_purchase_data() {
    if (!function_exists('is_wc_endpoint_url')) return;
    if (!is_wc_endpoint_url('order-received')) return;

    $order_id = absint(get_query_var('order-received'));
    if (!$order_id) return;

    $order_key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
    $order = wc_get_order($order_id);
    if (!$order || ($order_key && !$order->key_is_valid($order_key))) return;

    $payload = ga4_maccabi_build_purchase_payload($order_id);
    if (!$payload) return;

    $lang = ga4_maccabi_get_current_language();
    $payload['website_language'] = $lang;

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

function ga4_maccabi_build_purchase_payload($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) return null;

    $items = [];
    $value = 0;

    $coupon_codes = $order->get_coupon_codes();
    $coupon = !empty($coupon_codes) ? implode(', ', $coupon_codes) : '';

    foreach ($order->get_items() as $item) {
        $product = $item->get_product();
        if (!$product) continue;

        $product_id = $product->get_id();
        $variation_id = $item->get_variation_id();
        $item_id = $variation_id ? (string) $variation_id : (string) $product_id;
        $sku = $product->get_sku();
        if ($sku) $item_id = $sku;

        $qty = (int) $item->get_quantity();
        $line_total = (float) $item->get_total();
        $line_subtotal = (float) $item->get_subtotal();
        $discount = max(0, $line_subtotal - $line_total);
        $unit_price = $qty > 0 ? $line_total / $qty : 0;

        $cats = [];
        $base_id = $variation_id ? wp_get_post_parent_id($product_id) : $product_id;
        $terms = get_the_terms($base_id, 'product_cat');
        if ($terms && !is_wp_error($terms)) {
            $cats = array_values(array_map(function ($t) { return $t->name; }, $terms));
        }

        $items[] = array(
            'item_id'         => $item_id,
            'item_name'       => $item->get_name(),
            'item_variant'    => $item->get_variation_attributes() ? implode(' / ', $item->get_variation_attributes()) : '',
            'price'           => round($unit_price, 2),
            'quantity'        => $qty,
            'discount'        => round($discount, 2),
            'item_brand'      => 'Maccabi Tel Aviv',
            'item_category'   => $cats[0] ?? '',
            'item_category2'  => $cats[1] ?? '',
            'item_category3'  => $cats[2] ?? '',
            'item_list_id'    => '',
            'item_list_name'  => '',
            'coupon'          => $coupon,
        );
        $value += $line_total;
    }

    return array(
        'transaction_id' => (string) $order->get_order_number(),
        'value'          => round($value, 2),
        'currency'       => $order->get_currency(),
        'tax'            => round((float) $order->get_total_tax(), 2),
        'shipping'       => round((float) $order->get_shipping_total(), 2),
        'coupon'         => $coupon,
        'items'          => $items,
    );
}

function ga4_maccabi_get_current_language() {
    $lang = function_exists('apply_filters') ? apply_filters('wpml_current_language', get_locale()) : get_locale();
    if (empty($lang)) $lang = get_locale();
    $lang = strtolower($lang);
    if (strpos($lang, 'en') === 0) return 'english';
    if (strpos($lang, 'he') === 0) return 'hebrew';
    return 'hebrew';
}

/**
 * AJAX: Product categories for GA4 (optional – if JS needs them)
 */
add_action('wp_ajax_get_product_categories', 'ga4_maccabi_get_product_categories_ajax');
add_action('wp_ajax_nopriv_get_product_categories', 'ga4_maccabi_get_product_categories_ajax');

function ga4_maccabi_get_product_categories_ajax() {
    check_ajax_referer('ga4_nonce');

    $product_id = isset($_POST['product_id']) ? (int) $_POST['product_id'] : 0;
    if ($product_id <= 0) {
        wp_send_json_error(array('message' => 'invalid product_id'), 400);
    }

    $base_id = wp_get_post_parent_id($product_id) ?: $product_id;
    $terms = get_the_terms($base_id, 'product_cat');
    if (!$terms || is_wp_error($terms)) {
        wp_send_json_success(array('categories' => array()));
    }

    $names = array_values(array_map(function ($t) { return $t->name; }, $terms));
    wp_send_json_success(array('categories' => $names));
}
