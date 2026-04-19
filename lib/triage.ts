// Rule-based symptom triage decision tree.
// Kept intentionally simple and transparent so you can see how each answer path
// maps to a diagnosis / severity. The chat page blends this with Ollama for
// free-text questions the tree can't handle.

import type { Diagnosis } from './types'

export interface SymptomNode {
  id: string
  label: string
  questions: { key: string; prompt: string; options: string[] }[]
  classify: (answers: Record<string, string>) => Diagnosis
}

// Shared follow-ups
const redFlagSeverity = (answers: Record<string, string>): 'mild' | 'moderate' | 'severe' | null => {
  if (answers.red_flag === 'yes') return 'severe'
  return null
}

export const SYMPTOMS: SymptomNode[] = [
  {
    id: 'headache',
    label: 'Headache',
    questions: [
      { key: 'duration', prompt: 'How long have you had the headache?', options: ['< 1 day', '1–3 days', '> 3 days'] },
      { key: 'intensity', prompt: 'How intense is the pain?', options: ['Mild (annoying but can work)', 'Moderate (hard to focus)', 'Severe (worst ever)'] },
      { key: 'red_flag', prompt: 'Any of these? Sudden onset "worst ever", vision changes, confusion, weakness, fever > 39°C.', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      const severe = redFlagSeverity({ red_flag: a.red_flag?.toLowerCase() === 'yes' ? 'yes' : 'no' })
      if (severe || a.intensity?.startsWith('Severe') || a.duration === '> 3 days') {
        return {
          condition: 'Possible migraine or secondary headache requiring evaluation',
          severity: 'severe',
          confidence: 'medium',
          specialty: 'Neurologist',
          rationale:
            'Prolonged or very severe headaches, or any neurological red flags (vision, confusion, weakness), warrant in-person evaluation rather than self-care.',
        }
      }
      return {
        condition: 'Tension-type headache',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'Rest in a quiet, dim room for 30–45 minutes',
          'Apply a cool compress to the forehead',
          'Drink 400–500 ml water — dehydration is a common trigger',
          'Gentle neck and shoulder stretches',
        ],
        otc: ['Ibuprofen 200–400 mg', 'Acetaminophen 500 mg', 'Naproxen 220 mg'],
        rationale: 'Short-duration, mild-to-moderate headache with no red flags typically responds to rest, hydration, and OTC analgesics.',
      }
    },
  },
  {
    id: 'cough',
    label: 'Cough',
    questions: [
      { key: 'duration', prompt: 'How long have you been coughing?', options: ['< 3 days', '3–14 days', '> 2 weeks'] },
      { key: 'type', prompt: 'Is it dry or producing phlegm?', options: ['Dry', 'Productive (mucus)', 'Mix'] },
      { key: 'red_flag', prompt: 'Any shortness of breath, blood in mucus, chest pain, or fever > 39°C?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.duration === '> 2 weeks') {
        return {
          condition: 'Persistent or complicated cough — evaluation recommended',
          severity: 'severe',
          confidence: 'medium',
          specialty: 'Pulmonologist',
          rationale:
            'Cough > 2 weeks, or any red flag (dyspnea, hemoptysis, chest pain, high fever), can signal infection, asthma exacerbation, or other conditions that need imaging/listening.',
        }
      }
      return {
        condition: 'Upper-respiratory cough (likely viral)',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'Warm fluids — water, broth, herbal tea',
          '1–2 tsp of honey (adults only)',
          'Steam inhalation for 5–10 min, twice a day',
          'Elevate head while sleeping',
        ],
        otc: ['Dextromethorphan (for dry cough)', 'Guaifenesin (expectorant, for productive cough)', 'Throat lozenges'],
        rationale: 'Short-duration cough without red flags usually resolves in 7–10 days with supportive care.',
      }
    },
  },
  {
    id: 'stomach_ache',
    label: 'Stomach ache',
    questions: [
      { key: 'location', prompt: 'Where is the pain?', options: ['Upper stomach', 'Lower stomach', 'All over'] },
      { key: 'duration', prompt: 'How long has it lasted?', options: ['< 12 hours', '12–48 hours', '> 2 days'] },
      { key: 'red_flag', prompt: 'Blood in stool, severe vomiting, high fever, or pain rated 8+/10?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.duration === '> 2 days') {
        return {
          condition: 'Acute abdominal pain — needs physical exam',
          severity: 'severe',
          confidence: 'medium',
          specialty: 'Gastroenterologist',
          rationale:
            'Long-duration or severe abdominal pain with red flags can indicate appendicitis, gallstones, ulcer, or infection. In-person exam is important.',
        }
      }
      return {
        condition: 'Dyspepsia / mild gastroenteritis',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'BRAT diet (Bananas, Rice, Applesauce, Toast) for 24 hours',
          'Small sips of water / oral rehydration salts',
          'Avoid dairy, caffeine, spicy, and fatty foods',
          'Rest and heat pad on abdomen',
        ],
        otc: ['Antacid (e.g. Tums)', 'Famotidine 20 mg', 'Loperamide (for diarrhea, adults only)'],
        rationale: 'Short-duration stomach upset without red flags typically improves with hydration, bland food, and OTC antacids.',
      }
    },
  },
  {
    id: 'sore_throat',
    label: 'Sore throat',
    questions: [
      { key: 'duration', prompt: 'How long has it lasted?', options: ['< 3 days', '3–7 days', '> 1 week'] },
      { key: 'red_flag', prompt: 'Any trouble breathing, trouble swallowing, visible white patches, or fever > 39°C?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.duration === '> 1 week') {
        return {
          condition: 'Possible bacterial pharyngitis / tonsillitis',
          severity: 'moderate',
          confidence: 'medium',
          specialty: 'General Physician',
          rationale:
            'White patches, high fever, or duration > 1 week raise the chance of strep throat or tonsillitis, which may need a rapid test and antibiotics.',
        }
      }
      return {
        condition: 'Viral pharyngitis',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'Salt-water gargles 3–4 times a day',
          'Warm fluids with honey and lemon',
          'Throat lozenges',
          'Humidifier or steam in the bathroom',
        ],
        otc: ['Ibuprofen or acetaminophen for pain', 'Benzydamine oral rinse', 'Throat sprays'],
        rationale: 'Most sore throats are viral and resolve in 3–7 days with supportive care.',
      }
    },
  },
  {
    id: 'chest_pain',
    label: 'Chest pain',
    questions: [
      { key: 'character', prompt: 'How would you describe the pain?', options: ['Sharp / stabbing', 'Pressure / crushing', 'Burning (after meals)'] },
      { key: 'red_flag', prompt: 'Does it radiate to jaw/arm, come with shortness of breath, sweating, or dizziness?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.character?.startsWith('Pressure')) {
        return {
          condition: '⚠️ Possible cardiac event — seek emergency care immediately',
          severity: 'severe',
          confidence: 'high',
          specialty: 'Emergency / Cardiologist',
          rationale:
            'Pressure-like chest pain, or any radiating/associated symptoms (arm, jaw, sweating, breathlessness), can indicate a heart attack. Call emergency services or go to the nearest ER now.',
        }
      }
      if (a.character?.startsWith('Burning')) {
        return {
          condition: 'Likely acid reflux (GERD)',
          severity: 'mild',
          confidence: 'medium',
          homeRemedies: [
            'Elevate head of bed by 15 cm',
            'Avoid lying down for 3 hours after meals',
            'Smaller, more frequent meals',
            'Avoid trigger foods (spicy, citrus, fatty)',
          ],
          otc: ['Antacid (Tums, Gelusil)', 'Famotidine 20 mg', 'Omeprazole 20 mg (short course)'],
          rationale: 'Post-meal burning chest pain is most often GERD and responds well to lifestyle changes + OTC acid reduction.',
        }
      }
      return {
        condition: 'Musculoskeletal / atypical chest pain',
        severity: 'moderate',
        confidence: 'low',
        specialty: 'General Physician',
        rationale:
          'Sharp chest pain without cardiac red flags is often musculoskeletal, but given the location, a quick in-person evaluation is a good idea to rule out other causes.',
      }
    },
  },
  {
    id: 'rash',
    label: 'Skin rash',
    questions: [
      { key: 'spread', prompt: 'How widespread?', options: ['One small patch', 'A few areas', 'All over the body'] },
      { key: 'red_flag', prompt: 'Any fever, blistering, facial swelling, or trouble breathing?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.spread?.startsWith('All over')) {
        return {
          condition: 'Widespread or systemic rash — needs evaluation',
          severity: 'severe',
          confidence: 'medium',
          specialty: 'Dermatologist',
          rationale:
            'Full-body rashes or rashes with systemic symptoms (fever, swelling, breathing issues) can be a drug reaction or infection and deserve an in-person look.',
        }
      }
      return {
        condition: 'Localized contact or allergic dermatitis',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'Cool compress 15 minutes, 2–3× daily',
          'Fragrance-free moisturizer',
          'Avoid scratching; keep the area dry',
          'Identify and remove the trigger (new soap, jewelry, plant)',
        ],
        otc: ['1% hydrocortisone cream (short course)', 'Oral antihistamine (cetirizine, loratadine)', 'Calamine lotion'],
        rationale: 'Small, localized rashes without systemic features usually respond to topical hydrocortisone + antihistamines.',
      }
    },
  },
  {
    id: 'fever',
    label: 'Fever',
    questions: [
      { key: 'temp', prompt: 'What is your temperature?', options: ['< 38°C', '38–39°C', '> 39°C'] },
      { key: 'duration', prompt: 'How many days?', options: ['< 2 days', '2–4 days', '> 4 days'] },
      { key: 'red_flag', prompt: 'Stiff neck, severe headache, trouble breathing, or confusion?', options: ['No', 'Yes'] },
    ],
    classify: (a) => {
      if (a.red_flag?.toLowerCase() === 'yes' || a.temp === '> 39°C' || a.duration === '> 4 days') {
        return {
          condition: 'High or prolonged fever — medical review needed',
          severity: 'severe',
          confidence: 'medium',
          specialty: 'General Physician',
          rationale:
            'High fever > 39°C, fever lasting more than 4 days, or any red flag can signal serious infection and should be evaluated in person.',
        }
      }
      return {
        condition: 'Viral fever',
        severity: 'mild',
        confidence: 'medium',
        homeRemedies: [
          'Rest and fluids (2–3 L/day)',
          'Light clothing, tepid sponge bath if uncomfortable',
          'Nutritious but easy-to-digest meals',
          'Monitor temperature every 4–6 hours',
        ],
        otc: ['Paracetamol 500–1000 mg every 6 hours (max 4 g/day)', 'Ibuprofen 400 mg every 6–8 hours'],
        rationale: 'Short, low-to-moderate fever typically accompanies viral illness and resolves in 3–5 days with rest and antipyretics.',
      }
    },
  },
]

export function findSymptom(id: string) {
  return SYMPTOMS.find((s) => s.id === id)
}

// Build a Google Maps deep-link for specialist or pharmacy search.
export function mapsLink(query: string) {
  const q = encodeURIComponent(query)
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}
