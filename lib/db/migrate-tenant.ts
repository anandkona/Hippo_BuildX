import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import path from 'path';

export async function migrateTenant(schemaName: string) {
  console.log(`[Migrations] Starting migrations for tenant schema: ${schemaName}`);
  
  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/build_ex';
  // Use a dedicated single connection to preserve session state on Neon unpooled endpoint
  const migrationClient = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  
  try {
    // Manually set the search path for this session
    await migrationClient.unsafe(`SET search_path TO "${schemaName}", public`);
    
    const db = drizzle(migrationClient);
    const migrationsFolder = path.resolve(process.cwd(), 'lib/db/migrations/tenant');
    
    // Run migrations explicitly against the tenant schema
    await migrate(db, { migrationsFolder, migrationsSchema: schemaName });
    console.log(`[Migrations] Successfully applied migrations for ${schemaName}`);
  } catch (error) {
    console.error(`[Migrations] Failed to migrate schema ${schemaName}`, error);
    throw error;
  } finally {
    await migrationClient.end();
  }
}
