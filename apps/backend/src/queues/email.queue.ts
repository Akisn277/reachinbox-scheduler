import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const emailQueue = new Queue("email-scheduler", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});