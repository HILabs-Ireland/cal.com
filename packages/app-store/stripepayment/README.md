<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
  
  <a href="https://cal.com/enterprise">Get Started with Enterprise</a>
</div>

# Enterprise Edition

Welcome to the Enterprise Edition ("/ee") of Cal.com.

The [/ee](https://github.com/calcom/cal.com/tree/main/apps/web/ee) subfolder is the place for all the **Pro** features from our [hosted](https://cal.com/pricing) plan and [enterprise-grade](https://cal.com/enterprise) features such as SSO, SAML, ADFS, OIDC, SCIM, SIEM, HRIS and much more.

> _❗ WARNING: This package is copyrighted (unlike our [main repo](https://github.com/calcom/cal.com)). You are not allowed to use this code to host your own version of app.cal.com without obtaining a proper [license](https://cal.com/enterprise) first❗_

## Setting up Stripe

1. Create a stripe account or use an existing one. For testing, you should use all stripe dashboard functions with the Test-Mode toggle in the top right activated.
2. Open [Stripe ApiKeys](https://dashboard.stripe.com/apikeys) save the token starting with `pk_...` to `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` in the .env file.
3. Open [Stripe Connect Settings](https://dashboard.stripe.com/settings/connect) and activate OAuth for Standard Accounts
4. Add `<CALENDSO URL>/api/integrations/stripepayment/callback` as redirect URL.
5. Select all `payment_intent` events for the webhook.
