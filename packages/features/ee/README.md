<!-- PROJECT LOGO -->
<div align="center">
  <a href="https://cal.com/enterprise">
    <img src="https://user-images.githubusercontent.com/8019099/133430653-24422d2a-3c8d-4052-9ad6-0580597151ee.png" alt="Logo">
  </a>
  
  <a href="https://cal.com/sales">Get a License Key</a>
</div>

# Enterprise Edition

Welcome to the Enterprise Edition ("/ee") of Cal.com.

The [/ee](https://github.com/calcom/cal.com/tree/main/packages/features/ee) subfolder is the place for all the **Enterprise Edition** features from our [hosted](https://cal.com/pricing) plan and enterprise-grade features for [Enterprise](https://cal.com/enterprise) such as SSO, SAML, OIDC, SCIM, SIEM and much more or [Platform](https://cal.com/platform) plan to build a marketplace.

> _❗ WARNING: This repository is copyrighted (unlike our [main repo](https://github.com/calcom/cal.com)). You are not allowed to use this code to host your own version of app.cal.com without obtaining a proper [license](https://cal.com/sales) first❗_

## Setting up SAML login

1. Set SAML_DATABASE_URL to a postgres database. Please use a different database than the main Cal instance since the migrations are separate for this database. For example `postgresql://postgres:@localhost:5450/cal-saml`
2. Set SAML_ADMINS to a comma separated list of admin emails from where the SAML metadata can be uploaded and configured.
3. Create a SAML application with your Identity Provider (IdP) using the instructions here - [SAML Setup](../../apps/web/docs/saml-setup.md)
4. Remember to configure access to the IdP SAML app for all your users (who need access to Cal).
5. You will need the XML metadata from your IdP later, so keep it accessible.
6. Log in to one of the admin accounts configured in SAML_ADMINS and then navigate to Settings -> Security.
7. You should see a SAML configuration section, copy and paste the XML metadata from step 5 and click on Save.
8. Your provisioned users can now log into Cal using SAML.
