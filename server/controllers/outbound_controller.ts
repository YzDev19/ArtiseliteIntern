import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createOutbound = async (req: Request, res: Response) => {
  try {
    const { reference, dateShipped, customerId, warehouseId, items } = req.body;
    const documentUrl = (req as any).file ? (req as any).file.path : null;
    const parsedItems = JSON.parse(items);

    // Verify stock availability across all requested items
    for (const item of parsedItems) {
      const inventory = await prisma.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: parseInt(item.productId),
            warehouseId: parseInt(warehouseId)
          }
        }
      });

      if (!inventory || inventory.quantity < parseInt(item.quantity)) {
        return res.status(400).json({ 
          error: `Insufficient stock for Product ID ${item.productId}. Available: ${inventory?.quantity || 0}` 
        });
      }
    }

    // Execute shipment and stock deduction in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const outbound = await tx.outbound.create({
        data: {
          reference,
          dateShipped: new Date(dateShipped),
          customerId: parseInt(customerId),
          warehouseId: parseInt(warehouseId),
          documentUrl,
          items: {
            create: parsedItems.map((item: any) => ({
              productId: parseInt(item.productId),
              quantity: parseInt(item.quantity)
            }))
          }
        }
      });

      // Decrement inventory levels
      for (const item of parsedItems) {
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: parseInt(item.productId),
              warehouseId: parseInt(warehouseId)
            }
          },
          data: { quantity: { decrement: parseInt(item.quantity) } }
        });
      }

      // Log the activity for audit purposes
      await tx.auditLog.create({
        data: {
          action: "OUTBOUND_SHIPPED",
          entity: "Outbound",
          entityId: outbound.id,
          userId: 1, 
          details: `Shipped ${parsedItems.length} items (Ref: ${reference})`
        }
      });

      return outbound;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Outbound Error:", error);
    res.status(500).json({ error: "Failed to process outbound shipment" });
  }
};

export const createBulkOutbound = async (req: Request, res: Response) => {
  try {
    const rows = req.body; 
    if (!Array.isArray(rows)) return res.status(400).json({ error: "Input must be an array" });

    // Group items by reference number
    const orders = new Map();
    for (const row of rows) {
      const ref = row.reference || "BULK-OUT-" + Date.now();
      if (!orders.has(ref)) orders.set(ref, []);
      orders.get(ref).push(row);
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const adminUser = await prisma.user.findFirst();

    for (const [reference, items] of orders) {
      try {
        await prisma.$transaction(async (tx) => {
          const firstItem = items[0];

          // Resolve warehouse and customer entities
          const warehouse = await tx.warehouse.findFirst({
            where: { name: { equals: firstItem.warehouse, mode: 'insensitive' } }
          });
          if (!warehouse) throw new Error(`Warehouse '${firstItem.warehouse}' not found`);

          let customer = await tx.customer.findFirst({
            where: { name: { equals: firstItem.customer, mode: 'insensitive' } }
          });

          if (!customer) {
            customer = await tx.customer.create({
              data: { 
                name: firstItem.customer || "Walk-in Customer",
                contact: "Imported via CSV" 
              }
            });
          }

          // Create outbound shipment record
          const outbound = await tx.outbound.create({
            data: {
              reference: String(reference),
              dateShipped: new Date(firstItem.date || new Date()),
              customerId: customer.id, 
              warehouseId: warehouse.id,
            }
          });

          // Validate stock and process each item
          for (const item of items) {
            const product = await tx.product.findUnique({ where: { sku: String(item.sku) } });
            if (!product) throw new Error(`SKU '${item.sku}' not found`);

            const qty = parseInt(item.quantity) || 0;

            const stock = await tx.inventory.findUnique({
              where: { productId_warehouseId: { productId: product.id, warehouseId: warehouse.id } }
            });

            if (!stock || stock.quantity < qty) {
              throw new Error(`Insufficient stock for ${item.sku}`);
            }

            await tx.inventory.update({
              where: { id: stock.id },
              data: { quantity: { decrement: qty } }
            });

            await tx.outboundItem.create({
              data: {
                outboundId: outbound.id,
                productId: product.id,
                quantity: qty,
                unitPrice: parseFloat(item.price) || Number(product.price)
              }
            });
          }

          // Log bulk operation
          if (adminUser) {
            await tx.auditLog.create({
              data: {
                userId: adminUser.id,
                action: "BULK_OUTBOUND",
                entity: "Outbound",
                entityId: outbound.id,
                details: `Bulk shipped ${reference}`
              }
            });
          }
        });
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Order ${reference}: ${error.message}`);
      }
    }

    res.json({ message: "Bulk outbound processed", results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Bulk upload process failed" });
  }
};