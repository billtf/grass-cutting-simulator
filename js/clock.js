/**
 * In-game time. Hours are floats. Only this module converts real seconds
 * to game hours using the current day length.
 */

export function secondsPerGameHour(dayLengthMinutes, hoursPerDay) {
  return (dayLengthMinutes * 60) / hoursPerDay;
}

export function createClock(hoursPerDay = 24, startHour = 7) {
  return {
    day: 1,
    hour: startHour,
    hoursPerDay,
    paused: false,
    fastForward: false,
  };
}

/**
 * Advance the clock. Returns { hours, hourTicks, dayRolled }.
 * hourTicks are the integer hours that were crossed (0–23).
 */
export function advanceClock(clock, realSeconds, dayLengthMinutes, rate = 1) {
  if (clock.paused || realSeconds <= 0) {
    return { hours: 0, hourTicks: [], dayRolled: false };
  }
  const sph = secondsPerGameHour(dayLengthMinutes, clock.hoursPerDay);
  const hours = (realSeconds * rate) / sph;
  let remaining = hours;
  const hourTicks = [];
  let dayRolled = false;

  while (remaining > 1e-9) {
    const before = clock.hour;
    const room = clock.hoursPerDay - before;
    if (remaining >= room - 1e-9) {
      const startH = Math.floor(before);
      for (let h = startH + 1; h < clock.hoursPerDay; h++) {
        hourTicks.push(h);
      }
      clock.hour = 0;
      clock.day += 1;
      dayRolled = true;
      remaining -= room;
      hourTicks.push(0);
    } else {
      const after = before + remaining;
      const startH = Math.floor(before);
      const endH = Math.floor(after);
      for (let h = startH + 1; h <= endH; h++) {
        hourTicks.push(h);
      }
      clock.hour = after;
      remaining = 0;
    }
  }

  return { hours, hourTicks, dayRolled };
}

export function formatClock(clock) {
  const h24 = Math.floor(clock.hour) % clock.hoursPerDay;
  const minutes = Math.floor((clock.hour - Math.floor(clock.hour)) * 60);
  const ampm = h24 < 12 ? "AM" : "PM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const mm = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${h12}:${mm} ${ampm}`;
}

export function seasonForDay(day, daysPerSeason = 14) {
  const names = ["spring", "summer", "fall", "winter"];
  const index = Math.floor((day - 1) / daysPerSeason) % 4;
  return names[index];
}
