import React from "react";
import type { NextPage } from "next";
import Csv2PdfHero from "../components/csv2pdf/Hero";
import { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { getSelectorsByUserAgent } from "react-device-detect";
import Head from "next/head";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const serverSideUserAgent = ctx.req.headers["user-agent"];
  return {
    props: {
      data: { serverSideUserAgent },
    },
  };
};

const Home: NextPage = ({
  data,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { isMobile } = getSelectorsByUserAgent(
    data.serverSideUserAgent ?? navigator.userAgent
  );

  return (
    <>
      <Head>
        <title>Microservices App - CSV to PDF</title>
      </Head>
      <Csv2PdfHero isMobile={isMobile} />
    </>
  );
};

export default Home;
