// Tag-based article recommendation engine. Matches the user's record tags
// against article.targetConditions to surface personalised articles first.

import type { ArticleRef, MedicalRecord } from './types'

export const ARTICLES: ArticleRef[] = [
  {
    id: 'a1',
    title: 'Top 3 Foods to Limit if You Have Type 2 Diabetes',
    description: 'Refined carbs, sugary drinks, and ultra-processed snacks — and what to swap them for.',
    url: 'https://www.mayoclinic.org/diseases-conditions/diabetes/in-depth/diabetes-diet/art-20044295',
    source: 'Mayo Clinic',
    tag: 'Nutrition',
    targetConditions: ['diabetes', 'type2-diabetes'],
  },
  {
    id: 'a2',
    title: 'How Walking After Meals Lowers Blood Sugar',
    description: 'A 10–15 minute post-meal walk can blunt post-prandial glucose spikes by up to 30%.',
    url: 'https://medlineplus.gov/diabetesmedicines.html',
    source: 'MedlinePlus',
    tag: 'Lifestyle',
    targetConditions: ['diabetes'],
  },
  {
    id: 'a3',
    title: 'The DASH Diet Explained',
    description: 'A step-by-step guide to the eating pattern most strongly linked to lower blood pressure.',
    url: 'https://www.nhlbi.nih.gov/education/dash-eating-plan',
    source: 'NHLBI',
    tag: 'Heart Health',
    targetConditions: ['hypertension', 'heart', 'cardio'],
  },
  {
    id: 'a4',
    title: 'Home Blood Pressure Monitoring: How to Get It Right',
    description: 'Cuff size, arm position, timing — small things that make your readings trustworthy.',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
    source: 'American Heart Association',
    tag: 'Heart Health',
    targetConditions: ['hypertension', 'vitals'],
  },
  {
    id: 'a5',
    title: 'Understanding Your Cholesterol Numbers',
    description: 'What LDL, HDL, and triglycerides mean and which numbers matter most for you.',
    url: 'https://www.cdc.gov/cholesterol/about.html',
    source: 'CDC',
    tag: 'Heart Health',
    targetConditions: ['cholesterol', 'lipids', 'cardio'],
  },
  {
    id: 'a6',
    title: 'Spotting Hypoglycemia Early',
    description: 'The subtle warning signs of low blood sugar and how to respond in the moment.',
    url: 'https://www.cdc.gov/diabetes/basics/low-blood-sugar.html',
    source: 'CDC',
    tag: 'Diabetes',
    targetConditions: ['diabetes', 'hba1c'],
  },
  {
    id: 'a7',
    title: 'Medication Safety: Avoiding Interactions',
    description: 'How to build a single trusted medication list and the flags to watch for.',
    url: 'https://medlineplus.gov/druginformation.html',
    source: 'MedlinePlus',
    tag: 'Medications',
    targetConditions: ['medication', 'allergy'],
  },
  {
    id: 'a8',
    title: '7-Day Low-Sodium Meal Planner',
    description: 'Simple swaps that bring daily sodium under 2,300 mg without sacrificing flavour.',
    url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-to-reduce-sodium',
    source: 'American Heart Association',
    tag: 'Nutrition',
    targetConditions: ['hypertension', 'heart'],
  },
  {
    id: 'a9',
    title: 'Sleep and Your Health: Why 7+ Hours Matter',
    description: 'Sleep\u2019s overlooked effect on glucose control, blood pressure, and immunity.',
    url: 'https://www.cdc.gov/sleep/about_sleep/how_much_sleep.html',
    source: 'CDC',
    tag: 'Lifestyle',
    targetConditions: ['diabetes', 'hypertension', 'general'],
  },
  {
    id: 'a10',
    title: 'Reading Nutrition Labels: The Basics',
    description: 'Carbs, added sugars, sodium — what to look at first if you\u2019re managing a chronic condition.',
    url: 'https://www.fda.gov/food/new-nutrition-facts-label/how-understand-and-use-nutrition-facts-label',
    source: 'FDA',
    tag: 'Nutrition',
    targetConditions: ['diabetes', 'hypertension', 'general'],
  },
  {
    id: 'a11',
    title: 'Beginner\u2019s Guide to Meditation and Stress Reduction',
    description: 'Short, evidence-based techniques to lower cortisol and blood pressure.',
    url: 'https://www.nccih.nih.gov/health/meditation-and-mindfulness-what-you-need-to-know',
    source: 'NIH',
    tag: 'Mental Health',
    targetConditions: ['hypertension', 'general'],
  },
  {
    id: 'a12',
    title: 'Preventive Care Schedule: What to Screen and When',
    description: 'Age- and condition-specific screening timelines that catch issues early.',
    url: 'https://www.cdc.gov/prevention/index.html',
    source: 'CDC',
    tag: 'Prevention',
    targetConditions: ['general'],
  },
]

export function rankArticles(records: MedicalRecord[]): ArticleRef[] {
  const userTags = new Set(records.flatMap((r) => r.tags))
  if (userTags.size === 0) return ARTICLES.slice(0, 6)
  const scored = ARTICLES.map((a) => {
    const hits = a.targetConditions.filter((t) => userTags.has(t)).length
    const generalHit = a.targetConditions.includes('general') ? 0.3 : 0
    return { a, score: hits + generalHit }
  })
  scored.sort((x, y) => y.score - x.score)
  return scored.map((s) => s.a)
}
