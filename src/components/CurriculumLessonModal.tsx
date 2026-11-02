import React from 'react';
import { Unit, Level, Lesson } from '../data/courseData';
import { LessonSessionEngine } from './LessonSessionEngine';

interface CurriculumLessonModalProps {
  unit: Unit;
  level: Level;
  lesson: Lesson;
  onClose: () => void;
  onComplete: (lessonId: string, earnedXp: number) => void;
}

export const CurriculumLessonModal: React.FC<CurriculumLessonModalProps> = ({
  unit,
  level,
  lesson,
  onClose,
  onComplete,
}) => {
  const lessonIndex = Math.max(
    0,
    level.lessons.findIndex((l) => l.id === lesson.id)
  );

  return (
    <LessonSessionEngine
      unitId={unit.id}
      levelId={level.id}
      lessonIndex={lessonIndex}
      onExit={onClose}
      onLessonCompleted={onComplete}
    />
  );
};
