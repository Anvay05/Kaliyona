"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Volume2,
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
} from "lucide-react";
import React, { useRef, useEffect, useState } from "react";
import { Autoplay, EffectCards, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css/effect-cards";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css";

import { cn } from "@/lib/utils";
import { playTactileTone } from "../../data/kanglishData";

import bgGreetings from "../../assets/images/card_bg_greetings_1793258715261.jpg";
import bgMetro from "../../assets/images/card_bg_metro_1793259476473.jpg";
import bgBus from "../../assets/images/card_bg_bus_1793259477989.jpg";
import bgRickshaw from "../../assets/images/card_bg_rickshaw_1793258718246.jpg";
import bgFood from "../../assets/images/card_bg_food_1793258714909.jpg";
import bgKaapi from "../../assets/images/card_bg_kaapi_1793259478932.jpg";
import bgDirections from "../../assets/images/card_bg_directions_1793258717170.jpg";
import bgTraffic from "../../assets/images/card_bg_traffic_1793259478283.jpg";
import bgShopping from "../../assets/images/card_bg_shopping_1793259479946.jpg";
import bgNumbers from "../../assets/images/card_bg_numbers_v2_1793272671662.jpg";
import bgFamily from "../../assets/images/card_bg_family_1793258719145.jpg";
import bgHome from "../../assets/images/card_bg_home_1793259482526.jpg";
import bgOffice from "../../assets/images/card_bg_office_1793259482837.jpg";
import bgRain from "../../assets/images/card_bg_rain_1793259483293.jpg";
import bgTime from "../../assets/images/card_bg_time_1793258720590.jpg";
import bgOpinions from "../../assets/images/card_bg_opinions_1793258722302.jpg";

export const TOPIC_VERTICAL_BACKGROUNDS: Record<string, string> = {
  greetings: bgGreetings,
  metro: bgMetro,
  bus: bgBus,
  rickshaw: bgRickshaw,
  food: bgFood,
  kaapi: bgKaapi,
  directions: bgDirections,
  traffic: bgTraffic,
  shopping: bgShopping,
  numbers: bgNumbers,
  family: bgFamily,
  home: bgHome,
  office: bgOffice,
  rain: bgRain,
  time: bgTime,
  opinions: bgOpinions,
};

export const TOPIC_INSTANT_GRADIENTS: Record<string, string> = {
  greetings: "linear-gradient(160deg, #312e81 0%, #7c2d12 55%, #1e1b4b 100%)",
  metro: "linear-gradient(160deg, #4c1d95 0%, #1e3a8a 55%, #0f172a 100%)",
  bus: "linear-gradient(160deg, #14532d 0%, #0f766e 55%, #0f172a 100%)",
  rickshaw: "linear-gradient(160deg, #78350f 0%, #14532d 55%, #18181b 100%)",
  food: "linear-gradient(160deg, #7c2d12 0%, #9a3412 55%, #271206 100%)",
  kaapi: "linear-gradient(160deg, #451a03 0%, #78350f 55%, #1c1917 100%)",
  directions: "linear-gradient(160deg, #065f46 0%, #1e3a8a 55%, #0f172a 100%)",
  traffic: "linear-gradient(160deg, #7f1d1d 0%, #78350f 55%, #18181b 100%)",
  shopping: "linear-gradient(160deg, #831843 0%, #581c87 55%, #1e1b4b 100%)",
  numbers: "linear-gradient(160deg, #1e3a8a 0%, #312e81 55%, #0f172a 100%)",
  family: "linear-gradient(160deg, #7c2d12 0%, #831843 55%, #1f1224 100%)",
  home: "linear-gradient(160deg, #1e3a8a 0%, #0f766e 55%, #0f172a 100%)",
  office: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 55%, #172554 100%)",
  rain: "linear-gradient(160deg, #0f172a 0%, #164e63 55%, #090d16 100%)",
  time: "linear-gradient(160deg, #312e81 0%, #4c1d95 55%, #0f172a 100%)",
  opinions: "linear-gradient(160deg, #881337 0%, #4c1d95 55%, #18181b 100%)",
};

const ALL_VERTICAL_BACKGROUNDS: string[] = [
  TOPIC_VERTICAL_BACKGROUNDS.greetings,
  TOPIC_VERTICAL_BACKGROUNDS.metro,
  TOPIC_VERTICAL_BACKGROUNDS.bus,
  TOPIC_VERTICAL_BACKGROUNDS.rickshaw,
  TOPIC_VERTICAL_BACKGROUNDS.food,
  TOPIC_VERTICAL_BACKGROUNDS.kaapi,
  TOPIC_VERTICAL_BACKGROUNDS.directions,
  TOPIC_VERTICAL_BACKGROUNDS.traffic,
  TOPIC_VERTICAL_BACKGROUNDS.shopping,
  TOPIC_VERTICAL_BACKGROUNDS.numbers,
  TOPIC_VERTICAL_BACKGROUNDS.family,
  TOPIC_VERTICAL_BACKGROUNDS.home,
  TOPIC_VERTICAL_BACKGROUNDS.office,
  TOPIC_VERTICAL_BACKGROUNDS.rain,
  TOPIC_VERTICAL_BACKGROUNDS.time,
  TOPIC_VERTICAL_BACKGROUNDS.opinions,
];

// Warm background image cache so flashcard decks open instantaneously
let preloadedFlashcardBgs = false;
function warmFlashcardImageCache() {
  if (preloadedFlashcardBgs || typeof window === "undefined") return;
  preloadedFlashcardBgs = true;
  // Immediate preload for the first 4 visible cards in the stack
  ALL_VERTICAL_BACKGROUNDS.slice(0, 4).forEach((src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  });
  // Idle preload for remaining topic backgrounds
  const schedule =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 120);
  schedule(() => {
    ALL_VERTICAL_BACKGROUNDS.slice(4).forEach((src) => {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  });
}

if (typeof window !== "undefined") {
  warmFlashcardImageCache();
}

const TOPIC_KANNADA_HEADERS: Record<
  string,
  { kannada: string; translit: string }
> = {
  greetings: {
    kannada: "ನಮಸ್ಕಾರ · ಹೇಗಿದ್ದೀರಾ?",
    translit: "Namaskara · Hegiddira?",
  },
  metro: {
    kannada: "ನಮ್ಮ ಮೆಟ್ರೋ · ಮುಂದಿನ ನಿಲ್ದಾಣ",
    translit: "Namma Metro · Mundina Nildana",
  },
  bus: {
    kannada: "ಬಿಎಂಟಿಸಿ ಬಸ್ · ಟಿಕೆಟ್ ಕೊಡಿ",
    translit: "BMTC Bus · Ticket Kodi",
  },
  rickshaw: {
    kannada: "ಅಣ್ಣ, ಮೀಟರ್ ಹಾಕಿ!",
    translit: "Anna, Meter Haaki!",
  },
  food: {
    kannada: "ಮಸಾಲೆ ದೋಸೆ · ಇಡ್ಲಿ ವಡೆ",
    translit: "Masale Dose · Idli Vade",
  },
  kaapi: {
    kannada: "ಸ್ಟ್ರಾಂಗ್ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ",
    translit: "Strong Filter Kaapi Kodi",
  },
  directions: {
    kannada: "ಎಡ · ಬಲ · ನೇರವಾಗಿ ಹೋಗಿ",
    translit: "Eda · Bala · Neravaagi Hogi",
  },
  traffic: {
    kannada: "ಸಿಗ್ನಲ್ ಹತ್ರ · ಫ್ಲೈಓವರ್ ಮೇಲೆ",
    translit: "Signal Hatra · Flyover Mele",
  },
  shopping: {
    kannada: "ಇದು ಎಷ್ಟು? · ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ",
    translit: "Idu Eshtu? · Swalpa Kammi Maadi",
  },
  numbers: {
    kannada: "ಒಂದು · ಎರಡು · ನೂರು ₹",
    translit: "Ondu · Eradu · Nooru ₹",
  },
  family: {
    kannada: "ಅಮ್ಮ · ಅಪ್ಪ · ಸ್ನೇಹಿತರು",
    translit: "Amma · Appa · Snehitharu",
  },
  home: {
    kannada: "ನಮ್ಮ ಮನೆ · ಗೇಟ್ ಹತ್ರ ಡೆಲಿವರಿ",
    translit: "Namma Mane · Gate Hatra Delivery",
  },
  office: {
    kannada: "ಆಫೀಸ್ ಮೀಟಿಂಗ್ · ಕೆಲಸ ಮಾಡಿ",
    translit: "Office Meeting · Kelasa Maadi",
  },
  rain: {
    kannada: "ಮಳೆ ಬಂತು! · ಕೊಡೆ ಇದೆಯಾ?",
    translit: "Male Banthu! · Kode Ideya?",
  },
  time: {
    kannada: "ಇವತ್ತು · ನಾಳೆ · ಎಷ್ಟು ಗಂಟೆ?",
    translit: "Ivattu · Naale · Eshtu Gante?",
  },
  opinions: {
    kannada: "ತುಂಬಾ ಇಷ್ಟ · ಸಕ್ಕತ್ ಆಗಿದೆ!",
    translit: "Tumba Ishta · Sakkath Aagide!",
  },
};

const DEFAULT_IMAGES = [
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.greetings,
    alt: "Greetings — Bengaluru Golden Hour",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.metro,
    alt: "Namma Metro — Elevated Bengaluru Metro Station",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.bus,
    alt: "BMTC Bus — Tree-Lined Bengaluru Avenue",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.rickshaw,
    alt: "Rickshaw — Bengaluru Auto Ride",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.food,
    alt: "Food — Masala Dosa & Darshini",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.kaapi,
    alt: "Filter Kaapi — Brass Davara & Tumbler",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.directions,
    alt: "Directions — Cubbon Park & Signpost",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.traffic,
    alt: "Traffic Signal — Silk Board & Flyover Dusk",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.shopping,
    alt: "Shopping — Bengaluru Street Bazaar",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.numbers,
    alt: "Numbers & Counting — Kannada Chalkboard & Abacus",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.family,
    alt: "Family — Traditional Bengaluru Veranda",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.home,
    alt: "Home & Delivery — Cozy Bengaluru Balcony",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.office,
    alt: "Office — Bengaluru Tech Park Courtyard",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.rain,
    alt: "Bengaluru Rain — Evening Monsoon Streetlamps",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.time,
    alt: "Time & Days — Twilight Lake & Clock Tower",
  },
  {
    src: TOPIC_VERTICAL_BACKGROUNDS.opinions,
    alt: "Opinions — Rooftop Chai Hangout",
  },
];

const TOPIC_DEFAULT_BADGE: Record<string, string> = {
  greetings: "👋 Greetings",
  metro: "🚇 Namma Metro",
  bus: "🚌 BMTC Bus",
  rickshaw: "🛺 Auto Rickshaw",
  food: "🍽️ Darshini Food",
  kaapi: "☕ Filter Kaapi",
  directions: "🧭 Navigation",
  traffic: "🚦 Traffic & Signals",
  shopping: "🛍️ Shopping & UPI",
  numbers: "🔢 Numbers & Count",
  family: "👨‍👩‍👧 Family & Friends",
  home: "🏠 Home & Delivery",
  office: "💻 Tech Park & Work",
  rain: "🌧️ Weather & Rain",
  time: "🕐 Time & Days",
  opinions: "❤️ Vibe & Opinions",
};

interface ContextualSceneRule {
  sceneKey: keyof typeof TOPIC_VERTICAL_BACKGROUNDS;
  badge: string;
  keywords: string[];
}

const CONTEXTUAL_SCENE_RULES: ContextualSceneRule[] = [
  {
    sceneKey: "metro",
    badge: "🚇 Namma Metro",
    keywords: [
      "metro",
      "ಮೆಟ್ರೋ",
      "purple line",
      "green line",
      "platform",
      "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್",
      "nildana",
      "ನಿಲ್ದಾಣ",
      "token",
      "ಟೋಕನ್",
    ],
  },
  {
    sceneKey: "bus",
    badge: "🚌 BMTC Bus",
    keywords: ["bus", "ಬಸ್", "bmtc", "conductor", "ಕಂಡಕ್ಟರ್", "bus stop"],
  },
  {
    sceneKey: "rickshaw",
    badge: "🛺 Auto Rickshaw",
    keywords: ["auto", "ಆಟೋ", "rickshaw", "meter", "ಮೀಟರ್", "bidthira"],
  },
  {
    sceneKey: "kaapi",
    badge: "☕ Filter Kaapi",
    keywords: ["kaapi", "coffee", "ಕಾಫಿ", "tea", "chai", "ಟೀ", "ಚಹಾ", "elaneeru"],
  },
  {
    sceneKey: "food",
    badge: "🍽️ Darshini Food",
    keywords: ["dosa", "dose", "ದೋಸೆ", "idli", "ಇಡ್ಲಿ", "vada", "oota", "ಊಟ"],
  },
  {
    sceneKey: "traffic",
    badge: "🚦 Traffic & Signals",
    keywords: ["traffic", "ಟ್ರಾಫಿಕ್", "signal", "ಸಿಗ್ನಲ್", "flyover", "u-turn"],
  },
  {
    sceneKey: "rain",
    badge: "🌧️ Weather & Rain",
    keywords: ["rain", "male", "ಮಳೆ", "umbrella", "chhatri", "kode"],
  },
  {
    sceneKey: "office",
    badge: "💻 Tech Park & Work",
    keywords: ["office", "ಆಫೀಸ್", "meeting", "ಮೀಟಿಂಗ್", "laptop", "kelasa"],
  },
  {
    sceneKey: "home",
    badge: "🏠 Home & Delivery",
    keywords: ["flat", "ಫ್ಲಾಟ್", "delivery", "ಡೆಲಿವರಿ", "water can", "security"],
  },
  {
    sceneKey: "shopping",
    badge: "🛍️ Shopping & UPI",
    keywords: ["upi", "chillare", "ಚಿಲ್ಲರೆ", "discount", "kammi", "angadi"],
  },
  {
    sceneKey: "numbers",
    badge: "🔢 Numbers & Count",
    keywords: [
      "ondu",
      "eradu",
      "mooru",
      "naalku",
      "aidu",
      "aaru",
      "elu",
      "entu",
      "tombattu",
      "ombattu",
      "hattu",
      "hatthu",
      "hannondondu",
      "hanneradu",
      "hadimooru",
      "hadinaalku",
      "hadinaidu",
      "hadinaaru",
      "hadinelu",
      "hadinentu",
      "hattombattu",
      "ippattu",
      "ippatthu",
      "mootu",
      "nalavattu",
      "aivattu",
      "nooru",
      "ಒಂದು",
      "ಎರಡು",
      "ಮೂರು",
      "ನಾಲ್ಕು",
      "ಐದು",
      "ಹತ್ತು",
      "ಇಪ್ಪತ್ತು",
      "ನೂರು",
    ],
  },
];

/**
 * Resolves the background image and badge for a flashcard.
 * - If the card is inside one of the 16 specific topic decks (`topicId` in `TOPIC_VERTICAL_BACKGROUNDS`),
 *   it ALWAYS uses that topic's dedicated background image so a topic never shows a mismatched background.
 * - If `topicId` is generic (e.g. "all"), it falls back to keyword matching.
 */
export function resolveFlashcardScene(
  card: StudyFlashcardItem,
  topicId: string
): { bgSrc: string; sceneBadge: string } {
  if (topicId && TOPIC_VERTICAL_BACKGROUNDS[topicId]) {
    return {
      bgSrc: TOPIC_VERTICAL_BACKGROUNDS[topicId],
      sceneBadge: TOPIC_DEFAULT_BADGE[topicId] || "✨ Bengaluru",
    };
  }

  const haystack = `${card.translit} ${card.meaning} ${card.kannada}`.toLowerCase();
  for (const rule of CONTEXTUAL_SCENE_RULES) {
    for (const kw of rule.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        return {
          bgSrc: TOPIC_VERTICAL_BACKGROUNDS[rule.sceneKey],
          sceneBadge: rule.badge,
        };
      }
    }
  }

  return {
    bgSrc: TOPIC_VERTICAL_BACKGROUNDS.greetings,
    sceneBadge: "👋 Greetings",
  };
}

const Skiper48 = ({ autoPlay = false }: { autoPlay?: boolean }) => {
  return (
    <div className="flex min-h-[460px] w-full items-center justify-center py-6">
      <Carousel_002 images={DEFAULT_IMAGES} loop autoplay={autoPlay} />
    </div>
  );
};

export { Skiper48 };
export default Skiper48;

const Carousel_002 = ({
  images = DEFAULT_IMAGES,
  className,
  showPagination = false,
  showNavigation = false,
  loop = true,
  autoplay = false,
  spaceBetween = 40,
}: {
  images?: { src: string; alt: string }[];
  className?: string;
  showPagination?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  spaceBetween?: number;
}) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const activeImages =
    Array.isArray(images) && images.length > 0 ? images : DEFAULT_IMAGES;

  useEffect(() => {
    if (!swiperRef.current) return;
    if (autoplay) {
      swiperRef.current.autoplay?.start();
    } else {
      swiperRef.current.autoplay?.stop();
    }
  }, [autoplay]);

  const css = `
  .Carousal_002 {
    padding-bottom: 50px !important;
  }
  `;

  return (
    <div
      className={cn(
        "relative w-full max-w-3xl flex justify-center items-center",
        className
      )}
    >
      <style>{css}</style>

      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          if (!autoplay) {
            swiper.autoplay?.stop();
          } else {
            swiper.autoplay?.start();
          }
        }}
        speed={200}
        spaceBetween={spaceBetween}
        autoplay={{
          delay: 1000,
          disableOnInteraction: false,
        }}
        effect="cards"
        grabCursor={true}
        loop={loop}
        pagination={
          showPagination
            ? {
                clickable: true,
              }
            : false
        }
        navigation={
          showNavigation
            ? {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
              }
            : false
        }
        className="Carousal_002 h-[380px] w-[260px]"
        modules={[EffectCards, Autoplay, Pagination, Navigation]}
      >
        {activeImages.map((image, index) => (
          <SwiperSlide
            key={index}
            className="!w-[260px] !h-[380px] overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl"
          >
            <img
              className="h-full w-full object-cover select-none"
              src={image.src || undefined}
              alt={image.alt || ""}
              referrerPolicy="no-referrer"
            />
          </SwiperSlide>
        ))}
        {showNavigation && (
          <div>
            <div className="swiper-button-next after:hidden">
              <ChevronRightIcon className="h-6 w-6 text-white" />
            </div>
            <div className="swiper-button-prev after:hidden">
              <ChevronLeftIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
      </Swiper>
    </div>
  );
};

export { Carousel_002 };

export interface FlashcardTopicCarouselItem {
  id: string;
  title: string;
  icon: string;
  description: string;
  cardCount: number;
  seenCount: number;
  isAvailable: boolean;
}

interface FlashcardTopicCarouselProps {
  topics: FlashcardTopicCarouselItem[];
  onSelectTopic: (topicId: string) => void;
}

/**
 * Interactive vertical EffectCards Swiper Carousel for the Flashcard Topic decks.
 * Full-bleed vertical illustrated background images (260px x 380px) with:
 * - Upper side: Kannada script + Kanglish header
 * - Bottom side: English topic title, description & Start CTA
 */
export const FlashcardTopicCarousel: React.FC<FlashcardTopicCarouselProps> = ({
  topics,
  onSelectTopic,
}) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    dragged: boolean;
  }>({ isDown: false, startX: 0, scrollLeft: 0, dragged: false });

  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    if (!swiperRef.current) return;
    if (autoplay) {
      swiperRef.current.autoplay?.start();
    } else {
      swiperRef.current.autoplay?.stop();
    }
  }, [autoplay]);

  // Keep active topic pill scrolled into view horizontally
  useEffect(() => {
    const strip = stripRef.current;
    const pill = pillRefs.current[activeIndex];
    if (!strip || !pill) return;
    const targetLeft =
      pill.offsetLeft - strip.clientWidth / 2 + pill.clientWidth / 2;
    strip.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }, [activeIndex]);

  const activeTopicItem = topics[activeIndex] || topics[0];

  const handleSelectTopicIndex = (idx: number) => {
    setActiveIndex(idx);
    if (swiperRef.current) {
      if (swiperRef.current.params.loop) {
        swiperRef.current.slideToLoop(idx, 180);
      } else {
        swiperRef.current.slideTo(idx, 180);
      }
    }
  };

  const handleScrollStripRight = () => {
    const nextIdx = (activeIndex + 1) % Math.max(1, topics.length);
    handleSelectTopicIndex(nextIdx);
  };

  const css = `
  .Carousal_002 {
    padding-bottom: 44px !important;
  }
  .Carousal_002 .swiper-pagination-bullet {
    background: var(--accent);
    opacity: 0.35;
  }
  .Carousal_002 .swiper-pagination-bullet-active {
    opacity: 1;
    transform: scale(1.2);
  }
  `;

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Topic Quick-Jump Strip + Scroll / Autoplay controls */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <div
          ref={stripRef}
          onWheel={(e) => {
            if (!stripRef.current) return;
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              stripRef.current.scrollLeft += e.deltaY;
            }
          }}
          onMouseDown={(e) => {
            if (!stripRef.current) return;
            dragStateRef.current = {
              isDown: true,
              startX: e.pageX - stripRef.current.offsetLeft,
              scrollLeft: stripRef.current.scrollLeft,
              dragged: false,
            };
          }}
          onMouseMove={(e) => {
            const st = dragStateRef.current;
            if (!st.isDown || !stripRef.current) return;
            const x = e.pageX - stripRef.current.offsetLeft;
            const walk = x - st.startX;
            if (Math.abs(walk) > 6) {
              st.dragged = true;
              stripRef.current.scrollLeft = st.scrollLeft - walk;
            }
          }}
          onMouseUp={() => {
            dragStateRef.current.isDown = false;
          }}
          onMouseLeave={() => {
            dragStateRef.current.isDown = false;
          }}
          style={{ WebkitOverflowScrolling: "touch" }}
          className="min-w-0 flex-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar py-2 px-1 touch-pan-x overscroll-x-contain select-none"
        >
          {topics.map((t, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  pillRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => {
                  if (dragStateRef.current.dragged) {
                    dragStateRef.current.dragged = false;
                    return;
                  }
                  handleSelectTopicIndex(idx);
                }}
                className={cn(
                  "min-h-[48px] sm:min-h-[52px] px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border inline-flex items-center gap-2 touch-pan-x",
                  isActive
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_4px_12px_rgba(108,92,231,0.28)] scale-[1.02]"
                    : "bg-white/95 text-[var(--ink)] border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] shadow-2xs"
                )}
              >
                <span className="text-base sm:text-lg leading-none">{t.icon}</span>
                <span>{t.title}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleScrollStripRight}
          title="Next topic"
          aria-label="Scroll to next topic"
          className="min-h-[48px] sm:min-h-[52px] px-3.5 sm:px-4 py-3 rounded-2xl text-xs sm:text-sm font-mono-accent font-bold inline-flex items-center justify-center gap-1.5 border shrink-0 cursor-pointer transition-all bg-white/95 text-[var(--ink)] border-[var(--line)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95 shadow-2xs touch-manipulation"
        >
          <Play className="w-4 h-4 fill-current text-[var(--accent)]" />
          <span className="hidden sm:inline">Next</span>
        </button>

        <button
          type="button"
          onClick={() => setAutoplay((prev) => !prev)}
          className={cn(
            "hidden md:inline-flex min-h-[48px] sm:min-h-[52px] px-4 py-3 rounded-2xl text-xs font-mono-accent font-semibold items-center gap-1.5 border shrink-0 cursor-pointer transition-colors touch-manipulation",
            autoplay
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "bg-white/95 text-[var(--muted)] border-[var(--line)] hover:border-[var(--accent)]"
          )}
          aria-label={autoplay ? "Pause card autoplay" : "Start card autoplay"}
        >
          {autoplay ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{autoplay ? "Auto" : "Play"}</span>
        </button>
      </div>

      {/* Main Interactive EffectCards Vertical Carousel (260px x 380px) */}
      <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center justify-center py-2">
        <style>{css}</style>

        <div className="relative w-full flex items-center justify-center">
          {/* Previous Card Button */}
          <button
            type="button"
            onClick={() => swiperRef.current?.slidePrev(180)}
            aria-label="Previous topic card"
            className="hidden sm:flex w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--ink)] items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 z-20 mr-6"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          <Swiper
            onSwiper={(swiper) => {
              swiperRef.current = swiper;
              if (!autoplay) {
                swiper.autoplay?.stop();
              } else {
                swiper.autoplay?.start();
              }
            }}
            onSlideChange={(swiper) => {
              setActiveIndex(swiper.realIndex);
              playTactileTone("flip");
            }}
            speed={160}
            spaceBetween={40}
            preventClicks={false}
            preventClicksPropagation={false}
            autoplay={{
              delay: 1000,
              disableOnInteraction: false,
            }}
            effect="cards"
            grabCursor={true}
            loop={false}
            pagination={{
              clickable: true,
            }}
            className="Carousal_002 h-[380px] w-[260px]"
            modules={[EffectCards, Autoplay, Pagination, Navigation]}
          >
            {topics.map((topic, index) => {
              const knHeader = TOPIC_KANNADA_HEADERS[topic.id] || {
                kannada: "ಕನ್ನಡ ಪದಗಳು",
                translit: "Kannada Padagalu",
              };
              const bgImageSrc =
                TOPIC_VERTICAL_BACKGROUNDS[topic.id] ||
                ALL_VERTICAL_BACKGROUNDS[index % ALL_VERTICAL_BACKGROUNDS.length];
              const isNearActive = Math.abs(index - activeIndex) <= 3;

              return (
                <SwiperSlide
                  key={topic.id}
                  style={{
                    background:
                      TOPIC_INSTANT_GRADIENTS[topic.id] ||
                      TOPIC_INSTANT_GRADIENTS.greetings,
                  }}
                  className="!w-[260px] !h-[380px] overflow-hidden rounded-3xl bg-neutral-900 border border-white/15 shadow-2xl select-none"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (topic.isAvailable) {
                        onSelectTopic(topic.id);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" || e.key === " ") &&
                        topic.isAvailable
                      ) {
                        e.preventDefault();
                        onSelectTopic(topic.id);
                      }
                    }}
                    className={cn(
                      "group relative w-full h-full p-4 flex flex-col justify-between text-left overflow-hidden",
                      topic.isAvailable
                        ? "cursor-pointer"
                        : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {/* Full-Bleed Vertical Background Artwork */}
                    <img
                      src={bgImageSrc}
                      alt={topic.title}
                      decoding="async"
                      loading={isNearActive ? "eager" : "lazy"}
                      fetchPriority={index === activeIndex ? "high" : "auto"}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Subtle Top & Bottom Atmospheric Gradient Scrim */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/10 to-black/70 pointer-events-none"
                    />

                    {/* UPPER SIDE: Kannada Script + Kanglish Header */}
                    <div className="relative z-10 rounded-2xl bg-neutral-950/75 border border-white/20 p-3 space-y-1 shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <span className="mono-label !text-[9px] text-amber-300">
                          {TOPIC_DEFAULT_BADGE[topic.id] || "ಕನ್ನಡ · KANNADA"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-mono-accent font-semibold text-white">
                          {topic.cardCount} cards
                        </span>
                      </div>
                      <p className="font-kannada font-bold text-base text-white leading-snug truncate">
                        {knHeader.kannada}
                      </p>
                      <p className="text-[11px] font-display font-semibold text-white/80 truncate">
                        {knHeader.translit}
                      </p>
                    </div>

                    {/* BOTTOM SIDE: English Title, Description & Action */}
                    <div className="relative z-10 mt-auto rounded-2xl bg-neutral-950/80 border border-white/20 p-3.5 space-y-2 shadow-lg">
                      <div>
                        <span className="mono-label !text-[9px] text-emerald-300 block">
                          ENGLISH · DECK {index + 1} OF {topics.length}
                        </span>
                        <h3 className="font-display font-bold text-lg text-white leading-tight mt-0.5 flex items-center gap-1.5">
                          <span>{topic.icon}</span>
                          <span>{topic.title}</span>
                        </h3>
                        <p className="text-xs text-white/80 line-clamp-2 mt-0.5 leading-snug">
                          {topic.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs">
                        {topic.seenCount > 0 ? (
                          <span className="font-mono-accent text-white/75 text-[11px]">
                            ✓ {topic.seenCount} seen
                          </span>
                        ) : (
                          <span className="font-mono-accent text-white/75 text-[11px]">
                            New deck
                          </span>
                        )}
                        <span className="font-display font-bold text-xs text-amber-300 group-hover:translate-x-0.5 transition-transform">
                          Start 10 Cards →
                        </span>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Next Card Button */}
          <button
            type="button"
            onClick={() => swiperRef.current?.slideNext(160)}
            aria-label="Next topic card"
            className="hidden sm:flex w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--ink)] items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 z-20 ml-6"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile Bottom Controls + Active Deck CTA */}
        {activeTopicItem && (
          <div className="mt-1 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => swiperRef.current?.slidePrev(160)}
              aria-label="Previous topic"
              className="sm:hidden w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] cursor-pointer"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={!activeTopicItem.isAvailable}
              onClick={() => onSelectTopic(activeTopicItem.id)}
              className="btn-primary !py-2.5 !px-6 !text-xs"
            >
              <span>
                Practice {activeTopicItem.title} (10 Cards) →
              </span>
            </button>

            <button
              type="button"
              onClick={() => swiperRef.current?.slideNext(160)}
              aria-label="Next topic"
              className="sm:hidden w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)] cursor-pointer"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export interface StudyFlashcardItem {
  id: string;
  kannada: string;
  translit: string;
  meaning: string;
}

interface FlashcardStudyCarouselProps {
  topicId: string;
  topicTitle: string;
  cards: StudyFlashcardItem[];
  currentIndex: number;
  activeTtsItemId: string | null;
  onIndexChange: (nextIndex: number) => void;
  onPlayAudio: (itemId: string, kannadaScript: string) => void;
  onBackToTopics: () => void;
  onFinishDeck: () => void;
}

/**
 * Interactive vertical EffectCards Swiper Carousel for the 10-card study session.
 * Full-bleed topic-matched vertical background image on every card (260px x 380px) with NO flip:
 * - Upper side: Kannada script + Kanglish pronunciation + Audio button + Scene badge
 * - Bottom side: English translation meaning
 */
export const FlashcardStudyCarousel: React.FC<FlashcardStudyCarouselProps> = ({
  topicId,
  topicTitle,
  cards,
  currentIndex,
  activeTtsItemId,
  onIndexChange,
  onPlayAudio,
  onBackToTopics,
  onFinishDeck,
}) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const activeCard = cards[currentIndex] || cards[0];

  useEffect(() => {
    if (
      swiperRef.current &&
      swiperRef.current.activeIndex !== currentIndex
    ) {
      swiperRef.current.slideTo(currentIndex, 160);
    }
  }, [currentIndex]);

  const css = `
  .Carousal_002_Study {
    padding-bottom: 36px !important;
  }
  .Carousal_002_Study .swiper-pagination-bullet {
    background: var(--accent);
    opacity: 0.35;
  }
  .Carousal_002_Study .swiper-pagination-bullet-active {
    opacity: 1;
    transform: scale(1.2);
  }
  `;

  if (!activeCard) return null;

  return (
    <div className="glass-strong p-5 sm:p-7 space-y-4">
      <style>{css}</style>

      {/* Header: Back to topics + Card index + Audio replay */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToTopics}
          className="text-xs font-mono-accent text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Topics</span>
        </button>

        <span className="mono-label text-[var(--accent2)]">
          {topicTitle} · CARD {currentIndex + 1} OF {cards.length}
        </span>

        <button
          type="button"
          onClick={() => onPlayAudio(activeCard.id, activeCard.kannada)}
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer",
            activeTtsItemId === activeCard.id
              ? "bg-[var(--accent)] text-white animate-pulse shadow-sm"
              : "bg-[var(--surface-warm)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          )}
          aria-label="Listen audio"
        >
          <Volume2
            className={cn(
              "w-4 h-4",
              activeTtsItemId === activeCard.id && "fill-current"
            )}
          />
        </button>
      </div>

      {/* Vertical Stacked Cards Carousel (260px x 380px) — Full-Bleed Topic-Matched Background, No Flip */}
      <div className="relative w-full flex items-center justify-center py-2">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => swiperRef.current?.slidePrev(160)}
          aria-label="Previous flashcard"
          className="hidden sm:flex w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--ink)] items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-35 disabled:pointer-events-none z-20 mr-6"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>

        <Swiper
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            if (swiper.activeIndex !== currentIndex) {
              playTactileTone("flip");
              onIndexChange(swiper.activeIndex);
            }
          }}
          speed={160}
          spaceBetween={40}
          preventClicks={false}
          preventClicksPropagation={false}
          effect="cards"
          grabCursor={true}
          loop={false}
          pagination={{
            clickable: true,
          }}
          className="Carousal_002_Study h-[380px] w-[260px]"
          modules={[EffectCards, Pagination, Navigation]}
        >
          {cards.map((card, idx) => {
            const isSpeakingThis = activeTtsItemId === card.id;
            const { bgSrc: slideBgSrc, sceneBadge } = resolveFlashcardScene(
              card,
              topicId
            );

            return (
              <SwiperSlide
                key={card.id}
                style={{
                  background:
                    TOPIC_INSTANT_GRADIENTS[topicId] ||
                    TOPIC_INSTANT_GRADIENTS.greetings,
                }}
                className="!w-[260px] !h-[380px] overflow-hidden rounded-3xl bg-neutral-900 border border-white/15 shadow-2xl select-none"
              >
                <div
                  onClick={() => onPlayAudio(card.id, card.kannada)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onPlayAudio(card.id, card.kannada);
                    }
                  }}
                  aria-label={`${card.translit} — ${card.meaning}. Tap to listen in Kannada`}
                  className="relative w-[260px] h-[380px] p-4 flex flex-col justify-between text-center cursor-pointer overflow-hidden"
                >
                  {/* Full-Bleed Topic-Matched Vertical Background Artwork */}
                  <img
                    src={slideBgSrc}
                    alt={sceneBadge}
                    decoding="async"
                    loading="eager"
                    fetchPriority={idx === currentIndex ? "high" : "auto"}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
                  />

                  {/* Subtle Top & Bottom Atmospheric Gradient Scrim */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/15 to-black/75 pointer-events-none"
                  />

                  {/* ======================================================= */}
                  {/* UPPER SIDE: KANNADA SCRIPT + KANGLISH PRONUNCIATION     */}
                  {/* ======================================================= */}
                  <div className="relative z-10 rounded-2xl bg-neutral-950/75 border border-white/20 p-3.5 space-y-2 shadow-md">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/35 text-[10px] font-display font-bold text-amber-200 truncate">
                        {sceneBadge}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-mono-accent text-white shrink-0">
                        #{idx + 1}/{cards.length}
                      </span>
                    </div>

                    {/* Kannada Script */}
                    <p className="font-kannada font-bold text-xl sm:text-2xl text-white leading-snug break-words">
                      {card.kannada}
                    </p>

                    {/* Kanglish Romanization */}
                    <p className="font-display font-bold text-sm text-amber-200 leading-snug break-words">
                      {card.translit}
                    </p>

                    {/* Audio Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayAudio(card.id, card.kannada);
                      }}
                      className={cn(
                        "mx-auto px-3 py-1 rounded-full border text-xs font-mono-accent font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer",
                        isSpeakingThis
                          ? "bg-[var(--accent)] text-white border-white animate-pulse"
                          : "bg-white/15 border-white/30 text-white hover:bg-white/25"
                      )}
                    >
                      <Volume2 className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                      <span>TAP AUDIO</span>
                    </button>
                  </div>

                  {/* ======================================================= */}
                  {/* BOTTOM SIDE: ENGLISH MEANING (ALWAYS VISIBLE, NO FLIP)  */}
                  {/* ======================================================= */}
                  <div className="relative z-10 rounded-2xl bg-neutral-950/80 border border-white/25 p-3.5 space-y-1 shadow-lg">
                    <span className="mono-label text-emerald-300 !text-[10px] block">
                      ENGLISH MEANING
                    </span>
                    <p className="font-display font-bold text-base sm:text-lg text-white leading-snug break-words">
                      {card.meaning}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>

        <button
          type="button"
          onClick={() => {
            if (currentIndex + 1 < cards.length) {
              swiperRef.current?.slideNext(180);
            } else {
              onFinishDeck();
            }
          }}
          aria-label="Next flashcard"
          className="hidden sm:flex w-11 h-11 rounded-full bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--ink)] items-center justify-center shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 z-20 ml-6"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom Navigation Bar synced with Swiper */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => {
            if (currentIndex > 0) {
              swiperRef.current?.slidePrev(180);
            }
          }}
          className="btn-ghost !py-2.5 !px-5 !text-xs disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={() => onPlayAudio(activeCard.id, activeCard.kannada)}
          className="px-3.5 py-2 rounded-xl bg-[var(--surface-warm)] border border-[var(--line)] hover:border-[var(--accent)] text-xs font-mono-accent font-semibold text-[var(--accent)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (currentIndex + 1 < cards.length) {
              swiperRef.current?.slideNext(180);
            } else {
              onFinishDeck();
            }
          }}
          className="btn-primary !py-2.5 !px-6 !text-xs"
        >
          <span>{currentIndex + 1 < cards.length ? "Next" : "Finish"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
