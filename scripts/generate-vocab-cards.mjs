#!/usr/bin/env node
/**
 * Batch static vocabulary preview card generator & WebP optimizer.
 *
 * Prompt template (per B2):
 *   "Flat vector editorial illustration, warm South Indian palette (terracotta,
 *   turmeric yellow, leaf green, warm cream background), clean geometric shapes,
 *   friendly characters, scene depicting: {lesson.visualTheme}. ABSOLUTELY NO TEXT,
 *   NO LETTERS, NO NUMBERS, NO SIGNS, NO LABELS, NO WATERMARKS anywhere in the
 *   image. Aspect ratio 16:9."
 *
 * Output:
 *   public/vocab-cards/{lessonId}.webp (1200x675, <= 120 KB each)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const SRC_IMAGES_DIR = path.join(ROOT_DIR, 'src', 'assets', 'images');
const OUT_DIR = path.join(ROOT_DIR, 'public', 'vocab-cards');
const MAX_BYTES = 120 * 1024; // 120 KB

const LESSONS = [
  {
    id: 'u1_l1',
    visualTheme:
      'two friendly neighbors greeting each other with folded hands on a sunny tree-lined Bengaluru street',
  },
  {
    id: 'u1_l2',
    visualTheme:
      'two young friends chatting at an outdoor garden cafe table surrounded by potted plants',
  },
  {
    id: 'u1_l3',
    visualTheme:
      'a cheerful fruit vendor arranging ripe yellow mangoes and green coconuts in woven baskets',
  },
  {
    id: 'u1_l4',
    visualTheme:
      'a smiling shopkeeper handing a small parcel across a warm wooden counter',
  },
  {
    id: 'u1_l5',
    visualTheme:
      'two travelers walking along a shaded park pathway with flowering bougainvillea arches',
  },
  {
    id: 'u2_l1',
    visualTheme:
      'crispy golden masala dosa on a green banana leaf beside a brass tumbler of steaming filter coffee',
  },
  {
    id: 'u2_l2',
    visualTheme:
      'colorful vegetable baskets and marigold garlands at a lively morning market stall',
  },
  {
    id: 'u3_l1',
    visualTheme:
      'a green and yellow auto rickshaw driving along a sunny tree-lined avenue in Bengaluru',
  },
  {
    id: 'u4_l1',
    visualTheme:
      'gentle evening rain falling over warm glowing streetlights and lush green banyan trees',
  },
  {
    id: 'u5_l1',
    visualTheme:
      'colleagues smiling and conversing on a sunlit rooftop garden overlooking city trees',
  },
];

export function buildImagePrompt(visualTheme) {
  return `Flat vector editorial illustration, warm South Indian palette (terracotta, turmeric yellow, leaf green, warm cream background), clean geometric shapes, friendly characters, scene depicting: ${visualTheme}. ABSOLUTELY NO TEXT, NO LETTERS, NO NUMBERS, NO SIGNS, NO LABELS, NO WATERMARKS anywhere in the image. Aspect ratio 16:9.`;
}

function findSourceImageForLesson(lessonId) {
  if (!fs.existsSync(SRC_IMAGES_DIR)) return null;
  const files = fs.readdirSync(SRC_IMAGES_DIR);
  const match = files.find(
    (f) =>
      f.startsWith(`vocab_${lessonId}_`) &&
      (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'))
  );
  return match ? path.join(SRC_IMAGES_DIR, match) : null;
}

function convertToWebpUnder120KB(inputPath, outputPath) {
  const qualities = [78, 70, 62, 54, 46, 38];
  for (const q of qualities) {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-i',
        inputPath,
        '-vf',
        'scale=1200:675:force_original_aspect_ratio=increase,crop=1200:675',
        '-c:v',
        'libwebp',
        '-quality',
        String(q),
        '-compression_level',
        '6',
        outputPath,
      ],
      { stdio: 'inherit' }
    );
    const stat = fs.statSync(outputPath);
    if (stat.size <= MAX_BYTES) {
      return { sizeBytes: stat.size, quality: q };
    }
  }
  const finalStat = fs.statSync(outputPath);
  return { sizeBytes: finalStat.size, quality: qualities[qualities.length - 1] };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const lesson of LESSONS) {
    const srcPath = findSourceImageForLesson(lesson.id);
    if (!srcPath) {
      throw new Error(
        `Missing source illustration for ${lesson.id} in ${SRC_IMAGES_DIR}`
      );
    }
    const outPath = path.join(OUT_DIR, `${lesson.id}.webp`);
    const { sizeBytes, quality } = convertToWebpUnder120KB(srcPath, outPath);
    const kb = (sizeBytes / 1024).toFixed(1);
    console.log(
      `[vocab-card] ${lesson.id}.webp -> 1200x675, ${kb} KB (q=${quality})`
    );
  }
}

main();
