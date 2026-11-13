import { OrderStatus } from '../types';

/**
 * Strict state machine defining valid lifecycle transitions for an order.
 * Ensures orders follow realistic restaurant progression and cannot illegally jump backwards.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [], // Terminal successful state
  cancelled: [], // Terminal cancelled state
};

/**
 * Validates whether a requested transition is permitted.
 */
export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Gets the next logical status in standard happy-path flow
 */
export function getNextHappyPathStatus(current: OrderStatus): OrderStatus | null {
  switch (current) {
    case 'new':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'served';
    default:
      return null;
  }
}
