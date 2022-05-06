import React from "react";
import Head from "next/head";
import { Card, Space, Layout } from "antd";
import { HeartFilled } from "@ant-design/icons";
import PlayForm from "../components/PlayForm";
import styles from "../styles/Home.module.css";

export default function Home() {
  return (
    <div>
      <Head>
        <title>J!</title>
        <meta name="description" content="A J! trivia app" />
        <link
          rel="icon"
          href="https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2Fjeopardy.png?v=1604939463216"
          type="image/png"
          sizes="16x16"
        />
      </Head>

      <Layout className={styles.container}>
        <Layout.Content>
          <div className={styles.main}>
            <Space direction="vertical">
              <h1 className={styles.title}>Play</h1>
              <PlayForm />

              <Card
                hoverable
                title={<a href="https://j-archive.com">J! Archive &rarr;</a>}
              >
                <p>
                  Visit the J! Archive home page itself to find episode dates.
                </p>
              </Card>
            </Space>
          </div>
        </Layout.Content>
        <Layout.Footer>
          <div>
            Made with <HeartFilled /> by{" "}
            <a href="https://github.com/cmnord">cmnord</a>
          </div>
        </Layout.Footer>
      </Layout>
    </div>
  );
}
