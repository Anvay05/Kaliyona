export interface ScratchPhrase {
  id: string;
  script: string;      // Kannada script
  kanglish: string;    // romanized
  english: string;
  difficulty: 1 | 2 | 3;
}

export const SCRATCH_PHRASES: ScratchPhrase[] = [
  { id: 'p01', script: 'ನಮಸ್ಕಾರ', kanglish: 'Namaskara', english: 'Hello', difficulty: 1 },
  { id: 'p02', script: 'ಧನ್ಯವಾದ', kanglish: 'Dhanyavaada', english: 'Thank you', difficulty: 1 },
  { id: 'p03', script: 'ಎಷ್ಟು?', kanglish: 'Eshtu?', english: 'How much?', difficulty: 1 },
  { id: 'p04', script: 'ಚೆನ್ನಾಗಿದೆ!', kanglish: 'Chennagide!', english: "It's great!", difficulty: 1 },
  { id: 'p05', script: 'ಒಂದು ಕಾಫಿ ಬೇಕು', kanglish: 'Ondu kaapi beku', english: 'I want one coffee', difficulty: 1 },
  { id: 'p06', script: 'ಎರಡು ಟಿಕೇಟ್ ಕೊಡಿ', kanglish: 'Eradu ticket kodi', english: 'Give two tickets', difficulty: 1 },
  { id: 'p07', script: 'ಬಿಸಿ ಬಿಸಿ ಇಡ್ಲಿ ಕೊಡಿ', kanglish: 'Bisi bisi idli kodi', english: 'Give me hot idlis', difficulty: 2 },
  { id: 'p08', script: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ', kanglish: 'Swalpa kammi maadi', english: 'Reduce the price a little', difficulty: 2 },
  { id: 'p09', script: 'ಬಸ್ ಎಲ್ಲಿ ನಿಲ್ಲುತ್ತೆ?', kanglish: 'Bus elli nillutte?', english: 'Where does the bus stop?', difficulty: 2 },
  { id: 'p10', script: 'ಮೆಜೆಸ್ಟಿಕ್ ಹೋಗ್ತೀರಾ?', kanglish: 'Majestic hogteera?', english: 'Will you go to Majestic?', difficulty: 2 },
  { id: 'p11', script: 'ನನ್ನ ಹೆಸರು ಮೀರಾ', kanglish: 'Nanna hesaru Meera', english: 'My name is Meera', difficulty: 2 },
  { id: 'p12', script: 'ಇಲ್ಲಿಗೆ ಬನ್ನಿ', kanglish: 'Illige banni', english: 'Come here', difficulty: 2 },
];
