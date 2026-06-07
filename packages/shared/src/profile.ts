export function computeAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) return null;
  const born = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(born.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function formatLocation(city?: string | null, country?: string | null) {
  return [city, country].filter(Boolean).join(", ") || null;
}
