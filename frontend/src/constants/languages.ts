export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
];

export const PROFICIENCY_LEVELS = [
  "Beginner",
  "Elementary",
  "Intermediate",
  "Advanced",
  "Fluent",
];

const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));

// language code -> circle flag country code (hatscripts circle-flags CDN)
const FLAG_COUNTRY: Record<string, string> = {
  en: "gb",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "br",
  zh: "cn",
  ja: "jp",
  ko: "kr",
  ru: "ru",
  ar: "sa",
  hi: "in",
  tr: "tr",
  nl: "nl",
  pl: "pl",
  sv: "se",
  vi: "vn",
  th: "th",
  id: "id",
  el: "gr",
};

export const flagUrl = (code?: string | null): string =>
  `https://hatscripts.github.io/circle-flags/flags/${
    (code && FLAG_COUNTRY[code]) || "xx"
  }.svg`;

export const langName = (code?: string | null): string =>
  (code && byCode[code]?.name) || code || "?";

export const langFlag = (code?: string | null): string =>
  (code && byCode[code]?.flag) || "🌐";
