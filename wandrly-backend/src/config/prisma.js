import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize the adapter and client exactly ONCE
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// Export this single instance to be used everywhere else
export default prisma;

//using singleton pattern to ensure only one instance of PrismaClient is created and shared across the entire application, preventing issues with multiple connections and ensuring efficient resource usage.