import { Campaign, Prisma, PrismaClient, Subscriber } from "@prisma/client";
import { Resend } from "resend";
import MarkdownIt from "markdown-it";
import {
  EmailTemplate,
  reengagement20230825,
  defaultSignature,
} from "./emailTemplates";
require("dotenv").config();

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

async function getSubscribersToDeliver(
  campaign: Campaign,
  where: Prisma.SubscriberWhereInput = {}
) {
  const alreadyDeliveredSubs = await prisma.campaignDelivery.findMany({
    where: {
      campaignId: campaign.id,
      OR: [{ status: "SENT" }, { status: "PENDING" }],
    },
    select: {
      subscriberId: true,
    },
  });

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "ACTIVE",
      id: { notIn: alreadyDeliveredSubs.map((x) => x.subscriberId) },
      ...where,
    },
  });

  return subscribers;
}

function format(template: string, subscriber: Subscriber) {
  return template.replace(/\{firstName\}/g, subscriber.firstName ?? "");
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) {
    return e.message;
  }
  return JSON.stringify(e);
}

async function markdownToHtml(markdown: string) {
  const md = new MarkdownIt();
  return md.render(markdown);
}

async function deliverCampaign(subscriber: Subscriber, campaign: Campaign) {
  const from = "Linton Ye <linton@jimulabs.com>";

  const delivery = await prisma.campaignDelivery.create({
    data: {
      campaignId: campaign.id,
      subscriberId: subscriber.id,
      status: "PENDING",
    },
  });

  try {
    const bodyText = format(campaign.emailBodyTemplate, subscriber);
    const bodyHtml = await markdownToHtml(bodyText);
    const response = await resend.emails.send({
      from,
      to: subscriber.email,
      subject: format(campaign.emailSubjectTemplate, subscriber),
      text: bodyText,
      html: bodyHtml,
    });
    await prisma.campaignDelivery.update({
      where: {
        id: delivery.id,
      },
      data: {
        status: "SENT",
      },
    });
  } catch (e) {
    await prisma.campaignDelivery.update({
      where: {
        id: delivery.id,
      },
      data: {
        status: "FAILED",
        error: getErrorMessage(e),
      },
    });
    throw e;
  }
}

async function createCampaign(
  name: string,
  emailSubjectTemplate: string,
  emailBodyTemplate: string
) {
  const campaign = await prisma.campaign.create({
    data: {
      name,
      emailSubjectTemplate,
      emailBodyTemplate,
    },
  });

  return campaign;
}

async function getCampaign(template: EmailTemplate) {
  const { name, emailSubjectTemplate, emailBodyTemplate } = template;
  let campaign = await prisma.campaign.findFirst({
    where: {
      name,
    },
  });

  if (!campaign) {
    const signature = template.signature ?? defaultSignature;
    campaign = await createCampaign(
      name,
      emailSubjectTemplate,
      emailBodyTemplate + (signature ? `\n\n${signature}` : "")
    );
  }
  return campaign;
}

async function main() {
  const campaign = await getCampaign(reengagement20230825);
  const subscribers = await getSubscribersToDeliver(campaign);
  console.log(
    `Delivering "${campaign.name}" to ${subscribers.length} subscribers`
  );

  await pressYToContinue();

  console.log("Starting to deliver...");

  // split subscribers into 10-batch
  const batchSize = 10;
  const batchCount = Math.ceil(subscribers.length / batchSize);
  for (let i = 0; i < batchCount; i++) {
    const batch = subscribers.slice(i * batchSize, (i + 1) * batchSize);
    try {
      await Promise.all(
        batch.map((subscriber) => deliverCampaign(subscriber, campaign))
      );
      const percent = Math.round(((i + 1) * 100) / batchCount);
      console.log(`${percent}% done`);
    } catch (e) {
      console.error(e);
    }
    // wait 1 second between batches, to avoid hitting the rate limit of 10 emails per second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function pressYToContinue() {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question("Press Y to continue: ", (answer: string) => {
      readline.close();
      if (answer.toUpperCase() === "Y") {
        resolve(true);
      } else {
        console.log("Aborted");
        process.exit(0);
      }
    });
  });
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
