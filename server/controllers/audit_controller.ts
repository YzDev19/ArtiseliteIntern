import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    // Fetch recent logs with associated user details
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { name: true, email: true } } 
      },
      orderBy: { timestamp: 'desc' }, // Sort by newest first
      take: 50 // Limit results for performance
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
};