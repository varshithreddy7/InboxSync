import { PrismaClient } from "@prisma/client";


const dbClient = new PrismaClient({
    log: ['info', 'warn', 'error'],
});

// Initialize database connection on application startup
 
dbClient.$connect()
    .then(() => {
        console.log("Database session established successfully");
    })
    .catch((connectionError) => {
        console.error("Failed to establish database session:", connectionError);
        process.exit(1);
    });

export default dbClient;