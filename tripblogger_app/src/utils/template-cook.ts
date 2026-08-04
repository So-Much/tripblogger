import type { EventBlockDto } from '@/src/types/template-cook';

export function eventBlockName(block: EventBlockDto): string {
  return block.location?.name ?? block.customName ?? 'Điểm dừng';
}

/** Local calendar YYYY-MM-DD */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function slotTypeLabel(slot: string | null | undefined): string {
  switch (slot) {
    case 'POI':
      return 'Tham quan';
    case 'FOOD':
      return 'Ăn uống';
    case 'STAY':
      return 'Chỗ ở';
    default:
      return 'Khác';
  }
}
