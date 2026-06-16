// Password hashing/verification. bcryptjs is a pure-JS port of bcrypt — a
// little slower than native `bcrypt`, but deploys cleanly to every Node host
// (no native build step on Vercel/Supabase/etc.).

import bcrypt from 'bcryptjs'

const COST = 10 // ~60ms/hash on modern hardware — enough to slow brute-force

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
