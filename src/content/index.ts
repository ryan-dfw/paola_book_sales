import type { Locale } from '../types';
import type { LocaleContent } from './types';
import { en } from './en';
import { es } from './es';

export const CONTENT: Record<Locale, LocaleContent> = { en, es };

export type { LocaleContent, ManualMethodLabels } from './types';
