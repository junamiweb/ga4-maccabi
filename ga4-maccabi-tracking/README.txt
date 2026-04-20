=== GA4 Maccabi Tracking ===

Contributors: maccabi, junami
Tags: ga4, analytics, woocommerce, dataLayer, ecommerce, GTM
Requires at least: 5.0
Requires PHP: 7.4
WC requires at least: 5.0
License: GPLv2 or later

GA4 dataLayer events for WooCommerce + server-injected purchase + debug mode.

== Description ==

* Full ecommerce events: view_item, view_item_list, select_item, add_to_cart, remove_from_cart, view_cart, begin_checkout, add_shipping_info, add_payment_info, purchase
* Server-injected purchase (enterprise) - no DOM scraping on thank-you page
* Debug mode: ?ga4debug=1 or localStorage.ga4debug = "1"
* Engagement: search, login, sign_up, change_language_click, menu_click, banner_view/click, generate_lead
* WPML support (Hebrew/English)
* AJAX endpoint for product categories (get_product_categories)

== Installation ==

1. Copy the folder ga4-maccabi-tracking to wp-content/plugins/
2. Activate the plugin
3. Ensure GTM is loaded and listens to dataLayer
4. For debug: add ?ga4debug=1 to any URL

== Debug Mode ==

* URL: https://yoursite.com/?ga4debug=1
* Or: localStorage.setItem('ga4debug','1') then refresh
* Shows live panel (bottom-right) with all dataLayer pushes
