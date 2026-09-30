import { Client } from "@elastic/elasticsearch";
import { prisma } from "../config/prisma.js";

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
});

const INDEX = "reachinbox-emails";

export async function indexEmail(email: any) {
  await client.index({
    index: INDEX,
    id: email.id,
    document: {
      id: email.id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      campaignId: email.campaignId,
      senderId: email.senderId,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt,
    },
    refresh: true,
  });
}

async function indexAllEmails() {
  const emails = await prisma.email.findMany();

  for (const email of emails) {
    await indexEmail(email);
  }

  console.log(`Indexed ${emails.length} emails into Elasticsearch`);
}

export async function searchEmails(query: string) {
  // Make sure existing database emails are searchable.
  await indexAllEmails();

  const result = await client.search({
    index: INDEX,
    query: {
      multi_match: {
        query,
        fields: [
          "recipient",
          "subject",
          "body",
          "status",
        ],
      },
    },
  });

  return result.hits.hits.map((hit) => hit._source);
}