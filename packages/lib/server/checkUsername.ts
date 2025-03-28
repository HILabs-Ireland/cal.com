import { checkRegularUsername } from "./checkRegularUsername";

// We want to remove dependency on website for signup stuff as signup is now part of app.
export const checkUsername = checkRegularUsername;
