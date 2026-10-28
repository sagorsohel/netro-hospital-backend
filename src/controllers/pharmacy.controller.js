import { db } from "../db/index.js";
import { medicines, pharmacyInvoices } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

// 1. Get Medicines (Inventory List)
export const getMedicines = async (req, res, next) => {
  try {
    const { search, filter } = req.query;
    let allMedicines = await db
      .select()
      .from(medicines)
      .orderBy(desc(medicines.createdAt));

    // Optional Search Filter
    if (search) {
      const q = search.toLowerCase();
      allMedicines = allMedicines.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.generic.toLowerCase().includes(q) ||
          m.batchNo.toLowerCase().includes(q)
      );
    }

    // Optional Status Filter
    if (filter === "low-stock") {
      allMedicines = allMedicines.filter(
        (m) => m.totalPieces <= (m.minThresholdPieces || 100)
      );
    } else if (filter === "near-expiry") {
      const now = new Date().getTime();
      allMedicines = allMedicines.filter((m) => {
        const exp = new Date(m.expiryDate).getTime();
        return (exp - now) / (1000 * 3600 * 24) <= 60;
      });
    }

    res.json({
      success: true,
      count: allMedicines.length,
      data: allMedicines,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get Medicine By ID
export const getMedicineById = async (req, res, next) => {
  try {
    const [medicine] = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, req.params.id));

    if (!medicine) {
      return res.status(404).json({ success: false, message: "Medicine not found." });
    }
    res.json({ success: true, data: medicine });
  } catch (error) {
    next(error);
  }
};

// 3. New Stock-In Entry (Multi-Unit Conversion)
export const createStockIn = async (req, res, next) => {
  try {
    const {
      name,
      generic,
      category,
      cartonQty = 1,
      packetPerCarton = 10,
      piecePerPacket = 10,
      unitSellingPrice,
      stripSellingPrice,
      batchNo,
      expiryDate,
      supplier,
      branch = "Main Hospital Pharmacy",
    } = req.body;

    if (!name || !unitSellingPrice || !stripSellingPrice || !batchNo || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Medicine name, batch number, expiry date, and selling prices are required.",
      });
    }

    const calculatedTotalPieces = Number(cartonQty) * Number(packetPerCarton) * Number(piecePerPacket);

    const newMedicine = {
      id: `med-${Date.now()}`,
      name,
      generic: generic || name,
      category: category || "General",
      cartonQty: Number(cartonQty),
      packetPerCarton: Number(packetPerCarton),
      piecePerPacket: Number(piecePerPacket),
      totalPieces: calculatedTotalPieces,
      unitSellingPrice: Number(unitSellingPrice).toFixed(2),
      stripSellingPrice: Number(stripSellingPrice).toFixed(2),
      batchNo,
      expiryDate,
      minThresholdPieces: 100,
      supplier: supplier || "Direct Manufacturer",
      branch,
    };

    await db.insert(medicines).values(newMedicine);

    res.status(201).json({
      success: true,
      message: `Stock-in entry created! ${name} (${calculatedTotalPieces} pcs) added to inventory.`,
      data: newMedicine,
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get POS Sales Invoices
export const getInvoices = async (req, res, next) => {
  try {
    const allInvoices = await db
      .select()
      .from(pharmacyInvoices)
      .orderBy(desc(pharmacyInvoices.createdAt));

    res.json({
      success: true,
      count: allInvoices.length,
      data: allInvoices,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Create POS Sale & Auto Deduct Stock
export const createInvoice = async (req, res, next) => {
  try {
    const {
      customerName = "Walk-in Customer",
      phone,
      memberId,
      isMember = false,
      hasPrescription = false,
      items = [], // [{ medicineId, name, unitType, quantity, unitPrice, totalPrice }]
    } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required for digital invoice delivery.",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item must be present in the bill.",
      });
    }

    // Compute bill subtotals
    const subtotal = items.reduce((acc, curr) => acc + Number(curr.totalPrice), 0);
    const discountAmount = isMember ? +(subtotal * 0.1).toFixed(2) : 0;
    const discountPercentage = isMember ? 10 : 0;
    const grandTotal = +(subtotal - discountAmount).toFixed(2);

    const invoiceNo = `INV-NETRO-${Math.floor(100000 + Math.random() * 900000)}`;

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      customerName,
      phone,
      memberId: memberId || null,
      isMember: Boolean(isMember),
      hasPrescription: Boolean(hasPrescription),
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      discountPercentage: discountPercentage.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      status: "Paid",
      whatsappSent: true, // auto WhatsApp simulated trigger
      smsSent: true,      // auto SMS simulated trigger
      items,
    };

    // Save invoice
    await db.insert(pharmacyInvoices).values(newInvoice);

    // Auto-deduct inventory pieces from medicines
    for (const item of items) {
      if (item.medicineId) {
        const [med] = await db
          .select()
          .from(medicines)
          .where(eq(medicines.id, item.medicineId));

        if (med) {
          let piecesToDeduct = item.quantity;
          if (item.unitType === "strip") {
            piecesToDeduct = item.quantity * med.piecePerPacket;
          } else if (item.unitType === "carton") {
            piecesToDeduct = item.quantity * med.packetPerCarton * med.piecePerPacket;
          }

          const remainingPieces = Math.max(0, med.totalPieces - piecesToDeduct);
          const remainingCartons = Math.floor(
            remainingPieces / (med.packetPerCarton * med.piecePerPacket)
          );

          await db
            .update(medicines)
            .set({
              totalPieces: remainingPieces,
              cartonQty: remainingCartons,
            })
            .where(eq(medicines.id, item.medicineId));
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Sale completed! ${invoiceNo} generated and digital PDF sent to WhatsApp: ${phone}`,
      data: newInvoice,
    });
  } catch (error) {
    next(error);
  }
};

// 6. Trigger Delivery Action (WhatsApp/SMS)
export const triggerDeliveryAction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'whatsapp' | 'sms'

    const [invoice] = await db
      .select()
      .from(pharmacyInvoices)
      .where(eq(pharmacyInvoices.id, id));

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }

    const updates = {};
    if (type === "whatsapp") updates.whatsappSent = true;
    if (type === "sms") updates.smsSent = true;

    await db.update(pharmacyInvoices).set(updates).where(eq(pharmacyInvoices.id, id));

    res.json({
      success: true,
      message: `${type === "whatsapp" ? "WhatsApp PDF Invoice" : "SMS Bill Summary"} delivered to ${invoice.phone}`,
      data: { ...invoice, ...updates },
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get Pharmacy KPI Stats
export const getPharmacyStats = async (req, res, next) => {
  try {
    const allMedicines = await db.select().from(medicines);
    const allInvoices = await db.select().from(pharmacyInvoices);

    const totalSalesToday = allInvoices.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
    const lowStockCount = allMedicines.filter((m) => m.totalPieces <= (m.minThresholdPieces || 100)).length;

    const now = new Date().getTime();
    const nearExpiryCount = allMedicines.filter((m) => {
      const exp = new Date(m.expiryDate).getTime();
      return (exp - now) / (1000 * 3600 * 24) <= 60;
    }).length;

    const totalStockValuation = allMedicines.reduce(
      (sum, m) => sum + m.totalPieces * Number(m.unitSellingPrice),
      0
    );

    res.json({
      success: true,
      data: {
        totalSalesToday,
        invoicesCount: allInvoices.length,
        totalStockValuation: Math.round(totalStockValuation),
        totalMedicinesCount: allMedicines.length,
        nearExpiryCount,
        lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};
