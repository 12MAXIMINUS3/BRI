import { Badge } from '@/components/ui/Badge';
import { getAvailability } from '../availability';

export function AvailabilityBadge({ stockQuantity }: { stockQuantity: number }) {
  const availability = getAvailability(stockQuantity);
  return (
    <Badge tone={availability.tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {availability.label}
    </Badge>
  );
}
