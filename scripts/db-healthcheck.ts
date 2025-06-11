import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function healthCheck() {
  const startTime = Date.now()
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime
    
    console.log({
      status: 'healthy',
      database: 'PostgreSQL',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    })
    
    process.exit(0)
  } catch (error) {
    console.error({
      status: 'unhealthy',
      database: 'PostgreSQL',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

healthCheck()