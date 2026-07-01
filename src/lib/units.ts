import { INCHES_PER_FOOT } from "./types";

export function feetToInches(feet: number): number {
  return feet * INCHES_PER_FOOT;
}

export function inchesToFeet(inches: number): number {
  return inches / INCHES_PER_FOOT;
}

export type LengthUnit = "feet" | "inches";

export function parseLengthInches(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const inchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inches)$/i);
  if (!inchesMatch) return null;

  const inches = Number(inchesMatch[1]);
  return Number.isNaN(inches) || inches < 0 ? null : inches;
}

export function parseLengthFeet(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const feetInchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in|inches)?)?$/i);
  if (feetInchesMatch) {
    const feet = Number(feetInchesMatch[1]);
    const inches = feetInchesMatch[2] ? Number(feetInchesMatch[2]) : 0;
    if (Number.isNaN(feet) || Number.isNaN(inches)) return null;
    return feetToInches(feet) + inches;
  }

  const inchesOnlyMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inches)$/i);
  if (inchesOnlyMatch) {
    const inches = Number(inchesOnlyMatch[1]);
    return Number.isNaN(inches) ? null : inches;
  }

  const numeric = Number(trimmed);
  if (Number.isNaN(numeric) || numeric < 0) return null;
  return feetToInches(numeric);
}

export function parseLengthWithUnit(input: string, unit: LengthUnit = "feet"): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const explicitInches = parseLengthInches(trimmed);
  if (explicitInches !== null) return explicitInches;

  const explicitFeet = parseLengthFeet(trimmed);
  if (explicitFeet !== null && !/^\d+(\.\d+)?$/.test(trimmed)) {
    return explicitFeet;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (Number.isNaN(numeric) || numeric < 0) return null;
    return unit === "inches" ? numeric : feetToInches(numeric);
  }

  return explicitFeet;
}

export function formatLength(inches: number): string {
  const safeInches = Math.max(0, inches);
  const wholeFeet = Math.floor(safeInches / INCHES_PER_FOOT);
  const remainingInches = Math.round((safeInches - wholeFeet * INCHES_PER_FOOT) * 1000) / 1000;

  if (remainingInches === 0) {
    return `${wholeFeet}'`;
  }

  if (wholeFeet === 0) {
    return `${remainingInches}"`;
  }

  return `${wholeFeet}' ${remainingInches}"`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function createId(): string {
  return crypto.randomUUID();
}
