import DE from "./languages/DE.json";
import { userLangToTranslateCode } from "./LanguageSelector";

const languages: { [key: string]: { [key: string]: string } } = {
  DE,
};

const userLang = navigator.language;

const translate = (
  key: string,
  language: string = userLangToTranslateCode(
    localStorage.getItem("language") ?? userLang
  )
): string => {
  const langCode = userLangToTranslateCode(language);
  if (langCode === "EN") return key; // Return the key itself for English
  return languages[langCode]?.[key] || key;
};

export default translate;
