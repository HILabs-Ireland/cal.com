import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/auth/verify/getServerSideProps";

import type { PageProps } from "~/auth/verify-view";
import VerifyPage from "~/auth/verify-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => `Success`,
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page: VerifyPage,
  getData: withAppDirSsr<PageProps>(getServerSideProps),
})<"P">;
