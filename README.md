# Send newsletters with Resend.com

At this point, this is just a simple script that can be used to send newsletter. I made it a Next.js project just in case this can be turned into a fully-fledged open source alternative to services like ConvertKit or Mailchimp.

With the $20/month plan at Resend.com (for 50K emails), the price would be much more preferable compared to $80 something at similar services.

# Getting started

1. Set up the account at resend.com, add your domain, create an API key etc.
2. Put the API key into `.env`
3. Initialize the local db via `npx supabase start`. Docker is needed for this step.
4. `yarn`
5. `npx ts-node scripts/send.ts`
