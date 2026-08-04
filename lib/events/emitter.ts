import { EventEmitter } from 'events';
import { evaluateProgressForBilling } from '../domain/billing/rules-engine';

// Create a globally scoped event emitter so it persists across hot-reloads in dev
const globalForEvents = global as unknown as { eventEmitter: EventEmitter };

export const eventBus = globalForEvents.eventEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.eventEmitter = eventBus;
}

export type DomainEvent = {
  name: string;
  payload: any;
  tenantId: string;
  timestamp: Date;
};

/**
 * Emit a domain event.
 * In a real production environment, this would publish to BullMQ, Kafka, or AWS EventBridge.
 */
export function emitDomainEvent(name: string, tenantId: string, payload: any) {
  const event: DomainEvent = {
    name,
    tenantId,
    payload,
    timestamp: new Date(),
  };
  
  // Also log the event for auditing/debugging
  console.log(`[DomainEvent] ${name} emitted for tenant ${tenantId}`, payload);
  
  eventBus.emit(name, event);
}

// ==========================================
// EVENT LISTENERS
// ==========================================
eventBus.on('progress.updated', async (event: DomainEvent) => {
  const { unitId, newProgress, approvedBy } = event.payload;
  await evaluateProgressForBilling(event.tenantId, unitId, newProgress, approvedBy);
});
