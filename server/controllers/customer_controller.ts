import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCustomers = async (req: Request, res: Response) => {
  // Retrieve all customer records
  const customers = await prisma.customer.findMany();
  res.json(customers);
};

export const createCustomer = async (req: Request, res: Response) => {
  const { name, email, contact, address } = req.body;
  // Save a new customer to the database
  const customer = await prisma.customer.create({
    data: { name, email, contact, address }
  });
  res.json(customer);
};