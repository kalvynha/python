/**
 * Skill taxonomy shared by seeds, session generator, and SRS queue.
 *
 * Difficulty level 0–10 maps roughly to US grades K–4 complexity, but we
 * keep it grade-agnostic: the adaptive engine moves a kid up/down levels
 * based on performance, not age.
 */

export type MathSkillTag =
  | "add_within_10"
  | "add_within_20"
  | "sub_within_10"
  | "sub_within_20"
  | "add_2digit_no_regroup"
  | "add_2digit_regroup"
  | "sub_2digit_regroup"
  | "mul_by_2_5_10"
  | "mul_facts_0_5"
  | "mul_facts_6_9"
  | "div_facts_basic"
  | "fractions_halves_quarters";

export type SpellingSkillTag =
  | "cvc_short_a"
  | "cvc_short_e"
  | "cvc_short_i"
  | "cvc_short_o"
  | "cvc_short_u"
  | "digraphs_sh_ch_th"
  | "long_a_cvce"
  | "long_i_cvce"
  | "long_o_cvce"
  | "r_controlled_ar_or"
  | "vowel_teams_ee_ea"
  | "ie_vs_ei"
  | "silent_letters"
  | "common_sight_words";

export type SkillTag = MathSkillTag | SpellingSkillTag;

export type SkillDomain = "math" | "spelling";

export interface SkillDef {
  tag: SkillTag;
  domain: SkillDomain;
  name: string;
  difficulty: number; // 0–10
  description: string;
}
