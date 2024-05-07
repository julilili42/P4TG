import DE from "./languages/DE.json";
import EN from "./languages/EN.json";
import { userLangToTranslateCode } from "./LanguageSelector";

type LanguagePack = Record<string, string>;

const languages: Record<string, LanguagePack> = {
  DE,
  EN,
};

const userLang = navigator.language;

const translate = (
  key: string,
  language: string = userLangToTranslateCode(
    localStorage.getItem("language") ?? userLang
  )
): string => {
  return languages[userLangToTranslateCode(language)][key] || key;
};

export default translate;
