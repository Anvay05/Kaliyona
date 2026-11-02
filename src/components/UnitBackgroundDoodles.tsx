import React, { useMemo, useState } from 'react';

// Winding horizontal offsets cycling by lesson index: [0, +40px, +56px, +40px, 0, -40, -56, -40]
export const WINDING_OFFSETS = [0, 40, 56, 40, 0, -40, -56, -40];

type PaletteKey = 'indigo' | 'teal' | 'amber' | 'emerald' | 'rose';

interface PaletteColors {
  accentStroke: string;
  accentFill: string;
  softBg: string;
  borderTint: string;
}

const PALETTES: Record<PaletteKey, PaletteColors> = {
  indigo: {
    accentStroke: '#4f46e5',
    accentFill: '#e0e7ff',
    softBg: 'rgba(79, 70, 229, 0.06)',
    borderTint: 'rgba(79, 70, 229, 0.24)',
  },
  teal: {
    accentStroke: '#0d9488',
    accentFill: '#ccfbf1',
    softBg: 'rgba(13, 148, 136, 0.06)',
    borderTint: 'rgba(13, 148, 136, 0.24)',
  },
  amber: {
    accentStroke: '#d97706',
    accentFill: '#fef3c7',
    softBg: 'rgba(217, 119, 6, 0.065)',
    borderTint: 'rgba(217, 119, 6, 0.26)',
  },
  emerald: {
    accentStroke: '#059669',
    accentFill: '#d1fae5',
    softBg: 'rgba(5, 150, 105, 0.06)',
    borderTint: 'rgba(5, 150, 105, 0.24)',
  },
  rose: {
    accentStroke: '#e11d48',
    accentFill: '#ffe4e6',
    softBg: 'rgba(225, 29, 72, 0.055)',
    borderTint: 'rgba(225, 29, 72, 0.24)',
  },
};

export type ArtId =
  | 'namaste_hands'
  | 'name_badge'
  | 'vidhana_soudha'
  | 'wave_hand'
  | 'smile_bubble'
  | 'heart_garland'
  | 'polite_bubbles'
  | 'marigold_flower'
  | 'teacup_warm'
  | 'thumbs_sun'
  | 'magnifying_question'
  | 'signpost_two_way'
  | 'lightbulb_idea'
  | 'price_tag_question'
  | 'compass_star'
  | 'number_blocks'
  | 'bmtc_ticket'
  | 'dice_pair'
  | 'abacus_frame'
  | 'tally_board'
  | 'masala_dosa'
  | 'idli_vada'
  | 'sambar_pot'
  | 'tiffin_cutlery'
  | 'rice_bowl'
  | 'filter_kaapi'
  | 'tender_coconut'
  | 'cutting_chai'
  | 'water_droplet'
  | 'coffee_beans'
  | 'shop_angadi'
  | 'city_map_pin'
  | 'cozy_home'
  | 'park_tree'
  | 'metro_train'
  | 'buddies_duo'
  | 'friend_polaroid'
  | 'auto_cap_badge'
  | 'spectacles_uncle'
  | 'high_five'
  | 'beku_check_card'
  | 'service_bell'
  | 'shopping_basket'
  | 'wish_star_hand'
  | 'menu_checklist'
  | 'beda_stop_card'
  | 'crossed_chili'
  | 'no_sugar_cup'
  | 'balance_scale'
  | 'full_plate_saaku'
  | 'rupee_notes'
  | 'upi_qr_stand'
  | 'gold_coins'
  | 'wallet_cash'
  | 'price_calc'
  | 'brass_key_tag'
  | 'phone_handoff'
  | 'backpack_patch'
  | 'shared_umbrella_home'
  | 'respect_crown'
  | 'tiffin_carrier'
  | 'cafe_chair'
  | 'walking_sneaker'
  | 'stop_octagon'
  | 'open_door'
  | 'parcel_handoff'
  | 'eyes_look'
  | 'ear_listen'
  | 'megaphone_shout'
  | 'bill_receipt'
  | 'auto_rickshaw_side'
  | 'speedometer_dial'
  | 'auto_horn'
  | 'traffic_cone'
  | 'lightning_action'
  | 'laptop_work'
  | 'open_book'
  | 'checkered_flags'
  | 'trophy_cup'
  | 'boss_shield'
  | 'podium_first'
  | 'traffic_signal'
  | 'direction_arrows'
  | 'uturn_sign'
  | 'paper_plane'
  | 'flyover_bridge'
  | 'temple_gopuram'
  | 'street_lamp'
  | 'auto_fare_meter'
  | 'hailing_hand'
  | 'destination_board'
  | 'auto_front'
  | 'gps_phone_map'
  | 'rearview_mirror'
  | 'arrival_gate'
  | 'raincloud_sun'
  | 'open_umbrella'
  | 'sunglasses_sun'
  | 'traffic_cars'
  | 'alarm_clock'
  | 'pie_half_hour'
  | 'sun_moon_cycle'
  | 'hourglass_timer'
  | 'flip_calendar'
  | 'weekly_planner'
  | 'sticky_reminder'
  | 'rewind_ff_portals'
  | 'rocket_launch'
  | 'done_stamp'
  | 'heart_eyes_face'
  | 'five_star_bar'
  | 'muscle_sulabha'
  | 'speech_hearts'
  | 'champion_crown'
  | 'tiger_medal'
  | 'diploma_scroll'
  | 'fireworks_burst';

interface DoodleSlotItem {
  art: ArtId;
  title: string;
  sub?: string;
}

interface UnitFullDoodleConfig {
  palette: PaletteKey;
  kannadaTop: string;
  kannadaMiddle: string;
  kannadaBottom: string;
  // 8 distinct unit-representing doodles per unit (4 rows × Left & Right)
  doodles: [
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
    DoodleSlotItem,
  ];
}

/**
 * All 30 curriculum units (u1 through u30) individually configured with 8 unit-specific doodles each (240 doodles total!)
 */
const UNIT_DOODLE_CONFIGS: Record<string, UnitFullDoodleConfig> = {
  u1: {
    palette: 'indigo',
    kannadaTop: 'ನಮಸ್ಕಾರ',
    kannadaMiddle: 'ಹೇಗಿದ್ದೀರಾ?',
    kannadaBottom: 'ನನ್ನ ಹೆಸರು',
    doodles: [
      { art: 'namaste_hands', title: 'Namaskāra! 🙏', sub: 'ನಮಸ್ಕಾರ · Hello' },
      { art: 'wave_hand', title: 'Hegiddira? 👋', sub: 'How are you?' },
      { art: 'name_badge', title: 'Nanna Hesaru...', sub: 'My name is...' },
      { art: 'smile_bubble', title: 'Chennagidini 😊', sub: 'I am fine!' },
      { art: 'vidhana_soudha', title: 'Nanna Ooru BLR', sub: 'My hometown' },
      { art: 'beku_check_card', title: 'Haudu · Sari ✓', sub: 'Yes & Okay' },
      { art: 'buddies_duo', title: 'Naanu & Neenu', sub: 'Me & You' },
      { art: 'compass_star', title: 'Welcome! ✨', sub: 'Unit 1 Intro' },
    ],
  },
  u2: {
    palette: 'rose',
    kannadaTop: 'ಧನ್ಯವಾದ',
    kannadaMiddle: 'ದಯವಿಟ್ಟು',
    kannadaBottom: 'ಪರವಾಗಿಲ್ಲ',
    doodles: [
      { art: 'heart_garland', title: 'Dhanyavaada! 🌸', sub: 'Thank you kindly' },
      { art: 'marigold_flower', title: 'Dayavittu 🙏', sub: 'Please' },
      { art: 'polite_bubbles', title: 'Parvagilla ✨', sub: 'No problem at all' },
      { art: 'teacup_warm', title: 'Kshamisri · Sorry', sub: 'Excuse me' },
      { art: 'thumbs_sun', title: 'Tumba Thanks!', sub: 'Big gratitude' },
      { art: 'speech_hearts', title: 'Sweet Kannada ❤️', sub: 'Win every heart' },
      { art: 'namaste_hands', title: 'Namaskara Sir', sub: 'Polite greeting' },
      { art: 'wish_star_hand', title: 'Kind Words ⭐', sub: 'Politeness Pack' },
    ],
  },
  u3: {
    palette: 'amber',
    kannadaTop: 'ಏನು? ಎಲ್ಲಿ?',
    kannadaMiddle: 'ಎಷ್ಟು? ಯಾಕೆ?',
    kannadaBottom: 'ಹೇಗಿದೆ?',
    doodles: [
      { art: 'magnifying_question', title: 'Enu? Elli? 🔎', sub: 'What & Where' },
      { art: 'lightbulb_idea', title: 'Yaake? 💡', sub: 'Why is that?' },
      { art: 'signpost_two_way', title: 'Eshtu? Hegide?', sub: 'How much · How' },
      { art: 'price_tag_question', title: 'Idhu Enu? 🏷️', sub: 'What is this?' },
      { art: 'compass_star', title: 'Yaavaaga? ❓', sub: 'When & Which' },
      { art: 'smile_bubble', title: 'Yaaru? Who? 💬', sub: 'Curious mind' },
      { art: 'city_map_pin', title: 'Elli Ide? 📍', sub: 'Where is it?' },
      { art: 'eyes_look', title: 'Ask & Learn 👀', sub: 'Question Words' },
    ],
  },
  u4: {
    palette: 'teal',
    kannadaTop: 'ಒಂದು · ಎರಡು',
    kannadaMiddle: 'ಮೂರು · ನಾಲ್ಕು',
    kannadaBottom: 'ಹತ್ತು · ಇಪ್ಪತ್ತು',
    doodles: [
      { art: 'number_blocks', title: 'Ondu · Eradu 🔢', sub: '1, 2, 3, 4, 5' },
      { art: 'dice_pair', title: 'Aaru · Elu 🎲', sub: '6, 7, 8, 9' },
      { art: 'bmtc_ticket', title: 'Hattu · Ippattu', sub: '10 to 20 · Bus #' },
      { art: 'abacus_frame', title: '1 to 20 Count 🧮', sub: 'Quick numbers' },
      { art: 'tally_board', title: 'Hadinaidu (15)', sub: 'Teen digits' },
      { art: 'gold_coins', title: 'Hattu ರೂಪಾಯಿ 🪙', sub: 'Count change' },
      { art: 'price_calc', title: 'Digit Drill ⚡', sub: 'Fast recall' },
      { art: 'trophy_cup', title: 'Phase 1 Gate 🏆', sub: 'Foundation Boss' },
    ],
  },
  u5: {
    palette: 'amber',
    kannadaTop: 'ಮಸಾಲೆ ದೋಸೆ',
    kannadaMiddle: 'ಇಡ್ಲಿ · ವಡೆ',
    kannadaBottom: 'ಊಟ ಆಯ್ತಾ?',
    doodles: [
      { art: 'masala_dosa', title: 'Masala Dose! 🍛', sub: 'Crispy Darshini King' },
      { art: 'sambar_pot', title: 'Bisi Sambar 🍲', sub: 'Hot & tangy' },
      { art: 'idli_vada', title: 'Idli · Vade Plate', sub: 'Chutney dip' },
      { art: 'tiffin_cutlery', title: 'Oota Aaytha? 🍴', sub: 'Had your meal?' },
      { art: 'rice_bowl', title: 'Anna · Chapati', sub: 'Wholesome lunch' },
      { art: 'service_bell', title: 'Darshini Token 🔔', sub: 'Self-service pro' },
      { art: 'menu_checklist', title: 'Tiffin Menu 📋', sub: 'Morning feast' },
      { art: 'heart_eyes_face', title: 'Bisi Bisi Oota 😋', sub: 'Foodie heaven' },
    ],
  },
  u6: {
    palette: 'teal',
    kannadaTop: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    kannadaMiddle: 'ಬಿಸಿ ಚಹಾ',
    kannadaBottom: 'ಎಳನೀರು · ನೀರು',
    doodles: [
      { art: 'filter_kaapi', title: 'Filter Kaapi ☕', sub: 'Davara · Tumbler' },
      { art: 'coffee_beans', title: 'Chikmagalur Brew', sub: 'Rich aroma' },
      { art: 'tender_coconut', title: 'Elaneeru 🥥', sub: 'Fresh coconut' },
      { art: 'water_droplet', title: 'Swalpa Neeru 💧', sub: 'Glass of water' },
      { art: 'cutting_chai', title: 'By-Two Tea! 🍵', sub: 'Share with a pal' },
      { art: 'teacup_warm', title: 'Badam Haalu 🥛', sub: 'Warm milk drink' },
      { art: 'no_sugar_cup', title: 'Less Sugar ☕', sub: 'Custom order' },
      { art: 'thumbs_sun', title: 'Refresh! ☀️', sub: 'Drinks mastered' },
    ],
  },
  u7: {
    palette: 'emerald',
    kannadaTop: 'ಮನೆ · ಆಫೀಸ್',
    kannadaMiddle: 'ಅಂಗಡಿ · ರಸ್ತೆ',
    kannadaBottom: 'ಇಲ್ಲಿ · ಅಲ್ಲಿ',
    doodles: [
      { art: 'shop_angadi', title: 'Angadi · Market 🏪', sub: 'Local shops' },
      { art: 'park_tree', title: 'Cubbon Park 🌳', sub: 'Garden City' },
      { art: 'city_map_pin', title: 'Illi · Alli 📍', sub: 'Here & There' },
      { art: 'cozy_home', title: 'Namma Mane 🏡', sub: 'Sweet home' },
      { art: 'metro_train', title: 'Metro · Bus Stop', sub: 'Daily transit' },
      { art: 'street_lamp', title: 'Main Road 🛣️', sub: 'Street corners' },
      { art: 'vidhana_soudha', title: 'Tech Park / Office', sub: 'Work hubs' },
      { art: 'direction_arrows', title: 'Everywhere! 🧭', sub: 'Places in BLR' },
    ],
  },
  u8: {
    palette: 'indigo',
    kannadaTop: 'ಅಣ್ಣ · ಅಕ್ಕ',
    kannadaMiddle: 'ಇವರು ಯಾರು?',
    kannadaBottom: 'ನನ್ನ ಸ್ನೇಹಿತ',
    doodles: [
      { art: 'buddies_duo', title: 'Anna · Akka 👥', sub: 'Brother · Sister' },
      { art: 'auto_cap_badge', title: 'Auto Driver 🛺', sub: 'Friendly Anna' },
      { art: 'friend_polaroid', title: 'Nanna Friend 📸', sub: 'Ivaru yaaru?' },
      { art: 'spectacles_uncle', title: 'Angadi Uncle 👓', sub: 'Shopkeeper' },
      { art: 'high_five', title: 'Ellaru Namavare!', sub: 'People around us' },
      { art: 'smile_bubble', title: 'Avaru Manager 💬', sub: 'Office folks' },
      { art: 'wave_hand', title: 'Hello Neighbour 👋', sub: 'Warm community' },
      { art: 'speech_hearts', title: 'Namma Jana ❤️', sub: 'Bengaluru people' },
    ],
  },
  u9: {
    palette: 'rose',
    kannadaTop: 'ನನಗೆ ಬೇಕು',
    kannadaMiddle: 'ಒಂದು ಕಾಫಿ ಬೇಕು',
    kannadaBottom: 'ಇನ್ನೂ ಸ್ವಲ್ಪ',
    doodles: [
      { art: 'beku_check_card', title: 'Nanage Beku! 🙋', sub: 'I want · Core frame' },
      { art: 'wish_star_hand', title: 'Ondu Kaapi Beku', sub: 'Ask with ease' },
      { art: 'shopping_basket', title: 'Idhu Beku 🧺', sub: 'Market picks' },
      { art: 'service_bell', title: 'Swalpa Beku 🔔', sub: 'A little more' },
      { art: 'menu_checklist', title: 'Enu Beku Guru?', sub: 'What do you want?' },
      { art: 'masala_dosa', title: 'Dose Beku 🍛', sub: 'Plug any food' },
      { art: 'filter_kaapi', title: 'Tea Beku ☕', sub: 'Plug any drink' },
      { art: 'thumbs_sun', title: 'Beku Power! ✨', sub: 'Instant ordering' },
    ],
  },
  u10: {
    palette: 'amber',
    kannadaTop: 'ನನಗೆ ಬೇಡ',
    kannadaMiddle: 'ಸಾಕು ಅಣ್ಣ',
    kannadaBottom: 'ಖಾರ ಬೇಡ',
    doodles: [
      { art: 'beda_stop_card', title: 'Nanage Beda! 🙅', sub: 'No thanks · Decline' },
      { art: 'crossed_chili', title: 'Khaara Beda 🌶️', sub: 'No spice please' },
      { art: 'full_plate_saaku', title: 'Saaku! Enough ✋', sub: 'Swalpa saaku' },
      { art: 'no_sugar_cup', title: 'Sakkare Beda ☕', sub: 'Sugar-free' },
      { art: 'balance_scale', title: 'Beku vs Beda ⚖️', sub: 'Total control' },
      { art: 'wave_hand', title: 'Illa, Beda 👋', sub: 'Polite refusal' },
      { art: 'rice_bowl', title: 'Innu Beda 🍚', sub: 'Full tummy' },
      { art: 'polite_bubbles', title: 'Dhanyavaada 🙏', sub: 'Polite & clear' },
    ],
  },
  u11: {
    palette: 'emerald',
    kannadaTop: 'ಎಷ್ಟು ಆಯ್ತು?',
    kannadaMiddle: 'ನೂರು ರೂಪಾಯಿ',
    kannadaBottom: 'ಚಿಲ್ಲರೆ ಇದೆಯಾ?',
    doodles: [
      { art: 'rupee_notes', title: 'Nooru ₹100 💰', sub: '30 · 50 · 100 Rupees' },
      { art: 'gold_coins', title: 'Chillare Coins 🪙', sub: 'Loose change' },
      { art: 'upi_qr_stand', title: 'UPI Scan Maadi 📱', sub: 'Digital payments' },
      { art: 'wallet_cash', title: 'Eshtu Aaytu? 👛', sub: 'How much total?' },
      { art: 'price_calc', title: 'Phase 2 Boss! 🏆', sub: '30 to 100 mastered' },
      { art: 'bill_receipt', title: 'Total Bill 🧾', sub: 'Shop & restaurant' },
      { art: 'price_tag_question', title: 'Fair Price 🏷️', sub: 'Smart shopper' },
      { art: 'trophy_cup', title: 'Checkpoint! 👑', sub: 'Words & Wants Gate' },
    ],
  },
  u12: {
    palette: 'indigo',
    kannadaTop: 'ನನ್ನ · ನಿನ್ನ',
    kannadaMiddle: 'ಇದು ನನ್ನದು',
    kannadaBottom: 'ನಿನ್ನ ಫೋನ್',
    doodles: [
      { art: 'brass_key_tag', title: 'Nanna Key 🔑', sub: 'Mine & Yours' },
      { art: 'backpack_patch', title: 'Nanna Bag 🎒', sub: 'My backpack' },
      { art: 'phone_handoff', title: 'Ninna Phone 📱', sub: 'Your mobile' },
      { art: 'friend_polaroid', title: 'Ninna Friend 🤝', sub: 'Connections' },
      { art: 'high_five', title: 'Nanna vs Ninna', sub: 'Clear ownership' },
      { art: 'name_badge', title: 'My ID Badge 🪪', sub: 'Office & daily' },
      { art: 'open_book', title: 'Nanna Book 📖', sub: 'Personal items' },
      { art: 'compass_star', title: 'Yours & Mine ✨', sub: 'Unit 12 Pro' },
    ],
  },
  u13: {
    palette: 'teal',
    kannadaTop: 'ನಮ್ಮ · ನಿಮ್ಮ',
    kannadaMiddle: 'ನಮ್ಮ ಬೆಂಗಳೂರು',
    kannadaBottom: 'ಅವರ ಮನೆ',
    doodles: [
      { art: 'shared_umbrella_home', title: 'Namma Ooru! 🏡', sub: 'Ours · Namma BLR' },
      { art: 'respect_crown', title: 'Nimma (Respect) 👑', sub: 'Polite plural' },
      { art: 'tiffin_carrier', title: 'Namma Mane Oota', sub: 'Shared meals' },
      { art: 'buddies_duo', title: 'Avara Team 👥', sub: 'Theirs · Group' },
      { art: 'vidhana_soudha', title: 'Namma Pride! ✨', sub: 'Ours & Theirs' },
      { art: 'cozy_home', title: 'Nimma Mane 🏠', sub: 'Your family home' },
      { art: 'heart_garland', title: 'One Community 🌸', sub: 'Warm respect' },
      { art: 'speech_hearts', title: 'Respectful Talk', sub: 'Nimma vs Ninna' },
    ],
  },
  u14: {
    palette: 'emerald',
    kannadaTop: 'ಬಾ · ಹೋಗು',
    kannadaMiddle: 'ಬನ್ನಿ · ಕೂತ್ಕೊಳ್ಳಿ',
    kannadaBottom: 'ಇಲ್ಲಿ ನಿಲ್ಲು',
    doodles: [
      { art: 'cafe_chair', title: 'Banni · Kootkoli 🪑', sub: 'Come in & sit' },
      { art: 'open_door', title: 'Olagade Banni 🚪', sub: 'Welcome inside' },
      { art: 'walking_sneaker', title: 'Baa · Hogu 👟', sub: 'Come & Go' },
      { art: 'stop_octagon', title: 'Illi Nillu! 🛑', sub: 'Stop on foot' },
      { art: 'direction_arrows', title: 'Bega Baa Guru!', sub: 'Come quickly!' },
      { art: 'paper_plane', title: 'Alli Hogu ✈️', sub: 'Go over there' },
      { art: 'wave_hand', title: 'Illi Banni 👋', sub: 'Respectful invite' },
      { art: 'lightning_action', title: 'Basic Commands ⚡', sub: 'Action starter' },
    ],
  },
  u15: {
    palette: 'amber',
    kannadaTop: 'ಕೊಡಿ · ತಗೊಳ್ಳಿ',
    kannadaMiddle: 'ಹೇಳಿ · ನೋಡಿ',
    kannadaBottom: 'ಬಿಲ್ ಕೊಡಿ',
    doodles: [
      { art: 'parcel_handoff', title: 'Kodi · Thagoli 🤲', sub: 'Give & Take' },
      { art: 'eyes_look', title: 'Illi Nodi! 👀', sub: 'Look right here' },
      { art: 'megaphone_shout', title: 'Innomme Heli 📣', sub: 'Say that again' },
      { art: 'ear_listen', title: 'Swalpa Keli 👂', sub: 'Listen / Ask' },
      { art: 'bill_receipt', title: 'Bill Kodi Anna! 🧾', sub: 'Restaurant pro' },
      { art: 'service_bell', title: 'Dose Kodi 🔔', sub: 'Order power move' },
      { art: 'masala_dosa', title: 'Chutney Kodi 🍛', sub: 'Table requests' },
      { art: 'smile_bubble', title: 'Sari Heli 💬', sub: 'Smooth exchange' },
    ],
  },
  u16: {
    palette: 'rose',
    kannadaTop: 'ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
    kannadaMiddle: 'ಸ್ವಲ್ಪ ನಿಧಾನ',
    kannadaBottom: 'ಬೇಗ ಹೋಗಿ',
    doodles: [
      { art: 'auto_rickshaw_side', title: 'Illi Nillisi! 🛺', sub: 'Stop vehicle here' },
      { art: 'auto_horn', title: 'Pom-Pom Anna! 📯', sub: 'Auto survival' },
      { art: 'speedometer_dial', title: 'Swalpa Nidhaana', sub: 'Slow vs Bega' },
      { art: 'traffic_cone', title: 'Alli Nillisi 🚧', sub: 'Stop over there' },
      { art: 'auto_cap_badge', title: 'The -i Secret ✨', sub: 'Polite commands' },
      { art: 'traffic_signal', title: 'Signal Stop 🚦', sub: 'Nillu vs Nillisi' },
      { art: 'street_lamp', title: 'Gate Hatra 🛣️', sub: 'Drop-off spot' },
      { art: 'thumbs_sun', title: 'Safe Ride! 👍', sub: 'Driver respect' },
    ],
  },
  u17: {
    palette: 'indigo',
    kannadaTop: 'ತಿನ್ನು · ಕುಡಿ',
    kannadaMiddle: 'ಮಾಡು · ಓದು',
    kannadaBottom: 'ಕೆಲಸ ಮಾಡಿ',
    doodles: [
      { art: 'lightning_action', title: 'Thinnu · Kudi ⚡', sub: 'Eat · Drink · Do' },
      { art: 'tiffin_cutlery', title: 'Bisi Dose Thinnu', sub: 'Eat fresh food' },
      { art: 'laptop_work', title: 'Work Maadi! 💻', sub: 'Do · Make · Build' },
      { art: 'open_book', title: 'Kannada Odu 📖', sub: 'Read & learn' },
      { art: 'filter_kaapi', title: 'Kaapi Kudi ☕', sub: 'Drink hot coffee' },
      { art: 'walking_sneaker', title: 'Daily Verbs 👟', sub: 'Active life' },
      { art: 'menu_checklist', title: 'Action Combos ✓', sub: 'Plug & play' },
      { art: 'compass_star', title: 'Verb Master ✨', sub: 'Unit 17 Complete' },
    ],
  },
  u18: {
    palette: 'amber',
    kannadaTop: 'ಫೇಸ್ ೩ ಬಾಸ್',
    kannadaMiddle: 'ಶಹಬ್ಬಾಸ್!',
    kannadaBottom: 'ಮುಂದೆ ನಡೆಯಿರಿ',
    doodles: [
      { art: 'checkered_flags', title: 'Phase 3 Gate! 🏁', sub: 'Relations & Action' },
      { art: 'boss_shield', title: 'Command Master 🛡️', sub: 'Polite & casual' },
      { art: 'trophy_cup', title: 'Sakkath Progress 🏆', sub: 'All verbs unlocked' },
      { art: 'podium_first', title: 'Level Up #1 🥇', sub: 'A2 Milestone' },
      { art: 'fireworks_burst', title: 'Ready for Autos!', sub: 'Phase 3 Boss' },
      { art: 'respect_crown', title: 'Action Crown 👑', sub: 'Full command' },
      { art: 'five_star_bar', title: '5/5 Mastery ⭐', sub: 'Boss checkpoint' },
      { art: 'tiger_medal', title: 'Anna Proud! 🐯', sub: 'On to Phase 4' },
    ],
  },
  u19: {
    palette: 'teal',
    kannadaTop: 'ಎಡ · ಬಲ · ನೇರ',
    kannadaMiddle: 'ಮುಂದೆ ಹೋಗಿ',
    kannadaBottom: 'ಯು-ಟರ್ನ್ ಮಾಡಿ',
    doodles: [
      { art: 'direction_arrows', title: 'Leftu · Rightu 🧭', sub: 'Turn left & right' },
      { art: 'paper_plane', title: 'Neera Hogi ⬆️', sub: 'Go straight ahead' },
      { art: 'uturn_sign', title: 'U-Turn Maadi ↩️', sub: 'Turn around' },
      { art: 'traffic_cone', title: 'Dead End / Tirugi', sub: 'Road navigation' },
      { art: 'compass_star', title: 'Pakka Navigator!', sub: 'Neera vs Neeru' },
      { art: 'signpost_two_way', title: 'Which Cross? 🪧', sub: 'Every turn clear' },
      { art: 'city_map_pin', title: 'Exact Spot 📍', sub: 'Pin-point guide' },
      { art: 'street_lamp', title: 'Next Leftu 🛣️', sub: 'Street smarts' },
    ],
  },
  u20: {
    palette: 'emerald',
    kannadaTop: 'ಸಿಗ್ನಲ್ ಹತ್ರ',
    kannadaMiddle: 'ಫ್ಲೈಓವರ್ ಮೇಲೆ',
    kannadaBottom: 'ಸರ್ಕಲ್ ಹತ್ರ',
    doodles: [
      { art: 'traffic_signal', title: 'Signal Hatra 🚦', sub: 'Near traffic light' },
      { art: 'street_lamp', title: 'Circle / Cross 🛣️', sub: 'Major junctions' },
      { art: 'flyover_bridge', title: 'Flyover Mele 🌉', sub: 'Over & under' },
      { art: 'temple_gopuram', title: 'Temple Corner 🛕', sub: 'Local landmarks' },
      { art: 'park_tree', title: 'Park Hatra 🌳', sub: 'Tree-lined avenues' },
      { art: 'metro_train', title: 'Metro Pillar 🚇', sub: 'Station landmarks' },
      { art: 'shop_angadi', title: 'Market Cross 🏪', sub: 'Busy bazaar' },
      { art: 'city_map_pin', title: 'Landmark Pro 📍', sub: 'City guide' },
    ],
  },
  u21: {
    palette: 'amber',
    kannadaTop: 'ಮೀಟರ್ ಹಾಕಿ',
    kannadaMiddle: 'ಚಿಲ್ಲರೆ ಇಲ್ಲ',
    kannadaBottom: 'ಯುಪಿಐ ಇದೆಯಾ?',
    doodles: [
      { art: 'auto_fare_meter', title: 'Meter Haaki! 📟', sub: 'Put the meter on' },
      { art: 'gold_coins', title: 'Chillare Illa 🪙', sub: 'No loose change' },
      { art: 'upi_qr_stand', title: 'PhonePe / UPI 📱', sub: 'Scan & pay fast' },
      { art: 'rupee_notes', title: '20 Extra Beda 💸', sub: 'Fair fare talk' },
      { art: 'bill_receipt', title: 'Fair Fare Pro!', sub: 'Auto negotiation' },
      { art: 'wallet_cash', title: 'Exact Change 👛', sub: 'Smart commuter' },
      { art: 'price_calc', title: 'Meter Rate 🧮', sub: 'Base fare ₹30' },
      { art: 'thumbs_sun', title: 'Sari Anna! 👍', sub: 'Win-win ride' },
    ],
  },
  u22: {
    palette: 'indigo',
    kannadaTop: 'ಬರ್ತೀರಾ ಅಣ್ಣ?',
    kannadaMiddle: 'ಇಂದಿರಾನಗರ',
    kannadaBottom: 'ಹತ್ಕೊಳ್ಳಿ!',
    doodles: [
      { art: 'hailing_hand', title: 'Auto! Bartira? 🙋‍♂️', sub: 'Will you come?' },
      { art: 'auto_front', title: 'Hathkoli! Hop in 🛺', sub: 'Driver says yes!' },
      { art: 'destination_board', title: 'Indiranagar Hogbeku', sub: 'Koramangala · MG Rd' },
      { art: 'city_map_pin', title: 'Metro Hatra 📍', sub: 'Drop destination' },
      { art: 'auto_rickshaw_side', title: 'Barutte / Illa Sir', sub: 'Spot driver reply' },
      { art: 'auto_horn', title: 'Hail Like a Local', sub: 'Curbside pro' },
      { art: 'auto_cap_badge', title: 'Namma Driver 🧢', sub: 'Friendly nod' },
      { art: 'direction_arrows', title: 'Let’s Roll! ➡️', sub: 'Ride begins' },
    ],
  },
  u23: {
    palette: 'teal',
    kannadaTop: 'ಸೈಡ್-ಗೆ ನಿಲ್ಲಿಸಿ',
    kannadaMiddle: 'ಮುಂದೆ ಹೋಗಿ',
    kannadaBottom: 'ಬಂದ್ವಿ ಗುರು!',
    doodles: [
      { art: 'gps_phone_map', title: 'Live Ride Map 📱', sub: 'Guide mid-ride' },
      { art: 'rearview_mirror', title: 'Mundhe Hogi 🪞', sub: 'Go a bit ahead' },
      { art: 'arrival_gate', title: 'Gate Hatra Nillisi', sub: 'Stop at the gate' },
      { art: 'auto_rickshaw_side', title: 'Side-ge Nillisi 🛺', sub: 'Pull over here' },
      { art: 'checkered_flags', title: 'Bandvi! Arrived', sub: 'Smooth drop-off' },
      { art: 'traffic_signal', title: 'Signal Aadmele 🚦', sub: 'After the signal' },
      { art: 'cozy_home', title: 'Reached Home 🏡', sub: 'Safe & sound' },
      { art: 'gold_coins', title: 'Pay & Thank 🪙', sub: 'Dhanyavaada Anna' },
    ],
  },
  u24: {
    palette: 'rose',
    kannadaTop: 'ಮಳೆ ಬಂತು!',
    kannadaMiddle: 'ತುಂಬಾ ಬಿಸಿ ಇದೆ',
    kannadaBottom: 'ಲೇಟ್ ಆಯ್ತು',
    doodles: [
      { art: 'raincloud_sun', title: 'Male Banthu! 🌧️', sub: 'Sudden 5 PM rain' },
      { art: 'open_umbrella', title: 'Chhatri Ideya? ☔', sub: 'Got an umbrella?' },
      { art: 'traffic_cars', title: 'Full Traffic Guru 🚗', sub: 'Silk Board mood' },
      { art: 'sunglasses_sun', title: 'Tumba Bisi Ide ☀️', sub: 'Sunny afternoon' },
      { art: 'alarm_clock', title: 'Sorry, Late Aaytu!', sub: 'Running 5m late' },
      { art: 'teacup_warm', title: 'Rainy Chai ☕', sub: 'Monsoon vibes' },
      { art: 'park_tree', title: 'Cool Breeze 🍃', sub: 'AC city weather' },
      { art: 'smile_bubble', title: 'Adjust Maadi 😊', sub: 'Chit-chat pro' },
    ],
  },
  u25: {
    palette: 'amber',
    kannadaTop: 'ಪಕ್ಕಾ ಆಟೋ ರಾಜ',
    kannadaMiddle: 'ಫುಲ್ ರೈಡ್',
    kannadaBottom: 'ಫೇಸ್ ೪ ಗೇಟ್',
    doodles: [
      { art: 'trophy_cup', title: 'The Full Ride! 🏆', sub: 'Hail -> Direct -> Pay' },
      { art: 'auto_rickshaw_side', title: 'Namma Auto Boss 🛺', sub: 'Total confidence' },
      { art: 'gps_phone_map', title: 'Start to Finish 📍', sub: '15-step capstone' },
      { art: 'auto_fare_meter', title: 'Meter + Tip Pro 📟', sub: 'Zero language gap' },
      { art: 'checkered_flags', title: 'Phase 4 Complete!', sub: 'Certified Rider' },
      { art: 'boss_shield', title: 'Road Legend 🛡️', sub: 'Bengaluru streets' },
      { art: 'five_star_bar', title: '5-Star Commuter ⭐', sub: 'Auto Anna smiles' },
      { art: 'fireworks_burst', title: 'Victory Ride! 🎆', sub: 'Phase 4 Gate' },
    ],
  },
  u26: {
    palette: 'indigo',
    kannadaTop: 'ಎಷ್ಟು ಗಂಟೆ?',
    kannadaMiddle: 'ಅರ್ಧ ಗಂಟೆ',
    kannadaBottom: 'ಬೆಳಿಗ್ಗೆ · ರಾತ್ರಿ',
    doodles: [
      { art: 'alarm_clock', title: 'Eshtu Gante? 🕐', sub: 'What time is it?' },
      { art: 'pie_half_hour', title: 'Ardha Gante ⏱️', sub: 'Half an hour' },
      { art: 'sun_moon_cycle', title: 'Beligge · Raatri 🌗', sub: 'Morning to night' },
      { art: 'hourglass_timer', title: 'Innu 10 Nimisha ⏳', sub: '10 more minutes' },
      { art: 'filter_kaapi', title: '4 Gante Kaapi ☕', sub: 'Evening break' },
      { art: 'number_blocks', title: '8 Gante · 9 Gante', sub: 'Clock numbers' },
      { art: 'sticky_reminder', title: 'On Time! 📌', sub: 'Never miss a beat' },
      { art: 'compass_star', title: 'Time Master ✨', sub: 'Unit 26 Pro' },
    ],
  },
  u27: {
    palette: 'emerald',
    kannadaTop: 'ಇವತ್ತು · ನಾಳೆ',
    kannadaMiddle: 'ನಿನ್ನೆ · ವಾರ',
    kannadaBottom: 'ನಾಳೆ ಸಿಗೋಣ!',
    doodles: [
      { art: 'flip_calendar', title: 'Ivattu · Naale 📅', sub: 'Today & Tomorrow' },
      { art: 'sticky_reminder', title: 'Naale Sigona! 📌', sub: 'See you tomorrow' },
      { art: 'weekly_planner', title: 'Somavaara -> Shani', sub: 'Days of the week' },
      { art: 'thumbs_sun', title: 'Bhanuvaara Chutti ☀️', sub: 'Sunday holiday!' },
      { art: 'open_door', title: 'Naale Banni Anna!', sub: 'Come tomorrow' },
      { art: 'alarm_clock', title: 'Ninne (Yesterday)', sub: 'Past & upcoming' },
      { art: 'buddies_duo', title: 'Weekend Plan 👥', sub: 'Meetup with pals' },
      { art: 'smile_bubble', title: 'See You Soon! 👋', sub: 'Daily rhythm' },
    ],
  },
  u28: {
    palette: 'teal',
    kannadaTop: 'ಆಯ್ತು · ಮಾಡ್ತೀನಿ',
    kannadaMiddle: 'ಊಟ ಆಯ್ತು',
    kannadaBottom: 'ನಾಳೆ ಬರ್ತೀನಿ',
    doodles: [
      { art: 'rewind_ff_portals', title: 'Past & Future ⏪⏩', sub: 'Aaytu · Maadthini' },
      { art: 'done_stamp', title: 'Oota Aaytu ✓', sub: 'Already done!' },
      { art: 'rocket_launch', title: 'Naale Bartini 🚀', sub: 'I will come' },
      { art: 'laptop_work', title: 'Kelsa Aaytha? 💻', sub: 'Is work finished?' },
      { art: 'flip_calendar', title: 'Time Travel Chunks', sub: 'No conjugation' },
      { art: 'lightning_action', title: 'Eega Maadthini ⚡', sub: 'Doing it now' },
      { art: 'checkered_flags', title: 'Ninne Aaytu 🏁', sub: 'Finished yesterday' },
      { art: 'wish_star_hand', title: 'Future Ready ⭐', sub: 'Speak naturally' },
    ],
  },
  u29: {
    palette: 'rose',
    kannadaTop: 'ತುಂಬಾ ಇಷ್ಟ!',
    kannadaMiddle: 'ಸಕ್ಕತ್ ಆಗಿದೆ',
    kannadaBottom: 'ಕನ್ನಡ ಸುಲಭ',
    doodles: [
      { art: 'heart_eyes_face', title: 'Tumba Ishta! 😍', sub: 'I love it!' },
      { art: 'speech_hearts', title: 'Tumba Santosha ❤️', sub: 'So happy to meet' },
      { art: 'five_star_bar', title: 'Sakkath Aagide! ⭐', sub: 'It is awesome!' },
      { art: 'muscle_sulabha', title: 'Kannada Sulabha 💪', sub: 'Kannada is easy!' },
      { art: 'masala_dosa', title: 'Nanage Dose Ishta!', sub: 'Share favorites' },
      { art: 'marigold_flower', title: 'Channagide 🌸', sub: 'Looks & tastes good' },
      { art: 'thumbs_sun', title: 'Super Guru! 👍', sub: 'Real reactions' },
      { art: 'smile_bubble', title: 'Happy Vibes 😊', sub: 'Feelings & views' },
    ],
  },
  u30: {
    palette: 'amber',
    kannadaTop: 'ಕನ್ನಡ ಗೊತ್ತು!',
    kannadaMiddle: 'ನಮ್ಮ ಬೆಂಗಳೂರು',
    kannadaBottom: 'ಪಕ್ಕಾ ಲೋಕಲ್ 🏆',
    doodles: [
      { art: 'champion_crown', title: 'Bengaluru Legend 👑', sub: 'All 30 Units Done!' },
      { art: 'fireworks_burst', title: '100% Kanglish Pro 🎆', sub: 'Fluency unlocked' },
      { art: 'tiger_medal', title: 'Anna Proud of You 🐯', sub: 'Full BLR Day Boss' },
      { art: 'diploma_scroll', title: 'B1 Fluency Scroll 📜', sub: 'Course Graduate' },
      { art: 'vidhana_soudha', title: 'Namma Ooru Hero! 🏆', sub: 'Everyday Capstone' },
      { art: 'auto_rickshaw_side', title: 'Auto Master 🛺', sub: 'Ride anywhere' },
      { art: 'filter_kaapi', title: 'Darshini Local ☕', sub: 'Order like a boss' },
      { art: 'trophy_cup', title: 'Grand Champion 🏆', sub: 'Shubha Dina!' },
    ],
  },
};

/**
 * Renders any of the 65+ custom hand-drawn SVG doodle illustrations by ArtId
 */
function renderDoodleArt(artId: ArtId, stroke: string, fill: string): React.ReactNode {
  switch (artId) {
    case 'namaste_hands':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="52" r="36" fill={fill} opacity="0.7" />
          <path d="M50 10V17M24 20L29 25M76 20L71 25" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M50 22C45 32 36 44 36 58C36 67 42 73 48 76L50 62" fill="#fde68a" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M50 22C55 32 64 44 64 58C64 67 58 73 52 76L50 62" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M50 22V75" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <rect x="36" y="75" width="28" height="8" rx="4" fill="#fff" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'name_badge':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="10" y="16" width="80" height="58" rx="10" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M10 26C10 20.5 14.5 16 20 16H80C85.5 16 90 20.5 90 26V36H10V26Z" fill={fill} stroke={stroke} strokeWidth="2.4" />
          <text x="50" y="30" textAnchor="middle" fill={stroke} fontSize="9" fontWeight="900">HELLO · NAMASKARA</text>
          <path d="M22 52H62M22 62H48" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="74" cy="56" r="9" fill="#fef3c7" stroke={stroke} strokeWidth="2" />
          <path d="M71 58C73 60 75 60 77 58" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );

    case 'vidhana_soudha':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <circle cx="50" cy="48" r="34" fill={fill} opacity="0.6" />
          <path d="M18 74H82V46H18V74Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M32 46C32 28 68 28 68 46" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <path d="M50 18V28M30 46V74M43 46V74M57 46V74M70 46V74" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'wave_hand':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="32" fill={fill} opacity="0.65" />
          <path d="M32 52C28 42 32 26 37 28L40 42C41 24 47 22 49 26L48 42C52 25 58 26 58 31L54 45C59 34 64 36 62 42L56 58C52 66 40 66 32 52Z" fill="#fde68a" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M20 30C20 24 25 20 30 20M68 26C73 28 75 34 73 39" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'smile_bubble':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M16 26C16 19 22 14 29 14H63C70 14 76 19 76 26V52C76 59 70 64 63 64H36L20 76V64C17 62 16 57 16 52V26Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <circle cx="46" cy="39" r="15" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="41" cy="36" r="2" fill={stroke} />
          <circle cx="51" cy="36" r="2" fill={stroke} />
          <path d="M40 43C43 47 49 47 52 43" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'heart_garland':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="36" fill={fill} opacity="0.65" />
          <path d="M50 76C50 76 24 60 24 40C24 30 32 24 40 24C45 24 48 27 50 31C52 27 55 24 60 24C68 24 76 30 76 40C76 60 50 76 50 76Z" fill="#fecdd3" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="32" cy="20" r="4" fill="#fde68a" stroke={stroke} strokeWidth="1.8" />
          <circle cx="68" cy="20" r="4" fill="#fde68a" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'polite_bubbles':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="12" y="14" width="58" height="36" rx="10" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <text x="41" y="36" textAnchor="middle" fill={stroke} fontSize="10" fontWeight="900">DAYAVITTU</text>
          <rect x="30" y="42" width="58" height="34" rx="10" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <text x="59" y="63" textAnchor="middle" fill={stroke} fontSize="10" fontWeight="900">THANKS 🙏</text>
        </svg>
      );

    case 'marigold_flower':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} opacity="0.65" />
          <circle cx="45" cy="26" r="10" fill="#fcd34d" stroke={stroke} strokeWidth="2" />
          <circle cx="64" cy="45" r="10" fill="#fde68a" stroke={stroke} strokeWidth="2" />
          <circle cx="45" cy="64" r="10" fill="#fcd34d" stroke={stroke} strokeWidth="2" />
          <circle cx="26" cy="45" r="10" fill="#fde68a" stroke={stroke} strokeWidth="2" />
          <circle cx="45" cy="45" r="9" fill="#fb7185" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'teacup_warm':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="48" r="30" fill={fill} opacity="0.6" />
          <path d="M24 40H60V56C60 65 52 70 42 70C32 70 24 65 24 56V40Z" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M60 44H68C72 44 72 54 68 54H60" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
          <path d="M36 30C34 25 38 22 36 18M48 30C46 25 50 22 48 18" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'thumbs_sun':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="26" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <path d="M45 10V15M45 75V80M10 45H15M75 45H80M20 20L24 24M66 66L70 70M70 20L66 24M24 66L20 70" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
          <path d="M36 42C38 39 41 39 42 42M48 42C50 39 53 39 54 42M38 52C42 56 48 56 52 52" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'magnifying_question':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="46" cy="46" r="34" fill={fill} opacity="0.65" />
          <circle cx="44" cy="44" r="22" fill="#fff" stroke={stroke} strokeWidth="2.6" />
          <path d="M60 60L82 82" stroke={stroke} strokeWidth="5.5" strokeLinecap="round" />
          <text x="44" y="52" textAnchor="middle" fill={stroke} fontSize="24" fontWeight="900">?</text>
          <text x="78" y="30" fill={stroke} fontSize="16" fontWeight="900">?</text>
        </svg>
      );

    case 'signpost_two_way':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <path d="M50 14V84" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <path d="M16 24H76L86 33L76 42H16V24Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M84 48H24L14 57L24 66H84V48Z" fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <text x="46" y="36" textAnchor="middle" fill={stroke} fontSize="9.5" fontWeight="900">ELLI? (WHERE)</text>
          <text x="53" y="60" textAnchor="middle" fill={stroke} fontSize="9.5" fontWeight="900">ESHTU? (₹)</text>
        </svg>
      );

    case 'lightbulb_idea':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} opacity="0.6" />
          <path d="M45 18C34 18 27 26 27 36C27 43 32 48 36 54H54C58 48 63 43 63 36C63 26 56 18 45 18Z" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <path d="M38 60H52M40 66H50M45 8V13M18 26L22 29M72 26L68 29" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      );

    case 'price_tag_question':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M20 46L48 18H72V42L44 70L20 46Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <circle cx="60" cy="30" r="4" fill={fill} stroke={stroke} strokeWidth="2" />
          <text x="45" y="52" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="900">₹ ?</text>
        </svg>
      );

    case 'compass_star':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M45 17L52 38L73 45L52 52L45 73L38 52L17 45L38 38L45 17Z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
          <circle cx="45" cy="45" r="4" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'number_blocks':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <rect x="14" y="20" width="34" height="34" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <text x="31" y="44" textAnchor="middle" fill={stroke} fontSize="20" fontWeight="900">1</text>
          <rect x="52" y="18" width="34" height="34" rx="8" fill="#fde68a" stroke={stroke} strokeWidth="2.4" />
          <text x="69" y="42" textAnchor="middle" fill={stroke} fontSize="20" fontWeight="900">2</text>
          <rect x="28" y="56" width="44" height="32" rx="8" fill={fill} stroke={stroke} strokeWidth="2.4" />
          <text x="50" y="78" textAnchor="middle" fill={stroke} fontSize="18" fontWeight="900">10·20</text>
        </svg>
      );

    case 'bmtc_ticket':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="14" y="22" width="72" height="46" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M26 34H74M26 56H74" stroke={stroke} strokeWidth="1.8" strokeDasharray="4 4" />
          <text x="50" y="49" textAnchor="middle" fill={stroke} fontSize="12" fontWeight="900">500D · ₹15</text>
        </svg>
      );

    case 'dice_pair':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="20" y="20" width="50" height="50" rx="10" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <circle cx="33" cy="33" r="3.5" fill={stroke} />
          <circle cx="45" cy="45" r="3.5" fill={stroke} />
          <circle cx="57" cy="57" r="3.5" fill={stroke} />
          <circle cx="57" cy="33" r="3.5" fill={stroke} />
          <circle cx="33" cy="57" r="3.5" fill={stroke} />
        </svg>
      );

    case 'abacus_frame':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="18" y="20" width="54" height="50" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M18 36H72M18 54H72" stroke={stroke} strokeWidth="2" />
          <circle cx="32" cy="36" r="5" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
          <circle cx="46" cy="36" r="5" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="40" cy="54" r="5" fill="#fb7185" stroke={stroke} strokeWidth="1.8" />
          <circle cx="56" cy="54" r="5" fill="#34d399" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'tally_board':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="16" y="20" width="58" height="50" rx="8" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <path d="M28 32V56M38 32V56M48 32V56M58 32V56M24 52L62 36" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );

    case 'masala_dosa':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <ellipse cx="50" cy="58" rx="42" ry="26" fill="#d1fae5" stroke={stroke} strokeWidth="2.3" />
          <path d="M14 58C22 44 78 44 86 58C78 68 22 68 14 58Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="34" cy="38" r="7" fill="#fff" stroke={stroke} strokeWidth="2" />
          <circle cx="50" cy="36" r="7" fill="#fca5a5" stroke={stroke} strokeWidth="2" />
          <circle cx="66" cy="38" r="7" fill="#fde68a" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'idli_vada':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <ellipse cx="50" cy="56" rx="38" ry="22" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <ellipse cx="36" cy="54" rx="13" ry="8" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <ellipse cx="62" cy="54" rx="13" ry="9" fill="#fbbf24" stroke={stroke} strokeWidth="2.2" />
          <circle cx="62" cy="54" r="3" fill={fill} stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'sambar_pot':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M22 42H68L62 72H28L22 42Z" fill="#fca5a5" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <ellipse cx="45" cy="42" rx="23" ry="6" fill="#fde68a" stroke={stroke} strokeWidth="2.2" />
          <path d="M52 40L66 20" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'tiffin_cutlery':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} opacity="0.65" />
          <ellipse cx="36" cy="32" rx="6" ry="10" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <path d="M36 42V66M54 24V66M49 24V34C49 38 59 38 59 34V24" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      );

    case 'rice_bowl':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M22 46C22 34 68 34 68 46H22Z" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <path d="M20 46H70C68 64 58 72 45 72C32 72 22 64 20 46Z" fill={fill} stroke={stroke} strokeWidth="2.3" />
        </svg>
      );

    case 'filter_kaapi':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="54" r="36" fill={fill} opacity="0.65" />
          <path d="M20 66H80L72 82H28L20 66Z" fill="#fde68a" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M34 36H66L62 66H38L34 36Z" fill="#fff" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <ellipse cx="50" cy="36" rx="16" ry="4.5" fill="#fef3c7" stroke={stroke} strokeWidth="2" />
          <path d="M42 26C40 20 44 17 42 12M56 26C54 20 58 17 56 12" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'tender_coconut':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <path d="M30 48C30 34 38 26 50 26C62 26 70 34 70 48C70 66 62 78 50 78C38 78 30 66 30 48Z" fill="#a7f3d0" stroke={stroke} strokeWidth="2.4" />
          <path d="M50 32L58 12L72 16" stroke="#e11d48" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'cutting_chai':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M28 28H62L56 70H34L28 28Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M31 44H59L56 68H34L31 44Z" fill="#fed7aa" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'water_droplet':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M45 18C45 18 24 42 24 56C24 68 33 76 45 76C57 76 66 68 66 56C66 42 45 18 45 18Z" fill={fill} stroke={stroke} strokeWidth="2.4" />
        </svg>
      );

    case 'coffee_beans':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <ellipse cx="34" cy="45" rx="12" ry="18" transform="rotate(-15 34 45)" fill="#fde68a" stroke={stroke} strokeWidth="2.2" />
          <path d="M32 30C38 40 30 50 36 60" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="58" cy="48" rx="12" ry="18" transform="rotate(20 58 48)" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M60 33C54 43 62 53 56 63" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'shop_angadi':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <rect x="20" y="42" width="60" height="42" rx="5" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M16 42L24 26H76L84 42H16Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="40" y="58" width="20" height="26" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'city_map_pin':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <path d="M16 26L38 18L62 26L84 18V74L62 82L38 74L16 82V26Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M50 22C42 22 36 28 36 36C36 46 50 58 50 58C50 58 64 46 64 36C64 28 58 22 50 22Z" fill="#fecdd3" stroke={stroke} strokeWidth="2.2" />
          <circle cx="50" cy="36" r="4" fill="#fff" />
        </svg>
      );

    case 'cozy_home':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M18 46L45 22L72 46" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="26" y="44" width="38" height="30" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <rect x="39" y="54" width="12" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'park_tree':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="36" r="20" fill="#a7f3d0" stroke={stroke} strokeWidth="2.3" />
          <circle cx="32" cy="44" r="14" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="58" cy="44" r="14" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M45 48V74M35 74H55" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'metro_train':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="20" y="20" width="60" height="48" rx="12" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <rect x="28" y="28" width="44" height="20" rx="5" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="34" cy="58" r="4" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
          <circle cx="66" cy="58" r="4" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
          <path d="M14 74H86" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'buddies_duo':
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="36" cy="40" r="13" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <circle cx="64" cy="40" r="13" fill="#fed7aa" stroke={stroke} strokeWidth="2.3" />
          <path d="M18 76C18 64 26 58 36 58C46 58 54 64 54 76" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M46 76C46 64 54 58 64 58C74 58 82 64 82 76" fill={fill} stroke={stroke} strokeWidth="2.3" />
        </svg>
      );

    case 'friend_polaroid':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <rect x="18" y="12" width="58" height="68" rx="7" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <rect x="25" y="19" width="44" height="40" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
          <circle cx="47" cy="36" r="9" fill="#fde68a" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'auto_cap_badge':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M22 52C22 36 32 28 46 28C60 28 70 36 70 52H22Z" fill="#2dd4bf" stroke={stroke} strokeWidth="2.3" />
          <path d="M16 52H76C76 57 70 60 62 60H22C18 60 16 56 16 52Z" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <circle cx="46" cy="40" r="5" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'spectacles_uncle':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="28" fill={fill} opacity="0.6" />
          <circle cx="32" cy="45" r="11" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <circle cx="58" cy="45" r="11" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M43 45H47M21 45L15 41M69 45L75 41" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'high_five':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} opacity="0.65" />
          <path d="M26 64L38 34L48 40L40 66Z" fill="#fde68a" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M64 64L52 34L42 40L50 66Z" fill="#fed7aa" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M45 16V24M32 20L36 26M58 20L54 26" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'beku_check_card':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <rect x="18" y="16" width="64" height="62" rx="12" fill="#d1fae5" stroke={stroke} strokeWidth="2.4" />
          <path d="M34 46L45 57L66 34" stroke="#059669" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <text x="50" y="70" textAnchor="middle" fill={stroke} fontSize="11" fontWeight="900">BEKU ✓</text>
        </svg>
      );

    case 'service_bell':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M22 62C22 44 32 34 45 34C58 34 68 44 68 62H22Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.3" />
          <circle cx="45" cy="28" r="5" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="16" y="62" width="58" height="8" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'shopping_basket':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M20 42H75L67 72H28L20 42Z" fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M32 42L42 22M63 42L53 22" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );

    case 'wish_star_hand':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} opacity="0.6" />
          <path d="M45 18L50 32L65 34L54 44L57 58L45 51L33 58L36 44L25 34L40 32L45 18Z" fill="#fde68a" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );

    case 'menu_checklist':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="22" y="16" width="46" height="58" rx="7" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M30 32L34 36L40 28M46 33H60M30 48L34 52L40 44M46 49H60" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'beda_stop_card':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <rect x="18" y="16" width="64" height="62" rx="12" fill="#ffe4e6" stroke={stroke} strokeWidth="2.4" />
          <path d="M36 34L64 58M64 34L36 58" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
          <text x="50" y="70" textAnchor="middle" fill={stroke} fontSize="11" fontWeight="900">BEDA ✗</text>
        </svg>
      );

    case 'crossed_chili':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="28" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M30 56C42 58 58 46 60 30C50 30 34 42 30 56Z" fill="#fb7185" stroke={stroke} strokeWidth="2" />
          <path d="M25 25L65 65" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'no_sugar_cup':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="26" y="26" width="16" height="16" rx="3" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <rect x="46" y="34" width="16" height="16" rx="3" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M22 64L68 22" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'balance_scale':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M45 20V70M30 70H60M22 34H68" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 52H32L24 34L16 52Z" fill="#d1fae5" stroke={stroke} strokeWidth="2" />
          <path d="M58 52H74L66 34L58 52Z" fill="#ffe4e6" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'full_plate_saaku':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <circle cx="47" cy="46" r="30" fill={fill} stroke={stroke} strokeWidth="2.4" />
          <text x="47" y="51" textAnchor="middle" fill={stroke} fontSize="13" fontWeight="900">SAAKU ✋</text>
        </svg>
      );

    case 'rupee_notes':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="14" y="22" width="72" height="44" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <rect x="20" y="28" width="60" height="32" rx="4" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <text x="50" y="50" textAnchor="middle" fill={stroke} fontSize="17" fontWeight="900">₹ 100</text>
        </svg>
      );

    case 'upi_qr_stand':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <rect x="24" y="14" width="46" height="64" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <rect x="32" y="24" width="12" height="12" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="50" y="24" width="12" height="12" fill={fill} stroke={stroke} strokeWidth="2" />
          <rect x="32" y="42" width="12" height="12" fill={fill} stroke={stroke} strokeWidth="2" />
          <text x="47" y="70" textAnchor="middle" fill={stroke} fontSize="9.5" fontWeight="900">UPI SCAN</text>
        </svg>
      );

    case 'gold_coins':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="36" cy="48" r="18" fill="#fde68a" stroke={stroke} strokeWidth="2.3" />
          <circle cx="54" cy="40" r="18" fill="#fcd34d" stroke={stroke} strokeWidth="2.3" />
          <text x="54" y="46" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="900">₹</text>
        </svg>
      );

    case 'wallet_cash':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="18" y="28" width="54" height="40" rx="8" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <rect x="52" y="40" width="24" height="16" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <circle cx="60" cy="48" r="3" fill={stroke} />
        </svg>
      );

    case 'price_calc':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="24" y="16" width="42" height="58" rx="7" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <rect x="30" y="22" width="30" height="14" rx="3" fill="#d1fae5" stroke={stroke} strokeWidth="1.8" />
          <circle cx="35" cy="46" r="3" fill={stroke} />
          <circle cx="45" cy="46" r="3" fill={stroke} />
          <circle cx="55" cy="46" r="3" fill={stroke} />
          <circle cx="35" cy="58" r="3" fill={stroke} />
          <circle cx="45" cy="58" r="3" fill={stroke} />
          <circle cx="55" cy="58" r="3" fill={stroke} />
        </svg>
      );

    case 'brass_key_tag':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <circle cx="34" cy="42" r="15" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" />
          <circle cx="34" cy="42" r="5" fill="#fff" stroke={stroke} strokeWidth="2" />
          <path d="M49 42H84V54M72 42V52" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
          <rect x="26" y="64" width="50" height="20" rx="5" fill="#fff" stroke={stroke} strokeWidth="2" />
          <text x="51" y="77" textAnchor="middle" fill={stroke} fontSize="9.5" fontWeight="900">NANNA KEY</text>
        </svg>
      );

    case 'phone_handoff':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="28" y="16" width="34" height="58" rx="7" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <rect x="33" y="24" width="24" height="38" rx="3" fill={fill} stroke={stroke} strokeWidth="1.8" />
          <circle cx="45" cy="68" r="2.5" fill={stroke} />
        </svg>
      );

    case 'backpack_patch':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="24" y="26" width="42" height="48" rx="12" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <rect x="31" y="46" width="28" height="20" rx="5" fill="#fff" stroke={stroke} strokeWidth="2" />
          <path d="M36 26V20C36 16 54 16 54 20V26" stroke={stroke} strokeWidth="2.4" />
        </svg>
      );

    case 'shared_umbrella_home':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <path d="M18 46C18 26 32 16 50 16C68 16 82 26 82 46H18Z" fill={fill} stroke={stroke} strokeWidth="2.4" />
          <rect x="34" y="52" width="32" height="28" rx="4" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <rect x="45" y="62" width="10" height="18" fill="#fde68a" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'respect_crown':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M20 62L26 30L45 44L64 30L70 62H20Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      );

    case 'tiffin_carrier':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="28" y="28" width="34" height="14" rx="3" fill="#fff" stroke={stroke} strokeWidth="2.2" />
          <rect x="28" y="42" width="34" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="28" y="56" width="34" height="14" rx="3" fill="#fde68a" stroke={stroke} strokeWidth="2.2" />
          <path d="M24 28V64M66 28V64M36 20H54" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      );

    case 'cafe_chair':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <circle cx="48" cy="48" r="34" fill={fill} opacity="0.6" />
          <path d="M32 26V74M60 50V74M32 50H64" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="28" y="24" width="10" height="20" rx="4" fill="#fcd34d" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'walking_sneaker':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M24 32H48L56 48H74C78 48 80 52 80 58V64H20V46L24 32Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <rect x="20" y="60" width="60" height="7" rx="3.5" fill={fill} stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'stop_octagon':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <polygon points="34,18 56,18 72,34 72,56 56,72 34,72 18,56 18,34" fill="#fb7185" stroke={stroke} strokeWidth="2.4" />
          <text x="45" y="49" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="900">NILLU</text>
        </svg>
      );

    case 'open_door':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="26" y="18" width="38" height="56" rx="4" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <path d="M26 18L52 12V68L26 74V18Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <circle cx="46" cy="42" r="2.5" fill={stroke} />
        </svg>
      );

    case 'parcel_handoff':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="24" y="28" width="46" height="42" rx="6" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M20 28H74V38H20V28Z" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M47 28V70" stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'eyes_look':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <ellipse cx="32" cy="45" rx="12" ry="16" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <ellipse cx="58" cy="45" rx="12" ry="16" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <circle cx="35" cy="45" r="5" fill={stroke} />
          <circle cx="61" cy="45" r="5" fill={stroke} />
        </svg>
      );

    case 'ear_listen':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M36 30C36 20 56 20 56 38C56 50 46 54 44 64C42 70 32 68 32 60" fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M66 30C70 38 70 46 66 54M74 24C80 36 80 48 74 60" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'megaphone_shout':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M22 42L64 22V68L22 48V42Z" fill="#fff" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="14" y="38" width="10" height="14" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M74 34L84 28M76 45H86M74 56L84 62" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );

    case 'bill_receipt':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M26 16H64V74L56 68L48 74L40 68L32 74L26 68V16Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M34 30H56M34 42H56M34 54H48" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'auto_rickshaw_side':
      return (
        <svg viewBox="0 0 105 95" className="w-full h-full" fill="none">
          <path d="M20 44C20 28 32 22 52 22H74C82 22 86 28 86 38V44H20Z" fill="#fbbf24" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M16 44H88V66C88 69 85 71 82 71H20C17 71 16 68 16 65V44Z" fill="#10b981" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <rect x="48" y="29" width="24" height="20" rx="3" fill="#fff" stroke={stroke} strokeWidth="2" />
          <circle cx="30" cy="72" r="9" fill="#334155" stroke={stroke} strokeWidth="2.2" />
          <circle cx="74" cy="72" r="9" fill="#334155" stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'speedometer_dial':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M18 64C18 44 31 30 48 30C65 30 78 44 78 64H18Z" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M48 62L62 40" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="62" r="4" fill={stroke} />
        </svg>
      );

    case 'auto_horn':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="28" cy="45" r="13" fill="#fb7185" stroke={stroke} strokeWidth="2.3" />
          <path d="M41 45L64 31V59L41 45Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
        </svg>
      );

    case 'traffic_cone':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M45 20L64 68H26L45 20Z" fill="#fb923c" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M35 44H55M31 54H59" stroke="#fff" strokeWidth="4" />
          <rect x="20" y="68" width="50" height="6" rx="3" fill={stroke} />
        </svg>
      );

    case 'lightning_action':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="32" fill={fill} opacity="0.65" />
          <path d="M50 14L28 48H46L40 76L64 42H46L50 14Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
      );

    case 'laptop_work':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="22" y="22" width="50" height="34" rx="5" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M14 56H80L74 66H20L14 56Z" fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
        </svg>
      );

    case 'open_book':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M18 26C30 24 42 28 47 34C52 28 64 24 76 26V66C64 64 52 68 47 72C42 68 30 64 18 66V26Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <path d="M47 34V72" stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'checkered_flags':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M24 72L42 22M70 72L52 22" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
          <rect x="18" y="22" width="26" height="18" rx="3" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <rect x="50" y="22" width="26" height="18" rx="3" fill="#fde68a" stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'trophy_cup':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <path d="M30 24H64V44C64 54 56 62 47 62C38 62 30 54 30 44V24Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" />
          <path d="M47 62V74M34 74H60" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'boss_shield':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M45 16L70 26V46C70 62 58 72 45 78C32 72 20 62 20 46V26L45 16Z" fill={fill} stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="45" cy="45" r="10" fill="#fcd34d" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'podium_first':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="35" y="34" width="25" height="38" fill="#fcd34d" stroke={stroke} strokeWidth="2.3" />
          <rect x="15" y="48" width="20" height="24" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <rect x="60" y="54" width="20" height="18" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <text x="47" y="56" textAnchor="middle" fill={stroke} fontSize="14" fontWeight="900">1</text>
        </svg>
      );

    case 'traffic_signal':
      return (
        <svg viewBox="0 0 90 95" className="w-full h-full" fill="none">
          <rect x="32" y="14" width="26" height="56" rx="10" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <circle cx="45" cy="26" r="5.5" fill="#fb7185" stroke={stroke} strokeWidth="1.8" />
          <circle cx="45" cy="42" r="5.5" fill="#fbbf24" stroke={stroke} strokeWidth="1.8" />
          <circle cx="45" cy="58" r="5.5" fill="#34d399" stroke={stroke} strokeWidth="1.8" />
          <path d="M45 70V84" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'direction_arrows':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <circle cx="47" cy="45" r="32" fill={fill} opacity="0.65" />
          <path d="M47 68V22M47 22L36 33M47 22L58 33M24 46H70" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'uturn_sign':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M56 60V38C56 28 34 28 34 38V56M34 56L27 49M34 56L41 49" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'paper_plane':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M16 44L74 20L54 72L42 52L16 44Z" fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
        </svg>
      );

    case 'flyover_bridge':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <path d="M12 42C36 26 64 26 88 42" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M12 50H88M30 50V72M70 50V72" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );

    case 'temple_gopuram':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M34 22H56L62 42H28L34 22Z" fill="#fde68a" stroke={stroke} strokeWidth="2.2" />
          <path d="M26 42H64L70 68H20L26 42Z" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <rect x="40" y="52" width="10" height="16" fill="#fff" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'street_lamp':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M36 74V24C36 18 56 18 56 26" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="56" cy="30" r="7" fill="#fde68a" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'auto_fare_meter':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <rect x="20" y="26" width="54" height="48" rx="9" fill="#1e293b" stroke={stroke} strokeWidth="2.4" />
          <rect x="27" y="34" width="40" height="18" rx="3" fill="#d1fae5" stroke={stroke} strokeWidth="1.8" />
          <text x="47" y="47" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="900">₹ 30.0</text>
          <path d="M74 44L88 24" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <rect x="80" y="14" width="14" height="10" rx="3" fill="#fb7185" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'hailing_hand':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <circle cx="48" cy="48" r="32" fill={fill} opacity="0.65" />
          <path d="M32 68V34C32 28 40 28 40 34V46H56C62 46 62 54 56 54H44V68" fill="#fde68a" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'destination_board':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="12" y="24" width="76" height="42" rx="8" fill="#10b981" stroke={stroke} strokeWidth="2.4" />
          <text x="50" y="44" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900">INDIRANAGAR</text>
          <text x="50" y="57" textAnchor="middle" fill="#fef3c7" fontSize="8.5" fontWeight="800">MG ROAD · 3 KM</text>
        </svg>
      );

    case 'auto_front':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M26 42C26 26 64 26 64 42H26Z" fill="#fbbf24" stroke={stroke} strokeWidth="2.3" />
          <rect x="24" y="42" width="42" height="24" rx="5" fill="#10b981" stroke={stroke} strokeWidth="2.3" />
          <circle cx="45" cy="54" r="6" fill="#fef3c7" stroke={stroke} strokeWidth="2" />
          <circle cx="45" cy="72" r="7" fill="#334155" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'gps_phone_map':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <rect x="26" y="12" width="44" height="68" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M36 62C40 46 54 48 58 28" stroke="#059669" strokeWidth="2.8" strokeLinecap="round" strokeDasharray="4 4" />
          <circle cx="58" cy="28" r="4.5" fill="#e11d48" stroke={stroke} strokeWidth="1.8" />
        </svg>
      );

    case 'rearview_mirror':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <rect x="18" y="32" width="54" height="26" rx="10" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <path d="M45 16V32M32 50L44 38M46 52L58 40" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'arrival_gate':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M22 72V36C22 22 72 22 72 36V72" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <rect x="32" y="44" width="30" height="28" fill={fill} stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'raincloud_sun':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <circle cx="34" cy="34" r="12" fill="#fcd34d" stroke={stroke} strokeWidth="2.2" />
          <path d="M28 54H76C82 54 86 48 84 42C82 36 76 34 72 36C68 26 58 22 48 26C40 28 38 36 38 38C30 38 26 44 28 54Z" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M38 62L34 72M52 62L48 72M66 62L62 72" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'open_umbrella':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <path d="M18 50C18 30 32 18 48 18C64 18 78 30 78 50H18Z" fill="#fb7185" stroke={stroke} strokeWidth="2.4" />
          <path d="M48 50V72C48 78 40 78 40 72" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      );

    case 'sunglasses_sun':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="24" fill="#fcd34d" stroke={stroke} strokeWidth="2.3" />
          <rect x="29" y="36" width="13" height="9" rx="2" fill="#1e293b" />
          <rect x="48" y="36" width="13" height="9" rx="2" fill="#1e293b" />
          <path d="M42 39H48M38 53C42 57 48 57 52 53" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'traffic_cars':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="16" y="42" width="44" height="20" rx="5" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <path d="M24 42L30 30H48L54 42" fill="#fff" stroke={stroke} strokeWidth="2" />
          <circle cx="26" cy="64" r="6" fill="#334155" />
          <circle cx="50" cy="64" r="6" fill="#334155" />
        </svg>
      );

    case 'alarm_clock':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <circle cx="48" cy="50" r="25" fill="#fff" stroke={stroke} strokeWidth="2.5" />
          <path d="M26 28L34 22M70 28L62 22M48 36V50L58 56" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );

    case 'pie_half_hour':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="26" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M45 19A26 26 0 0 1 45 71V19Z" fill={fill} stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'sun_moon_cycle':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <circle cx="34" cy="44" r="14" fill="#fcd34d" stroke={stroke} strokeWidth="2.2" />
          <path d="M64 30C56 32 54 44 62 52C66 56 72 56 76 54C70 62 56 60 52 48C48 36 56 26 64 30Z" fill={fill} stroke={stroke} strokeWidth="2.2" />
        </svg>
      );

    case 'hourglass_timer':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M28 20H62L45 45L62 70H28L45 45L28 20Z" fill={fill} stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
        </svg>
      );

    case 'flip_calendar':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <rect x="20" y="20" width="56" height="56" rx="9" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <path d="M20 29C20 24 24 20 29 20H67C72 20 76 24 76 29V38H20V29Z" fill="#fbbf24" stroke={stroke} strokeWidth="2.3" />
          <text x="48" y="60" textAnchor="middle" fill={stroke} fontSize="12" fontWeight="900">NAALE</text>
        </svg>
      );

    case 'weekly_planner':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="16" y="22" width="64" height="46" rx="7" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <path d="M16 36H80M38 36V68M58 36V68" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'sticky_reminder':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M22 20H68V56L54 70H22V20Z" fill="#fef3c7" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
          <circle cx="45" cy="20" r="4" fill="#e11d48" />
        </svg>
      );

    case 'rewind_ff_portals':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <circle cx="50" cy="45" r="32" fill={fill} opacity="0.65" />
          <path d="M44 33L28 45L44 57V33ZM56 33L72 45L56 57V33Z" fill="#fff" stroke={stroke} strokeWidth="2.3" strokeLinejoin="round" />
        </svg>
      );

    case 'rocket_launch':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <path d="M45 16C58 28 60 48 56 62H34C30 48 32 28 45 16Z" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <circle cx="45" cy="40" r="6" fill={fill} stroke={stroke} strokeWidth="2" />
          <path d="M38 62L45 76L52 62" fill="#fbbf24" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'done_stamp':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="16" y="28" width="62" height="34" rx="7" transform="rotate(-6 16 28)" fill="#d1fae5" stroke={stroke} strokeWidth="2.4" />
          <text x="47" y="48" textAnchor="middle" fill={stroke} fontSize="11" fontWeight="900">AAYTU ✓</text>
        </svg>
      );

    case 'heart_eyes_face':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <circle cx="48" cy="48" r="28" fill="#fde68a" stroke={stroke} strokeWidth="2.4" />
          <circle cx="38" cy="42" r="5" fill="#e11d48" />
          <circle cx="58" cy="42" r="5" fill="#e11d48" />
          <path d="M36 56C41 63 55 63 60 56" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'five_star_bar':
      return (
        <svg viewBox="0 0 100 90" className="w-full h-full" fill="none">
          <rect x="12" y="28" width="76" height="34" rx="10" fill="#fff" stroke={stroke} strokeWidth="2.3" />
          <text x="50" y="50" textAnchor="middle" fill="#f59e0b" fontSize="15" fontWeight="900">★★★★★</text>
        </svg>
      );

    case 'muscle_sulabha':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="30" fill={fill} stroke={stroke} strokeWidth="2.3" />
          <text x="45" y="50" textAnchor="middle" fill={stroke} fontSize="12" fontWeight="900">EASY 💪</text>
        </svg>
      );

    case 'speech_hearts':
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="26" fill="#ffe4e6" stroke={stroke} strokeWidth="2.2" />
          <path d="M45 58C45 58 30 48 30 37C30 32 35 28 40 28C43 28 45 31 45 31C45 31 47 28 50 28C55 28 60 32 60 37C60 48 45 58 45 58Z" fill="#fb7185" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'champion_crown':
      return (
        <svg viewBox="0 0 100 95" className="w-full h-full" fill="none">
          <circle cx="50" cy="48" r="34" fill={fill} opacity="0.65" />
          <path d="M22 64L28 30L50 44L72 30L78 64H22Z" fill="#fcd34d" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      );

    case 'tiger_medal':
      return (
        <svg viewBox="0 0 95 95" className="w-full h-full" fill="none">
          <path d="M36 16L44 36M60 16L52 36" stroke="#e11d48" strokeWidth="4" strokeLinecap="round" />
          <circle cx="48" cy="54" r="22" fill="#fcd34d" stroke={stroke} strokeWidth="2.4" />
          <text x="48" y="60" textAnchor="middle" fill={stroke} fontSize="16" fontWeight="900">🐯</text>
        </svg>
      );

    case 'diploma_scroll':
      return (
        <svg viewBox="0 0 95 90" className="w-full h-full" fill="none">
          <rect x="20" y="28" width="56" height="32" rx="8" fill="#fff" stroke={stroke} strokeWidth="2.4" />
          <circle cx="48" cy="44" r="7" fill="#fb7185" stroke={stroke} strokeWidth="2" />
        </svg>
      );

    case 'fireworks_burst':
    default:
      return (
        <svg viewBox="0 0 90 90" className="w-full h-full" fill="none">
          <circle cx="45" cy="45" r="28" fill={fill} opacity="0.6" />
          <path d="M45 14V26M45 64V76M14 45H26M64 45H76M23 23L32 32M58 58L67 67M67 23L58 32M32 58L23 67" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="45" cy="45" r="8" fill="#fcd34d" stroke={stroke} strokeWidth="2" />
        </svg>
      );
  }
}

function getUnitConfig(unitId: string, unitIndex: number): {
  config: UnitFullDoodleConfig;
  palette: PaletteColors;
} {
  const fallbackKeys = Object.keys(UNIT_DOODLE_CONFIGS);
  const cfg =
    UNIT_DOODLE_CONFIGS[unitId] ||
    UNIT_DOODLE_CONFIGS[fallbackKeys[unitIndex % fallbackKeys.length]];
  return {
    config: cfg,
    palette: PALETTES[cfg.palette],
  };
}

/**
 * Rich, multi-doodle unit background canvas rendered behind the 5 winding lesson nodes
 * across ALL 30 units (u1 through u30) on the Home page!
 *
 * Uses a 4-row × 2-column (Left & Right) layout so every single unit displays 8 distinct
 * unit-representing doodles, Kanglish callout stickers, and Kannada script watermarks
 * evenly distributed from Lesson 1 down to Lesson 5.
 */

// ============================================================================
// TRANSPARENT DOODLE STICKER PNG MAPPING (FROM USER-PROVIDED DOODLE SHEETS)
// ============================================================================

const ART_ID_TO_DOODLE_PNG: Record<ArtId, string> = {
  // Sheet 1 (4x4): Greetings, Politeness, Vidhana Soudha, Marigold, Tea, Stars
  namaste_hands: '/assets/doodles/namaste_hands.png',
  wave_hand: '/assets/doodles/wave_hand.png',
  name_badge: '/assets/doodles/name_badge.png',
  smile_bubble: '/assets/doodles/smile_bubble.png',
  vidhana_soudha: '/assets/doodles/vidhana_soudha.png',
  beku_check_card: '/assets/doodles/beku_check_card.png',
  buddies_duo: '/assets/doodles/buddies_duo.png',
  compass_star: '/assets/doodles/compass_star.png',
  heart_garland: '/assets/doodles/heart_garland.png',
  marigold_flower: '/assets/doodles/marigold_flower.png',
  polite_bubbles: '/assets/doodles/polite_bubbles.png',
  teacup_warm: '/assets/doodles/teacup_warm.png',
  five_star_bar: '/assets/doodles/five_star_bar.png',
  done_stamp: '/assets/doodles/done_stamp.png',
  megaphone_shout: '/assets/doodles/megaphone_shout.png',

  // Sheet 2 (3x4): Questions, Map, Signpost, Blocks, Dice, Ticket
  thumbs_sun: '/assets/doodles/thumbs_sun.png',
  speech_hearts: '/assets/doodles/speech_hearts.png',
  wish_star_hand: '/assets/doodles/wish_star_hand.png',
  magnifying_question: '/assets/doodles/magnifying_question.png',
  lightbulb_idea: '/assets/doodles/lightbulb_idea.png',
  signpost_two_way: '/assets/doodles/signpost_two_way.png',
  price_tag_question: '/assets/doodles/price_tag_question.png',
  city_map_pin: '/assets/doodles/city_map_pin.png',
  eyes_look: '/assets/doodles/eyes_look.png',
  number_blocks: '/assets/doodles/number_blocks.png',
  dice_pair: '/assets/doodles/dice_pair.png',
  bmtc_ticket: '/assets/doodles/bmtc_ticket.png',

  // Sheet 3 (4x4): Numbers, Coins, Trophy, Masala Dosa, Idli-Vada, Sambar, Rice, Checklist
  abacus_frame: '/assets/doodles/abacus_frame.png',
  tally_board: '/assets/doodles/tally_board.png',
  gold_coins: '/assets/doodles/gold_coins.png',
  auto_fare_meter: '/assets/doodles/auto_fare_meter.png',
  price_calc: '/assets/doodles/price_calc.png',
  trophy_cup: '/assets/doodles/trophy_cup.png',
  masala_dosa: '/assets/doodles/masala_dosa.png',
  tiffin_carrier: '/assets/doodles/tiffin_carrier.png',
  sambar_pot: '/assets/doodles/sambar_pot.png',
  idli_vada: '/assets/doodles/idli_vada.png',
  tiffin_cutlery: '/assets/doodles/tiffin_cutlery.png',
  heart_eyes_face: '/assets/doodles/heart_eyes_face.png',
  rice_bowl: '/assets/doodles/rice_bowl.png',
  service_bell: '/assets/doodles/service_bell.png',
  menu_checklist: '/assets/doodles/menu_checklist.png',
  shopping_basket: '/assets/doodles/shopping_basket.png',

  // Sheet 4 (4x4): Filter Kaapi, Coconut, Chai, Angadi, Cubbon Park, Home, Namma Metro, Auto Rickshaw
  filter_kaapi: '/assets/doodles/filter_kaapi.png',
  coffee_beans: '/assets/doodles/coffee_beans.png',
  tender_coconut: '/assets/doodles/tender_coconut.png',
  water_droplet: '/assets/doodles/water_droplet.png',
  cutting_chai: '/assets/doodles/cutting_chai.png',
  no_sugar_cup: '/assets/doodles/no_sugar_cup.png',
  shop_angadi: '/assets/doodles/shop_angadi.png',
  park_tree: '/assets/doodles/park_tree.png',
  cozy_home: '/assets/doodles/cozy_home.png',
  metro_train: '/assets/doodles/metro_train.png',
  auto_cap_badge: '/assets/doodles/auto_cap_badge.png',
  auto_rickshaw_side: '/assets/doodles/auto_rickshaw_side.png',
  shared_umbrella_home: '/assets/doodles/shared_umbrella_home.png',
  respect_crown: '/assets/doodles/respect_crown.png',
  auto_front: '/assets/doodles/auto_front.png',

  // Mapped companion ArtIds across Units 8–30 using the 60 extracted transparent stickers
  friend_polaroid: '/assets/doodles/buddies_duo.png',
  spectacles_uncle: '/assets/doodles/eyes_look.png',
  high_five: '/assets/doodles/wave_hand.png',
  beda_stop_card: '/assets/doodles/done_stamp.png',
  crossed_chili: '/assets/doodles/no_sugar_cup.png',
  balance_scale: '/assets/doodles/abacus_frame.png',
  full_plate_saaku: '/assets/doodles/tiffin_carrier.png',
  rupee_notes: '/assets/doodles/bmtc_ticket.png',
  upi_qr_stand: '/assets/doodles/auto_fare_meter.png',
  wallet_cash: '/assets/doodles/shopping_basket.png',
  brass_key_tag: '/assets/doodles/price_tag_question.png',
  phone_handoff: '/assets/doodles/auto_fare_meter.png',
  backpack_patch: '/assets/doodles/tiffin_carrier.png',
  cafe_chair: '/assets/doodles/teacup_warm_alt.png',
  walking_sneaker: '/assets/doodles/metro_train_alt.png',
  stop_octagon: '/assets/doodles/done_stamp.png',
  open_door: '/assets/doodles/shared_umbrella_home.png',
  parcel_handoff: '/assets/doodles/wish_star_hand.png',
  ear_listen: '/assets/doodles/polite_bubbles.png',
  bill_receipt: '/assets/doodles/menu_checklist.png',
  speedometer_dial: '/assets/doodles/auto_fare_meter.png',
  auto_horn: '/assets/doodles/service_bell.png',
  traffic_cone: '/assets/doodles/signpost_two_way.png',
  lightning_action: '/assets/doodles/lightbulb_idea.png',
  laptop_work: '/assets/doodles/price_calc.png',
  open_book: '/assets/doodles/tally_board.png',
  checkered_flags: '/assets/doodles/compass_star.png',
  boss_shield: '/assets/doodles/respect_crown.png',
  podium_first: '/assets/doodles/trophy_cup.png',
  traffic_signal: '/assets/doodles/signpost_two_way.png',
  direction_arrows: '/assets/doodles/signpost_two_way.png',
  uturn_sign: '/assets/doodles/signpost_two_way.png',
  paper_plane: '/assets/doodles/compass_star.png',
  flyover_bridge: '/assets/doodles/metro_train_alt.png',
  temple_gopuram: '/assets/doodles/vidhana_soudha.png',
  street_lamp: '/assets/doodles/lightbulb_idea.png',
  hailing_hand: '/assets/doodles/wave_hand.png',
  destination_board: '/assets/doodles/signpost_two_way.png',
  gps_phone_map: '/assets/doodles/city_map_pin.png',
  rearview_mirror: '/assets/doodles/auto_front.png',
  arrival_gate: '/assets/doodles/cozy_home.png',
  raincloud_sun: '/assets/doodles/water_droplet.png',
  open_umbrella: '/assets/doodles/water_droplet.png',
  sunglasses_sun: '/assets/doodles/thumbs_sun.png',
  traffic_cars: '/assets/doodles/auto_rickshaw_side.png',
  alarm_clock: '/assets/doodles/service_bell.png',
  pie_half_hour: '/assets/doodles/thumbs_sun.png',
  sun_moon_cycle: '/assets/doodles/thumbs_sun.png',
  hourglass_timer: '/assets/doodles/dice_pair.png',
  flip_calendar: '/assets/doodles/menu_checklist.png',
  weekly_planner: '/assets/doodles/tally_board.png',
  sticky_reminder: '/assets/doodles/price_tag_question.png',
  rewind_ff_portals: '/assets/doodles/compass_star.png',
  rocket_launch: '/assets/doodles/metro_train.png',
  muscle_sulabha: '/assets/doodles/thumbs_sun.png',
  champion_crown: '/assets/doodles/trophy_cup.png',
  tiger_medal: '/assets/doodles/buddies_duo.png',
  diploma_scroll: '/assets/doodles/bmtc_ticket.png',
  fireworks_burst: '/assets/doodles/five_star_bar.png',
};

const loadedDoodleUrls = new Set<string>();
const failedDoodleUrls = new Set<string>();

function getWebpUrl(pngUrl: string): string {
  return pngUrl.replace(/\.png$/i, '.webp');
}

// Pre-warm the top Home Screen doodles (Hero + Units 1-4) immediately, then pre-warm remaining unique WebPs
if (typeof window !== 'undefined') {
  const preloadUrl = (pngUrl?: string) => {
    if (!pngUrl) return;
    const webpUrl = getWebpUrl(pngUrl);
    if (loadedDoodleUrls.has(webpUrl) || failedDoodleUrls.has(webpUrl)) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      loadedDoodleUrls.add(webpUrl);
    };
    img.onerror = () => {
      failedDoodleUrls.add(webpUrl);
    };
    img.src = webpUrl;
  };

  const priorityArts: ArtId[] = [
    'vidhana_soudha',
    'auto_rickshaw_side',
    ...(UNIT_DOODLE_CONFIGS.u1?.doodles.map((d) => d.art) || []),
    ...(UNIT_DOODLE_CONFIGS.u2?.doodles.map((d) => d.art) || []),
    ...(UNIT_DOODLE_CONFIGS.u3?.doodles.map((d) => d.art) || []),
    ...(UNIT_DOODLE_CONFIGS.u4?.doodles.map((d) => d.art) || []),
  ];
  Array.from(new Set(priorityArts)).forEach((art) =>
    preloadUrl(ART_ID_TO_DOODLE_PNG[art])
  );

  window.setTimeout(() => {
    Array.from(new Set(Object.values(ART_ID_TO_DOODLE_PNG))).forEach((pngUrl) =>
      preloadUrl(pngUrl)
    );
  }, 150);
}

const DoodleImg: React.FC<{
  doodleId: string;
  art: ArtId;
  stroke: string;
  fill: string;
  title: string;
  sub?: string;
  className?: string;
  priority?: boolean;
}> = React.memo(
  ({
    art,
    stroke,
    fill,
    title,
    sub,
    className = 'w-full h-full',
    priority = false,
  }) => {
    const pngSrc = ART_ID_TO_DOODLE_PNG[art];
    const webpSrc = useMemo(() => (pngSrc ? getWebpUrl(pngSrc) : ''), [pngSrc]);

    const [stage, setStage] = useState<'webp' | 'png' | 'svg'>(() => {
      if (!pngSrc) return 'svg';
      if (failedDoodleUrls.has(webpSrc) && failedDoodleUrls.has(pngSrc)) {
        return 'svg';
      }
      if (failedDoodleUrls.has(webpSrc)) {
        return 'png';
      }
      return 'webp';
    });

    const activeSrc = stage === 'webp' ? webpSrc : stage === 'png' ? pngSrc : '';
    const [isLoaded, setIsLoaded] = useState<boolean>(() =>
      Boolean(activeSrc && loadedDoodleUrls.has(activeSrc))
    );

    const cleanLabel = useMemo(
      () => `${title}${sub ? ` (${sub})` : ''}`.replace(/[^\w\s₹/·,-]/g, '').trim(),
      [title, sub]
    );

    if (stage === 'svg' || !activeSrc) {
      return (
        <div
          className={`${className} drop-shadow-sm select-none pointer-events-none`}
          aria-hidden="true"
        >
          {renderDoodleArt(art, stroke, fill)}
        </div>
      );
    }

    return (
      <div
        className={`relative ${className} select-none pointer-events-none`}
        aria-hidden="true"
      >
        {/* Instant 0ms inline vector doodle rendered immediately until the sticker finishes decoding */}
        {!isLoaded && (
          <div className="absolute inset-0 w-full h-full drop-shadow-sm">
            {renderDoodleArt(art, stroke, fill)}
          </div>
        )}
        <img
          src={activeSrc}
          alt={cleanLabel || art}
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => {
            loadedDoodleUrls.add(activeSrc);
            setIsLoaded(true);
          }}
          onError={() => {
            failedDoodleUrls.add(activeSrc);
            if (stage === 'webp') {
              setStage('png');
              setIsLoaded(loadedDoodleUrls.has(pngSrc));
            } else {
              setStage('svg');
            }
          }}
          className={`w-full h-full object-contain drop-shadow-sm transition-opacity duration-150 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  }
);

export const UnitPathBackdropDoodles: React.FC<{
  unitId: string;
  unitIndex: number;
}> = React.memo(({ unitId, unitIndex }) => {
  const { config, palette } = getUnitConfig(unitId, unitIndex);
  const isPriorityUnit = unitIndex < 4;

  // Build 4 horizontal rows (each row has a Left doodle and a Right doodle -> 8 doodles per unit)
  const rows = useMemo(
    () =>
      [0, 1, 2, 3].map((rIdx) => {
        const lessonApproxIdx = Math.min(4, Math.round((rIdx * 4) / 3));
        const offsetAtRow =
          WINDING_OFFSETS[
            (unitIndex * 5 + lessonApproxIdx) % WINDING_OFFSETS.length
          ];

        // If the lesson node shifts right (offset > 0), the LEFT side has more room for the large hero badge.
        // If the lesson node shifts left (offset < 0), the RIGHT side has more room for the large hero badge.
        const leftIsWide =
          offsetAtRow > 0 ? true : offsetAtRow < 0 ? false : rIdx % 2 === 0;

        const itemA = config.doodles[rIdx * 2];
        const itemB = config.doodles[rIdx * 2 + 1];

        return {
          rIdx,
          leftItem: leftIsWide ? itemA : itemB,
          rightItem: leftIsWide ? itemB : itemA,
          leftSlotId: `${unitId}_r${rIdx}_left_${(leftIsWide ? itemA : itemB).art}`,
          rightSlotId: `${unitId}_r${rIdx}_right_${(leftIsWide ? itemB : itemA).art}`,
          leftIsWide,
        };
      }),
    [config.doodles, unitId, unitIndex]
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl z-0"
      style={{
        backgroundColor: palette.softBg,
        border: `1.5px dashed ${palette.borderTint}`,
      }}
      aria-hidden="true"
    >
      {/* 1. Ambient Notebook Dot-Grid + Hand-Drawn Squiggle Trail across the entire unit */}
      <svg
        className="absolute inset-0 w-full h-full opacity-50"
        viewBox="0 0 420 640"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`unit-grid-${unitId}`}
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="3"
              cy="3"
              r="1.35"
              fill={palette.accentStroke}
              opacity="0.32"
            />
          </pattern>
        </defs>
        <rect width="420" height="640" fill={`url(#unit-grid-${unitId})`} />

        {/* Ambient hand-drawn wave & loop lines in background */}
        <path
          d="M16 34C50 16 78 48 112 28"
          stroke={palette.accentStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.45"
        />
        <path
          d="M308 175C342 157 370 189 404 171"
          stroke={palette.accentStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.45"
        />
        <path
          d="M16 345C50 327 78 359 112 341"
          stroke={palette.accentStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.45"
        />
        <path
          d="M308 495C342 477 370 509 404 491"
          stroke={palette.accentStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.45"
        />
        {/* Decorative floating stars in center-background */}
        <circle
          cx="145"
          cy="95"
          r="3"
          fill={palette.accentStroke}
          opacity="0.25"
        />
        <circle
          cx="275"
          cy="245"
          r="3.5"
          fill={palette.accentStroke}
          opacity="0.25"
        />
        <circle
          cx="140"
          cy="420"
          r="3"
          fill={palette.accentStroke}
          opacity="0.25"
        />
        <circle
          cx="280"
          cy="560"
          r="3.5"
          fill={palette.accentStroke}
          opacity="0.25"
        />
      </svg>

      {/* 2. Top, Middle & Bottom Kannada Script Watermarks */}
      <div
        className="absolute top-2 left-1/2 -translate-x-1/2 opacity-[0.15] font-extrabold text-xl sm:text-2xl tracking-widest whitespace-nowrap"
        style={{ color: palette.accentStroke }}
      >
        {config.kannadaTop}
      </div>
      <div
        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 opacity-[0.11] font-extrabold text-2xl sm:text-3xl tracking-widest whitespace-nowrap"
        style={{ color: palette.accentStroke }}
      >
        {config.kannadaMiddle}
      </div>
      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-[0.15] font-extrabold text-xl sm:text-2xl tracking-widest whitespace-nowrap"
        style={{ color: palette.accentStroke }}
      >
        {config.kannadaBottom}
      </div>

      {/* 3. 4 EVENLY SPACED ROWS × 2 SIDES = 8 DOODLE IMAGES IN EVERY UNIT */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between py-4 px-1.5 sm:px-3">
        {rows.map(
          ({ rIdx, leftItem, rightItem, leftSlotId, rightSlotId, leftIsWide }) => (
            <div
              key={rIdx}
              className="w-full flex items-center justify-between gap-2"
            >
              {/* LEFT FLANK DOODLE IMAGE */}
              <div
                className={`flex flex-col items-center ${
                  leftIsWide
                    ? 'max-w-[114px] sm:max-w-[136px]'
                    : 'max-w-[90px] sm:max-w-[108px]'
                }`}
              >
                <div
                  className={`${
                    leftIsWide
                      ? 'w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] -rotate-6'
                      : 'w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] rotate-6'
                  } drop-shadow-xs`}
                >
                  <DoodleImg
                    doodleId={leftSlotId}
                    art={leftItem.art}
                    stroke={palette.accentStroke}
                    fill={palette.accentFill}
                    title={leftItem.title}
                    sub={leftItem.sub}
                    priority={isPriorityUnit}
                  />
                </div>
              </div>

              {/* RIGHT FLANK DOODLE IMAGE */}
              <div
                className={`flex flex-col items-center ${
                  !leftIsWide
                    ? 'max-w-[114px] sm:max-w-[136px]'
                    : 'max-w-[90px] sm:max-w-[108px]'
                }`}
              >
                <div
                  className={`${
                    !leftIsWide
                      ? 'w-[76px] h-[76px] sm:w-[92px] sm:h-[92px] rotate-6'
                      : 'w-[58px] h-[58px] sm:w-[68px] sm:h-[68px] -rotate-6'
                  } drop-shadow-xs`}
                >
                  <DoodleImg
                    doodleId={rightSlotId}
                    art={rightItem.art}
                    stroke={palette.accentStroke}
                    fill={palette.accentFill}
                    title={rightItem.title}
                    sub={rightItem.sub}
                    priority={isPriorityUnit}
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
});

/**
 * Miniature unit doodle images for the Unit Header Bar across all 30 units in CurriculumPath.tsx
 */
export const UnitHeaderWatermarkDoodle: React.FC<{
  unitId: string;
  unitIndex: number;
}> = React.memo(({ unitId, unitIndex }) => {
  const { config, palette } = getUnitConfig(unitId, unitIndex);
  const isPriorityUnit = unitIndex < 4;
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-xl z-0"
      aria-hidden="true"
    >
      <div
        className="absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-50"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div className="absolute right-10 -top-1.5 w-14 h-14 opacity-45 rotate-6">
        <DoodleImg
          doodleId={`${unitId}_hdr_0_${config.doodles[0].art}`}
          art={config.doodles[0].art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={config.doodles[0].title}
          sub={config.doodles[0].sub}
          priority={isPriorityUnit}
        />
      </div>
      <div className="absolute right-24 top-0.5 w-11 h-11 opacity-30 -rotate-12">
        <DoodleImg
          doodleId={`${unitId}_hdr_1_${config.doodles[1].art}`}
          art={config.doodles[1].art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={config.doodles[1].title}
          sub={config.doodles[1].sub}
          priority={isPriorityUnit}
        />
      </div>
      <div className="absolute right-36 -bottom-2 w-10 h-10 opacity-20 rotate-12">
        <DoodleImg
          doodleId={`${unitId}_hdr_2_${config.doodles[2].art}`}
          art={config.doodles[2].art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={config.doodles[2].title}
          sub={config.doodles[2].sub}
          priority={isPriorityUnit}
        />
      </div>
    </div>
  );
});

/**
 * Decorative unit doodle images rendered inside the "Pick Up Where You Left Off" card
 * on HomeDashboard.tsx.
 */
export const ActiveUnitCardDoodle: React.FC<{
  unitId: string;
  unitIndex: number;
}> = React.memo(({ unitId, unitIndex }) => {
  const { config, palette } = getUnitConfig(unitId, unitIndex);

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl z-0"
      aria-hidden="true"
    >
      <div
        className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-45"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div className="absolute right-2 top-14 w-28 h-28 opacity-25 rotate-6">
        <DoodleImg
          doodleId={`${unitId}_active_0_${config.doodles[0].art}`}
          art={config.doodles[0].art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={config.doodles[0].title}
          sub={config.doodles[0].sub}
          priority={true}
        />
      </div>
      <div className="absolute left-3 bottom-16 w-20 h-20 opacity-15 -rotate-6">
        <DoodleImg
          doodleId={`${unitId}_active_2_${config.doodles[2].art}`}
          art={config.doodles[2].art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={config.doodles[2].title}
          sub={config.doodles[2].sub}
          priority={true}
        />
      </div>
      <div
        className="absolute left-4 bottom-16 text-2xl font-extrabold opacity-[0.08] tracking-widest"
        style={{ color: palette.accentStroke }}
      >
        {config.kannadaTop}
      </div>
    </div>
  );
});

/**
 * Bengaluru Cultural Doodle Image Backdrop for the top Greeting Hero Card on HomeDashboard.tsx
 */
export const GreetingHeroBackdropDoodles: React.FC = React.memo(() => {
  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl z-0"
      aria-hidden="true"
    >
      <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-100/50" />
      <div className="absolute right-16 -top-10 w-32 h-32 rounded-full bg-indigo-100/40" />

      <div className="absolute right-2 bottom-1 w-24 h-24 sm:w-28 sm:h-28 opacity-35 rotate-6">
        <DoodleImg
          doodleId="hero_vidhana_soudha"
          art="vidhana_soudha"
          stroke="#4f46e5"
          fill="#e0e7ff"
          title="Vidhana Soudha Bengaluru"
          sub="Bengaluru Landmark"
          priority={true}
        />
      </div>
      <div className="absolute right-24 bottom-1 w-20 h-20 sm:w-24 sm:h-24 opacity-35 -rotate-6">
        <DoodleImg
          doodleId="hero_auto_rickshaw"
          art="auto_rickshaw_side"
          stroke="#059669"
          fill="#d1fae5"
          title="Namma Auto Rickshaw"
          sub="Bengaluru Auto"
          priority={true}
        />
      </div>
    </div>
  );
});

const PALETTE_ROTATION: PaletteKey[] = [
  'indigo',
  'amber',
  'teal',
  'rose',
  'emerald',
];

/**
 * Illustrated backdrop for the top Explore & Listen header card
 */
export const ExploreHeaderBackdropDoodle: React.FC<{
  unitId: string;
}> = ({ unitId }) => {
  const unitIdx = Math.max(
    0,
    parseInt(unitId.replace(/\D/g, ''), 10) - 1 || 0
  );
  const { config, palette } = getUnitConfig(unitId || 'u1', unitIdx);
  const primaryDoodle = config.doodles[0];
  const secondaryDoodle = config.doodles[4] || config.doodles[1];
  const tertiaryDoodle = config.doodles[2] || config.doodles[0];

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[22px] z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(125deg, rgba(255,255,255,0.92) 0%, ${palette.softBg} 55%, ${palette.accentFill}70 100%)`,
        }}
      />
      {/* Subtle notebook dot grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 600 220"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`explore-hdr-dots-${unitId}`}
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="3"
              cy="3"
              r="1.3"
              fill={palette.accentStroke}
              opacity="0.28"
            />
          </pattern>
        </defs>
        <rect width="600" height="220" fill={`url(#explore-hdr-dots-${unitId})`} />
        <path
          d="M340 28C390 8 430 48 485 22C530 4 565 34 595 18"
          stroke={palette.accentStroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.3"
        />
      </svg>

      {/* Soft ambient color blobs */}
      <div
        className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-55"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className="absolute left-1/3 -bottom-14 w-40 h-40 rounded-full opacity-35"
        style={{ backgroundColor: palette.accentFill }}
      />

      {/* Unit doodles floating in background */}
      <div className="absolute right-4 top-2 w-20 h-20 sm:w-24 sm:h-24 opacity-25 rotate-6">
        <DoodleImg
          doodleId={`exp_hdr_0_${unitId}_${primaryDoodle.art}`}
          art={primaryDoodle.art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={primaryDoodle.title}
          sub={primaryDoodle.sub}
        />
      </div>
      <div className="absolute right-28 top-3 w-14 h-14 sm:w-16 sm:h-16 opacity-20 -rotate-6 hidden sm:block">
        <DoodleImg
          doodleId={`exp_hdr_1_${unitId}_${secondaryDoodle.art}`}
          art={secondaryDoodle.art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={secondaryDoodle.title}
          sub={secondaryDoodle.sub}
        />
      </div>
      <div className="absolute right-52 -bottom-2 w-14 h-14 opacity-15 rotate-12 hidden md:block">
        <DoodleImg
          doodleId={`exp_hdr_2_${unitId}_${tertiaryDoodle.art}`}
          art={tertiaryDoodle.art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={tertiaryDoodle.title}
          sub={tertiaryDoodle.sub}
        />
      </div>
    </div>
  );
};

/**
 * Illustrated background for each single-word vocabulary card on the Explore screen.
 * Rotates palettes and unit doodles per card index so cards feel lively and unique.
 */
export const ExploreWordCardBackdropDoodle: React.FC<{
  unitId: string;
  cardIndex: number;
  isPlaying?: boolean;
}> = ({ unitId, cardIndex, isPlaying }) => {
  const unitIdx = Math.max(
    0,
    parseInt(unitId.replace(/\D/g, ''), 10) - 1 || 0
  );
  const { config } = getUnitConfig(unitId || 'u1', unitIdx);

  // Cycle soft pastel palettes across cards so the list feels colorful and distinct
  const paletteKey =
    PALETTE_ROTATION[(unitIdx + cardIndex) % PALETTE_ROTATION.length];
  const palette = PALETTES[paletteKey];

  const primaryDoodle = config.doodles[cardIndex % config.doodles.length];
  const secondaryDoodle =
    config.doodles[(cardIndex + 3) % config.doodles.length];

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-2xl z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: isPlaying
            ? `linear-gradient(110deg, ${palette.accentFill}85 0%, ${palette.softBg} 55%, ${palette.accentFill}B0 100%)`
            : `linear-gradient(110deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.86) 42%, ${palette.softBg} 72%, ${palette.accentFill}75 100%)`,
        }}
      />
      {/* Decorative right-side pastel arc */}
      <div
        className="absolute -right-8 -top-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full opacity-55"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className="absolute right-24 -bottom-12 w-28 h-28 rounded-full opacity-35 hidden sm:block"
        style={{ backgroundColor: palette.accentFill }}
      />

      {/* Subtle hand-drawn dashed trail & dots in the middle-right open space */}
      <svg
        className="absolute right-0 top-0 h-full w-2/3 opacity-45"
        viewBox="0 0 360 96"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M20 72C75 44 130 82 190 50C240 24 295 62 350 32"
          stroke={palette.accentStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.32"
        />
        <circle
          cx="85"
          cy="26"
          r="2.5"
          fill={palette.accentStroke}
          opacity="0.25"
        />
        <circle
          cx="165"
          cy="74"
          r="3"
          fill={palette.accentStroke}
          opacity="0.22"
        />
        <circle
          cx="235"
          cy="22"
          r="2.5"
          fill={palette.accentStroke}
          opacity="0.25"
        />
      </svg>

      {/* Primary unit doodle positioned before the right action buttons */}
      <div
        className={`absolute right-24 sm:right-28 top-1/2 -translate-y-1/2 w-14 h-14 sm:w-[68px] sm:h-[68px] opacity-40 ${
          cardIndex % 2 === 0 ? 'rotate-6' : '-rotate-6'
        }`}
      >
        <DoodleImg
          doodleId={`exp_word_${unitId}_${cardIndex}_a_${primaryDoodle.art}`}
          art={primaryDoodle.art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={primaryDoodle.title}
          sub={primaryDoodle.sub}
        />
      </div>

      {/* Secondary companion doodle in the center-right area on wider screens */}
      <div
        className={`absolute right-44 sm:right-52 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 opacity-22 hidden md:block ${
          cardIndex % 2 === 0 ? '-rotate-12' : 'rotate-12'
        }`}
      >
        <DoodleImg
          doodleId={`exp_word_${unitId}_${cardIndex}_b_${secondaryDoodle.art}`}
          art={secondaryDoodle.art}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={secondaryDoodle.title}
          sub={secondaryDoodle.sub}
        />
      </div>
    </div>
  );
};

const SITUATION_DOODLE_THEMES: Record<
  string,
  { palette: PaletteKey; primaryArt: ArtId; secondaryArt: ArtId }
> = {
  'auto-ride': {
    palette: 'amber',
    primaryArt: 'auto_rickshaw_side',
    secondaryArt: 'auto_fare_meter',
  },
  'darshini-food': {
    palette: 'rose',
    primaryArt: 'masala_dosa',
    secondaryArt: 'filter_kaapi',
  },
  'pg-landlord': {
    palette: 'emerald',
    primaryArt: 'cozy_home',
    secondaryArt: 'shared_umbrella_home',
  },
  'market-bargain': {
    palette: 'teal',
    primaryArt: 'shopping_basket',
    secondaryArt: 'tender_coconut',
  },
  'office-chai': {
    palette: 'indigo',
    primaryArt: 'cutting_chai',
    secondaryArt: 'buddies_duo',
  },
  'doctor-visit': {
    palette: 'rose',
    primaryArt: 'teacup_warm',
    secondaryArt: 'heart_garland',
  },
};

/**
 * Illustrated background for Bengaluru Street Situation cards on the Explore screen
 */
export const ExploreSituationCardBackdropDoodle: React.FC<{
  situationId: string;
  index: number;
}> = ({ situationId, index }) => {
  const theme = SITUATION_DOODLE_THEMES[situationId] || {
    palette: PALETTE_ROTATION[index % PALETTE_ROTATION.length],
    primaryArt: 'vidhana_soudha' as ArtId,
    secondaryArt: 'compass_star' as ArtId,
  };
  const palette = PALETTES[theme.palette];

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[22px] z-0"
      style={{
        background: `linear-gradient(135deg, rgba(255,255,255,0.95) 0%, ${palette.softBg} 58%, ${palette.accentFill}75 100%)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-55"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className="absolute -left-6 -bottom-8 w-24 h-24 rounded-full opacity-30"
        style={{ backgroundColor: palette.accentFill }}
      />

      <div className="absolute right-2.5 top-2.5 w-16 h-16 opacity-35 rotate-6">
        <DoodleImg
          doodleId={`sit_bg_${situationId}_1`}
          art={theme.primaryArt}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={situationId}
        />
      </div>
      <div className="absolute right-16 bottom-12 w-12 h-12 opacity-20 -rotate-12">
        <DoodleImg
          doodleId={`sit_bg_${situationId}_2`}
          art={theme.secondaryArt}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={situationId}
        />
      </div>
    </div>
  );
};

const FLASHCARD_TOPIC_DOODLE_THEMES: Record<
  string,
  {
    palette: PaletteKey;
    primaryArt: ArtId;
    secondaryArt: ArtId;
    kannadaWatermark: string;
  }
> = {
  greetings: {
    palette: 'indigo',
    primaryArt: 'namaste_hands',
    secondaryArt: 'wave_hand',
    kannadaWatermark: 'ನಮಸ್ಕಾರ',
  },
  food: {
    palette: 'amber',
    primaryArt: 'masala_dosa',
    secondaryArt: 'filter_kaapi',
    kannadaWatermark: 'ಮಸಾಲೆ ದೋಸೆ',
  },
  directions: {
    palette: 'teal',
    primaryArt: 'signpost_two_way',
    secondaryArt: 'city_map_pin',
    kannadaWatermark: 'ಎಲ್ಲಿ? · ನೇರ',
  },
  rickshaw: {
    palette: 'emerald',
    primaryArt: 'auto_rickshaw_side',
    secondaryArt: 'auto_fare_meter',
    kannadaWatermark: 'ಮೀಟರ್ ಹಾಕಿ',
  },
  family: {
    palette: 'rose',
    primaryArt: 'buddies_duo',
    secondaryArt: 'cozy_home',
    kannadaWatermark: 'ಅಣ್ಣ · ಅಕ್ಕ',
  },
  numbers: {
    palette: 'indigo',
    primaryArt: 'number_blocks',
    secondaryArt: 'gold_coins',
    kannadaWatermark: 'ಒಂದು · ಎರಡು',
  },
  time: {
    palette: 'amber',
    primaryArt: 'thumbs_sun',
    secondaryArt: 'menu_checklist',
    kannadaWatermark: 'ಎಷ್ಟು ಗಂಟೆ?',
  },
  opinions: {
    palette: 'rose',
    primaryArt: 'heart_eyes_face',
    secondaryArt: 'five_star_bar',
    kannadaWatermark: 'ಸಕ್ಕತ್ ಆಗಿದೆ',
  },
};

/**
 * Illustrated backdrop for the "Choose a Topic to Practice" header card in Flashcards mode
 */
export const FlashcardDecksHeaderBackdropDoodle: React.FC = () => {
  const palette = PALETTES.indigo;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[22px] z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(125deg, rgba(255,255,255,0.94) 0%, ${palette.softBg} 55%, ${palette.accentFill}75 100%)`,
        }}
      />

      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 600 160"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="fc-hdr-dots"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="3"
              cy="3"
              r="1.3"
              fill={palette.accentStroke}
              opacity="0.28"
            />
          </pattern>
        </defs>
        <rect width="600" height="160" fill="url(#fc-hdr-dots)" />
        <path
          d="M320 26C375 8 425 46 480 20C525 4 560 32 592 16"
          stroke={palette.accentStroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.3"
        />
      </svg>

      <div
        className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-55"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className="absolute right-28 -bottom-12 w-32 h-32 rounded-full opacity-35"
        style={{ backgroundColor: PALETTES.amber.accentFill }}
      />

      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-18 h-18 sm:w-22 sm:h-22 opacity-30 rotate-6">
        <DoodleImg
          doodleId="fc_hdr_vidhana"
          art="vidhana_soudha"
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title="Bengaluru Flashcards"
        />
      </div>
      <div className="absolute right-24 top-2 w-14 h-14 sm:w-16 sm:h-16 opacity-22 -rotate-6 hidden sm:block">
        <DoodleImg
          doodleId="fc_hdr_compass"
          art="compass_star"
          stroke={PALETTES.amber.accentStroke}
          fill={PALETTES.amber.accentFill}
          title="Explore Topics"
        />
      </div>
    </div>
  );
};

/**
 * Illustrated background for each of the 8 Flashcard Topic card buttons & vertical carousel cards
 */
export const FlashcardTopicCardBackdropDoodle: React.FC<{
  topicId: string;
  index: number;
  variant?: 'default' | 'vertical' | 'study';
}> = ({ topicId, index, variant = 'default' }) => {
  const theme = FLASHCARD_TOPIC_DOODLE_THEMES[topicId] || {
    palette: PALETTE_ROTATION[index % PALETTE_ROTATION.length],
    primaryArt: 'vidhana_soudha' as ArtId,
    secondaryArt: 'compass_star' as ArtId,
    kannadaWatermark: 'ಕನ್ನಡ',
  };
  const palette = PALETTES[theme.palette];

  if (variant === 'vertical') {
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl z-0"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(165deg, ${palette.accentFill}95 0%, ${palette.softBg} 38%, rgba(255,255,255,0.96) 72%, rgba(255,255,255,0.99) 100%)`,
          }}
        />

        {/* Notebook dot-grid across top half */}
        <svg
          className="absolute inset-x-0 top-0 h-[230px] w-full opacity-45"
          viewBox="0 0 260 230"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id={`fc-vert-dots-${topicId}-${index}`}
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="3"
                cy="3"
                r="1.25"
                fill={palette.accentStroke}
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect
            width="260"
            height="230"
            fill={`url(#fc-vert-dots-${topicId}-${index})`}
          />
          <path
            d="M14 155C68 122 126 176 188 134C214 116 236 128 250 108"
            stroke={palette.accentStroke}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="4 6"
            opacity="0.35"
          />
        </svg>

        {/* Soft circular halo behind central illustration */}
        <div
          className="absolute left-1/2 top-[118px] -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full opacity-70"
          style={{ backgroundColor: palette.accentFill }}
        />
        <div
          className="absolute -right-8 -top-8 w-28 h-28 rounded-full opacity-45"
          style={{ backgroundColor: palette.accentFill }}
        />

        {/* Kannada script watermark in top-center backdrop */}
        <div
          className="absolute left-1/2 top-[56px] -translate-x-1/2 font-extrabold text-lg tracking-widest opacity-[0.16] whitespace-nowrap"
          style={{ color: palette.accentStroke }}
        >
          {theme.kannadaWatermark}
        </div>

        {/* Secondary companion illustration floating top-right */}
        <div
          className={`absolute right-4 top-14 w-12 h-12 opacity-30 ${
            index % 2 === 0 ? '-rotate-12' : 'rotate-12'
          }`}
        >
          <DoodleImg
            doodleId={`fc_vert_${topicId}_secondary`}
            art={theme.secondaryArt}
            stroke={palette.accentStroke}
            fill={palette.accentFill}
            title={topicId}
          />
        </div>

        {/* Center hero topic illustration */}
        <div
          className={`absolute left-1/2 top-[126px] -translate-x-1/2 -translate-y-1/2 w-[112px] h-[112px] transition-transform duration-300 group-hover:scale-105 ${
            index % 2 === 0 ? 'rotate-3' : '-rotate-3'
          }`}
        >
          <DoodleImg
            doodleId={`fc_vert_${topicId}_primary`}
            art={theme.primaryArt}
            stroke={palette.accentStroke}
            fill={palette.accentFill}
            title={topicId}
          />
        </div>
      </div>
    );
  }

  if (variant === 'study') {
    return (
      <div
        className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-3xl z-0"
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(165deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.94) 52%, ${palette.softBg} 80%, ${palette.accentFill}75 100%)`,
          }}
        />

        <div
          className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-55"
          style={{ backgroundColor: palette.accentFill }}
        />
        <div
          className="absolute -left-8 -top-8 w-28 h-28 rounded-full opacity-40"
          style={{ backgroundColor: palette.accentFill }}
        />

        <div className="absolute right-3 bottom-12 w-16 h-16 opacity-25 rotate-6">
          <DoodleImg
            doodleId={`fc_study_${topicId}_${index}_primary`}
            art={theme.primaryArt}
            stroke={palette.accentStroke}
            fill={palette.accentFill}
            title={topicId}
          />
        </div>
        <div className="absolute left-3 bottom-12 w-12 h-12 opacity-18 -rotate-12">
          <DoodleImg
            doodleId={`fc_study_${topicId}_${index}_secondary`}
            art={theme.secondaryArt}
            stroke={palette.accentStroke}
            fill={palette.accentFill}
            title={topicId}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[22px] z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(125deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 45%, ${palette.softBg} 72%, ${palette.accentFill}85 100%)`,
        }}
      />

      {/* Soft pastel corner glow */}
      <div
        className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full opacity-60"
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className="absolute right-16 -top-10 w-24 h-24 rounded-full opacity-35"
        style={{ backgroundColor: palette.accentFill }}
      />

      {/* Subtle hand-drawn dashed trail */}
      <svg
        className="absolute right-0 top-0 h-full w-2/3 opacity-45"
        viewBox="0 0 260 120"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M16 92C68 58 118 98 172 62C206 38 232 58 254 34"
          stroke={palette.accentStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeDasharray="4 6"
          opacity="0.32"
        />
        <circle
          cx="118"
          cy="30"
          r="2.5"
          fill={palette.accentStroke}
          opacity="0.25"
        />
        <circle
          cx="188"
          cy="86"
          r="3"
          fill={palette.accentStroke}
          opacity="0.22"
        />
      </svg>

      {/* Subtle Kannada script watermark */}
      <div
        className="absolute right-3 bottom-11 font-extrabold text-sm sm:text-base tracking-wider opacity-[0.13] whitespace-nowrap"
        style={{ color: palette.accentStroke }}
      >
        {theme.kannadaWatermark}
      </div>

      {/* Primary topic illustration */}
      <div
        className={`absolute right-3 bottom-7 w-16 h-16 sm:w-[72px] sm:h-[72px] opacity-45 transition-transform duration-300 group-hover:scale-105 ${
          index % 2 === 0 ? 'rotate-6' : '-rotate-6'
        }`}
      >
        <DoodleImg
          doodleId={`fc_topic_${topicId}_primary`}
          art={theme.primaryArt}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={topicId}
        />
      </div>

      {/* Secondary companion illustration */}
      <div
        className={`absolute right-20 top-2.5 w-11 h-11 opacity-22 ${
          index % 2 === 0 ? '-rotate-12' : 'rotate-12'
        }`}
      >
        <DoodleImg
          doodleId={`fc_topic_${topicId}_secondary`}
          art={theme.secondaryArt}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={topicId}
        />
      </div>
    </div>
  );
};

export type ProfileCardBackdropVariant =
  | 'hero'
  | 'notes'
  | 'goal'
  | 'invite'
  | 'preferences'
  | 'menu'
  | 'speak'
  | 'stat-indigo'
  | 'stat-teal'
  | 'stat-amber'
  | 'stat-rose';

const PROFILE_BACKDROP_CONFIGS: Record<
  ProfileCardBackdropVariant,
  {
    palette: PaletteKey;
    secondaryPalette: PaletteKey;
    primaryArt: ArtId;
    secondaryArt?: ArtId;
    watermark: string;
    gradient: string;
  }
> = {
  hero: {
    palette: 'indigo',
    secondaryPalette: 'amber',
    primaryArt: 'vidhana_soudha',
    secondaryArt: 'auto_rickshaw_side',
    watermark: 'ನಮ್ಮ ಬೆಂಗಳೂರು',
    gradient:
      'linear-gradient(125deg, rgba(255,255,255,0.92) 0%, rgba(238,242,255,0.88) 48%, rgba(224,231,255,0.85) 78%, rgba(254,243,199,0.65) 100%)',
  },
  notes: {
    palette: 'teal',
    secondaryPalette: 'indigo',
    primaryArt: 'open_book',
    secondaryArt: 'filter_kaapi',
    watermark: 'ಪದಗಳ ಡೈರಿ',
    gradient:
      'linear-gradient(125deg, rgba(255,255,255,0.92) 0%, rgba(240,253,250,0.88) 50%, rgba(204,251,241,0.75) 82%, rgba(224,231,255,0.6) 100%)',
  },
  goal: {
    palette: 'amber',
    secondaryPalette: 'emerald',
    primaryArt: 'trophy_cup',
    secondaryArt: 'compass_star',
    watermark: 'ದಿನದ ಗುರಿ',
    gradient:
      'linear-gradient(125deg, rgba(255,255,255,0.92) 0%, rgba(255,251,235,0.9) 50%, rgba(254,243,199,0.78) 100%)',
  },
  invite: {
    palette: 'rose',
    secondaryPalette: 'indigo',
    primaryArt: 'buddies_duo',
    secondaryArt: 'heart_garland',
    watermark: 'ಸ್ನೇಹಿತರು',
    gradient:
      'linear-gradient(125deg, rgba(255,255,255,0.92) 0%, rgba(255,241,242,0.9) 50%, rgba(255,228,230,0.78) 100%)',
  },
  preferences: {
    palette: 'indigo',
    secondaryPalette: 'teal',
    primaryArt: 'compass_star',
    secondaryArt: 'teacup_warm',
    watermark: 'ಕಲಿಯೋಣ',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(245,243,255,0.86) 55%, rgba(237,233,254,0.72) 100%)',
  },
  menu: {
    palette: 'emerald',
    secondaryPalette: 'indigo',
    primaryArt: 'signpost_two_way',
    secondaryArt: 'city_map_pin',
    watermark: 'ಮಾರ್ಗಸೂಚಿ',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(236,253,245,0.85) 55%, rgba(209,250,229,0.68) 100%)',
  },
  speak: {
    palette: 'indigo',
    secondaryPalette: 'amber',
    primaryArt: 'namaste_hands',
    secondaryArt: 'auto_rickshaw_side',
    watermark: 'ಮಾತಾಡಿ ಕಲಿಯಿರಿ',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(245,243,255,0.88) 52%, rgba(224,231,255,0.75) 100%)',
  },
  'stat-indigo': {
    palette: 'indigo',
    secondaryPalette: 'indigo',
    primaryArt: 'compass_star',
    watermark: 'ಘಟಕಗಳು',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(238,242,255,0.9) 58%, rgba(224,231,255,0.85) 100%)',
  },
  'stat-teal': {
    palette: 'teal',
    secondaryPalette: 'teal',
    primaryArt: 'open_book',
    watermark: 'ಪಾಠಗಳು',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.9) 58%, rgba(204,251,241,0.85) 100%)',
  },
  'stat-amber': {
    palette: 'amber',
    secondaryPalette: 'amber',
    primaryArt: 'lightbulb_idea',
    watermark: 'ಪದಗಳು',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,251,235,0.9) 58%, rgba(254,243,199,0.85) 100%)',
  },
  'stat-rose': {
    palette: 'rose',
    secondaryPalette: 'amber',
    primaryArt: 'trophy_cup',
    watermark: 'ಸ್ಟ್ರೀಕ್',
    gradient:
      'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,241,242,0.9) 58%, rgba(255,228,230,0.85) 100%)',
  },
};

/**
 * Illustrated background layer for Profile, Notes, Stat Tiles, and Speak Deck cards
 * so cards feel warm, textured, and visually grounded.
 */
export const ProfileCardBackdropDoodle: React.FC<{
  variant: ProfileCardBackdropVariant;
  compact?: boolean;
}> = ({ variant, compact = false }) => {
  const cfg = PROFILE_BACKDROP_CONFIGS[variant];
  const palette = PALETTES[cfg.palette];
  const secondaryPalette = PALETTES[cfg.secondaryPalette];

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-[inherit] z-0"
      aria-hidden="true"
    >
      {/* Base tinted gradient wash */}
      <div
        className="absolute inset-0"
        style={{ background: cfg.gradient }}
      />

      {/* Subtle architectural dot-grid */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40"
        viewBox="0 0 400 180"
        fill="none"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`prof-dots-${variant}`}
            x="0"
            y="0"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="3"
              cy="3"
              r="1.2"
              fill={palette.accentStroke}
              opacity="0.25"
            />
          </pattern>
        </defs>
        <rect width="400" height="180" fill={`url(#prof-dots-${variant})`} />
        {!compact && (
          <path
            d="M210 24C255 6 300 42 345 18C370 6 388 22 400 14"
            stroke={palette.accentStroke}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="4 6"
            opacity="0.26"
          />
        )}
      </svg>

      {/* Ambient pastel blobs */}
      <div
        className={`absolute -right-8 -top-8 ${
          compact ? 'w-20 h-20' : 'w-36 h-36'
        } rounded-full opacity-55`}
        style={{ backgroundColor: palette.accentFill }}
      />
      <div
        className={`absolute ${
          compact ? '-left-6 -bottom-6 w-16 h-16' : 'right-24 -bottom-10 w-28 h-28'
        } rounded-full opacity-35`}
        style={{ backgroundColor: secondaryPalette.accentFill }}
      />

      {/* Kannada watermark */}
      <div
        className={`absolute ${
          compact
            ? 'right-2.5 bottom-1.5 text-[11px]'
            : 'right-4 bottom-2.5 text-sm sm:text-base'
        } font-extrabold tracking-wider opacity-[0.12] whitespace-nowrap`}
        style={{ color: palette.accentStroke }}
      >
        {cfg.watermark}
      </div>

      {/* Primary doodle illustration */}
      <div
        className={`absolute ${
          compact
            ? 'right-1.5 bottom-1.5 w-11 h-11 opacity-30'
            : 'right-4 top-3 w-16 h-16 sm:w-20 sm:h-20 opacity-28'
        } rotate-6`}
      >
        <DoodleImg
          doodleId={`prof_bg_${variant}_primary`}
          art={cfg.primaryArt}
          stroke={palette.accentStroke}
          fill={palette.accentFill}
          title={cfg.watermark}
        />
      </div>

      {/* Secondary doodle on larger cards */}
      {!compact && cfg.secondaryArt && (
        <div className="absolute right-24 top-4 w-13 h-13 sm:w-15 sm:h-15 opacity-20 -rotate-8 hidden sm:block">
          <DoodleImg
            doodleId={`prof_bg_${variant}_secondary`}
            art={cfg.secondaryArt}
            stroke={secondaryPalette.accentStroke}
            fill={secondaryPalette.accentFill}
            title={cfg.watermark}
          />
        </div>
      )}
    </div>
  );
};
