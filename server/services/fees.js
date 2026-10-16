export function registrationFee(type, modulesCount = 8) {
  if (type === 'dissertation') return 500;
  const count = Number(modulesCount) > 0 ? Number(modulesCount) : 8;
  return Number((count * 0.40).toFixed(2)); // SLE 0.40 per module for testing
}
