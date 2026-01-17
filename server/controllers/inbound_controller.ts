import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inbound stocks
// Process incoming stock shipments and update inventory levels
export const createInbound = async (req: Request, res: Response) => {
  const { warehouseId, reference, items } = req.body;

  // Validate that items list is correctly formatted
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Invalid items format. Expected an array." });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Create the inbound shipment record and its associated items
      const inbound = await tx.inbound.create({
        data: {
          warehouseId: parseInt(warehouseId), // Ensure ID is a number
          reference,
          items: {
            create: items.map((item: any) => ({
              productId: parseInt(item.productId),
              quantity: parseInt(item.quantity)
            }))
          }
        },
        include: { items: true }
      });

      // Update existing stock or initialize new inventory records
      for (const item of items) {
        await tx.inventory.upsert({
          where: {
            productId_warehouseId: { 
              productId: parseInt(item.productId), 
              warehouseId: parseInt(warehouseId) 
            }
          },
          update: { quantity: { increment: parseInt(item.quantity) } },
          create: { 
            productId: parseInt(item.productId), 
            warehouseId: parseInt(warehouseId), 
            quantity: parseInt(item.quantity) 
          }
        });
      }

      return inbound;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Inbound transaction failed" });
  }
};



export const createBulkInbound = async (req: Request, res: Response) => {
  try {
    const rows = req.body; 
    if (!Array.isArray(rows)) return res.status(400).json({ error: "Input must be an array" });

    // Group items by their invoice reference to process shipments together
    const shipments = new Map();
    for (const row of rows) {
      const ref = row.reference || "BULK-IMPORT-" + Date.now();
      if (!shipments.has(ref)) shipments.set(ref, []);
      shipments.get(ref).push(row);
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const adminUser = await prisma.user.findFirst();

    // Iterate through grouped shipments and process within individual transactions
    for (const [reference, items] of shipments) {
      try {
        await prisma.$transaction(async (tx) => {
          const firstItem = items[0];

          // Locate warehouse by name
          const warehouse = await tx.warehouse.findFirst({
            where: { name: { equals: firstItem.warehouse, mode: 'insensitive' } }
          });
          if (!warehouse) throw new Error(`Warehouse '${firstItem.warehouse}' not found`);

          // Resolve or create supplier
          let supplier = await tx.supplier.findFirst({
            where: { name: { equals: firstItem.supplier, mode: 'insensitive' } }
          });
          if (!supplier) {
            supplier = await tx.supplier.create({ data: { name: firstItem.supplier, contact: "Imported" } });
          }

          // Initialize inbound record
          const inbound = await tx.inbound.create({
            data: {
              reference: String(reference),
              dateReceived: new Date(firstItem.date || new Date()),
              supplierId: supplier.id,
              warehouseId: warehouse.id,
            }
          });

          // Link products, update stock levels, and set unit costs
          for (const item of items) {
            const product = await tx.product.findUnique({ where: { sku: String(item.sku) } });
            if (!product) throw new Error(`SKU '${item.sku}' not found`);

            const qty = parseInt(item.quantity) || 0;
            const cost = parseFloat(item.cost) || 0;

            await tx.inboundItem.create({
              data: {
                inboundId: inbound.id,
                productId: product.id,
                quantity: qty,
                unitCost: cost
              }
            });

            // Increase inventory and update product cost price
            await tx.inventory.upsert({
              where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } },
              update: { quantity: { increment: qty } },
              create: { productId: product.id, warehouseId: warehouse.id, quantity: qty }
            });

            if (cost > 0) {
              await tx.product.update({
                where: { id: product.id },
                data: { costPrice: cost }
              });
            }
          }

          // Log the bulk transaction for auditing
          if (adminUser) {
            await tx.auditLog.create({
              data: {
                userId: adminUser.id,
                action: "BULK_INBOUND",
                entity: "Inbound",
                entityId: inbound.id,
                details: `Bulk imported ${reference} (${items.length} items)`
              }
            });
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Invoice ${reference}: ${error.message}`);
      }
    }

    res.json({ message: "Bulk import processed", results });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Bulk import process failed" });
  }
};