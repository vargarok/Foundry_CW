export const CW = {};

CW.attributes = {
  physical: ["str", "dex", "sta"],
  social: ["cha", "soc", "app"],
  mental: ["int", "edu", "wit"]
};

CW.defaultSkills = {
  athletics: { label: "Athletics", attr: "str" },
  awareness: { label: "Awareness", attr: "wit" },
  brawl: { label: "Brawl", attr: "str" },
  firearms: { label: "Firearms", attr: "dex" },
  stealth: { label: "Stealth", attr: "dex" },
  technology: { label: "Technology", attr: "int" },
  piloting: { label: "Piloting", attr: "dex" },
  persuasion: { label: "Persuasion", attr: "cha" },
  medicine: { label: "Medicine", attr: "int" },
  survival: { label: "Survival", attr: "wit" }
};