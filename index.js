#!/usr/bin/env node
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const open = require('open');
const figlet = require('figlet');
const boxen = require('boxen');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, increment, onSnapshot } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC4uft0hfgsW6F2Xr1Bfir3HcUZ7Zv6Blw",
  authDomain: "nexacoin-af273.firebaseapp.com",
  projectId: "nexacoin-af273",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function showHeader() {
  console.clear();
  console.log(
    chalk.cyanBright(figlet.textSync('NexaCoin CLI', { horizontalLayout: 'full' }))
  );
  console.log(chalk.gray('The Future of Web3 Terminal Mining | v1.0.0\n'));
}

const generateSessionId = () => Math.random().toString(36).substring(2, 15);

async function main() {
  showHeader();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Welcome to NexaCoin! Choose an option:',
      choices: [
        '🚀 Login via Browser', 
        '🚪 Exit'
      ]
    }
  ]);

  if (action.includes('Exit')) {
    console.log(chalk.gray('\nGoodbye! Keep mining. ⛏️\n'));
    process.exit(0);
  }

  if (action.includes('Login')) {
    const sessionId = generateSessionId();
    const loginUrl = `https://nexacoin-af273.web.app/?cli_session=${sessionId}`;
    
    console.log(
      boxen(
        chalk.yellow('Waiting for Web Authentication...\n\n') +
        chalk.white('Your browser will open automatically.\n') +
        chalk.gray(`If not, visit:\n${loginUrl}`),
        { padding: 1, margin: 1, borderColor: 'yellow', borderStyle: 'round' }
      )
    );
    
    await open(loginUrl);
    
    const spinner = ora({
      text: chalk.cyan('Listening for successful login...'),
      spinner: 'dots12'
    }).start();
    
    const unsubscribe = onSnapshot(doc(db, 'cli_sessions', sessionId), async (snap) => {
      if (snap.exists() && snap.data().uid) {
        unsubscribe();
        spinner.succeed(chalk.green('Authentication successful! 🎉'));
        const uid = snap.data().uid;
        
        await miningDashboard(uid);
      }
    });
  }
}

async function startAutoMiner(uid, data) {
  console.clear();
  showHeader();
  
  console.log(boxen(
    chalk.greenBright.bold('🚀 24/7 AUTO-MINER INITIATED\n') +
    chalk.white('Leave this terminal open. It will mine continuously.\n') +
    chalk.cyanBright(`Miner: `) + chalk.white(data.displayName || 'Anonymous') + '\n' +
    chalk.gray('Press Ctrl+C to stop.'),
    { padding: 1, borderColor: 'green', borderStyle: 'double' }
  ));

  let localBalance = data.balance;
  let blocksMined = 0;

  // Real-time hashing logs every 2 seconds
  setInterval(() => {
    const hashRate = (Math.random() * 800 + 200).toFixed(2);
    const nonce = Math.floor(Math.random() * 999999999);
    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] `) + chalk.cyanBright(`⚙️  Hashing... Rate: ${hashRate} MH/s | Nonce: 0x${nonce.toString(16)}`));
  }, 2000);

  // Auto-claim every 30 seconds
  setInterval(async () => {
    try {
      const reward = 2; // Auto claim 2 NXC per 30 seconds
      await updateDoc(doc(db, 'users', uid), {
        balance: increment(reward),
        totalMined: increment(reward),
        xp: increment(1)
      });
      localBalance += reward;
      blocksMined++;
      
      console.log('\n' + boxen(
        chalk.greenBright.bold(`✅ NEW BLOCK VERIFIED & CLAIMED! `) + chalk.yellow(`+${reward} NXC\n`) +
        chalk.cyan(`Total Auto-Mined: ${blocksMined} Blocks\n`) +
        chalk.magenta(`Current Balance: ${localBalance} NXC`),
        { padding: 1, borderColor: 'yellow', borderStyle: 'round' }
      ) + '\n');
    } catch (e) {
      console.log(chalk.red(`[Error] Failed to claim block: ${e.message}`));
    }
  }, 30000);
}

async function miningDashboard(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    console.log(chalk.red('User not found.'));
    process.exit(1);
  }
  const data = userDoc.data();

  showHeader();

  console.log(
    boxen(
      chalk.cyanBright.bold(`👤 Miner: `) + chalk.white(data.displayName || 'Anonymous') + '\n' +
      chalk.cyanBright.bold(`💰 Balance: `) + chalk.yellowBright(`${data.balance} NXC`) + '\n' +
      chalk.cyanBright.bold(`🏆 Level: `) + chalk.white(data.level || 1),
      { padding: 1, borderColor: 'cyan', borderStyle: 'double', title: 'Dashboard', titleAlignment: 'center' }
    )
  );

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Terminal Actions:',
      choices: [
        '⚡ Start 24/7 Auto-Miner (Live)', 
        '🚪 Logout'
      ]
    }
  ]);

  if (action.includes('Logout')) {
    console.log(chalk.gray('\nLogged out successfully.\n'));
    process.exit(0);
  }
  
  if (action.includes('Auto-Miner')) {
    await startAutoMiner(uid, data);
  }
}

main().catch(console.error);
