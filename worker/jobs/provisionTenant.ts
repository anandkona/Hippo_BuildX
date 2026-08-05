import { provisionTenant, type ProvisionTenantInput } from '@/lib/tenants/provision';

export async function handleProvisionTenant(data: ProvisionTenantInput) {
  return provisionTenant(data);
}
