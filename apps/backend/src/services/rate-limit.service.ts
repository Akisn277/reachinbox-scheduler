import { redisConnection } from "../config/redis.js";
import { prisma } from "../config/prisma.js";

const RESERVE_SLOT_SCRIPT = `
local senderId = KEYS[1]
local requestedAt = tonumber(ARGV[1])
local delayMs = tonumber(ARGV[2])
local hourlyLimit = tonumber(ARGV[3])

local nextKey = "sender:next:" .. senderId

local candidate = requestedAt

local existingNext = tonumber(redis.call("GET", nextKey) or "0")

if existingNext > candidate then
  candidate = existingNext
end

while true do
  local hourStart = math.floor(candidate / 3600000) * 3600000
  local hourEnd = hourStart + 3600000

  local countKey = "sender:hour:" .. senderId .. ":" .. hourStart

  local count = tonumber(redis.call("GET", countKey) or "0")

  if count < hourlyLimit then
    redis.call("INCR", countKey)

    redis.call(
      "PEXPIRE",
      countKey,
      172800000
    )

    local nextSlot = candidate + delayMs

    redis.call(
      "SET",
      nextKey,
      nextSlot,
      "PX",
      172800000
    )

    return candidate
  end

  candidate = hourEnd

  local updatedNext = tonumber(redis.call("GET", nextKey) or "0")

  if updatedNext > candidate then
    candidate = updatedNext
  end
end
`;

async function notifySlackRateLimit(senderId: string) {
  try {
    const sender = await prisma.sender.findUnique({
      where: {
        id: senderId,
      },
      select: {
        userId: true,
      },
    });

    if (!sender) {
      console.log("Slack notification skipped: sender not found");
      return;
    }

    const connection = await prisma.slackConnection.findUnique({
      where: {
        userId: sender.userId,
      },
    });

    if (!connection?.accessToken) {
      console.log("Slack notification skipped: Slack not connected");
      return;
    }

    const response = await fetch(
      "https://slack.com/api/chat.postMessage",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: "C0C5N9RNH9U",
          text:
            "ReachInbox alert: the hourly email sending limit was reached. The remaining email has been rescheduled for the next available sending window.",
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Slack notification failed:", data.error);
      return;
    }

    console.log("Slack rate-limit notification sent");
  } catch (error) {
    console.error("Slack notification error:", error);
  }
}

export async function reserveSendSlot(params: {
  senderId: string;
  requestedAt: number;
  delayMs: number;
  hourlyLimit: number;
}) {
  const result = await redisConnection.eval(
    RESERVE_SLOT_SCRIPT,
    1,
    params.senderId,
    params.requestedAt,
    params.delayMs,
    params.hourlyLimit
  );

  const scheduledAt = Number(result);

  const requestedHour =
    Math.floor(params.requestedAt / 3600000);

  const scheduledHour =
    Math.floor(scheduledAt / 3600000);

  // If the email had to move into a later hour,
  // the hourly rate limit was hit.
  if (scheduledHour > requestedHour) {
    await notifySlackRateLimit(params.senderId);
  }

  return scheduledAt;
}