import { en } from './en';
import { es } from './es';
import type { LocaleContent, UiLocale } from './types';

export const CONTENT: Record<UiLocale, LocaleContent> = { en, es };

export type { LocaleContent, ManualMethodLabels, UiLocale } from './types';
