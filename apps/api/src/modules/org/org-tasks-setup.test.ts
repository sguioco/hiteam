import 'reflect-metadata';
import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { UpsertOrgSetupDto } from './dto/upsert-org-setup.dto';
import { OrgService } from './org.service';
import { BillingService } from '../billing/billing.service';

async function run() {
  const input = { companyName: 'Team', timezone: 'Asia/Dubai', attendanceTrackingEnabled: false, billingCountry: 'AE' };
  assert.equal(validateSync(Object.assign(new UpsertOrgSetupDto(), input)).length, 0);
  assert.ok(validateSync(Object.assign(new UpsertOrgSetupDto(), { ...input, billingCountry: 'XX' })).length);
  assert.ok(validateSync(Object.assign(new UpsertOrgSetupDto(), { ...input, attendanceTrackingEnabled: true })).some((issue) => issue.property === 'latitude'));
  let tenant = { businessId: 'business', attendanceTrackingEnabled: true };
  const company = { id: 'company', name: 'Team', code: 'TEAM', logoUrl: null, googlePlaceId: null };
  let location: any = { id: 'location', companyId: 'company', name: 'Office', code: 'HQ', address: 'Not set yet', country: null, latitude: 0, longitude: 0, timezone: 'UTC' };
  const db: any = {
    tenant: { findUnique: async () => tenant, findUniqueOrThrow: async () => tenant, update: async ({ data }: any) => (tenant = { ...tenant, ...data }) },
    company: { findMany: async () => [company], update: async ({ data }: any) => Object.assign(company, data) },
    location: { findMany: async () => [location], update: async ({ data }: any) => (location = { ...location, ...data }) },
    employee: { updateMany: async () => ({}), findMany: async () => [] },
    employeeInvitation: { updateMany: async () => ({}) },
    role: { upsert: async () => ({ id: 'role' }) },
    $transaction: async (fn: any) => fn(db),
  };
  const service = new OrgService(db, { recordOrganizationUpdated() {} } as any, {} as any);
  const saved = await service.upsertSetup('tenant', { ...input, companyId: 'company', locationId: 'location' });
  assert.equal(saved.configured, true);
  assert.equal(saved.location.latitude, null);
  assert.equal(saved.location.longitude, null);
  assert.equal(saved.location.country, 'AE');
  assert.equal((await service.getSetup('tenant')).configured, true, 'Task-only setup remains configured after reload');
  db.location.findFirst = async () => location;
  const billing = new BillingService(db, {} as any, {} as any, {} as any);
  assert.equal((await (billing as any).resolvePricing('tenant')).currency, 'AED');
  location.country = 'US';
  assert.notEqual((await (billing as any).resolvePricing('tenant')).currency, 'AED', 'Explicit country overrides a Dubai timezone');
  location.country = 'AE';
  await assert.rejects(service.updateSettings('tenant', { attendanceTrackingEnabled: true }), /map point/);
  assert.equal(tenant.attendanceTrackingEnabled, false);
  await assert.rejects(service.upsertSetup('tenant', { ...input, companyId: 'foreign' }), /workspace/);
  const full = await service.upsertSetup('tenant', { ...input, attendanceTrackingEnabled: true, address: 'Dubai', latitude: 25, longitude: 55 });
  assert.equal(full.attendanceTrackingEnabled, true);
  assert.equal((await service.getSetup('tenant')).configured, true);
  console.log('tasks-only setup tests passed');
}
void run().catch((error) => { console.error(error); process.exitCode = 1; });
