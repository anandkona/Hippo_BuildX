/** PRD §8.3 unit lifecycle statuses */
export const UNIT_STATUSES = [
  'available',
  'reserved',
  'booked',
  'cancelled',
  'completed',
  'delivered',
] as const;

export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const UNIT_TYPES = [
  'villa',
  'flat',
  'plot',
  'commercial',
  'office',
  'warehouse',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export const PROJECT_STATUSES = [
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled',
] as const;

/** Finish-to-start is v1 (PRD §8.4); other types reserved for later */
export const DEPENDENCY_TYPES = ['FS'] as const;

export const DEFAULT_UNIT_CATEGORIES: Array<{
  code: string;
  name: string;
  unitType: UnitType;
  description: string;
}> = [
  { code: 'FLAT_2BHK', name: '2 BHK Flat', unitType: 'flat', description: 'Standard 2 bedroom apartment' },
  { code: 'FLAT_3BHK', name: '3 BHK Flat', unitType: 'flat', description: 'Standard 3 bedroom apartment' },
  { code: 'VILLA', name: 'Villa', unitType: 'villa', description: 'Independent villa' },
  { code: 'PLOT', name: 'Plot', unitType: 'plot', description: 'Residential plot' },
  { code: 'COMMERCIAL', name: 'Commercial', unitType: 'commercial', description: 'Commercial retail unit' },
  { code: 'OFFICE', name: 'Office', unitType: 'office', description: 'Office space' },
  { code: 'WAREHOUSE', name: 'Warehouse', unitType: 'warehouse', description: 'Warehouse unit' },
];

export function isUnitStatus(value: string): value is UnitStatus {
  return (UNIT_STATUSES as readonly string[]).includes(value);
}

export function isUnitType(value: string): value is UnitType {
  return (UNIT_TYPES as readonly string[]).includes(value);
}
