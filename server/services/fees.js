export function registrationFee(type, modulesCount = 8) {
  if (type === 'dissertation') return 500;
  const count = Number(modulesCount) > 0 ? Number(modulesCount) : 8;
  return count * 100; // SLE 100 per module
}
