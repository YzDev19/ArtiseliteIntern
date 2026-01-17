import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSuppliers = async (req: Request, res: Response) => {
  // Retrieve all registered suppliers
  const suppliers = await prisma.supplier.findMany();
  res.json(suppliers);
};

export const createSupplier = async (req: Request, res: Response) => {
  const { name, email, contact, address } = req.body;
  // Create a new supplier record
  const supplier = await prisma.supplier.create({
    data: { name, email, contact, address }
  });
  res.json(supplier);
};