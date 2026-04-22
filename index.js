#!/usr/bin/env node
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const open = require('open');
const figlet = require('figlet');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, increment, onSnapshot } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyC4uft0hfgsW6F2Xr1Bfir3HcUZ7Zv6Blw",
  authDomain: "nexacoin-af273.firebaseapp.com",
  projectId: "nexacoin-af273",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log(chalk.cyan(figlet.textSync('NexaCoin CLI', { horizontalLayout: 'full' })));

const generateSessionId = () => Math.random().toString(36).substring(2, 15);

async function main() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: ['1. Login via Browser', '2. Exit']
    }
  ]);

  if (action.includes('Exit')) {
    process.exit(0);
  }

  if (action.includes('Login')) {
    const sessionId = generateSessionId();
    const loginUrl = `https://nexacoin-af273.web.app/?cli_session=${sessionId}`;
    
    console.log(chalk.yellow('\nOpening browser for authentication...'));
    console.log(chalk.gray(`If browser doesn't open automatically, visit: ${loginUrl}\n`));
    
    await open(loginUrl);
    
    const spinner = ora('Waiting for authentication...').start();
    
    const unsubscribe = onSnapshot(doc(db, 'cli_sessions', sessionId), async (snap) => {
      if (snap.exists() && snap.data().uid) {
        unsubscribe();
        spinner.succeed(chalk.green('Successfully authenticated!'));
        const uid = snap.data().uid;
        
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          console.log(chalk.cyan(`\nWelcome, ${userDoc.data().displayName}!`));
          console.log(chalk.yellow(`Balance: ${userDoc.data().balance} NXC\n`));
          
          await miningDashboard(uid);
        }
      }
    });
  }
}

async function miningDashboard(uid) {
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Mining Dashboard:',
        choices: ['⛏️  Mine NXC', '💰 Check Balance', '🚪 Exit']
      }
    ]);

    if (action.includes('Exit')) {
      process.exit(0);
    }
    
    if (action.includes('Balance')) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      console.log(chalk.yellow(`\n💰 Current Balance: ${userDoc.data().balance} NXC\n`));
    }
    
    if (action.includes('Mine')) {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      const data = userDoc.data();
      
      const now = Date.now();
      const cooldown = 3 * 60 * 60 * 1000;
      
      if (data.lastMined && now - data.lastMined < cooldown) {
        const remaining = cooldown - (now - data.lastMined);
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        console.log(chalk.red(`\n⏳ Cooldown active! You can mine again in ${h}h ${m}m.\n`));
      } else {
        const spinner = ora('Connecting to mining node...').start();
        await new Promise(r => setTimeout(r, 1500));
        spinner.text = 'Calculating hashes...';
        await new Promise(r => setTimeout(r, 2000));
        spinner.text = 'Verifying block...';
        await new Promise(r => setTimeout(r, 1500));
        
        const baseAmount = 10;
        const levelBonus = (data.level - 1) * 2;
        const streakBonus = Math.min(data.miningStreak * 0.5, 20);
        const amount = Math.floor(baseAmount + levelBonus + streakBonus);
        
        try {
          await updateDoc(userRef, {
            balance: increment(amount),
            totalMined: increment(amount),
            lastMined: now,
            xp: increment(amount)
          });
          spinner.succeed(chalk.green(`Mining successful! +${amount} NXC added to your wallet.\n`));
        } catch (e) {
          spinner.fail(chalk.red('Mining failed. ' + e.message));
        }
      }
    }
  }
}

main().catch(console.error);
