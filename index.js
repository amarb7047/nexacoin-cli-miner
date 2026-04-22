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
                      'Login via Browser', 
                      'Exit'
                    ]
    }
      ]);

  if (action.includes('Exit')) {
        console.log(chalk.gray('\nGoodbye! Keep mining.\n'));
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
                        spinner.succeed(chalk.green('Authentication successful!'));
                        const uid = snap.data().uid;

                await miningDashboard(uid);
              }
      });
  }
}

async function miningDashboard(uid) {
    while (true) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (!userDoc.exists()) {
                  console.log(chalk.red('User not found.'));
                  process.exit(1);
          }
          const data = userDoc.data();

      showHeader();

      console.log(
              boxen(
                        chalk.cyanBright.bold(`Miner: `) + chalk.white(data.displayName || 'Anonymous') + '\n' +
                        chalk.cyanBright.bold(`Balance: `) + chalk.yellowBright(`${data.balance} NXC`) + '\n' +
                        chalk.cyanBright.bold(`Level: `) + chalk.white(data.level || 1),
                { padding: 1, borderColor: 'cyan', borderStyle: 'double', title: 'Dashboard', titleAlignment: 'center' }
                      )
            );

      const { action } = await inquirer.prompt([
        {
                  type: 'list',
                  name: 'action',
                  message: 'Terminal Actions:',
                  choices: [
                              'CLI Turbo Mine (Separate from Web)', 
                              'Refresh Stats', 
                              'Logout'
                            ]
        }
            ]);

      if (action.includes('Logout')) {
              console.log(chalk.gray('\nLogged out successfully.\n'));
              process.exit(0);
      }

      if (action.includes('Refresh')) {
              const spinner = ora('Refreshing...').start();
              await new Promise(r => setTimeout(r, 500));
              spinner.stop();
              continue;
      }

      if (action.includes('Mine')) {
              const now = Date.now();
              const cooldown = 3 * 60 * 60 * 1000; // 3 hours cooldown for CLI mining

            // We check cliLastMined instead of lastMined (which is for web)
            if (data.cliLastMined && now - data.cliLastMined < cooldown) {
                      const remaining = cooldown - (now - data.cliLastMined);
                      const h = Math.floor(remaining / 3600000);
                      const m = Math.floor((remaining % 3600000) / 60000);
                      console.log(
                                  boxen(
                                                chalk.redBright(`CLI Mining on Cooldown!\n`) +
                                                chalk.white(`Next turbo mine available in: ${h}h ${m}m.`),
                                    { padding: 1, borderColor: 'red', borderStyle: 'round' }
                                              )
                                );
                      await new Promise(r => setTimeout(r, 3000));
            } else {
                      const spinner = ora({ text: chalk.blueBright('Establishing secure node connection...'), spinner: 'aesthetic' }).start();
                      await new Promise(r => setTimeout(r, 1000));
                      spinner.text = chalk.cyan('Running PoW algorithms (Turbo Mode)...');
                      await new Promise(r => setTimeout(r, 1500));
                      spinner.text = chalk.magenta('Verifying cryptographic block hashes...');
                      await new Promise(r => setTimeout(r, 1500));

                const baseAmount = 15;
                      const levelBonus = (data.level - 1) * 3;
                      const amount = Math.floor(baseAmount + levelBonus);

                try {
                            await updateDoc(doc(db, 'users', uid), {
                                          balance: increment(amount),
                                          totalMined: increment(amount),
                                          cliLastMined: now,
                                          xp: increment(amount * 2) 
                            });
                            spinner.stop();
                            console.log(
                                          boxen(
                                                          chalk.greenBright.bold('BLOCK MINED SUCCESSFULLY!\n') +
                                                          chalk.yellow(`Reward: +${amount} NXC\n`) +
                                                          chalk.magenta(`Bonus XP: +${amount * 2}`),
                                            { padding: 1, borderColor: 'green', borderStyle: 'bold' }
                                                        )
                                        );
                } catch (e) {
                            spinner.fail(chalk.red('Mining failed. ' + e.message));
                }
                      await new Promise(r => setTimeout(r, 3000));
            }
      }
    }
}

main().catch(console.error);
