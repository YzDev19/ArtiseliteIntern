import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all users 
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true }, // Don't send passwords!
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Update a user's role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // Expect "ADMIN", "MANAGER", or "OPERATOR"

    const user = await prisma.user.update({
      where: { id: parseInt(id as string) },
      data: { role }
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to update role" });
  }
};