import { Campaign, PrismaClient, Subscriber } from "@prisma/client";
import { Resend } from "resend";
import MarkdownIt from "markdown-it";
require("dotenv").config();

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

async function getSubscribersToDeliver(campaign: Campaign) {
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: "ACTIVE",
      campaigns: {
        none: {
          id: campaign.id,
          OR: [{ status: "SENT" }, { status: "PENDING" }],
        },
      },
    },
  });

  return subscribers;
}

function format(template: string, subscriber: Subscriber) {
  return template.replace(/\{firstName\}/g, subscriber.firstName);
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

async function getAiAppsIntroCampaign() {
  const name = "AI Apps Intro";
  const emailSubjectTemplate = "Things I've been working on";
  const emailBodyTemplate = `Hi {firstName},

You are getting this email because you were interested in my React courses / articles.

https://usechattie.com
https://usepainboard.com

Thanks, and have a great day!
Linton
`;
  let campaign = await prisma.campaign.findFirst({
    where: {
      name,
    },
  });

  if (!campaign) {
    campaign = await createCampaign(
      name,
      emailSubjectTemplate,
      emailBodyTemplate
    );
  }
  return campaign;
}

async function main2() {
  const campaign = await getAiAppsIntroCampaign();
  const subscribers = await getSubscribersToDeliver(campaign);
  console.log(
    `Delivering "${campaign.name}" to ${subscribers.length} subscribers`
  );

  // split subscribers into 10-batch
  const batchCount = 10;
  const batchLength = Math.ceil(subscribers.length / batchCount);
  for (let i = 0; i < batchCount; i++) {
    const batch = subscribers.slice(i * batchLength, (i + 1) * batchLength);
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

async function main() {
  const html = await markdownToHtml(`# Hello World`);
  console.log(html);
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
