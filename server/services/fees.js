// Configurable System Fees for EduLink
// Institution rules: Regular modules are SLE 100/module in production, SLE 1.00 for testing (Monime floor).
// Dissertation is flat SLE 500.

export function getFeePerModule() {
  const envFee = process.env.FEE_PER_MODULE;
  if (envFee && !isNaN(Number(envFee))) {
    return Number(envFee);
  }
  return 1.00; // Testing floor for Monime USSD payments
}

export function getDissertationFee() {
  const envFee = process.env.DISSERTATION_FEE;
  if (envFee && !isNaN(Number(envFee))) {
    return Number(envFee);
  }
  return 500.00;
}

export function registrationFee(type, modulesCount = 8, studentContext = {}) {
  const level = Number(studentContext?.level || studentContext?.level_num || 0);
  const semester = Number(studentContext?.semester === 2 || String(studentContext?.semester).toLowerCase().includes('second') ? 2 : 1);

  // Institution rule: Final-year students in Semester 2 are dissertation-only; NEVER charge per-module fee
  if (type === 'dissertation' || (level === 4 && semester === 2)) {
    return getDissertationFee();
  }

  const count = Number(modulesCount) > 0 ? Number(modulesCount) : 8;
  const unitFee = getFeePerModule();
  return Number((count * unitFee).toFixed(2));
}
