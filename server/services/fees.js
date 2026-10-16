export function registrationFee(type, modulesCount = 8) {
  if (type === 'dissertation') return 500;
  const count = Number(modulesCount) > 0 ? Number(modulesCount) : 8;
  return Number((count * 1.00).toFixed(2)); // SLE 1.00 per module for testing (Monime min floor)
}
