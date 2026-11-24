# ClientBrief web billing

Use the Avunor Studio account, avunorstudio@gmail.com, as project owner and support contact. Customers enter their own billing email at checkout to receive receipts and subscription management links.

1. In RevenueCat, open the ClientBrief project and create a RevenueCat Web Billing app. Set its support email and connect the company Stripe account.
2. Set the launch plan to USD 29 per workspace per month. Create the workspace subscription product, add it to an offering, then create an identified Web Purchase Link. Set the success destination to https://clientbreif.vercel.app/app/settings. The server appends the signed-in Clerk organization ID to the link.
3. Create a project-scoped v2 secret key with the subscriptions read permission. Configure the five REVENUECAT variables from .env.example in Vercel. PRODUCT_ID is the RevenueCat API product ID beginning with prod. PURCHASE_LINK is the base URL from the dashboard, before the customer ID.
4. Test in a preview with a sandbox purchase link and the sandbox environment. Verify the workspace gains access, a second workspace stays inactive, and the admin can manage the subscription. Use the production purchase link and environment for launch.
5. Deploy the RevenueCat app first, then apply the retire_manual_pilot migration. The migration removes the minute-metering triggers and manual approval functions while retaining historical records in the private schema.

The backend reads subscriptions directly from RevenueCat before accepting an upload or starting transcription. The matching product must give access in the selected environment. Cancellation, expiry and renewal take effect according to the provider's access decision. Existing briefs and review links can be opened independently of billing. Store outage or incomplete configuration pauses new recordings.
