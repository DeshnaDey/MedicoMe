// Prototype doctor directory. Keyed by specialty.
//
// For a real product, this list would come from a health-network API. In the
// prototype we ship a small curated roster so users see the "doctor card" UX
// even without any backend.

export interface DoctorInfo {
  id: string
  name: string
  clinic: string
  address: string // used as the Maps destination
  distanceKm: number
  phone: string // E.164 format or local-with-country; used for tel: link
  bookingUrl: string // clinic / marketplace booking page
  specialty: string // canonical key, matches Diagnosis.specialty casing
}

const DOCTORS: DoctorInfo[] = [
  // ── Neurologist ──────────────────────────────────────────────────────────
  {
    id: 'doc_neuro_1',
    name: 'Dr. Ananya Krishnan',
    clinic: 'NeuroCare Clinic',
    address: 'NeuroCare Clinic, Indiranagar, Bengaluru',
    distanceKm: 3.2,
    phone: '+918046123001',
    bookingUrl: 'https://www.practo.com/bangalore/neurologist',
    specialty: 'Neurologist',
  },
  {
    id: 'doc_neuro_2',
    name: 'Dr. Rohan Iyer',
    clinic: 'Apollo Neurology',
    address: 'Apollo Hospitals, Bannerghatta Rd, Bengaluru',
    distanceKm: 6.8,
    phone: '+918046123002',
    bookingUrl: 'https://www.apollo247.com/specialties/neurology',
    specialty: 'Neurologist',
  },
  {
    id: 'doc_neuro_3',
    name: 'Dr. Meera Prasad',
    clinic: 'Fortis Neuro Centre',
    address: 'Fortis Hospital, Cunningham Rd, Bengaluru',
    distanceKm: 4.4,
    phone: '+918046123003',
    bookingUrl: 'https://www.fortishealthcare.com/book-an-appointment',
    specialty: 'Neurologist',
  },

  // ── Cardiologist / Emergency ─────────────────────────────────────────────
  {
    id: 'doc_cardio_1',
    name: 'Dr. Vikram Sethi',
    clinic: 'HeartWell Cardiology',
    address: 'HeartWell Cardiology, Koramangala, Bengaluru',
    distanceKm: 2.1,
    phone: '+918046123010',
    bookingUrl: 'https://www.practo.com/bangalore/cardiologist',
    specialty: 'Cardiologist',
  },
  {
    id: 'doc_cardio_2',
    name: 'Dr. Karan Mehta',
    clinic: 'Fortis Cardiac Sciences',
    address: 'Fortis Hospital, Cunningham Rd, Bengaluru',
    distanceKm: 4.3,
    phone: '+918046123011',
    bookingUrl: 'https://www.fortishealthcare.com/book-an-appointment',
    specialty: 'Cardiologist',
  },
  {
    id: 'doc_cardio_3',
    name: 'Dr. Priya Nair',
    clinic: 'Manipal Heart Centre',
    address: 'Manipal Hospitals, Old Airport Rd, Bengaluru',
    distanceKm: 7.9,
    phone: '+918046123012',
    bookingUrl: 'https://www.manipalhospitals.com/appointment',
    specialty: 'Cardiologist',
  },

  // ── Pulmonologist ────────────────────────────────────────────────────────
  {
    id: 'doc_pulmo_1',
    name: 'Dr. Arjun Rao',
    clinic: 'LungCare Respiratory Clinic',
    address: 'LungCare Clinic, HSR Layout, Bengaluru',
    distanceKm: 4.7,
    phone: '+918046123020',
    bookingUrl: 'https://www.practo.com/bangalore/pulmonologist',
    specialty: 'Pulmonologist',
  },
  {
    id: 'doc_pulmo_2',
    name: 'Dr. Shreya Banerjee',
    clinic: 'Apollo Pulmonology',
    address: 'Apollo Hospitals, Bannerghatta Rd, Bengaluru',
    distanceKm: 6.5,
    phone: '+918046123021',
    bookingUrl: 'https://www.apollo247.com/specialties/pulmonology',
    specialty: 'Pulmonologist',
  },

  // ── Gastroenterologist ───────────────────────────────────────────────────
  {
    id: 'doc_gi_1',
    name: 'Dr. Nishant Kapoor',
    clinic: 'GutWell Gastroenterology',
    address: 'GutWell Gastro, Indiranagar, Bengaluru',
    distanceKm: 3.5,
    phone: '+918046123030',
    bookingUrl: 'https://www.practo.com/bangalore/gastroenterologist',
    specialty: 'Gastroenterologist',
  },
  {
    id: 'doc_gi_2',
    name: 'Dr. Kavya Reddy',
    clinic: 'Manipal GI Centre',
    address: 'Manipal Hospitals, Old Airport Rd, Bengaluru',
    distanceKm: 8.1,
    phone: '+918046123031',
    bookingUrl: 'https://www.manipalhospitals.com/appointment',
    specialty: 'Gastroenterologist',
  },

  // ── Dermatologist ────────────────────────────────────────────────────────
  {
    id: 'doc_derm_1',
    name: 'Dr. Sneha Pillai',
    clinic: 'SkinEssence Dermatology',
    address: 'SkinEssence, Jayanagar, Bengaluru',
    distanceKm: 5.4,
    phone: '+918046123040',
    bookingUrl: 'https://www.practo.com/bangalore/dermatologist',
    specialty: 'Dermatologist',
  },
  {
    id: 'doc_derm_2',
    name: 'Dr. Rahul Verma',
    clinic: 'Kaya Skin Clinic',
    address: 'Kaya Skin Clinic, Indiranagar, Bengaluru',
    distanceKm: 3.0,
    phone: '+918046123041',
    bookingUrl: 'https://www.kaya.in/book-appointment',
    specialty: 'Dermatologist',
  },

  // ── General Physician ────────────────────────────────────────────────────
  {
    id: 'doc_gp_1',
    name: 'Dr. Aarti Menon',
    clinic: 'EverCare Family Clinic',
    address: 'EverCare Clinic, Koramangala, Bengaluru',
    distanceKm: 1.8,
    phone: '+918046123050',
    bookingUrl: 'https://www.practo.com/bangalore/general-physician',
    specialty: 'General Physician',
  },
  {
    id: 'doc_gp_2',
    name: 'Dr. Farhan Qureshi',
    clinic: 'Apollo Clinic',
    address: 'Apollo Clinic, HSR Layout, Bengaluru',
    distanceKm: 4.0,
    phone: '+918046123051',
    bookingUrl: 'https://www.apollo247.com/book-consult',
    specialty: 'General Physician',
  },
  {
    id: 'doc_gp_3',
    name: 'Dr. Neha Joshi',
    clinic: 'HealthSpring Clinic',
    address: 'HealthSpring, Indiranagar, Bengaluru',
    distanceKm: 3.3,
    phone: '+918046123052',
    bookingUrl: 'https://www.healthspring.in/appointment',
    specialty: 'General Physician',
  },
]

// Google Maps "directions from current location to destination".
// An empty origin makes Maps use the user's current location (prompted for
// permission by the Maps app / website).
export function directionsLink(destinationAddress: string) {
  const dest = encodeURIComponent(destinationAddress)
  return `https://www.google.com/maps/dir/?api=1&origin=&destination=${dest}&travelmode=driving`
}

// Tel: link for click-to-call.
export function phoneLink(phone: string) {
  return `tel:${phone.replace(/\s+/g, '')}`
}

// Look up doctors by a specialty string coming out of the triage classifier.
// We normalize loosely: the classifier sometimes returns "Emergency / Cardiologist".
export function findDoctorsForSpecialty(specialty: string, radiusKm: number, limit = 3): DoctorInfo[] {
  const needle = specialty.toLowerCase()
  const matched = DOCTORS.filter((d) => {
    const s = d.specialty.toLowerCase()
    return needle.includes(s) || s.includes(needle) || needle.split(/[^a-z]/).some((part) => part && s.includes(part))
  })
  // Prefer in-radius matches; if none, widen to the closest ones.
  const withinRadius = matched.filter((d) => d.distanceKm <= radiusKm).sort((a, b) => a.distanceKm - b.distanceKm)
  if (withinRadius.length >= 2) return withinRadius.slice(0, limit)
  const byDistance = [...matched].sort((a, b) => a.distanceKm - b.distanceKm)
  if (byDistance.length > 0) return byDistance.slice(0, limit)
  // As a last resort, return General Physicians.
  return DOCTORS.filter((d) => d.specialty === 'General Physician').slice(0, limit)
}
