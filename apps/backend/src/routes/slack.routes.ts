import { Router } from "express";
import { prisma } from "../config/prisma.js";

const router = Router();

router.get("/connect", (_req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    "http://localhost:5000/api/slack/callback";

  if (!clientId) {
    return res.status(500).send("SLACK_CLIENT_ID is missing");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "chat:write",
    redirect_uri: redirectUri,
  });

  res.redirect(
    `https://slack.com/oauth/v2/authorize?${params.toString()}`
  );
});

router.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");

    if (!code) {
      return res.status(400).send("Missing Slack OAuth code");
    }

    const response = await fetch(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID || "",
          client_secret: process.env.SLACK_CLIENT_SECRET || "",
          code,
          redirect_uri:
            process.env.SLACK_REDIRECT_URI ||
            "http://localhost:5000/api/slack/callback",
        }),
      }
    );

    const data = await response.json();

    console.log("Slack OAuth:", data);

    if (!data.ok) {
      return res
        .status(400)
        .send(`Slack OAuth failed: ${data.error}`);
    }

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

    await prisma.slackConnection.upsert({
      where: {
        userId: user.id,
      },
      update: {
        accessToken: data.access_token,
        teamId: data.team?.id || null,
        teamName: data.team?.name || null,
      },
      create: {
        userId: user.id,
        accessToken: data.access_token,
        teamId: data.team?.id || null,
        teamName: data.team?.name || null,
      },
    });

    res.redirect(
      "http://localhost:5173/settings?slack=connected"
    );
  } catch (error) {
    console.error("Slack callback error:", error);

    res.status(500).send(
      error instanceof Error
        ? error.message
        : "Slack connection failed"
    );
  }
});

export default router;