#!/bin/bash

checkRoute () {
  if [ "$1" != '1' ]; then rm -rf $2; fi
}

# These conditionals are used to remove directories from the build that are not needed in production
# This is to reduce the size of the build and prevent OOM errors
checkRoute "$APP_ROUTER_AUTH_FORGOT_PASSWORD_ENABLED" app/future/auth/forgot-password
checkRoute "$APP_ROUTER_AUTH_LOGIN_ENABLED" app/future/auth/login
checkRoute "$APP_ROUTER_AUTH_LOGOUT_ENABLED" app/future/auth/logout
checkRoute "$APP_ROUTER_AUTH_PLATFORM_ENABLED" app/future/auth/platform
checkRoute "$APP_ROUTER_AUTH_OAUTH2_ENABLED" app/future/auth/oauth2
checkRoute "$APP_ROUTER_TEAM_ENABLED" app/future/team

# These are routes that don't have and environment variable to enable or disable them
# Will stop removing gradually as we test and confirm that they are working
rm -rf \
   app/future/d\
   app/future/enterprise\
   app/future/org\
   app/future/reschedule\
   app/future/signup\

exit 1
