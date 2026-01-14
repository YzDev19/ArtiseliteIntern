import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || 'secret';

// register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // password hashing
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'OPERATOR' 
      }
    });

    
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(400).json({ error: "User already exists or invalid data" });
  }
};

// login user generate token
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find User
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Check Password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Generate Token
    const token = jwt.sign(
      { userId: user.id, role: user.role }, 
      SECRET, 
      { expiresIn: '1d' } 
    );

    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};