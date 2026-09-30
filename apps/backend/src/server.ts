import "dotenv/config";
import express from "express";
import cors from "cors";

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { emailQueue } from "./queues/email.queue.js";
import { prisma } from "./config/prisma.js";
import { searchEmails } from "./services/search.service.js";
import { scheduleCampaign } from "./services/scheduler.service.js";
import campaignRoutes from "./routes/campaign.routes.js";
import passport from "./auth/google.js";
import authRoutes from "./routes/auth.routes.js";
import slackRoutes from "./routes/slack.routes.js";

const app = express();

const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use("/api/auth", authRoutes);
app.use("/api", campaignRoutes);
app.use("/api/slack", slackRoutes);

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "ReachInbox Scheduler API is running",
    timestamp: new Date().toISOString(),
  });
});

/*
 * Temporary demo endpoint.
 * This will later be replaced by Google OAuth authenticated user.
 */
app.post("/test-campaign", async (req, res) => {
  try {
    const {
      recipients = [
        { email: "test1@example.com", name: "Test User 1" },
        { email: "test2@example.com", name: "Test User 2" },
        { email: "test3@example.com", name: "Test User 3" },
      ],
      startAt,
      delayMs = 2000,
      hourlyLimit = 100,
    } = req.body;

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

    const campaign = await scheduleCampaign({
      userId: user.id,
      senderId: sender.id,
      name: "ReachInbox Demo Campaign",
      subject: "ReachInbox Scheduled Email",
      body: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Hello from ReachInbox</h1>
          <p>This email was scheduled by the ReachInbox email scheduler.</p>
        </div>
      `,
      startAt: startAt ? new Date(startAt) : new Date(),
      delayMs: Number(delayMs),
      hourlyLimit: Number(hourlyLimit),
      recipients,
    });

    res.status(201).json({
      success: true,
      message: "Campaign scheduled successfully",
      campaignId: campaign.campaign.id,
      totalEmails: campaign.emails.length,
      emails: campaign.emails,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/campaigns", async (_req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        sender: true,
        _count: {
          select: {
            emails: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/emails", async (_req, res) => {
  try {
    const emails = await prisma.email.findMany({
      include: {
        sender: true,
        campaign: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    res.json({
      success: true,
      emails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/emails/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Search query is required",
      });
    }

    const results = await searchEmails(query);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Search failed",
    });
  }
});

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});