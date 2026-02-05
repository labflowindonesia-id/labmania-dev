import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dns from 'dns';

// Force IPv4 DNS resolution - fixes Supabase connection on networks that prefer IPv6
dns.setDefaultResultOrder('ipv4first');

// Use DATABASE_URL with pooler (port 6543) - more reliable than direct connection
// Port 5432 often blocked by firewalls, pooler provides reliable access
const connectionString = process.env.DATABASE_URL!;

// Log connection info (masked) for debugging
if (typeof window === 'undefined') {
    console.log('[DB] Initializing connection with pooler mode, URL prefix:', connectionString?.substring(0, 35) + '...');
}

// Configure postgres client with proper timeout and connection handling
const client = postgres(connectionString, {
    prepare: false, // Disable prefetch for Transaction pool mode
    connect_timeout: 30, // 30 second connection timeout
    idle_timeout: 20, // Close idle connections after 20 seconds
    max_lifetime: 60 * 30, // Max connection lifetime 30 minutes
    max: 10, // Max connections in pool
    fetch_types: false, // Disable type fetching for faster startup
    ssl: { rejectUnauthorized: false }, // SSL with flexible certificate validation for Supabase
    onnotice: () => { }, // Suppress notice messages
});

export const db = drizzle(client, { schema });

// Export schema for convenience
export { schema };
