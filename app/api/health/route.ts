import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryLimitMB = parseInt(process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/)?.[1] || '512');
    const memoryUsagePercent = (memoryUsage.heapUsed / 1024 / 1024 / memoryLimitMB) * 100;
    
    // Check if memory usage is critical
    if (memoryUsagePercent > 90) {
      return NextResponse.json({
        status: 'unhealthy',
        error: 'High memory usage',
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          limit: memoryLimitMB,
          percentage: Math.round(memoryUsagePercent)
        }
      }, { status: 503 });
    }
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        limit: memoryLimitMB,
        percentage: Math.round(memoryUsagePercent)
      },
      uptime: process.uptime()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: 'Health check failed'
    }, { status: 503 });
  }
}
