import { speakKannada } from '../utils/speechUtils';
export { speakKannada };

export interface PhraseItem {
  id: string;
  situationId: string;
  kannadaScript: string;
  translit: string;
  english: string;
  literalMeaning: string;
  streetTip: string;
  wordBankTokens: string[]; // Correct English words in order
  distractorTokens: string[]; // Extra words for word-bank challenge
  kanglishTokens: string[]; // Transliterated tokens in order
  kanglishDistractors: string[];
  speakerRole: string;
  speakerName: string;
  difficulty: 'Survival' | 'Street-Smart' | 'Local Boss';
}

export interface Situation {
  id: string;
  title: string;
  kannadaTitle: string;
  translitTitle: string;
  emoji: string;
  tileTint: string; // --tile-1 .. --tile-4
  accentColor: string;
  description: string;
  locationTag: string;
  totalPhrases: number;
  completedPhrases: number;
  progressPercent: number;
  scheduleTime: string;
  mentorName: string;
  mentorRole: string;
  phrases: PhraseItem[];
}

export interface RoleplayTurn {
  id: string;
  annaKannada: string;
  annaTranslit: string;
  annaEnglish: string;
  options: {
    translit: string;
    kannada: string;
    english: string;
    feedback: string;
    isBest: boolean;
  }[];
}

export interface RoleplayScenario {
  id: string;
  situationId: string;
  title: string;
  subtitle: string;
  emoji: string;
  characterName: string;
  characterRole: string;
  settingDescription: string;
  initialGreetingKannada: string;
  initialGreetingTranslit: string;
  initialGreetingEnglish: string;
  turns: RoleplayTurn[];
}

export interface AchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  tileTint: string;
  unlocked: boolean;
  progressText: string;
}

export const SITUATIONS: Situation[] = [
  {
    id: 'auto-ride',
    title: 'Auto Ride Basics',
    kannadaTitle: 'ಆಟೋ ಪ್ರಯಾಣ',
    translitTitle: 'Auto Prayaana',
    emoji: '🛺',
    tileTint: 'var(--tile-1)',
    accentColor: 'var(--accent)',
    description: 'Hail an auto in Indiranagar, negotiate meter-plus-twenty, and give turn-by-turn directions like a local.',
    locationTag: 'Indiranagar · 100ft Road',
    totalPhrases: 36,
    completedPhrases: 23,
    progressPercent: 65,
    scheduleTime: '09:00 AM',
    mentorName: 'Auto Anna Ramesh',
    mentorRole: 'Veteran Indiranagar Driver',
    phrases: [
      {
        id: 'auto-1',
        situationId: 'auto-ride',
        kannadaScript: 'ಅಣ್ಣ, ಇಂದಿರಾನಗರಕ್ಕೆ ಬರ್ತೀರಾ?',
        translit: 'Anna, Indiranagara-kke barthira?',
        english: 'Brother, will you come to Indiranagar?',
        literalMeaning: 'Older brother, to Indiranagar will-you-come?',
        streetTip: 'Always start with "Anna" (brother) and add "-kke" (to) after any neighbourhood name.',
        wordBankTokens: ['Brother,', 'will', 'you', 'come', 'to', 'Indiranagar?'],
        distractorTokens: ['how', 'much', 'stop', 'left'],
        kanglishTokens: ['Anna,', 'Indiranagara-kke', 'barthira?'],
        kanglishDistractors: ['eshtu', 'nillisi', 'beda'],
        speakerRole: 'Auto Anna',
        speakerName: 'Ramesh Anna',
        difficulty: 'Survival',
      },
      {
        id: 'auto-2',
        situationId: 'auto-ride',
        kannadaScript: 'ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ, ಒನ್ ಅಂಡ್ ಹಾಫ್ ಬೇಡ.',
        translit: 'Meter haaki anna, one-and-half beda.',
        english: 'Put on the meter brother, no one-and-a-half fare.',
        literalMeaning: 'Meter put brother, 1.5x not-needed.',
        streetTip: '"Beda" (don\'t want / no) is the single highest-leverage word in Bengaluru bargaining.',
        wordBankTokens: ['Put', 'on', 'the', 'meter', 'brother,', 'no', 'one-and-a-half', 'fare.'],
        distractorTokens: ['right', 'here', 'coffee', 'please'],
        kanglishTokens: ['Meter', 'haaki', 'anna,', 'one-and-half', 'beda.'],
        kanglishDistractors: ['beku', 'swalpa', 'hogi'],
        speakerRole: 'Auto Anna',
        speakerName: 'Ramesh Anna',
        difficulty: 'Street-Smart',
      },
      {
        id: 'auto-3',
        situationId: 'auto-ride',
        kannadaScript: 'ಮುಂದೆ ಸ್ವಲ್ಪ ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ.',
        translit: 'Munde swalpa left thagolli.',
        english: 'Take a slight left ahead.',
        literalMeaning: 'Ahead a-little left take-please.',
        streetTip: 'Pure Kanglish magic: mix "left", "right", "dead-end", or "U-turn" right inside "Munde swalpa ___ thagolli".',
        wordBankTokens: ['Take', 'a', 'slight', 'left', 'ahead.'],
        distractorTokens: ['behind', 'meter', 'how', 'fast'],
        kanglishTokens: ['Munde', 'swalpa', 'left', 'thagolli.'],
        kanglishDistractors: ['hinde', 'eshtu', 'beku'],
        speakerRole: 'Auto Anna',
        speakerName: 'Ramesh Anna',
        difficulty: 'Survival',
      },
      {
        id: 'auto-4',
        situationId: 'auto-ride',
        kannadaScript: 'ಇಲ್ಲೇ ಸೈಡ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ ಅಣ್ಣ.',
        translit: 'Ille side alli nillisi anna.',
        english: 'Stop right here on the side, brother.',
        literalMeaning: 'Right-here side in stop-please brother.',
        streetTip: '"Ille nillisi" stops the auto immediately without awkward hand waving.',
        wordBankTokens: ['Stop', 'right', 'here', 'on', 'the', 'side,', 'brother.'],
        distractorTokens: ['go', 'straight', 'money', 'wait'],
        kanglishTokens: ['Ille', 'side', 'alli', 'nillisi', 'anna.'],
        kanglishDistractors: ['hogona', 'eshtu', 'ಬೇಡ'],
        speakerRole: 'Auto Anna',
        speakerName: 'Ramesh Anna',
        difficulty: 'Survival',
      },
      {
        id: 'auto-5',
        situationId: 'auto-ride',
        kannadaScript: 'ಎಷ್ಟು ಆಯ್ತು? ಯುಪಿಐ ಮಾಡ್ಲಾ?',
        translit: 'Eshtu aaythu? UPI maadla?',
        english: 'How much is it? Shall I do UPI?',
        literalMeaning: 'How-much happened? UPI shall-I-do?',
        streetTip: 'Add "maadla?" (shall I do?) to any English verb: "Scan maadla?", "Call maadla?", "Pay maadla?"',
        wordBankTokens: ['How', 'much', 'is', 'it?', 'Shall', 'I', 'do', 'UPI?'],
        distractorTokens: ['cash', 'only', 'tomorrow', 'where'],
        kanglishTokens: ['Eshtu', 'aaythu?', 'UPI', 'maadla?'],
        kanglishDistractors: ['beda', 'hogi', 'nillisi'],
        speakerRole: 'Auto Anna',
        speakerName: 'Ramesh Anna',
        difficulty: 'Survival',
      },
    ],
  },
  {
    id: 'darshini-food',
    title: 'Darshini & Filter Kaapi',
    kannadaTitle: 'ದರ್ಶಿನಿ ಹೋಟೆಲ್',
    translitTitle: 'Darshini Oota',
    emoji: '☕',
    tileTint: 'var(--tile-2)',
    accentColor: 'var(--accent2)',
    description: 'Order crispy Benne Masala Dose, ask for extra chutney, and request "by-two" filter kaapi at a crowded counter.',
    locationTag: 'Malleswaram · CTR Counter',
    totalPhrases: 34,
    completedPhrases: 14,
    progressPercent: 40,
    scheduleTime: '11:30 AM',
    mentorName: 'Manjunath Bhat',
    mentorRole: 'Darshini Counter Master',
    phrases: [
      {
        id: 'food-1',
        situationId: 'darshini-food',
        kannadaScript: 'ಒಂದು ಬೆಣ್ಣೆ ಮಸಾಲೆ ದೋಸೆ, ಒಂದು ವಡೆ ಕೊಡಿ.',
        translit: 'Ondu benne masale dose, ondu vade kodi.',
        english: 'Give me one butter masala dosa and one vada.',
        literalMeaning: 'One butter masala dose, one vada give-please.',
        streetTip: 'In Kannada it is pronounced "Dose" (rhymes with "say"), never "Dosa"!',
        wordBankTokens: ['Give', 'me', 'one', 'butter', 'masala', 'dosa', 'and', 'one', 'vada.'],
        distractorTokens: ['water', 'two', 'bill', 'spicy'],
        kanglishTokens: ['Ondu', 'benne', 'masale', 'dose,', 'ondu', 'vade', 'kodi.'],
        kanglishDistractors: ['eradu', 'beda', 'kaapi'],
        speakerRole: 'Darshini Server',
        speakerName: 'Manjunath',
        difficulty: 'Survival',
      },
      {
        id: 'food-2',
        situationId: 'darshini-food',
        kannadaScript: 'ಸ್ವಲ್ಪ ಚಟ್ನಿ ಜಾಸ್ತಿ ಹಾಕಿ.',
        translit: 'Swalpa chutney jaasthi haaki.',
        english: 'Put a little extra chutney.',
        literalMeaning: 'A-little chutney more put-please.',
        streetTip: '"Jaasthi" (more) and "Kammi" (less) work everywhere — sugar, spice, or rent!',
        wordBankTokens: ['Put', 'a', 'little', 'extra', 'chutney.'],
        distractorTokens: ['less', 'salt', 'coffee', 'hot'],
        kanglishTokens: ['Swalpa', 'chutney', 'jaasthi', 'haaki.'],
        kanglishDistractors: ['kammi', 'beda', 'eshtu'],
        speakerRole: 'Darshini Server',
        speakerName: 'Manjunath',
        difficulty: 'Survival',
      },
      {
        id: 'food-3',
        situationId: 'darshini-food',
        kannadaScript: 'ಒಂದು ಬೈ-ಟು ಸ್ಟ್ರಾಂಗ್ ಕಾಫಿ ಕೊಡಿ.',
        translit: 'Ondu by-two strong kaapi kodi.',
        english: 'Give us one strong coffee shared in two cups.',
        literalMeaning: 'One by-two strong coffee give-please.',
        streetTip: '"By-two kaapi" is Bengaluru\'s iconic half-cup sharing ritual with friends.',
        wordBankTokens: ['Give', 'us', 'one', 'strong', 'coffee', 'shared', 'in', 'two', 'cups.'],
        distractorTokens: ['tea', 'cold', 'milk', 'sugar'],
        kanglishTokens: ['Ondu', 'by-two', 'strong', 'kaapi', 'kodi.'],
        kanglishDistractors: ['neeru', 'oota', 'ಬೇಡ'],
        speakerRole: 'Darshini Server',
        speakerName: 'Manjunath',
        difficulty: 'Street-Smart',
      },
      {
        id: 'food-4',
        situationId: 'darshini-food',
        kannadaScript: 'ಊಟ ಆಯ್ತಾ? ಕಾಫಿ ಸಕ್ಕತ್ ಆಗಿದೆ!',
        translit: 'Oota aaytha? Kaapi sakkath aagide!',
        english: 'Had your meal? The coffee is awesome!',
        literalMeaning: 'Meal happened-question? Coffee awesome has-become!',
        streetTip: '"Oota aaytha?" (Had food?) is how Bengaluru says "How are you?" and shows warmth.',
        wordBankTokens: ['Had', 'your', 'meal?', 'The', 'coffee', 'is', 'awesome!'],
        distractorTokens: ['where', 'bad', 'water', 'late'],
        kanglishTokens: ['Oota', 'aaytha?', 'Kaapi', 'sakkath', 'aagide!'],
        kanglishDistractors: ['illa', 'beku', 'hogi'],
        speakerRole: 'Darshini Server',
        speakerName: 'Manjunath',
        difficulty: 'Local Boss',
      },
    ],
  },
  {
    id: 'pg-landlord',
    title: 'PG & Landlord Talks',
    kannadaTitle: 'ಮನೆ ಓನರ್ ಮಾತುಕತೆ',
    translitTitle: 'Mane Owner Maathu',
    emoji: '🏠',
    tileTint: 'var(--tile-3)',
    accentColor: 'var(--success)',
    description: 'Discuss deposit, Cauvery water timings, Wi-Fi fixes, and gate curfews with your Koramangala landlord.',
    locationTag: 'Koramangala · 4th Block',
    totalPhrases: 32,
    completedPhrases: 8,
    progressPercent: 25,
    scheduleTime: '02:00 PM',
    mentorName: 'Shivanna Uncle',
    mentorRole: 'House Owner & RWA President',
    phrases: [
      {
        id: 'pg-1',
        situationId: 'pg-landlord',
        kannadaScript: 'ಅಂಕಲ್, ಕಾವೇರಿ ನೀರು ಯಾವಾಗ ಬರುತ್ತೆ?',
        translit: 'Uncle, Cauvery neeru yaavaaga barutthe?',
        english: 'Uncle, when does the Cauvery water come?',
        literalMeaning: 'Uncle, Cauvery water when comes?',
        streetTip: '"Yaavaaga barutthe?" (When does it come?) works for water, power, courier, or bus!',
        wordBankTokens: ['Uncle,', 'when', 'does', 'the', 'Cauvery', 'water', 'come?'],
        distractorTokens: ['power', 'rent', 'tomorrow', 'why'],
        kanglishTokens: ['Uncle,', 'Cauvery', 'neeru', 'yaavaaga', 'barutthe?'],
        kanglishDistractors: ['hogutthe', 'eshtu', 'ಬೇಡ'],
        speakerRole: 'Landlord',
        speakerName: 'Shivanna Uncle',
        difficulty: 'Survival',
      },
      {
        id: 'pg-2',
        situationId: 'pg-landlord',
        kannadaScript: 'ಕರೆಂಟ್ ಹೋಗಿದೆ, ಯುಪಿಎಸ್ ಆನ್ ಆಗಿಲ್ಲ.',
        translit: 'Current hogide, UPS on aagilla.',
        english: 'The power has gone out, the UPS has not turned on.',
        literalMeaning: 'Current has-gone, UPS on has-not-happened.',
        streetTip: 'In Bengaluru, electricity is always called "Current" — "Current bandidya?" (Did power come back?).',
        wordBankTokens: ['The', 'power', 'has', 'gone', 'out,', 'the', 'UPS', 'has', 'not', 'turned', 'on.'],
        distractorTokens: ['water', 'gate', 'locked', 'key'],
        kanglishTokens: ['Current', 'hogide,', 'UPS', 'on', 'aagilla.'],
        kanglishDistractors: ['bandide', 'beku', 'swalpa'],
        speakerRole: 'Landlord',
        speakerName: 'Shivanna Uncle',
        difficulty: 'Street-Smart',
      },
      {
        id: 'pg-3',
        situationId: 'pg-landlord',
        kannadaScript: 'ಈ ತಿಂಗಳು ಬಾಡಿಗೆ ಟ್ರಾನ್ಸ್‌ಫರ್ ಮಾಡಿದ್ದೀನಿ.',
        translit: 'Ee thingalu baadige transfer maadiddini.',
        english: 'I have transferred the rent for this month.',
        literalMeaning: 'This month rent transfer I-have-done.',
        streetTip: '"Maadiddini" = past tense "I have done it". "Sent maadiddini", "Lock maadiddini".',
        wordBankTokens: ['I', 'have', 'transferred', 'the', 'rent', 'for', 'this', 'month.'],
        distractorTokens: ['next', 'year', 'deposit', 'cash'],
        kanglishTokens: ['Ee', 'thingalu', 'baadige', 'transfer', 'maadiddini.'],
        kanglishDistractors: ['maadla', 'beda', 'naale'],
        speakerRole: 'Landlord',
        speakerName: 'Shivanna Uncle',
        difficulty: 'Local Boss',
      },
    ],
  },
  {
    id: 'market-bargain',
    title: 'Market Bargaining',
    kannadaTitle: 'ಮಾರ್ಕೆಟ್ ಚೌಕಾಶಿ',
    translitTitle: 'Market Chaukaashi',
    emoji: '🥬',
    tileTint: 'var(--tile-4)',
    accentColor: 'var(--info)',
    description: 'Buy fresh flowers, mangoes, and tender coconut in KR Market or Jayanagar without paying the newcomer price.',
    locationTag: 'Jayanagar · 4th Block Complex',
    totalPhrases: 38,
    completedPhrases: 19,
    progressPercent: 50,
    scheduleTime: '04:30 PM',
    mentorName: 'Lakshmi Akka',
    mentorRole: 'Flower & Fruit Vendor',
    phrases: [
      {
        id: 'mkt-1',
        situationId: 'market-bargain',
        kannadaScript: 'ಅಕ್ಕ, ಎಳನೀರು ಎಷ್ಟು? ಸಿಹಿ ಇದೆಯಾ?',
        translit: 'Akka, elaneeru eshtu? Sihi ideya?',
        english: 'Sister, how much is the tender coconut? Is it sweet?',
        literalMeaning: 'Older-sister, tender-coconut how-much? Sweet is-it?',
        streetTip: 'Call female vendors "Akka" (older sister) or "Amma" (mother) for an instant warm smile.',
        wordBankTokens: ['Sister,', 'how', 'much', 'is', 'the', 'tender', 'coconut?', 'Is', 'it', 'sweet?'],
        distractorTokens: ['sour', 'mango', 'water', 'ten'],
        kanglishTokens: ['Akka,', 'elaneeru', 'eshtu?', 'Sihi', 'ideya?'],
        kanglishDistractors: ['khara', 'beda', 'kodi'],
        speakerRole: 'Market Vendor',
        speakerName: 'Lakshmi Akka',
        difficulty: 'Survival',
      },
      {
        id: 'mkt-2',
        situationId: 'market-bargain',
        kannadaScript: 'ತುಂಬಾ ಜಾಸ್ತಿ ಆಯ್ತು ಅಕ್ಕ, ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ.',
        translit: 'Thumba jaasthi aaythu akka, swalpa kammi maadi.',
        english: 'That is too expensive sister, reduce it a little.',
        literalMeaning: 'Very much happened sister, a-little less make-please.',
        streetTip: '"Swalpa kammi maadi" is the golden bargaining phrase across all of Karnataka.',
        wordBankTokens: ['That', 'is', 'too', 'expensive', 'sister,', 'reduce', 'it', 'a', 'little.'],
        distractorTokens: ['more', 'give', 'free', 'bag'],
        kanglishTokens: ['Thumba', 'jaasthi', 'aaythu', 'akka,', 'swalpa', 'kammi', 'maadi.'],
        kanglishDistractors: ['beku', 'hogi', 'sakkath'],
        speakerRole: 'Market Vendor',
        speakerName: 'Lakshmi Akka',
        difficulty: 'Street-Smart',
      },
      {
        id: 'mkt-3',
        situationId: 'market-bargain',
        kannadaScript: 'ಸ್ವಲ್ಪ ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು ಫ್ರೀ ಹಾಕಿ.',
        translit: 'Swalpa kothambari soppu free haaki.',
        english: 'Throw in a little coriander leaves for free.',
        literalMeaning: 'A-little coriander greens free put-please.',
        streetTip: 'Asking for free curry leaves (karibevu) or coriander (kothambari) after buying veggies is peak local energy.',
        wordBankTokens: ['Throw', 'in', 'a', 'little', 'coriander', 'leaves', 'for', 'free.'],
        distractorTokens: ['onion', 'buy', 'expensive', 'no'],
        kanglishTokens: ['Swalpa', 'kothambari', 'soppu', 'free', 'haaki.'],
        kanglishDistractors: ['beda', 'eshtu', 'nillisi'],
        speakerRole: 'Market Vendor',
        speakerName: 'Lakshmi Akka',
        difficulty: 'Local Boss',
      },
    ],
  },
  {
    id: 'office-chai',
    title: 'Office & Tech Park Chai',
    kannadaTitle: 'ಆಫೀಸ್ ಟೀ ಬ್ರೇಕ್',
    translitTitle: 'Office Chai Maathu',
    emoji: '💻',
    tileTint: 'var(--tile-1)',
    accentColor: 'var(--accent)',
    description: 'Bond with Kannada-speaking teammates at Bellandur tech parks over chai, traffic rants, and weekend plans.',
    locationTag: 'ORR · Bellandur Tech Park',
    totalPhrases: 30,
    completedPhrases: 15,
    progressPercent: 50,
    scheduleTime: '06:00 PM',
    mentorName: 'Karthik Gowda',
    mentorRole: 'Senior Dev & Chai Buddy',
    phrases: [
      {
        id: 'off-1',
        situationId: 'office-chai',
        kannadaScript: 'ಮಗಾ, ಟೀ ಕುಡಿಯೋಕೆ ಹೋಗೋಣ್ವಾ?',
        translit: 'Maga, tea kudiyoke hogonva?',
        english: 'Bro, shall we go drink tea?',
        literalMeaning: 'Buddy, tea to-drink shall-we-go?',
        streetTip: '"Maga" or "Guru" = Bengaluru\'s affectionate "bro / dude" among friends and peers.',
        wordBankTokens: ['Bro,', 'shall', 'we', 'go', 'drink', 'tea?'],
        distractorTokens: ['meeting', 'now', 'sleep', 'work'],
        kanglishTokens: ['Maga,', 'tea', 'kudiyoke', 'hogonva?'],
        kanglishDistractors: ['beda', 'bande', 'nillisi'],
        speakerRole: 'Teammate',
        speakerName: 'Karthik',
        difficulty: 'Survival',
      },
      {
        id: 'off-2',
        situationId: 'office-chai',
        kannadaScript: 'ಏನ್ ಸೀನ್ ಇಲ್ಲ ಗುರು, ಆರಾಮಾಗಿ ಮ್ಯಾನೇಜ್ ಮಾಡೋಣ.',
        translit: 'Yen scene illa guru, aaraamaagi manage maadona.',
        english: 'No problem at all bro, we will manage it smoothly.',
        literalMeaning: 'Any scene not-there guru, comfortably manage let-us-do.',
        streetTip: '"Yen scene illa" (No scene / no worries) immediately calms down any stressful deployment day.',
        wordBankTokens: ['No', 'problem', 'at', 'all', 'bro,', 'we', 'will', 'manage', 'it', 'smoothly.'],
        distractorTokens: ['panic', 'bug', 'hard', 'never'],
        kanglishTokens: ['Yen', 'scene', 'illa', 'guru,', 'aaraamaagi', 'manage', 'maadona.'],
        kanglishDistractors: ['jaasthi', 'eshtu', 'ಬೇಡ'],
        speakerRole: 'Teammate',
        speakerName: 'Karthik',
        difficulty: 'Street-Smart',
      },
      {
        id: 'off-3',
        situationId: 'office-chai',
        kannadaScript: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಅಲ್ಲಿ ಫುಲ್ ಟ್ರಾಫಿಕ್ ಇತ್ತು!',
        translit: 'Silk Board alli full traffic itthu!',
        english: 'There was heavy traffic at Silk Board!',
        literalMeaning: 'Silk Board at full traffic was-there!',
        streetTip: 'Complaining about Silk Board or ORR traffic in Kanglish instantly makes you an honorary Bengalurean.',
        wordBankTokens: ['There', 'was', 'heavy', 'traffic', 'at', 'Silk', 'Board!'],
        distractorTokens: ['empty', 'road', 'metro', 'early'],
        kanglishTokens: ['Silk', 'Board', 'alli', 'full', 'traffic', 'itthu!'],
        kanglishDistractors: ['illa', 'beku', 'hogona'],
        speakerRole: 'Teammate',
        speakerName: 'Karthik',
        difficulty: 'Survival',
      },
    ],
  },
  {
    id: 'doctor-visit',
    title: 'Doctor & Pharmacy',
    kannadaTitle: 'ಕ್ಲಿನಿಕ್ ಮತ್ತು ಮೆಡಿಕಲ್',
    translitTitle: 'Doctor & Medical',
    emoji: '🩺',
    tileTint: 'var(--tile-2)',
    accentColor: 'var(--accent2)',
    description: 'Explain symptoms clearly at a local clinic or ask the pharmacist for dosage instructions when Bengaluru weather hits.',
    locationTag: 'HSR Layout · Sector 2 Clinic',
    totalPhrases: 30,
    completedPhrases: 7,
    progressPercent: 20,
    scheduleTime: '07:30 PM',
    mentorName: 'Dr. Ashwini Rao',
    mentorRole: 'Family Physician',
    phrases: [
      {
        id: 'doc-1',
        situationId: 'doctor-visit',
        kannadaScript: 'ಡಾಕ್ಟರ್, ನಿನ್ನೆಯಿಂದ ಸ್ವಲ್ಪ ಜ್ವರ ಮತ್ತೆ ಕೆಮ್ಮು ಇದೆ.',
        translit: 'Doctor, ninne-yinda swalpa jwara matthe kemmu ide.',
        english: 'Doctor, since yesterday I have a mild fever and cough.',
        literalMeaning: 'Doctor, yesterday-from a-little fever and cough is-there.',
        streetTip: '"Jwara" (fever), "Kemmu" (cough), and "Thale novu" (headache) are essential medical words.',
        wordBankTokens: ['Doctor,', 'since', 'yesterday', 'I', 'have', 'a', 'mild', 'fever', 'and', 'cough.'],
        distractorTokens: ['tomorrow', 'stomach', 'fine', 'medicine'],
        kanglishTokens: ['Doctor,', 'ninne-yinda', 'swalpa', 'jwara', 'matthe', 'kemmu', 'ide.'],
        kanglishDistractors: ['illa', 'naale', 'eshtu'],
        speakerRole: 'Physician',
        speakerName: 'Dr. Ashwini',
        difficulty: 'Survival',
      },
      {
        id: 'doc-2',
        situationId: 'doctor-visit',
        kannadaScript: 'ಈ ಮಾತ್ರೆ ಊಟಕ್ಕೆ ಮುಂಚೆನಾ ಅಥವಾ ಆಮೇಲಾ?',
        translit: 'Ee maathre ootakke munchena athava aamela?',
        english: 'Is this tablet before meals or after?',
        literalMeaning: 'This tablet for-meal before-question or after-question?',
        streetTip: '"Munche" (before) and "Aamele" (after/later) help with both medicine timings and daily plans.',
        wordBankTokens: ['Is', 'this', 'tablet', 'before', 'meals', 'or', 'after?'],
        distractorTokens: ['water', 'morning', 'only', 'sleep'],
        kanglishTokens: ['Ee', 'maathre', 'ootakke', 'munchena', 'athava', 'aamela?'],
        kanglishDistractors: ['beda', 'jaasthi', 'hogona'],
        speakerRole: 'Physician',
        speakerName: 'Dr. Ashwini',
        difficulty: 'Street-Smart',
      },
    ],
  },
];

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'rp-darshini',
    situationId: 'darshini-food',
    title: 'Ordering Food & Coffee with a Waiter',
    subtitle: '8:45 AM at a Bengaluru Darshini · Dosa & Filter Coffee',
    emoji: '☕',
    characterName: 'Waiter',
    characterRole: 'Restaurant Waiter',
    settingDescription: 'The fragrance of roasted butter and filter coffee fills the restaurant. Order breakfast and coffee from the waiter.',
    initialGreetingKannada: 'ಬನ್ನಿ ಸಾರ್! ಏನ್ ಕೊಡ್ಲಿ? ಬಿಸಿ ಬಿಸಿ ಬೆಣ್ಣೆ ದೋಸೆ ರೆಡಿ ಇದೆ.',
    initialGreetingTranslit: 'Banni sir! Yen kodli? Bisi bisi benne dose ready ide.',
    initialGreetingEnglish: 'Welcome! What shall I get you? Piping hot butter dosa is ready.',
    turns: [
      {
        id: 'd-turn-1',
        annaKannada: 'ಎರಡು ಮಸಾಲೆ ದೋಸೆನಾ? ಚಟ್ನಿ ಖಾರ ಬೇಕಾ, ಸಾದಾ ಬೇಕಾ?',
        annaTranslit: 'Eradu masale dosena? Chutney khara beka, saada beka?',
        annaEnglish: 'Two masala dosas? Do you want spicy chutney or regular?',
        options: [
          {
            translit: 'Ondu benne masale dose, chutney swalpa jaasthi haaki!',
            kannada: 'ಒಂದು ಬೆಣ್ಣೆ ಮಸಾಲೆ ದೋಸೆ, ಚಟ್ನಿ ಸ್ವಲ್ಪ ಜಾಸ್ತಿ ಹಾಕಿ!',
            english: 'One butter masala dosa, put a little extra chutney!',
            feedback: 'Crispy choice! Pronouncing "dose" and asking for "chutney jaasthi" earns instant respect.',
            isBest: true,
          },
          {
            translit: 'Khara chutney kodi, matthe ondu uddina vade.',
            kannada: 'ಖಾರ ಚಟ್ನಿ ಕೊಡಿ, ಮತ್ತೆ ಒಂದು ಉದ್ದಿನ ವಡೆ.',
            english: 'Give spicy chutney, and one medu vada.',
            feedback: 'Authentic order! "Uddina vade" is the classic Kannada name for medu vada.',
            isBest: true,
          },
        ],
      },
      {
        id: 'd-turn-2',
        annaKannada: 'ಆಯ್ತು! ದೋಸೆ ಆದ್ಮೇಲೆ ಫಿಲ್ಟರ್ ಕಾಫಿ ತಗೊಳ್ತೀರಾ?',
        annaTranslit: 'Aaythu! Dose aadmele filter kaapi thagolthira?',
        annaEnglish: 'Done! After the dosa, will you have filter coffee?',
        options: [
          {
            translit: 'Haudu! Ondu strong filter kaapi kodi, sakkare kammi.',
            kannada: 'ಹೌದು! ಒಂದು ಸ್ಟ್ರಾಂಗ್ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ, ಸಕ್ಕರೆ ಕಮ್ಮಿ.',
            english: 'Yes! Give one strong filter coffee, less sugar.',
            feedback: '"Haudu" (Yes) + "sakkare kammi" (less sugar) — you sound like a local regular!',
            isBest: true,
          },
        ],
      },
    ],
  },
  {
    id: 'rp-conductor',
    situationId: 'bmtc-bus',
    title: 'Buying a Bus Ticket from the Ticket Conductor',
    subtitle: '9:15 AM on a BMTC Bus · Asking for Stop & Ticket',
    emoji: '🚌',
    characterName: 'Ticket Conductor',
    characterRole: 'BMTC Bus Ticket Conductor',
    settingDescription: 'You just boarded a bus heading toward Indiranagar and Majestic. Ask the ticket conductor for your ticket and stop.',
    initialGreetingKannada: 'ಬನ್ನಿ ಮುಂದೆ ಹೋಗಿ! ಯಾವ ಸ್ಟಾಪ್‌ಗೆ ಟಿಕೆಟ್ ಬೇಕು ಹೇಳಿ?',
    initialGreetingTranslit: 'Banni munde hogi! Yaava stop-ge ticket beku heli?',
    initialGreetingEnglish: 'Come in, move forward! Tell me which stop you need a ticket for?',
    turns: [
      {
        id: 'c-turn-1',
        annaKannada: 'ಇಂದಿರಾನಗರಕ್ಕೆ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಆಗುತ್ತೆ. ಚಿಲ್ಲರೆ ಇದೆಯಾ ಅಥವಾ ಯುಪಿಐ ಮಾಡ್ತೀರಾ?',
        annaTranslit: 'Indiranagara-kke ippatthu roopayi aagutte. Chillare ideya athava UPI maadthira?',
        annaEnglish: 'It is 20 rupees to Indiranagar. Do you have change or will you pay by UPI?',
        options: [
          {
            translit: 'Conductor sir, Indiranagara-kke ondu ticket kodi. UPI QR scan maadthini.',
            kannada: 'ಕಂಡಕ್ಟರ್ ಸರ್, ಇಂದಿರಾನಗರಕ್ಕೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ. ಯುಪಿಐ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡ್ತೀನಿ.',
            english: 'Conductor sir, give me one ticket to Indiranagar. I will scan the UPI QR code.',
            feedback: 'Spot on! "Ondu ticket kodi" + "UPI scan maadthini" works on every Bengaluru bus.',
            isBest: true,
          },
          {
            translit: 'Illide iravatthu roopayi chillare, ondu ticket kodi.',
            kannada: 'ಇಲ್ಲಿದೆ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ಚಿಲ್ಲರೆ, ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ.',
            english: 'Here is 20 rupees exact change, please give one ticket.',
            feedback: 'Ticket conductors love exact change ("chillare")!',
            isBest: true,
          },
        ],
      },
      {
        id: 'c-turn-2',
        annaKannada: 'ತಗೊಳ್ಳಿ ಟಿಕೆಟ್! ಮುಂದೆ ಸೀಟ್ ಖಾಲಿ ಇದೆ ಕೂತ್ಕೊಳ್ಳಿ.',
        annaTranslit: 'Thagolli ticket! Munde seat khaali ide kootkoli.',
        annaEnglish: 'Take your ticket! There is an empty seat ahead, please sit down.',
        options: [
          {
            translit: 'Dhanyavada sir! Indiranagar stop bandaga swalpa heli.',
            kannada: 'ಧನ್ಯವಾದ ಸರ್! ಇಂದಿರಾನಗರ ಸ್ಟಾಪ್ ಬಂದಾಗ ಸ್ವಲ್ಪ ಹೇಳಿ.',
            english: 'Thank you sir! Please let me know when the Indiranagar stop comes.',
            feedback: 'Polite and practical! "Stop bandaga swalpa heli" guarantees you never miss your stop.',
            isBest: true,
          },
        ],
      },
    ],
  },
  {
    id: 'rp-auto',
    situationId: 'auto-ride',
    title: 'Auto Ride & Fare Chat with an Auto Driver',
    subtitle: '6:30 PM outside Indiranagar Metro · Drizzle starting',
    emoji: '🛺',
    characterName: 'Auto Driver',
    characterRole: 'Bengaluru Auto Driver',
    settingDescription: 'It just started drizzling near 100ft Road. Ask the auto driver to take you to Koramangala by meter.',
    initialGreetingKannada: 'ನಮಸ್ಕಾರ ಸಾರ್! ಎಲ್ಲಿಗೆ ಹೋಗ್ಬೇಕು? ಮಳೆ ಬರ್ತಾ ಇದೆ ನೋಡಿ.',
    initialGreetingTranslit: 'Namaskara sir! Ellige hogbeku? Male bartha ide nodi.',
    initialGreetingEnglish: 'Hello! Where do you need to go? Look, it is starting to rain.',
    turns: [
      {
        id: 'turn-1',
        annaKannada: 'ಕೋರಮಂಗಲನಾ? ಅಲ್ಲಿ ಫುಲ್ ಟ್ರಾಫಿಕ್ ಇದೆ. ಇನ್ನೂರು ರೂಪಾಯಿ ಕೊಡಿ.',
        annaTranslit: 'Koramangalana? Alli full traffic ide. Innooru roopayi kodi.',
        annaEnglish: 'Koramangala? There is heavy traffic there. Give 200 rupees.',
        options: [
          {
            translit: 'Anna, thumba jaasthi aaythu! Meter mele ippatthu roopayi thagolli.',
            kannada: 'ಅಣ್ಣ, ತುಂಬಾ ಜಾಸ್ತಿ ಆಯ್ತು! ಮೀಟರ್ ಮೇಲೆ ಇಪ್ಪತ್ತು ರೂಪಾಯಿ ತಗೊಳ್ಳಿ.',
            english: 'Brother, that is too much! Take twenty rupees above the meter.',
            feedback: 'Sakkath! Offering "meter mele 20" in respectful Kanglish wins the Auto Driver over immediately.',
            isBest: true,
          },
          {
            translit: 'One-fifty final maadi anna, barthira?',
            kannada: 'ಒನ್-ಫಿಫ್ಟಿ ಫೈನಲ್ ಮಾಡಿ ಅಣ್ಣ, ಬರ್ತೀರಾ?',
            english: 'Make it 150 final brother, will you come?',
            feedback: 'Solid street bargain! Mixing "One-fifty final maadi" sounds very natural.',
            isBest: true,
          },
          {
            translit: 'Illa anna, beda. Naanu metro alli hogthini.',
            kannada: 'ಇಲ್ಲ ಅಣ್ಣ, ಬೇಡ. ನಾನು ಮೆಟ್ರೋ ಅಲ್ಲಿ ಹೋಗ್ತೀನಿ.',
            english: 'No brother, don\'t want. I will go by metro.',
            feedback: 'Polite walk-away! Often gets you a lower fare right away.',
            isBest: false,
          },
        ],
      },
      {
        id: 'turn-2',
        annaKannada: 'ಸರಿ ಬಿಡಿ, ಹತ್ತಿ! ಸೋನಿ ವರ್ಲ್ಡ್ ಸಿಗ್ನಲ್ ಇಂದ ಯಾವ ಕಡೆ ಹೋಗ್ಲಿ?',
        annaTranslit: 'Sari bidi, hatthi! Sony World signal inda yaava kade hogli?',
        annaEnglish: 'Alright leave it, hop in! From Sony World signal, which way should I go?',
        options: [
          {
            translit: 'Signal alli right thagolli, aamele straight hogi anna.',
            kannada: 'ಸಿಗ್ನಲ್ ಅಲ್ಲಿ ರೈಟ್ ತಗೊಳ್ಳಿ, ಆಮೇಲೆ ಸ್ಟ್ರೈಟ್ ಹೋಗಿ ಅಣ್ಣ.',
            english: 'Take a right at the signal, then go straight brother.',
            feedback: 'Spot on! "Signal alli right thagolli, aamele straight hogi" is peak Bengaluru navigation.',
            isBest: true,
          },
          {
            translit: 'Munde swalpa left thagolli, park pakka nillisi.',
            kannada: 'ಮುಂದೆ ಸ್ವಲ್ಪ ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ, ಪಾರ್ಕ್ ಪಕ್ಕ ನಿಲ್ಲಿಸಿ.',
            english: 'Take a slight left ahead, stop next to the park.',
            feedback: 'Great use of "pakka" (next to) and "nillisi" (stop)!',
            isBest: true,
          },
        ],
      },
      {
        id: 'turn-3',
        annaKannada: 'ಬಂತು ನೋಡಿ! ಮೀಟರ್ ನೂರಾ ಮೂವತ್ತು ಆಯ್ತು. ಚೇಂಜ್ ಇದೆಯಾ?',
        annaTranslit: 'Banthu nodi! Meter noora moovatthu aaythu. Change ideya?',
        annaEnglish: 'Look, we have arrived! Meter is 130. Do you have change?',
        options: [
          {
            translit: 'Change illa anna, QR scan maadla? Thumba thanks!',
            kannada: 'ಚೇಂಜ್ ಇಲ್ಲ ಅಣ್ಣ, ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡ್ಲಾ? ತುಂಬಾ ಥ್ಯಾಂಕ್ಸ್!',
            english: 'No change brother, shall I scan QR? Thanks a lot!',
            feedback: '10/10! You just completed an entire Indiranagar-to-Koramangala auto ride in Kanglish.',
            isBest: true,
          },
        ],
      },
    ],
  },
  {
    id: 'rp-landlord',
    situationId: 'pg-landlord',
    title: 'Talking to the House Owner About Water & Rent',
    subtitle: '10:00 AM on the Ground Floor Verandah',
    emoji: '🏠',
    characterName: 'House Owner',
    characterRole: 'Bengaluru House Owner',
    settingDescription: 'Your house owner is on the ground floor. Ask about the water motor and let them know rent is paid.',
    initialGreetingKannada: 'ಏನಪ್ಪಾ, ಆಫೀಸ್ ಇಲ್ವಾ ಇವತ್ತು? ವರ್ಕ್ ಫ್ರಮ್ ಹೋಮ್ ಆ?',
    initialGreetingTranslit: 'Yenappa, office ilva ivatthu? Work from home aa?',
    initialGreetingEnglish: 'Hey there, no office today? Working from home?',
    turns: [
      {
        id: 'l-turn-1',
        annaKannada: 'ಹೌದಾ, ಒಳ್ಳೇದು. ಏನಾದ್ರೂ ಸಮಸ್ಯೆ ಇದೆಯಾ ಮನೆಯಲ್ಲಿ?',
        annaTranslit: 'Hauda, olledu. Yenaadru samasye ideya maneyalli?',
        annaEnglish: 'Is that so, good. Is there any issue in the house?',
        options: [
          {
            translit: 'Haudu sir, mele tank alli neeru khali aagide. Motor on maadthira?',
            kannada: 'ಹೌದು ಸರ್, ಮೇಲೆ ಟ್ಯಾಂಕ್ ಅಲ್ಲಿ ನೀರು ಖಾಲಿ ಆಗಿದೆ. ಮೋಟಾರ್ ಆನ್ ಮಾಡ್ತೀರಾ?',
            english: 'Yes sir, water is empty in the overhead tank. Will you turn on the motor?',
            feedback: 'Super polite and crystal clear! Every Bengaluru tenant needs "Motor on maadthira?".',
            isBest: true,
          },
          {
            translit: 'Yen samasye illa! Ee thingalu baadige UPI maadiddini.',
            kannada: 'ಏನ್ ಸಮಸ್ಯೆ ಇಲ್ಲ! ಈ ತಿಂಗಳು ಬಾಡಿಗೆ ಯುಪಿಐ ಮಾಡಿದ್ದೀನಿ.',
            english: 'No problem at all! I have paid this month\'s rent via UPI.',
            feedback: 'Music to any house owner\'s ears! "Baadige UPI maadiddini" builds great rapport.',
            isBest: true,
          },
        ],
      },
    ],
  },
];

export const WEEKLY_XP_DATA = [
  { day: 'Mon', xp: 35, phrases: 8 },
  { day: 'Tue', xp: 45, phrases: 12 },
  { day: 'Wed', xp: 40, phrases: 10 },
  { day: 'Thu', xp: 60, phrases: 16 },
  { day: 'Fri', xp: 85, phrases: 20 },
  { day: 'Sat', xp: 55, phrases: 14 },
  { day: 'Sun', xp: 70, phrases: 18 },
];

export const ACHIEVEMENTS: AchievementBadge[] = [
  {
    id: 'ach-streak',
    title: '7 Days Streak',
    subtitle: 'Practiced 7 days in a row without missing kaapi time',
    emoji: '🔥',
    tileTint: 'var(--tile-1)',
    unlocked: true,
    progressText: '12 / 7 Days',
  },
  {
    id: 'ach-words',
    title: '100 Phrases Learner',
    subtitle: 'Mastered core survival Kanglish across 4 situations',
    emoji: '🗣️',
    tileTint: 'var(--tile-2)',
    unlocked: true,
    progressText: '86 / 100 Phrases',
  },
  {
    id: 'ach-auto',
    title: 'First Lesson Complete',
    subtitle: 'Negotiated your first Indiranagar auto ride',
    emoji: '🛺',
    tileTint: 'var(--tile-3)',
    unlocked: true,
    progressText: 'Completed',
  },
  {
    id: 'ach-goal',
    title: 'Week Goal Achiever',
    subtitle: 'Hit 350 XP weekly target with 92% accuracy',
    emoji: '🏆',
    tileTint: 'var(--tile-4)',
    unlocked: true,
    progressText: '350 / 350 XP',
  },
  {
    id: 'ach-darshini',
    title: 'Benne Dose Boss',
    subtitle: 'Order a full meal at a Darshini in spoken Kannada',
    emoji: '☕',
    tileTint: 'var(--tile-2)',
    unlocked: false,
    progressText: '14 / 20 Phrases',
  },
  {
    id: 'ach-local',
    title: 'Honorary Bengalurean',
    subtitle: 'Complete all 6 real-life city situations',
    emoji: '🌳',
    tileTint: 'var(--tile-3)',
    unlocked: false,
    progressText: '4 / 6 Situations',
  },
];

// Speak Kannada / Kanglish audio helper using Web Speech API (speakKannada) + tactile tone
export function speakKanglishPhrase(
  translit: string,
  kannadaScript?: string,
  slow = false
): void {
  const primaryText = (kannadaScript || translit || '').trim();
  speakKannada(primaryText, {
    slow,
    fallbackTranslit: translit,
  });
  playTactileTone('tap');
}

let sharedAudioCtx: AudioContext | null = null;
let lastMascotPingTime = 0;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a subtle, short 'ping' / 'soft tap' sound via the Web Audio API
 * whenever the Anna mascot animation is triggered.
 */
export function playAnnaMascotPing(): void {
  if (typeof window === 'undefined') return;
  const nowPerf = performance.now();
  if (nowPerf - lastMascotPingTime < 90) return;
  lastMascotPingTime = nowPerf;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Soft tactile wooden-marimba / bell ping
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.065); // A5

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(293.66, now); // D4 soft body tap
    subOsc.frequency.exponentialRampToValueAtTime(440, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.042, now + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.075);

    osc.connect(gain);
    subOsc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    subOsc.start(now);
    osc.stop(now + 0.078);
    subOsc.stop(now + 0.05);
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

let lastScratchTickTime = 0;

export type TactileToneType =
  | 'tap'
  | 'select'
  | 'flip'
  | 'scratch'
  | 'reveal'
  | 'goal'
  | 'celebrate'
  | 'success'
  | 'error'
  | 'ping';

export function playTactileTone(type: TactileToneType): void {
  if (typeof window === 'undefined') return;
  if (type === 'ping') {
    playAnnaMascotPing();
    return;
  }

  if (type === 'scratch') {
    const nowPerf = performance.now();
    if (nowPerf - lastScratchTickTime < 55) return;
    lastScratchTickTime = nowPerf;
  }

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'tap') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
      return;
    }

    if (type === 'select') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.085);
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.095);
      return;
    }

    if (type === 'flip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.07);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.start(now);
      osc.stop(now + 0.08);
      return;
    }

    if (type === 'scratch') {
      // Crisp tactile foil-etch tick with slight pitch jitter
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const baseFreq = 950 + Math.random() * 420;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, now + 0.032);
      gain.gain.setValueAtTime(0.032, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.038);
      return;
    }

    if (type === 'reveal') {
      // Sparkling shimmer arpeggio when scratch card reveals
      const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        const start = now + idx * 0.055;
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.085, start + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
        o.start(start);
        o.stop(start + 0.25);
      });
      return;
    }

    if (type === 'goal') {
      // Satisfying two-note check-off chime (G5 -> D6)
      const notes = [783.99, 1174.66];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        const start = now + idx * 0.075;
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.095, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        o.start(start);
        o.stop(start + 0.23);
      });
      return;
    }

    if (type === 'celebrate') {
      // Warm celebratory 4-note fanfare (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        const start = now + idx * 0.07;
        const duration = idx === notes.length - 1 ? 0.38 : 0.2;
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(0.001, start);
        g.gain.linearRampToValueAtTime(0.11, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, start + duration);
        o.start(start);
        o.stop(start + duration + 0.01);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.09); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.18); // G5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.22);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // Ignore audio context errors
  }
}
