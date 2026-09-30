import "dotenv/config";

import { Worker } from "bullmq";

import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";
import { sendEmail } from "../services/email.service.js";
import { indexEmail } from "../services/search.service.js";

const worker = new Worker(
  "email-scheduler",
  async (job) => {
    console.log(`Processing email job: ${job.id}`);

    const emailId = job.data.emailId;

    if (!emailId) {
      throw new Error("Missing emailId");
    }

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
      include: {
        sender: true,
        campaign: true,
      },
    });

    if (!email) {
      throw new Error(`Email ${emailId} not found`);
    }

    // Idempotency
    if (email.status === "SENT") {
      console.log(`Email ${emailId} already sent. Skipping.`);
      return;
    }

    await prisma.email.update({
      where: {
        id: emailId,
      },
      data: {
        status: "SENDING",
        attempts: {
          increment: 1,
        },
      },
    });

    try {
      const result = await sendEmail({
        from: email.sender.email,
        to: email.recipient,
        subject: email.subject,
        html: email.body,
      });

      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: result.messageId,
          error: null,
        },
      });

      const updatedEmail = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (updatedEmail) {
        await indexEmail(updatedEmail);
      }

      // Check whether the campaign is complete
      const remaining = await prisma.email.count({
        where: {
          campaignId: email.campaignId,
          status: {
            in: ["PENDING", "QUEUED", "SENDING"],
          },
        },
      });

      if (remaining === 0) {
        await prisma.campaign.update({
          where: {
            id: email.campaignId,
          },
          data: {
            status: "COMPLETED",
          },
        });
      } else {
        await prisma.campaign.update({
          where: {
            id: email.campaignId,
          },
          data: {
            status: "RUNNING",
          },
        });
      }

      console.log(`Email ${emailId} sent successfully`);

      if (result.previewUrl) {
        console.log(`Ethereal preview: ${result.previewUrl}`);
      }

      return result;
    } catch (error) {
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "FAILED",
          error:
            error instanceof Error ? error.message : "Unknown email error",
        },
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  }
);

worker.on("completed", (job) => {
  console.log(`Email job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Email job failed: ${job?.id}`);
  console.error(error.message);
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log(
  `Email worker started with concurrency ${
    process.env.WORKER_CONCURRENCY || 5
  }`
);