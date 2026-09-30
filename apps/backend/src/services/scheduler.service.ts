import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { reserveSendSlot } from "./rate-limit.service.js";

export interface ScheduleCampaignInput {
  userId: string;
  senderId: string;
  name: string;
  subject: string;
  body: string;
  startAt: Date;
  delayMs: number;
  hourlyLimit: number;
  recipients: Array<{
    email: string;
    name?: string;
  }>;
}

export async function scheduleCampaign(input: ScheduleCampaignInput) {
  if (input.recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  if (input.delayMs < 0) {
    throw new Error("Delay cannot be negative");
  }

  if (input.hourlyLimit <= 0) {
    throw new Error("Hourly limit must be greater than zero");
  }

  const campaign = await prisma.campaign.create({
    data: {
      userId: input.userId,
      senderId: input.senderId,
      name: input.name,
      subject: input.subject,
      body: input.body,
      startAt: input.startAt,
      delayMs: input.delayMs,
      hourlyLimit: input.hourlyLimit,
      status: "SCHEDULED",
    },
  });

  const scheduledEmails = [];

  for (const recipient of input.recipients) {
    const scheduledTimestamp = await reserveSendSlot({
      senderId: input.senderId,
      requestedAt: input.startAt.getTime(),
      delayMs: input.delayMs,
      hourlyLimit: input.hourlyLimit,
    });

    const scheduledAt = new Date(scheduledTimestamp);

    const email = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        senderId: input.senderId,
        recipient: recipient.email,
        recipientName: recipient.name,
        subject: input.subject,
        body: input.body,
        status: "QUEUED",
        scheduledAt,
      },
    });

    const delay = Math.max(0, scheduledTimestamp - Date.now());

    await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
      },
      {
        jobId: `email-${email.id}`,
        delay,
      }
    );

    scheduledEmails.push({
      id: email.id,
      recipient: email.recipient,
      scheduledAt,
    });
  }

  return {
    campaign,
    emails: scheduledEmails,
  };
}