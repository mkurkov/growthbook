import { App as SlackApp } from "@slack/bolt";
import { SlackManager } from "../services/slack/SlackManager";
import { logger } from "../util/logger";

export const initSlackIntegration = async (): Promise<void> => {
  const port = process.env.SLACK_APP_PORT;
  if (!port) {
    throw new Error("ImplementationError: Missing SLACK_APP_PORT");
  }

  const botToken = process.env.SLACK_BOT_OAUTH_TOKEN;
  if (!botToken) {
    throw new Error("ImplementationError: Missing SLACK_BOT_OAUTH_TOKEN");
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    throw new Error("ImplementationError: Missing SLACK_SIGNING_SECRET");
  }

  const slackApp = new SlackApp({
    token: botToken,
    signingSecret,
  });

  await slackApp.start(port);
  const slackManager = new SlackManager(slackApp);
  await slackManager.init();

  logger.info("⚡️ Slack Bolt app is running!");
};