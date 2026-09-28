const FEES = Object.freeze({
  normal: 100,
  dissertation: 500
});

export function registrationFee(type) {
  if (!Object.hasOwn(FEES, type)) throw new Error('Invalid registration type');
  return FEES[type];
}
