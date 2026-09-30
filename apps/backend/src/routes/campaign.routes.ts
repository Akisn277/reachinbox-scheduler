import { Router } from "express";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { prisma } from "../config/prisma.js";
import { scheduleCampaign } from "../services/scheduler.service.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/campaigns/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "CSV file is required",
      });
    }

    const {
      subject,
      body,
      name = "CSV Campaign",
      startAt,
      delayMs = "2000",
      hourlyLimit = "100",
    } = req.body;

    if (!subject || !body) {
      return res.status(400).json({
        success: false,
        error: "Subject and body are required",
      });
    }

    const records = parse(req.file.buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const recipients = records
      .map((row: any) => ({
        email: row.email || row.Email,
        name: row.name || row.Name || undefined,
      }))
      .filter((row: any) => row.email);

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        error: "CSV must contain an email column",
      });
    }

    // Temporary demo user until Google OAuth is added
    const user = await prisma.user.upsert({
      where: {
        email: "demo@reachinbox.local",
      },
      update: {},
      create: {
        email: "demo@reachinbox.local",
        name: "Demo User",
      },
    });

    const sender = await prisma.sender.upsert({
      where: {
        userId_email: {
          userId: user.id,
          email: "demo@reachinbox.local",
        },
      },
      update: {},
      create: {
        userId: user.id,
        email: "demo@reachinbox.local",
        displayName: "ReachInbox Demo",
      },
    });

    const result = await scheduleCampaign({
      userId: user.id,
      senderId: sender.id,
      name,
      subject,
      body,
      startAt: startAt ? new Date(startAt) : new Date(),
      delayMs: Number(delayMs),
      hourlyLimit: Number(hourlyLimit),
      recipients,
    });

    res.status(201).json({
      success: true,
      message: "CSV campaign scheduled",
      campaignId: result.campaign.id,
      totalRecipients: recipients.length,
      emails: result.emails,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Campaign failed",
    });
  }
});

export default router;
