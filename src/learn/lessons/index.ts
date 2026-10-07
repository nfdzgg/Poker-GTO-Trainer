import type { ComponentType } from 'react';
import { Facing3betLesson } from './Facing3bet';
import { FacingOpenLesson } from './FacingOpen';
import { HandsLesson } from './Hands';
import { MoneyLesson } from './Money';
import { OpeningLesson } from './Opening';
import { PostflopLesson } from './Postflop';
import { PracticeLesson } from './Practice';
import { TableLesson } from './Table';
import { ValueBluffsLesson } from './ValueBluffs';
import { WelcomeLesson } from './Welcome';

/** Content component for each lesson id. */
export const LESSON_CONTENT: Record<string, ComponentType> = {
  welcome: WelcomeLesson,
  table: TableLesson,
  hands: HandsLesson,
  money: MoneyLesson,
  opening: OpeningLesson,
  'facing-open': FacingOpenLesson,
  'value-bluffs': ValueBluffsLesson,
  'facing-3bet': Facing3betLesson,
  practice: PracticeLesson,
  postflop: PostflopLesson,
};
