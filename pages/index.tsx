import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Home.module.css'
import DatePicker from "../components/DatePicker";

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>J!</title>
        <meta name="description" content="A J! trivia app" />
        <link rel="icon" href="https://cdn.glitch.com/a0ea5fd0-c422-4261-8950-fdebebccb098%2Fjeopardy.png?v=1604939463216" type="image/png" sizes="16x16" />

      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Play
        </h1>


        <div className={styles.description}>
          <DatePicker />
        </div>

        <div className={styles.grid}>
          <a href="https://j-archive.com" className={styles.card}>
            <h2>J! Archive &rarr;</h2>
            <p>Visit the J! Archive home page itself to find episode dates.</p>
          </a>
        </div>
      </main>
    </div>
  )
}

export default Home
