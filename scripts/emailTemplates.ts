export type EmailTemplate = {
  name: string;
  emailSubjectTemplate: string;
  emailBodyTemplate: string;
  signature?: string;
};

export const defaultSignature = `Linton Ye<br/>Thinking aloud on [Twitter, aka X](https://x.com/lintonye)`;

export const reengagement20230825: EmailTemplate = {
  name: "Re-engagement",
  emailSubjectTemplate: "Reconnect",
  emailBodyTemplate: `Hi {firstName},
  
  I'm not sure if you still remember me, but you subscribed to my mailing list about React courses a few years ago. Just wanted to check in and give you a quick update (Sorry for being quiet for so long!). 
  
  You must have tried ChatGPT or Midjourney, right? It's no doubt a big hype right now. But AI is (and will be) such a big deal in every aspect of our lives. For me personally, it rejuvenated the fire in my heart (more on that later). Once seeing its power, I told myself to drop everything else and focus on all things AI.
  
  I've since been learning and experimenting like crazy. Out of the 43 subfolders in my "ai-experiments" folder, there are 2 that I think are worth sharing with you. 
  
  The first one is a tool called Painboard. Can you guess what it does? It uses AI (of course!) to automatically extract customer pain points (or other actionable insights) from long-form customer feedback, such as reviews, transcripts, support tickets etc. I've seen people using it to analyze focus group meeting notes, employee reviews and product reviews. If you are a PM or designer, does it sound useful? Check it out and I'd love to hear your feedback. [https://usepainboard.com](https://usepainboard.com)
  
  The second one is a "ChatGPT for your website" tool. It lets a user easily train and embed a GPT-powered chatbot on websites. Honestly there are already a few dozen similar tools out there, but I've decided to focuses on the ease of use and customizability. BTW I'm pretty proud of the theme editor and hope you like the design too (and its name, Chattie). Fun fact, Chattie is the "new app" mentioned on Painboard's landing page. Here's the link: [https://usechattie.com](https://usechattie.com)
  
  Thanks for reading this far. While this email is not about React courses, I hope you still find it interesting. How's your jounery of learning React (and anything else)? Do you have any questions for me? I'd like to open up a conversation with you, and see if I can help you in any way.
  
  _PS: In the spirit of building in public, I'll try to share every aspect of my journey, both in the form of newsletter and on Twitter (well, X). Stay tuned!_
  
  Thanks, and have a great day!
  `,
};
