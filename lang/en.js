module.exports = {
  start: {
    welcome: "🎮 Welcome to PUBG UC Bot!\n\n" +
            "✨ Here you can:\n" +
            "• Buy UC for PUBG Mobile\n" +
            "• Get popularity\n" +
            "• Purchase cars and costumes\n\n" +
            "🛍 Choose a category from the menu below 👇"
  },
  errors: {
    cart_load_failed: "❌ Failed to load your cart."
  },
  currency: "₽",
  menu: {
    catalog: "📦 Catalog",
    cart: "🧺 Cart",
    orders: "📥 My Orders",
    popularity: "📢 Popularity",
    shop: "🛍 Shop",
    referrals: '👥 Referrals',
  },
  buttons: {
    open_catalog: "📦 Open Catalog",
    confirm: "✅ Confirm Order",
    cancel: "❌ Cancel",
    add_more: "➕ Add More",
    to_cart: "🧺 Go to Cart",
    uc_catalog: "📦 UC Catalog",
    popularity_catalog: "📢 Popularity",
    back: "🔙 Back",
    cars: "🚗 Cars",
    go_to_cart: '➕ Add to cart',
    to_cart: '🧺 Go to car'
  },
  cart: {
    empty: "🧺 Your cart is empty.\n📦 Please choose a UC package:",
    header: "🛒 Your cart:",
    no_id: "not specified",
    status: "Status: waiting for confirmation",
    select_first: "⛔ Please select a product from /catalog first.",
    total: "Total Amount",
    enter_id: "📥 Please enter your PUBG ID (numbers only):",
    cancelled: "❌ Order cancelled.\n📦 Please choose a UC or Popularity package.",
    cb_cancelled: "Cancelled ❌",
  },
  back: "Back",
  catalog: {
    selectCategory: "📦 Choose a category", // Added
    chooseCategory: "Choose a product category:",
    select_uc: "📦 Choose a UC package:",
    select_uc_manual: "Choose UC to be sent via ID:",
    select_type: "📦 How do you want to receive UC?",
    select_popularity: "📢 Choose popularity type",
    select_popularity_home: "🏠 Choose home popularity package",
    added: "added to cart",
    nickname_error: "❌ Failed to get nickname. Please check your PUBG ID.",
    confirmed: "🧾 Order confirmed",
    nickname: "Nickname",
    total: "Total Amount",
    manager: "Managers will contact you soon!",
    uc_issues_title: "❌ Issues detected with products:",
    please_edit_cart: "📌 Please adjust the quantity or remove the affected products.",
    uc_unavailable: "❌ {title} — fully unavailable",
    uc_partial: "⚠️ {title} — only {have} pcs available, you selected {want}",
    new_order: "New Order",
    no_username: "no nickname",
    positions: "Items",
    status: "Status",
    time: "Time",
    status_value: "being delivered"
  },
  orders: {
    current_cart: "🛒 Your cart:",
    status_waiting: "Status: waiting for confirmation",
    no_orders: "❌ You have no active orders.",
    list: "📥 Your orders:",
    order: "Order",
    status: "Status",
    time: "Time",
    error: "❌ An error occurred while retrieving your orders."
  },
  unknown_action: "⚠️ Unknown action",
  invalid_pubg_id: "❌ Please enter a valid PUBG ID (5 to 20 digits only)",
  referral: {
    header: "👥 Your referral system",
    link_label: "🔗 Your referral link:",
    instruction: "Send this link to your friends to invite them and earn bonuses!",
    level1_expl: "✅ 3% from every order of a direct friend (Level 1)",
    level2_expl: "✅ 1% from every order of a friend's friend (Level 2)",
    note: "You only earn points if your friend or their friend makes a real purchase.",
    invited_friends: "👤 Invited friends (Level 1):",
    friends_of_friends: "👥 Friends of friends (Level 2):",
    paid_orders: "<b>Paid orders:</b>",
    paid_orders_level1: "▫️ Level 1: <b>{orders}</b> for a total of <b>{revenue} ₽</b>",
    paid_orders_level2: "▫️ Level 2: <b>{orders}</b> for a total of <b>{revenue} ₽</b>",
    no_paid_orders_level2: "▫️ <i>No paid orders from your friends' friends yet. As soon as they buy something, you'll get 1% from their purchases.</i>",
    points_earned: "<b>Points earned:</b>",
    points_level1: "▫️ 3% from Level 1: <b>{points} points</b>",
    points_level2: "▫️ 1% from Level 2: <b>{points} points</b>",
    total_points: "Total points: {points} points",
    conversion: "1 point = 1 ruble. You can exchange points for UC or money via @inv1s_shop",
    invited_list: "<b>List of invited users:</b>",
    invited_row: "{n}. <b>ID:</b> <code>{id}</code> | <b>Level:</b> {level} | <b>Orders:</b> {orders} | <b>Points:</b> {points} | <b>Date:</b> {date}",
    no_invited: "You have no invited users yet.",
    new_referral: "🎉 You have a new referral! Someone joined using your link. Keep sharing to earn more rewards!"
  },
};

  