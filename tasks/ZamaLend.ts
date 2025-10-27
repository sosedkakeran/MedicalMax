import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact with ZamaLend
 * ============================================
 *
 * 1. Deploy all contracts:
 *   npx hardhat --network localhost deploy
 *
 * 2. Setup tokens (mint):
 *   npx hardhat --network localhost task:mint-cdoge --to 0xYourAddress --amount 1000
 *   npx hardhat --network localhost task:mint-cusdt --to ZamaLendAddress --amount 10000
 *
 * 3. Interact with lending protocol:
 *   npx hardhat --network localhost task:deposit --amount 100
 *   npx hardhat --network localhost task:borrow --amount 50
 *   npx hardhat --network localhost task:repay --amount 25
 *   npx hardhat --network localhost task:withdraw --amount 50
 *
 * 4. Check positions and prices:
 *   npx hardhat --network localhost task:get-position
 *   npx hardhat --network localhost task:get-price
 *   npx hardhat --network localhost task:set-price --price 2000000
 */

task("task:zamalend-address", "Prints the ZamaLend contract address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const zamaLend = await deployments.get("ZamaLend");
  console.log("ZamaLend address is " + zamaLend.address);
});

task("task:mint-cdoge", "Mints cDoge tokens to specified address")
  .addParam("toindex", "Recipient address")
  .addParam("amount", "Amount to mint")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    
    const amount = parseInt(taskArguments.amount) * 1000000;
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    const cDogeDeployment = await deployments.get("ConfidentialDoge");
    const signers = await ethers.getSigners();
    const toAddress = signers[taskArguments.toindex].address
    const cDogeContract = await ethers.getContractAt("ConfidentialDoge", cDogeDeployment.address);

    const tx = await cDogeContract.connect(signers[0]).mint(toAddress, amount);
    console.log(`Wait for tx:${tx.hash}...`);
    
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Minted ${taskArguments.amount} cDoge to ${taskArguments.toindex}`);
  });

task("task:mint-cusdt", "Mints cUSDT tokens to specified address")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount to mint")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    
    const amount = parseInt(taskArguments.amount)*1000000;
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    const cUSDTDeployment = await deployments.get("ConfidentialUSDT");
    const signers = await ethers.getSigners();
    // const toAddress = signers[taskArguments.toindex].address
    const cUSDTContract = await ethers.getContractAt("ConfidentialUSDT", cUSDTDeployment.address);

    const tx = await cUSDTContract.connect(signers[0]).mint(taskArguments.to, amount);
    console.log(`Wait for tx:${tx.hash}...`);
    
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Minted ${taskArguments.amount} cUSDT to ${taskArguments.toindex}`);
  });

task("task:deposit", "Deposits cDoge as collateral")
  .addParam("amount", "Amount to deposit")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    
    const amount = parseInt(taskArguments.amount)*1000000;
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const cDogeDeployment = await deployments.get("ConfidentialDoge");
    const signers = await ethers.getSigners();
    
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);
    const cDogeContract = await ethers.getContractAt("ConfidentialDoge", cDogeDeployment.address);

    // Approve ZamaLend to spend cDoge
    await cDogeContract.connect(signers[0]).setOperator(zamaLendDeployment.address, Math.floor(Date.now() / 1000) + 3600);
    console.log("Approved ZamaLend to spend cDoge");

    // Encrypt the amount
    const encryptedValue = await fhevm
      .createEncryptedInput(zamaLendDeployment.address, signers[0].address)
      .add64(amount)
      .encrypt();

    const tx = await zamaLendContract
      .connect(signers[0])
      .deposit(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Deposited ${amount} cDoge as collateral`);
  });

task("task:borrow", "Borrows cUSDT against collateral")
  .addParam("amount", "Amount to borrow")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    
    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const signers = await ethers.getSigners();
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);

    // Encrypt the amount
    const encryptedValue = await fhevm
      .createEncryptedInput(zamaLendDeployment.address, signers[0].address)
      .add64(amount)
      .encrypt();

    const tx = await zamaLendContract
      .connect(signers[0])
      .borrow(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Borrowed ${amount} cUSDT`);
  });

task("task:repay", "Repays borrowed cUSDT")
  .addParam("amount", "Amount to repay")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    
    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const cUSDTDeployment = await deployments.get("ConfidentialUSDT");
    const signers = await ethers.getSigners();
    
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);
    const cUSDTContract = await ethers.getContractAt("ConfidentialUSDT", cUSDTDeployment.address);

    // Approve ZamaLend to spend cUSDT for repayment
    await cUSDTContract.connect(signers[0]).setOperator(zamaLendDeployment.address, Math.floor(Date.now() / 1000) + 3600);
    console.log("Approved ZamaLend to spend cUSDT for repayment");

    // Encrypt the amount
    const encryptedValue = await fhevm
      .createEncryptedInput(zamaLendDeployment.address, signers[0].address)
      .add64(amount)
      .encrypt();

    const tx = await zamaLendContract
      .connect(signers[0])
      .repay(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Repaid ${amount} cUSDT`);
  });

task("task:withdraw", "Withdraws cDoge collateral")
  .addParam("amount", "Amount to withdraw")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;
    
    const amount = parseInt(taskArguments.amount);
    if (!Number.isInteger(amount)) {
      throw new Error(`Argument --amount is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const signers = await ethers.getSigners();
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);

    // Encrypt the amount
    const encryptedValue = await fhevm
      .createEncryptedInput(zamaLendDeployment.address, signers[0].address)
      .add64(amount)
      .encrypt();

    const tx = await zamaLendContract
      .connect(signers[0])
      .withdraw(encryptedValue.handles[0], encryptedValue.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Withdrew ${amount} cDoge`);
  });

task("task:get-position", "Gets user's lending position")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .addOptionalParam("user", "User address (defaults to first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;
    
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);

    const [encryptedCollateral, encryptedBorrowed] = await zamaLendContract.getUserPosition(userAddress);
    
    if (encryptedCollateral === ethers.ZeroHash) {
      console.log("User has no position");
      return;
    }

    try {
      const collateralAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedCollateral,
        zamaLendDeployment.address,
        signers[0],
      );
      
      const borrowedAmount = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBorrowed,
        zamaLendDeployment.address,
        signers[0],
      );

      console.log(`User Position for ${userAddress}:`);
      console.log(`  Collateral: ${collateralAmount} cDoge`);
      console.log(`  Borrowed: ${borrowedAmount} cUSDT`);
    } catch (error) {
      console.log("Could not decrypt position (insufficient permissions)");
      console.log(`Encrypted collateral: ${encryptedCollateral}`);
      console.log(`Encrypted borrowed: ${encryptedBorrowed}`);
    }
  });

task("task:get-price", "Gets the current Doge price")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);
    const price = await zamaLendContract.getDogePrice();
    const collateralRatio = await zamaLendContract.getCollateralRatio();
    
    console.log(`Current Doge Price: ${price} (1 DOGE = ${Number(price) / 1000000} USDT)`);
    console.log(`Collateral Ratio: ${collateralRatio}% (LTV: ${Number(100n / collateralRatio) * 100}%)`);
  });

task("task:set-price", "Sets the Doge price (owner only)")
  .addParam("price", "New price in micro-USDT (1000000 = 1 USDT)")
  .addOptionalParam("address", "Optionally specify the ZamaLend contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    
    const price = parseInt(taskArguments.price);
    if (!Number.isInteger(price)) {
      throw new Error(`Argument --price is not an integer`);
    }

    const zamaLendDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("ZamaLend");
    
    const signers = await ethers.getSigners();
    const zamaLendContract = await ethers.getContractAt("ZamaLend", zamaLendDeployment.address);

    const tx = await zamaLendContract.connect(signers[0]).setDogePrice(price);
    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
    console.log(`Set Doge price to ${price} (1 DOGE = ${price / 1000000} USDT)`);
  });

task("task:get-balance", "Gets user's token balance")
  .addParam("token", "Token type: 'cdoge' or 'cusdt'")
  .addOptionalParam("user", "User address (defaults to first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const tokenType = taskArguments.token.toLowerCase();
    if (tokenType !== 'cdoge' && tokenType !== 'cusdt') {
      throw new Error(`Invalid token type. Use 'cdoge' or 'cusdt'`);
    }

    const contractName = tokenType === 'cdoge' ? 'ConfidentialDoge' : 'ConfidentialUSDT';
    const tokenDeployment = await deployments.get(contractName);
    
    const signers = await ethers.getSigners();
    const userAddress = taskArguments.user || signers[0].address;
    
    const tokenContract = await ethers.getContractAt(contractName, tokenDeployment.address);
    const encryptedBalance = await tokenContract.confidentialBalanceOf(userAddress);
    
    if (encryptedBalance === ethers.ZeroHash) {
      console.log(`${tokenType.toUpperCase()} balance: 0`);
      return;
    }

    try {
      const balance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        tokenDeployment.address,
        signers[0],
      );

      console.log(`${tokenType.toUpperCase()} balance for ${userAddress}: ${balance}`);
    } catch (error) {
      console.log("Could not decrypt balance (insufficient permissions)");
      console.log(`Encrypted balance: ${encryptedBalance}`);
    }
  });