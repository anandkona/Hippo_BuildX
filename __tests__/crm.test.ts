import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getSql, getDb, createTenantSql } from '../lib/db/client';
import { tenants } from '../lib/db/schema/control-plane';
import { generateUuid } from '../lib/utils';
import { migrateTenant } from '../lib/db/migrate-tenant';
import { eq } from 'drizzle-orm';
import { LeadStateMachine } from '../lib/domain/crm/state-machine';
import { encrypt, decrypt } from '../lib/crypto';

describe('Phase 3: CRM & Sales Pipeline', () => {
  const tenantCrm = {
    id: generateUuid(),
    name: 'Tenant CRM',
    slug: 'tenant-crm',
    schemaName: 'tenant_crm_test',
  };

  const sql = getSql();
  const db = getDb();

  beforeAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantCrm.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.slug, 'tenant-crm'));

    await db.insert(tenants).values(tenantCrm);
    await migrateTenant(tenantCrm.schemaName);
  });

  afterAll(async () => {
    await sql.unsafe(`DROP SCHEMA IF EXISTS "${tenantCrm.schemaName}" CASCADE`);
    await db.delete(tenants).where(eq(tenants.id, tenantCrm.id));
  });

  it('Enforces lead state machine transitions', () => {
    // Valid transitions
    expect(LeadStateMachine.isValidTransition('Lead', 'Qualified')).toBe(true);
    expect(LeadStateMachine.isValidTransition('Qualified', 'Negotiation')).toBe(true);
    expect(LeadStateMachine.isValidTransition('Negotiation', 'Booking')).toBe(true);
    
    // Invalid transitions
    expect(LeadStateMachine.isValidTransition('Lead', 'Booking')).toBe(false);
    expect(LeadStateMachine.isValidTransition('Booking', 'Qualified')).toBe(false);

    expect(() => LeadStateMachine.transition('Lead', 'Booking')).toThrow(/Invalid state transition/);
  });

  it('Encrypts and decrypts KYC documents', () => {
    const sensitiveData = 'AADHAAR-1234-5678-9012';
    const encrypted = encrypt(sensitiveData);
    
    expect(encrypted).not.toContain('1234');
    expect(encrypted.split(':').length).toBe(3); // iv:encrypted:authTag
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveData);
  });

  it('Full Lead to Booking Pipeline (Simulated)', async () => {
    const tenantSql = createTenantSql(tenantCrm.schemaName);
    let leadId = generateUuid();
    let projectId = generateUuid();
    let blockId = generateUuid();
    let towerId = generateUuid();
    let floorId = generateUuid();
    let unitId = generateUuid();
    
    await tenantSql.begin(async (tx) => {
      // 1. Setup project and unit
      await tx`INSERT INTO projects (id, tenant_id, name) VALUES (${projectId}, ${tenantCrm.id}, 'CRM Project')`;
      await tx`INSERT INTO blocks (id, tenant_id, project_id, name) VALUES (${blockId}, ${tenantCrm.id}, ${projectId}, 'Block A')`;
      await tx`INSERT INTO towers (id, tenant_id, block_id, name) VALUES (${towerId}, ${tenantCrm.id}, ${blockId}, 'Tower 1')`;
      await tx`INSERT INTO floors (id, tenant_id, tower_id, name, floor_number) VALUES (${floorId}, ${tenantCrm.id}, ${towerId}, 'Floor 1', 1)`;
      await tx`INSERT INTO units (id, tenant_id, floor_id, number, status) VALUES (${unitId}, ${tenantCrm.id}, ${floorId}, '101', 'available')`;
      
      // 2. Create Lead
      await tx`INSERT INTO leads (id, tenant_id, first_name, email, status) VALUES (${leadId}, ${tenantCrm.id}, 'John', 'john@test.com', 'Lead')`;
      
      // 3. Transition to Negotiation
      let status = LeadStateMachine.transition('Lead', 'Qualified');
      status = LeadStateMachine.transition(status, 'Negotiation');
      await tx`UPDATE leads SET status = ${status} WHERE id = ${leadId}`;
      
      // 4. Create Booking
      const nextStatus = LeadStateMachine.transition(status, 'Booking');
      await tx`UPDATE leads SET status = ${nextStatus} WHERE id = ${leadId}`;
      await tx`UPDATE units SET status = 'booked' WHERE id = ${unitId}`;
      await tx`INSERT INTO bookings (id, tenant_id, lead_id, unit_id, booking_amount, status) VALUES (${generateUuid()}, ${tenantCrm.id}, ${leadId}, ${unitId}, 50000, 'active')`;
    });
    
    const [lead] = await tenantSql`SELECT status FROM leads WHERE id = ${leadId}`;
    const [unit] = await tenantSql`SELECT status FROM units WHERE id = ${unitId}`;
    const [booking] = await tenantSql`SELECT status FROM bookings WHERE lead_id = ${leadId}`;
    
    expect(lead.status).toBe('Booking');
    expect(unit.status).toBe('booked');
    expect(booking.status).toBe('active');
  });
});
