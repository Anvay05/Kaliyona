import type { LucideIcon } from 'lucide-react';
import {
  CarTaxiFront,
  Bus,
  ShoppingBasket,
  Home,
  Users,
  ShieldAlert,
  UtensilsCrossed,
  Pill,
} from 'lucide-react';

export interface PersonaBrainItem {
  keys: string[];
  name: string;
  nameKn: string;
  price: string;
}

export interface PersonaBrain {
  items: PersonaBrainItem[];
  negationLines: string[];
  affirmLines: string[];
  dontUnderstand: string;
}

export interface ScenarioCard {
  id: string;
  title: string;
  tagline: string;
  color: string;
  icon: LucideIcon;
  annaOpener: {
    kanglish: string;
    script: string;
    english: string;
  };
  suggestedReplies: Array<{
    kanglish: string;
    script: string;
  }>;
  keyPhrases: Array<{
    kanglish: string;
    script: string;
    english: string;
  }>;
  relatedUnitId: string;
  introLines: Array<{
    script: string;
    kanglish: string;
  }>;
  exitLine: {
    script: string;
    kanglish: string;
  };
  defaultReply: {
    script: string;
    kanglish: string;
  };
  brain: PersonaBrain;
}

export const SCENARIOS: ScenarioCard[] = [
  // 1. Waiter
  {
    id: 'darshini',
    title: 'Waiter',
    tagline: 'Order food, coffee & ask for the bill',
    icon: UtensilsCrossed,
    color: '#E8734A',
    annaOpener: {
      kanglish: 'Namaskara sir! Enu beku? Dose, idli, filter coffee ready ide!',
      script: 'ನಮಸ್ಕಾರ ಸರ್! ಏನು ಬೇಕು? ದೋಸೆ, ಇಡ್ಲಿ, ಫಿಲ್ಟರ್ ಕಾಫಿ ರೆಡಿ ಇದೆ!',
      english: 'Hello! What would you like to order? Dosa, idli, and filter coffee are ready!',
    },
    suggestedReplies: [
      { kanglish: 'One masala dosa and filter coffee please', script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ' },
      { kanglish: 'What do you have on the menu?', script: 'ತಿನ್ನೋಕೆ ಏನೇನು ಇದೆ?' },
      { kanglish: 'How much is the bill?', script: 'ಬಿಲ್ ಎಷ್ಟು ಆಯ್ತು?' },
    ],
    keyPhrases: [
      { kanglish: 'Ondu masala dose kodi', script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ', english: 'Give me one masala dosa' },
      { kanglish: 'Ondu strong filter coffee', script: 'ಒಂದು ಸ್ಟ್ರಾಂಗ್ ಫಿಲ್ಟರ್ ಕಾಫಿ', english: 'One strong filter coffee' },
      { kanglish: 'Bill eshtu aaytu?', script: 'ಬಿಲ್ ಎಷ್ಟು ಆಯ್ತು?', english: 'How much is the bill?' },
      { kanglish: 'Swalpa neeru kodi', script: 'ಸ್ವಲ್ಪ ನೀರು ಕೊಡಿ', english: 'Please give some water' },
    ],
    relatedUnitId: 'u2',
    introLines: [
      {
        script: 'ನಮಸ್ಕಾರ ಸರ್! ನಾನು ವೇಟರ್. ಏನು ಆರ್ಡರ್ ಮಾಡ್ತೀರಾ ಹೇಳಿ!',
        kanglish: 'Namaskara sir! Naanu Waiter. Enu order maadtira heli!',
      },
    ],
    exitLine: {
      script: 'ಥ್ಯಾಂಕ್ಸ್ ಸರ್, ಮತ್ತೆ ಬನ್ನಿ!',
      kanglish: 'Thanks sir, matte banni!',
    },
    defaultReply: {
      script: 'ಬಿಸಿ ಬಿಸಿ ದೋಸೆ ಮತ್ತು ಕಾಫಿ ರೆಡಿ ಇದೆ ಸರ್!',
      kanglish: 'Bisi bisi dose mathu coffee ready ide sir!',
    },
    brain: {
      items: [
        { keys: ['coffee', 'kaapi', 'kapi', 'filter coffee'], name: 'Filter Coffee', nameKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', price: '₹20' },
        { keys: ['idli', 'idly', 'thatte idli'], name: 'Idli (2 pcs)', nameKn: 'ಇಡ್ಲಿ', price: '₹30' },
        { keys: ['dose', 'dosa', 'masale', 'masala dose', 'masala dosa', 'benne'], name: 'Masala Dosa', nameKn: 'ಮಸಾಲೆ ದೋಸೆ', price: '₹50' },
        { keys: ['vada', 'vade', 'maddur vada', 'medu vada'], name: 'Crispy Vada', nameKn: 'ವಡೆ', price: '₹25' },
        { keys: ['tea', 'chaha', 'chai'], name: 'Hot Tea', nameKn: 'ಟೀ', price: '₹15' },
        { keys: ['uppittu', 'upma', 'khara bath', 'kesari bath', 'chow chow bath'], name: 'Khara Bath', nameKn: 'ಖಾರಾ ಬಾತ್', price: '₹35' },
        { keys: ['water', 'neeru', 'drinking water', 'bottle'], name: 'Drinking Water', nameKn: 'ಕುಡಿಯುವ ನೀರು', price: 'Free (or ₹20 bottle)' },
        { keys: ['meals', 'lunch', 'oota', 'thali', 'rice', 'dinner'], name: 'South Indian Meals', nameKn: 'ಊಟ (ಮೀಲ್ಸ್)', price: '₹90' },
      ],
      negationLines: [
        'Sari sir, bejaar madbedi! Innu enu beku — idli? dose?',
        'Okay boss! Bere enadru try maadi — vada chennagirutte!',
        'Sari sari! Coffee illa andre tea idde sir?',
      ],
      affirmLines: [
        'Sari boss, eradu nimisha! Bisi bisi tartini.',
        'Haudhu sir, eegle table-ge tartini!',
      ],
      dontUnderstand: 'Sari sir! Dose, idli, vada, athava filter coffee — enu tartini heli?',
    },
  },

  // 2. Ticket Conductor
  {
    id: 'bmtc',
    title: 'Ticket Conductor',
    tagline: 'Bus tickets, stops & change',
    icon: Bus,
    color: '#0EA5E9',
    annaOpener: {
      kanglish: 'Banni munde hogi! Yaava stop-ge ticket beku?',
      script: 'ಬನ್ನಿ ಮುಂದೆ ಹೋಗಿ! ಯಾವ ಸ್ಟಾಪ್‌ಗೆ ಟಿಕೆಟ್ ಬೇಕು?',
      english: 'Come in, move forward! Which bus stop do you need a ticket for?',
    },
    suggestedReplies: [
      { kanglish: 'One ticket to Majestic please', script: 'ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ' },
      { kanglish: 'Does this bus go to Indiranagar?', script: 'ಈ ಬಸ್ ಇಂದಿರಾನಗರಕ್ಕೆ ಹೋಗುತ್ತಾ?' },
      { kanglish: 'How much is the ticket?', script: 'ಟಿಕೆಟ್ ಎಷ್ಟು ಚಾರ್ಜ್?' },
    ],
    keyPhrases: [
      { kanglish: 'Ondu ticket kodi', script: 'ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ', english: 'Give me one ticket' },
      { kanglish: 'Ee bus Majestic-ge hogutta?', script: 'ಈ ಬಸ್ ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಹೋಗುತ್ತಾ?', english: 'Does this bus go to Majestic?' },
      { kanglish: 'Mundina stop-nalli ilisi', script: 'ಮುಂದಿನ ಸ್ಟಾಪ್‌ನಲ್ಲಿ ಇಳಿಸಿ', english: 'Drop me at the next stop' },
      { kanglish: 'UPI QR scan maadla?', script: 'ಯುಪಿಐ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡ್ಲಾ?', english: 'Can I scan UPI QR?' },
    ],
    relatedUnitId: 'u3',
    introLines: [
      {
        script: 'ನಮಸ್ಕಾರ! ನಾನು ಬಸ್ ಟಿಕೆಟ್ ಕಂಡಕ್ಟರ್. ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಹೇಳಿ!',
        kanglish: 'Namaskara! Naanu Ticket Conductor. Ellige hogbeku heli!',
      },
    ],
    exitLine: {
      script: 'ನೆಕ್ಸ್ಟ್ ಸ್ಟಾಪ್ ಬಂತು, ಹುಷಾರಾಗಿ ಇಳೀರಿ!',
      kanglish: 'Next stop bantu, hushaaraagi iLeeri!',
    },
    defaultReply: {
      script: 'ಯಾವ ಸ್ಟಾಪ್‌ಗೆ ಟಿಕೆಟ್ ಕೊಡ್ಲಿ ಸರ್? ಯುಪಿಐ ಕೂಡ ನಡೆಯುತ್ತೆ.',
      kanglish: 'Yaava stop-ge ticket kodli sir? UPI kooda nadeyutte.',
    },
    brain: {
      items: [
        { keys: ['majestic', 'kempegowda', 'bus stand', 'railway station'], name: 'Majestic Ticket', nameKn: 'ಮೆಜೆಸ್ಟಿಕ್ ಟಿಕೆಟ್', price: '₹25' },
        { keys: ['indiranagar', '100ft road', 'metro'], name: 'Indiranagar Ticket', nameKn: 'ಇಂದಿರಾನಗರ ಟಿಕೆಟ್', price: '₹20' },
        { keys: ['koramangala', 'sony signal', 'forum'], name: 'Koramangala Ticket', nameKn: 'ಕೋರಮಂಗಲ ಟಿಕೆಟ್', price: '₹20' },
        { keys: ['silk board', '500d', 'ring road', 'orr', 'bellandur', 'marathahalli'], name: 'Silk Board / ORR Ticket', nameKn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಟಿಕೆಟ್', price: '₹25' },
        { keys: ['whitefield', 'itpl', 'hoodi'], name: 'Whitefield Ticket', nameKn: 'ವೈಟ್‌ಫೀಲ್ಡ್ ಟಿಕೆಟ್', price: '₹30' },
        { keys: ['mg road', 'brigade road', 'cubbon park', 'shivajinagar'], name: 'MG Road Ticket', nameKn: 'ಎಂ.ಜಿ. ರೋಡ್ ಟಿಕೆಟ್', price: '₹15' },
        { keys: ['jayanagar', 'jp nagar', 'banashankari', 'btm'], name: 'Jayanagar Ticket', nameKn: 'ಜಯನಗರ ಟಿಕೆಟ್', price: '₹20' },
        { keys: ['electronic city', 'ecity', 'hebbal', 'yelahanka'], name: 'Express Route Ticket', nameKn: 'ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಟಿಕೆಟ್', price: '₹35' },
        { keys: ['next stop', 'stage', 'local', 'ticket'], name: 'Single Bus Ticket', nameKn: 'ಬಸ್ ಟಿಕೆಟ್', price: '₹15' },
        { keys: ['pass', 'daily pass', 'bmtc pass', 'day pass'], name: 'BMTC Daily Pass', nameKn: 'ಡೈಲಿ ಪಾಸ್', price: '₹70' },
      ],
      negationLines: [
        'Ticket bedwa? Haagidre bus pass ideya thorisi sir.',
        'Parvagilla, nimma stop bandaga heli, bell hoditini.',
        'Sari munde hogi sir, खाली ಸೀಟ್ ಅಲ್ಲಿ ಕೂತ್ಕೊಳ್ಳಿ!',
      ],
      affirmLines: [
        'Haudhu saar, ticket togoLLi! UPI scan athava chillare kodi.',
        'Sari munde banni, seat khaali ide kootkoli.',
      ],
      dontUnderstand: 'Yaava stop-ge hogbeku sir? Stop hesaru heli, ticket kodtini!',
    },
  },

  // 3. Auto Driver
  {
    id: 'auto',
    title: 'Auto Driver',
    tagline: 'Ask fare, meter & directions',
    icon: CarTaxiFront,
    color: '#6C5CE7',
    annaOpener: {
      kanglish: 'Namaskara sir! Ellige hogbeku? Banni kootkolli!',
      script: 'ನಮಸ್ಕಾರ ಸರ್! ಎಲ್ಲಿಗೆ ಹೋಗ್ಬೇಕು? ಬನ್ನಿ ಕೂತ್ಕೊಳ್ಳಿ!',
      english: 'Hello! Where would you like to go? Hop in!',
    },
    suggestedReplies: [
      { kanglish: 'Will you come to Indiranagar on meter?', script: 'ಇಂದಿರಾನಗರಕ್ಕೆ ಮೀಟರ್ ಹಾಕಿ ಬರ್ತೀರಾ?' },
      { kanglish: 'How much for Koramangala?', script: 'ಕೋರಮಂಗಲಕ್ಕೆ ಎಷ್ಟು ಆಗುತ್ತೆ?' },
      { kanglish: 'Please reduce the fare a little', script: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ ಅಣ್ಣ' },
    ],
    keyPhrases: [
      { kanglish: 'Meter haaki anna', script: 'ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ', english: 'Please put on the meter' },
      { kanglish: 'Eshtu aagutte?', script: 'ಎಷ್ಟು ಆಗುತ್ತೆ?', english: 'How much will it cost?' },
      { kanglish: 'Swalpa kammi maadi', script: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ', english: 'Reduce the price a little' },
      { kanglish: 'Illi side-alli nillisi', script: 'ಇಲ್ಲಿ ಸೈಡ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ', english: 'Stop here on the side' },
    ],
    relatedUnitId: 'u1',
    introLines: [
      {
        script: 'ನಮಸ್ಕಾರ ಸರ್! ನಾನು ಆಟೋ ಡ್ರೈವರ್. ಎಲ್ಲಿಗೆ ಡ್ರಾಪ್ ಮಾಡ್ಲಿ ಹೇಳಿ!',
        kanglish: 'Namaskara sir! Naanu Auto Driver. Ellige drop maadli heli!',
      },
    ],
    exitLine: {
      script: 'ಸರಿ ಸರ್, ಬರ್ತೀನಿ! ಹುಷಾರಾಗಿ ಹೋಗಿ.',
      kanglish: 'Sari sir, bartini! Hushaaraagi hogi.',
    },
    defaultReply: {
      script: 'ಸರಿ ಸರ್, ಮೀಟರ್ ಹಾಕ್ತೀನಿ, ಬನ್ನಿ ಕೂತ್ಕೊಳ್ಳಿ!',
      kanglish: 'Sari sir, meter haaktini, banni kootkoLLi!',
    },
    brain: {
      items: [
        { keys: ['meter', 'base', 'minimum', 'start'], name: 'Meter Base Fare', nameKn: 'ಬೇಸ್ ಫೇರ್', price: '₹30 (first 2 km)' },
        { keys: ['km', 'per km', 'rate', 'kilometer'], name: 'Per KM Rate', nameKn: 'ಪ್ರತಿ ಕಿ.ಮೀ', price: '₹15/km' },
        { keys: ['majestic', 'station', 'railway station'], name: 'Majestic Ride', nameKn: 'ಮೆಜೆಸ್ಟಿಕ್', price: '₹120' },
        { keys: ['koramangala', 'sony signal', 'forum', 'btm'], name: 'Koramangala Ride', nameKn: 'ಕೋರಮಂಗಲ', price: '₹90' },
        { keys: ['indiranagar', '100ft road', 'metro'], name: 'Indiranagar Ride', nameKn: 'ಇಂದಿರಾನಗರ', price: '₹80' },
        { keys: ['mg road', 'cubbon park', 'brigade road', 'church street'], name: 'MG Road Ride', nameKn: 'ಎಂ.ಜಿ. ರೋಡ್', price: '₹70' },
        { keys: ['whitefield', 'marathahalli', 'bellandur', 'hsr'], name: 'Tech Park Ride', nameKn: 'ಟೆಕ್ ಪಾರ್ಕ್', price: '₹150' },
        { keys: ['jayanagar', 'jp nagar', 'malleshwaram'], name: 'Jayanagar Ride', nameKn: 'ಜಯನಗರ', price: '₹100' },
        { keys: ['airport', 'kia', 'devanahalli'], name: 'Airport Trip', nameKn: 'ಏರ್‌ಪೋರ್ಟ್', price: '₹750' },
      ],
      negationLines: [
        'Sari saar, beda andre parvagilla! Yavaga auto beku aaga kariri.',
        'Illa sir, tension madkolbedi! Meter mele hogona banni.',
        'Sari boss, drop plan cancel aadre parvagilla, matte sigona!',
      ],
      affirmLines: [
        'Sari saar, kootkoLLi! Meter haaki eegle hogona.',
        'Haudhu boss, banni! Short-cut alli bega karkondu hogtini.',
      ],
      dontUnderstand: 'Ellige hogbeku sir? Area athava landmark hesaru heli, meter haaki hogona!',
    },
  },

  // 4. Shopkeeper
  {
    id: 'market',
    title: 'Shopkeeper',
    tagline: 'Buy groceries, vegetables & pay by UPI',
    icon: ShoppingBasket,
    color: '#22C55E',
    annaOpener: {
      kanglish: 'Banni sir! Enu beku? Milk, bread, fresh vegetables ella ide!',
      script: 'ಬನ್ನಿ ಸರ್! ಏನು ಬೇಕು? ಹಾಲು, ಬ್ರೆಡ್, ತಾಜಾ ತರಕಾರಿ ಎಲ್ಲಾ ಇದೆ!',
      english: 'Welcome! What do you need? Milk, bread, and fresh vegetables are all available!',
    },
    suggestedReplies: [
      { kanglish: 'How much is 1 kg tomato and onion?', script: 'ಟೊಮೇಟೊ ಮತ್ತು ಈರುಳ್ಳಿ ಎಷ್ಟು ಕಿಲೋ?' },
      { kanglish: 'Give me one packet of milk', script: 'ಒಂದು ಪ್ಯಾಕೆಟ್ ನಂದಿನಿ ಹಾಲು ಕೊಡಿ' },
      { kanglish: 'Can I pay by PhonePe / Google Pay?', script: 'ಫೋನ್‌ಪೇ ಅಥವಾ ಜಿಪೇ ಮಾಡ್ಲಾ?' },
    ],
    keyPhrases: [
      { kanglish: 'Idara bele eshtu?', script: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು?', english: 'How much does this cost?' },
      { kanglish: 'Swalpa kammi maadi', script: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ', english: 'Please reduce the price a bit' },
      { kanglish: 'Ondu packet haalu kodi', script: 'ಒಂದು ಪ್ಯಾಕೆಟ್ ಹಾಲು ಕೊಡಿ', english: 'Give me one packet of milk' },
      { kanglish: 'UPI scan maadthini', script: 'ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಮಾಡ್ತೀನಿ', english: 'I will scan UPI QR to pay' },
    ],
    relatedUnitId: 'u4',
    introLines: [
      {
        script: 'ನಮಸ್ಕಾರ! ನಮ್ಮ ಅಂಗಡಿಗೆ ಸ್ವಾಗತ. ಏನು ಸಾಮಾನು ಬೇಕು ಹೇಳಿ!',
        kanglish: 'Namaskara! Namma angadige swagatha. Enu saamaanu beku heli!',
      },
    ],
    exitLine: {
      script: 'ಮತ್ತೆ ಬನ್ನಿ ಸರ್, ಧನ್ಯವಾದ!',
      kanglish: 'Matte banni sir, dhanyavada!',
    },
    defaultReply: {
      script: 'ಎಲ್ಲಾ ತಾಜಾ ಸಾಮಾನು ಇದೆ ಸರ್, ಪ್ಯಾಕ್ ಮಾಡಿಕೊಡ್ತೀನಿ!',
      kanglish: 'Ella fresh saamaanu ide sir, pack maadikodtini!',
    },
    brain: {
      items: [
        { keys: ['tomato', 'tomatoes', 'thakkali', 'tomata'], name: 'Tomato (1 kg)', nameKn: 'ಟೊಮೇಟೊ', price: '₹40/kg' },
        { keys: ['onion', 'onions', 'eerulli', 'irulli', 'eeruLLi'], name: 'Onion (1 kg)', nameKn: 'ಈರುಳ್ಳಿ', price: '₹35/kg' },
        { keys: ['potato', 'potatoes', 'aalugadde', 'alugadde'], name: 'Potato (1 kg)', nameKn: 'ಆಲೂಗಡ್ಡೆ', price: '₹30/kg' },
        { keys: ['coriander', 'kothambari', 'soppu', 'greens'], name: 'Fresh Coriander', nameKn: 'ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು', price: '₹10/bunch' },
        { keys: ['carrot', 'carrots', 'gajjari', 'beans', 'vegetables', 'tharakari'], name: 'Fresh Vegetables', nameKn: 'ತಾಜಾ ತರಕಾರಿ', price: '₹40/kg' },
        { keys: ['milk', 'haalu', 'nandini', 'packet'], name: 'Nandini Milk (500 ml)', nameKn: 'ನಂದಿನಿ ಹಾಲು', price: '₹28' },
        { keys: ['curd', 'mosaru', 'yogurt'], name: 'Nandini Curd (500 g)', nameKn: 'ಮೊಸರು', price: '₹30' },
        { keys: ['bread', 'eggs', 'egg', 'butter', 'biscuit'], name: 'Bread & Bakery Pack', nameKn: 'ಬ್ರೆಡ್ ಪ್ಯಾಕ್', price: '₹45' },
        { keys: ['rice', 'akki', 'sugar', 'sakkare', 'dal', 'oil'], name: 'Sona Masoori Rice (1 kg)', nameKn: 'ಅಕ್ಕಿ', price: '₹60/kg' },
      ],
      negationLines: [
        'Beda andre parvagilla sir! Bere enu beku — haalu, bread, tharakari?',
        'Illa sir, carry bag bedwa? Kaiyalli thagond hogbovdu!',
        'Parvagilla sir, chillare illa andre GPay maadi, tension beda!',
      ],
      affirmLines: [
        'Haudhu saar, cover alli haaki kodtini, QR scan maadi!',
        'Sari sir, fresh item pack maadidini, thagoli!',
      ],
      dontUnderstand: 'Enu saamaanu beku sir? Tharakari, haalu, bread — list heli pack maadtini!',
    },
  },

  // 5. Traffic Police
  {
    id: 'traffic-police',
    title: 'Traffic Police',
    tagline: 'Ask directions, traffic & road rules',
    icon: ShieldAlert,
    color: '#DC2626',
    annaOpener: {
      script: 'ನಮಸ್ಕಾರ! ನಿಧಾನವಾಗಿ ಗಾಡಿ ಓಡಿಸಿ. ಏನು ಸಹಾಯ ಬೇಕು?',
      kanglish: 'Namaskara! Nidhanavaagi gaadi odisi. Enu sahaaya beku?',
      english: 'Hello! Drive carefully. How can I help you?',
    },
    suggestedReplies: [
      { kanglish: 'Which way is MG Road from here?', script: 'ಇಲ್ಲಿಂದ ಎಂ.ಜಿ. ರೋಡ್ ಯಾವ ಕಡೆ?' },
      { kanglish: 'Sorry sir, I did not see the one-way sign', script: 'ಸಾರಿ ಸರ್, ಒನ್-ವೇ ಬೋರ್ಡ್ ಕಾಣಿಸಲಿಲ್ಲ' },
      { kanglish: 'Here is my driving license', script: 'ಇಲ್ಲಿದೆ ನನ್ನ ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಸರ್' },
    ],
    keyPhrases: [
      { kanglish: 'MG Road yaava kade sir?', script: 'ಎಂ.ಜಿ. ರೋಡ್ ಯಾವ ಕಡೆ ಸರ್?', english: 'Which way is MG Road, sir?' },
      { kanglish: 'License thoristhini sir', script: 'ಲೈಸೆನ್ಸ್ ತೋರಿಸ್ತೀನಿ ಸರ್', english: 'I will show my license, sir' },
      { kanglish: 'Swalpa bidi sir, hosabaru', script: 'ಸ್ವಲ್ಪ ಬಿಡಿ ಸರ್, ಹೊಸಬರು', english: 'Please excuse me sir, I am new here' },
    ],
    relatedUnitId: 'u1',
    introLines: [
      {
        script: 'ನಮಸ್ತೆ! ಬೆಂಗಳೂರು ಟ್ರಾಫಿಕ್ ಪೊಲೀಸ್. ದಾರಿ ಅಥವಾ ಟ್ರಾಫಿಕ್ ಬಗ್ಗೆ ಕೇಳಿ!',
        kanglish: 'Namaste! Bengaluru Traffic Police. Daari athava traffic bagge keli!',
      },
    ],
    exitLine: {
      script: 'ಹುಷಾರಾಗಿ ಓಡಿಸಿ, ಹೆಲ್ಮೆಟ್ ಹಾಕಿ!',
      kanglish: 'Hushaaraagi odisi, helmet haaki!',
    },
    defaultReply: {
      script: 'ಮೇನ್ ರೋಡ್ ಮೂಲಕ ನೇರವಾಗಿ ಹೋಗಿ, ಟ್ರಾಫಿಕ್ ಕಮ್ಮಿ ಇದೆ.',
      kanglish: 'Main road moolaka neravaagi hogi, traffic kammi ide.',
    },
    brain: {
      items: [
        { keys: ['helmet', 'fine', 'challan'], name: 'No Helmet Fine', nameKn: 'ಹೆಲ್ಮೆಟ್ ಫೈನ್', price: '₹500' },
        { keys: ['signal', 'red light', 'jump'], name: 'Signal Jump Fine', nameKn: 'ಸಿಗ್ನಲ್ ಜಂಪ್ ಫೈನ್', price: '₹1,000' },
        { keys: ['silk board', 'direction', 'junction'], name: 'Silk Board Junction', nameKn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಸಿಗ್ನಲ್', price: '2.5 km ahead' },
        { keys: ['mg road', 'route', 'one way', 'indiranagar', 'koramangala'], name: 'Main Road Route', nameKn: 'ಮೇನ್ ರೋಡ್ ಮಾರ್ಗ', price: 'Straight ahead 3 km' },
      ],
      negationLines: [
        'Sari, ee sala warning kodtini, helmet haakikondu safe aagi odisi!',
        'Parvagilla, side-ge gaadi nillisi documents thorisi.',
      ],
      affirmLines: [
        'Sari, neravaagi hogi ಮುಂದಿನ ಸಿಗ್ನಲ್ ಅಲ್ಲಿ ರೈಟ್ ತಗೊಳ್ಳಿ.',
        'Haudhu, safe aagi drive maadi!',
      ],
      dontUnderstand: 'Yaava rastege daari beku athava documents bagge kelthiddira sir?',
    },
  },

  // 6. House Owner
  {
    id: 'landlord-aunty',
    title: 'House Owner',
    tagline: 'Talk about rent, water & flat rules',
    icon: Home,
    color: '#9333EA',
    annaOpener: {
      script: 'ಬನ್ನಿ! ಮನೆ ಚೆನ್ನಾಗಿದೆಯಾ? ಬಾಡಿಗೆ ಮತ್ತು ನೀರಿನ ಬಗ್ಗೆ ಏನಾದ್ರೂ ಕೇಳ್ಬೇಕಾ?',
      kanglish: 'Banni! Mane chennagideya? Baadige mathu neerina bagge enadru kelbeka?',
      english: 'Welcome! Is the flat comfortable? Do you want to ask about rent, Wi-Fi, or water?',
    },
    suggestedReplies: [
      { kanglish: 'When does the water come in the morning?', script: 'ಬೆಳಗ್ಗೆ ನೀರು ಎಷ್ಟು ಗಂಟೆಗೆ ಬರುತ್ತೆ?' },
      { kanglish: 'I have sent this month rent by UPI', script: 'ಈ ತಿಂಗಳ ಬಾಡಿಗೆ ಯುಪಿಐ ಕಳಿಸಿದ್ದೀನಿ' },
      { kanglish: 'Can you turn on the water motor please?', script: 'ದಯವಿಟ್ಟು ನೀರಿನ ಮೋಟಾರ್ ಆನ್ ಮಾಡ್ತೀರಾ?' },
    ],
    keyPhrases: [
      { kanglish: 'Baadige eshtu?', script: 'ಬಾಡಿಗೆ ಎಷ್ಟು?', english: 'How much is the rent?' },
      { kanglish: 'Motor on maadthira?', script: 'ಮೋಟಾರ್ ಆನ್ ಮಾಡ್ತೀರಾ?', english: 'Will you turn on the water motor?' },
      { kanglish: 'Rent UPI maadiddini', script: 'ರೆಂಟ್ ಯುಪಿಐ ಮಾಡಿದ್ದೀನಿ', english: 'I have paid the rent via UPI' },
    ],
    relatedUnitId: 'u1',
    introLines: [
      {
        script: 'ನಮಸ್ಕಾರ! ನಾನು ಮನೆ ಓನರ್. ಮನೆ, ಬಾಡಿಗೆ ಅಥವಾ ನೀರಿನ ಬಗ್ಗೆ ಕೇಳಿ!',
        kanglish: 'Namaskara! Naanu House Owner. Mane, baadige athava neerina bagge keli!',
      },
    ],
    exitLine: {
      script: 'ಸರಿ, ಏನಾದ್ರೂ ಬೇಕಿದ್ರೆ ಫೋನ್ ಮಾಡಿ!',
      kanglish: 'Sari, enadru bekidre phone maadi!',
    },
    defaultReply: {
      script: 'ಹೌದು, ಬೆಳಗ್ಗೆ ೬ ಗಂಟೆಗೆ ಕಾವೇರಿ ನೀರು ಬರುತ್ತೆ, ಮೋಟಾರ್ ಆನ್ ಮಾಡ್ತೀನಿ.',
      kanglish: 'Haudu, belagge 6 gantege Cauvery neeru baratte, motor on maadtini.',
    },
    brain: {
      items: [
        { keys: ['rent', 'baadige', '1bhk', '2bhk', 'monthly rent', 'flat', 'room'], name: 'Monthly Flat Rent', nameKn: 'ತಿಂಗಳ ಬಾಡಿಗೆ', price: '₹12,000/mo' },
        { keys: ['advance', 'deposit', 'security deposit'], name: 'Security Deposit', nameKn: 'ಸೆಕ್ಯೂರಿಟಿ ಅಡ್ವಾನ್ಸ್', price: '₹40,000' },
        { keys: ['maintenance', 'cleaning', 'garbage', 'trash', 'wifi', 'power', 'current'], name: 'Maintenance & Wi-Fi', nameKn: 'ಮೇಂಟೆನೆನ್ಸ್', price: '₹800/mo' },
        { keys: ['water', 'neeru', 'cauvery', 'motor', 'tank'], name: 'Water Supply', nameKn: 'ಕಾವೇರಿ ನೀರು', price: 'Included (6 AM daily)' },
      ],
      negationLines: [
        'Sari, advance kashta andre swalpa adjust maadona, chinte beda!',
        'Parvagilla, enu problem idru nanage call maadi.',
      ],
      affirmLines: [
        'Haudhu, 5th date olage UPI rent kottidre thumba olledu!',
        'Sari, eegle water motor on maadtini!',
      ],
      dontUnderstand: 'Mane baadige, water motor, athava maintenance bagge kelthiddira?',
    },
  },

  // 7. Pharmacist
  {
    id: 'pharmacy-bhaiya',
    title: 'Pharmacist',
    tagline: 'Ask for medicines & cold remedies',
    icon: Pill,
    color: '#DB2777',
    annaOpener: {
      script: 'ನಮಸ್ಕಾರ ಸರ್, ಯಾವ ಮಾತ್ರೆ ಬೇಕು? ಶೀತ, ಕೆಮ್ಮು ಅಥವಾ ಜ್ವರ ಇದೆಯಾ?',
      kanglish: 'Namaskara sir, yaava maathre beku? Sheetha, kemmu athava jwara ideya?',
      english: 'Hello! Which medicine do you need? Do you have a cold, cough, or fever?',
    },
    suggestedReplies: [
      { kanglish: 'Give me tablets for cold and fever', script: 'ಶೀತ ಮತ್ತು ಜ್ವರಕ್ಕೆ ಮಾತ್ರೆ ಕೊಡಿ' },
      { kanglish: 'Should I take this before or after food?', script: 'ಇದನ್ನು ಊಟದ ಮುಂಚೆನಾ ಆಮೇಲೆ ತಗೋಬೇಕಾ?' },
      { kanglish: 'Do you have Dolo 650 and cough syrup?', script: 'ಡೋಲೋ ೬೫೦ ಮತ್ತು ಕೆಮ್ಮಿನ ಸಿರಪ್ ಇದೆಯಾ?' },
    ],
    keyPhrases: [
      { kanglish: 'Jwarakke tablet kodi', script: 'ಜ್ವರಕ್ಕೆ ಟ್ಯಾಬ್ಲೆಟ್ ಕೊಡಿ', english: 'Give me tablets for fever' },
      { kanglish: 'Oota aadmele thagobeka?', script: 'ಊಟ ಆದ್ಮೇಲೆ ತಗೋಬೇಕಾ?', english: 'Should I take it after food?' },
      { kanglish: 'Swalpa bisi neeru kudiri', script: 'ಸ್ವಲ್ಪ ಬಿಸಿ ನೀರು ಕುಡೀರಿ', english: 'Drink warm water' },
    ],
    relatedUnitId: 'u4',
    introLines: [
      {
        script: 'ನಮಸ್ತೆ! ನಾನು ಫಾರ್ಮಸಿಸ್ಟ್. ಯಾವ ಔಷಧಿ ಬೇಕು ಹೇಳಿ!',
        kanglish: 'Namaste! Naanu Pharmacist. Yaava aushadhi beku heli!',
      },
    ],
    exitLine: {
      script: 'ಔಷಧಿ ಊಟ ಆದ್ಮೇಲೆ ತಗೊಳ್ಳಿ, ಬೇಗ ಹುಷಾರಾಗಿ!',
      kanglish: 'Aushadhi oota aadmele togoLLi, bega hushaaraagi!',
    },
    defaultReply: {
      script: 'ಈ ಮಾತ್ರೆ ಊಟ ಆದ್ಮೇಲೆ ತಗೊಳ್ಳಿ, ಬಿಸಿ ನೀರು ಕುಡೀರಿ.',
      kanglish: 'Ee maathre oota aadmele togoLLi, bisi neeru kudiri.',
    },
    brain: {
      items: [
        { keys: ['dolo', 'dolo 650', 'fever', 'jwara', 'headache', 'thale novu'], name: 'Dolo 650 Strip', nameKn: 'ಡೋಲೋ ೬೫೦', price: '₹30/strip' },
        { keys: ['paracetamol', 'crocin', 'tablet', 'medicine', 'maathre', 'pill'], name: 'Paracetamol Tablet', nameKn: 'ಪ್ಯಾರಸಿಟಮಾಲ್', price: '₹15/strip' },
        { keys: ['bandage', 'cotton', 'plaster', 'first aid', 'ointment'], name: 'First-Aid Bandage', nameKn: 'ಬ್ಯಾಂಡೇಜ್', price: '₹30' },
        { keys: ['syrup', 'sheetha', 'cold', 'cough', 'kemmu', 'kasa', 'throat'], name: 'Cough & Cold Syrup', nameKn: 'ಕಾಫ್ ಸಿರಪ್', price: '₹85' },
        { keys: ['vicks', 'inhaler', 'balm', 'ors'], name: 'Vicks & ORS Pack', nameKn: 'ವಿಕ್ಸ್', price: '₹45' },
      ],
      negationLines: [
        'Tablet bedwa? Parvagilla sir, bisi neeru kudi, rest thogoLLi!',
        'Sari sir, prescription idre thorisi, correct medicine kodtini.',
      ],
      affirmLines: [
        'Haudhu sir, 10 tablets ide, oota aadmele ಬೆಳಗ್ಗೆ ಮತ್ತು ರಾತ್ರಿ ತಗೊಳ್ಳಿ.',
        'Sari, cover alli haaki kodtini, bill ₹30.',
      ],
      dontUnderstand: 'Jwara, sheetha, kemmu athava thale novu — edakke maathre beku heli sir?',
    },
  },

  // 8. Neighbor
  {
    id: 'neighbor-uncle',
    title: 'Neighbor',
    tagline: 'Casual chat about weather & daily life',
    icon: Users,
    color: '#0D9488',
    annaOpener: {
      script: 'ನಮಸ್ಕಾರ! ಏನ್ ಸಮಾಚಾರ? ಇವತ್ತು ಬೆಂಗಳೂರು ವೆದರ್ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ ಅಲ್ವಾ?',
      kanglish: 'Namaskara! En samachara? Ivattu Bengaluru weather thumba chennagide alva?',
      english: 'Hello! How are things? Bengaluru weather is really nice today, isn’t it?',
    },
    suggestedReplies: [
      { kanglish: 'Yes, the weather is super cool today!', script: 'ಹೌದು, ಇವತ್ತು ವೆದರ್ ತುಂಬಾ ಕೂಲ್ ಆಗಿದೆ!' },
      { kanglish: 'Did you have your morning filter coffee?', script: 'ಬೆಳಗ್ಗೆ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡಿದ್ರಾ?' },
      { kanglish: 'I am learning to speak Kannada!', script: 'ನಾನು ಕನ್ನಡ ಮಾತಾಡೋಕೆ ಕಲೀತಾ ಇದ್ದೀನಿ!' },
    ],
    keyPhrases: [
      { kanglish: 'En samachara?', script: 'ಏನ್ ಸಮಾಚಾರ?', english: "What's the news / How are things?" },
      { kanglish: 'Weather thumba chennagide', script: 'ವೆದರ್ ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ', english: 'The weather is very nice' },
      { kanglish: 'Kaapi aaytha?', script: 'ಕಾಫಿ ಆಯ್ತಾ?', english: 'Did you have coffee?' },
    ],
    relatedUnitId: 'u2',
    introLines: [
      {
        script: 'ಹಲೋ! ನಾನು ನಿಮ್ಮ ಪಕ್ಕದ ಮನೆ ನೆರೆಹೊರೆಯವರು. ಬನ್ನಿ ಮಾತಾಡೋಣ!',
        kanglish: 'Hello! Naanu nimma Neighbor. Banni maathadona!',
      },
    ],
    exitLine: {
      script: 'ಸರಿ, ಸಂಜೆ ಪಾರ್ಕ್ ಅಲ್ಲಿ ಸಿಗೋಣ!',
      kanglish: 'Sari, sanje park alli sigona!',
    },
    defaultReply: {
      script: 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಬಿಸಿ ಬಿಸಿ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡಿಯೋದೇ ಒಂದು ಖುಷಿ ಕಣ್ರೀ!',
      kanglish: 'Bengaluralli bisi bisi filter coffee kudiyode ondu khushi kanree!',
    },
    brain: {
      items: [
        { keys: ['weather', 'havamana', 'thandi', 'rain', 'male', 'sun', 'cool', 'bisi'], name: 'Bengaluru Weather', nameKn: 'ಬೆಂಗಳೂರು ಹವಾಮಾನ', price: 'Pleasant 22°C' },
        { keys: ['cricket', 'rcb', 'match', 'ipl', 'score'], name: 'Cricket Chat', nameKn: 'ಕ್ರಿಕೆಟ್ ಸಮಾಚಾರ', price: 'Ee Sala Cup Namde!' },
        { keys: ['coffee', 'kaapi', 'morning walk', 'park', 'tea', 'breakfast', 'oota'], name: 'Filter Coffee & Walk', nameKn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', price: 'Always refreshing!' },
        { keys: ['metro', 'traffic', 'silk board', 'news', 'work', 'office'], name: 'City Life Chat', nameKn: 'ಬೆಂಗಳೂರು ಸಮಾಚಾರ', price: 'Namma Bengaluru!' },
      ],
      negationLines: [
        'Parvagilla bidri! Park nalli swalpa walk maadi, mind fresh aagutte.',
        'Sari sari, coffee bedwa? Haagidre sanje ಸಿಗೋಣ ಬನ್ನಿ!',
      ],
      affirmLines: [
        'Haudhu kanree, namma Bengaluru weather ಮತ್ತು ಕಾಫಿ ಸೂಪರ್!',
        'Tumba santhosha! Neevu Kannada thumba chennagi kalithiddira!',
      ],
      dontUnderstand: 'Tumba chennagide! Innu heli, office mattu oota ella hege naditha ide?',
    },
  },
];

// Carousel shows the first 4 everyday roles: Waiter, Ticket Conductor, Auto Driver, Shopkeeper
export const SURVIVAL_SCENARIOS = SCENARIOS.slice(0, 4);
