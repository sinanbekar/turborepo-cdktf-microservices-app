import type { AppProps } from "next/app";
import "../styles/globals.css";
import Layout from "../components/Layout";

function MicroservicesApp({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MicroservicesApp;
