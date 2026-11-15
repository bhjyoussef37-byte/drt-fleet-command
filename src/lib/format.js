export function pad2(value) {
  return String(Math.max(0, value)).padStart(2, '0');
}

export function formatClock(minutes, seconds = false) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(total / 60);
  const mins = Math.floor(total % 60);
  if (!seconds) return `${pad2(hours)}:${pad2(mins)}`;
  const secs = Math.floor((total % 1) * 60);
  return `${pad2(hours)}:${pad2(mins)}:${pad2(secs)}`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatDecimal(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.0';
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Urgency is intentionally a three-stage green → yellow → red scale. */
export function waitTone(wait) {
  if (wait < 6) {
    return {
      color: '#34d399',
      soft: 'rgba(52, 211, 153, 0.16)',
      label: 'À l’heure',
    };
  }
  if (wait < 12) {
    return {
      color: '#facc15',
      soft: 'rgba(250, 204, 21, 0.16)',
      label: 'En hausse',
    };
  }
  return {
    color: '#fb7185',
    soft: 'rgba(251, 113, 133, 0.16)',
    label: 'Critique',
  };
}
