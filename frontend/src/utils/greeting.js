/**
 * Formats a live, dynamic greeting based on current local hour:
 * - 05:00 to 11:59 -> Good morning [Name]
 * - 12:00 to 16:59 -> Good afternoon [Name]
 * - 17:00 to 04:59 -> Good evening [Name]
 */
export function getTimeBasedGreeting(name = 'Moses Saffa') {
  const hour = new Date().getHours();
  let timeOfDay = 'Good morning';
  if (hour >= 12 && hour < 17) {
    timeOfDay = 'Good afternoon';
  } else if (hour >= 17 || hour < 5) {
    timeOfDay = 'Good evening';
  }
  
  // Clean name or fallback to Moses Saffa
  const resolvedName = name && String(name).trim() ? String(name).trim() : 'Moses Saffa';
  return `${timeOfDay}, ${resolvedName}`;
}
