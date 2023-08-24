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

async function getReengageCampaign() {
  const name = "Re-engagement";
  const emailSubjectTemplate = "Reconnect";
  const emailBodyTemplate = `Hi {firstName},

I'm not sure if you still remember me, but you subscribed to my mailing list about React courses a few years ago. Just wanted to check in and give you a quick update (Sorry for being quiet for so long!). 

You must have tried ChatGPT or Midjourney, right? It's no doubt a big hype right now. But AI is (and will be) such a big deal in every aspect of our lives. For me personally, it rejuvenated the fire in my heart (more on that later). Once seeing its power, I told myself to drop everything else and focus on all things AI.

I've since been learning and experimenting like crazy. Out of the 43 subfolders in my "ai-experiments" folder, there are 2 that I think are worth sharing with you. 

The first one is a tool called Painboard. Can you guess what it does? It uses AI (of course!) to automatically extract customer pain points (or other actionable insights) from long-form customer feedback, such as reviews, transcripts, support tickets etc. I've seen people using it to analyze focus group meeting notes, employee reviews and product reviews. If you are a PM or designer, does it sound useful? Check it out and I'd love to hear your feedback. https://usepainboard.com

The second one is a "ChatGPT for your website" tool. It lets a user easily train and embed a GPT-powered chatbot on websites. Honestly there are already a few dozen similar tools out there, but I've decided to focuses on the ease of use and customizability. BTW I'm pretty proud of the theme editor and hope you like the design too (and its name, Chattie). Fun fact, Chattie is the "new app" mentioned on Painboard's landing page. Here's the link: https://usechattie.com

Thanks for reading this far. While this email is not about React courses, I hope you still find it interesting. How's your jounery of learning React (and anything else)? Do you have any questions for me? I'd like to open up a conversation with you, and see if I can help you in any way.

PS: In the spirit of building in public, I'll try to share every aspect of my journey, both in the form of newsletter and on Twitter (well, X). Stay tuned!

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
  const campaign = await getReengageCampaign();
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
  const campaign = await getReengageCampaign();
  const subscribers = await getSubscribersToDeliver(campaign);
  console.log(
    `Delivering "${campaign.name}" to ${subscribers.length} subscribers`
  );
}

main().catch((e: any) => {
  console.error(e);
  process.exit(1);
});
