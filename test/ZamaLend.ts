import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ZamaLend, ConfidentialDoge, ConfidentialUSDT } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const [deployer] = await ethers.getSigners();
  
  // Deploy ConfidentialDoge
  const ConfidentialDogeFactory = await ethers.getContractFactory("ConfidentialDoge");
  const confidentialDoge = (await ConfidentialDogeFactory.deploy()) as ConfidentialDoge;
  const cDogeAddress = await confidentialDoge.getAddress();

  // Deploy ConfidentialUSDT
  const ConfidentialUSDTFactory = await ethers.getContractFactory("ConfidentialUSDT");
  const confidentialUSDT = (await ConfidentialUSDTFactory.deploy()) as ConfidentialUSDT;
  const cUSDTAddress = await confidentialUSDT.getAddress();

  // Deploy ZamaLend
  const ZamaLendFactory = await ethers.getContractFactory("ZamaLend");
  const zamaLend = (await ZamaLendFactory.deploy(cDogeAddress, cUSDTAddress)) as ZamaLend;
  const zamaLendAddress = await zamaLend.getAddress();

  return {
    confidentialDoge,
    confidentialUSDT,
    zamaLend,
    cDogeAddress,
    cUSDTAddress,
    zamaLendAddress,
  };
}

describe("ZamaLend", function () {
  let signers: Signers;
  let confidentialDoge: ConfidentialDoge;
  let confidentialUSDT: ConfidentialUSDT;
  let zamaLend: ZamaLend;
  let cDogeAddress: string;
  let cUSDTAddress: string;
  let zamaLendAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({
      confidentialDoge,
      confidentialUSDT,
      zamaLend,
      cDogeAddress,
      cUSDTAddress,
      zamaLendAddress,
    } = await deployFixture());
  });

  describe("Token Setup", function () {
    it("should deploy all contracts with correct addresses", async function () {
      expect(await zamaLend.cDoge()).to.equal(cDogeAddress);
      expect(await zamaLend.cUSDT()).to.equal(cUSDTAddress);
      expect(await zamaLend.owner()).to.equal(signers.deployer.address);
    });

    it("should have correct token names and symbols", async function () {
      expect(await confidentialDoge.name()).to.equal("cDoge");
      expect(await confidentialDoge.symbol()).to.equal("cDOGE");
      expect(await confidentialUSDT.name()).to.equal("cUSDT");
      expect(await confidentialUSDT.symbol()).to.equal("cUSDT");
    });
  });

  describe("Token Minting", function () {
    it("should mint cDoge tokens to alice", async function () {
      const mintAmount = 1000;
      
      // Mint cDoge to Alice
      await confidentialDoge.connect(signers.deployer).mint(signers.alice.address, mintAmount);
      
      // Check Alice's balance
      const encryptedBalance = await confidentialDoge.confidentialBalanceOf(signers.alice.address);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        cDogeAddress,
        signers.alice,
      );
      
      expect(decryptedBalance).to.equal(mintAmount);
    });

    it("should mint cUSDT tokens to contract for lending", async function () {
      const mintAmount = 10000;
      
      // Mint cUSDT to ZamaLend contract for lending
      await confidentialUSDT.connect(signers.deployer).mint(zamaLendAddress, mintAmount);
      
      // Check contract's balance
      const encryptedBalance = await confidentialUSDT.confidentialBalanceOf(zamaLendAddress);
      const decryptedBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        encryptedBalance,
        cUSDTAddress,
        signers.deployer, // Contract owner can decrypt
      );
      
      expect(decryptedBalance).to.equal(mintAmount);
    });
  });

  describe("Deposit Functionality", function () {
    beforeEach(async function () {
      // Mint some cDoge to Alice for testing
      await confidentialDoge.connect(signers.deployer).mint(signers.alice.address, 1000);
    });

    it("should allow alice to deposit cDoge as collateral", async function () {
      const depositAmount = 100;
      
      // Create encrypted input for deposit
      const encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      // Alice approves ZamaLend to spend her cDoge
      const approveInput = await fhevm
        .createEncryptedInput(cDogeAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();
      
      await confidentialDoge
        .connect(signers.alice)
        .setOperator(zamaLendAddress, Math.floor(Date.now() / 1000) + 3600); // 1 hour approval

      // Deposit collateral
      await zamaLend
        .connect(signers.alice)
        .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

      // Check user position
      const [collateral, borrowed] = await zamaLend.getUserPosition(signers.alice.address);
      
      const decryptedCollateral = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        collateral,
        zamaLendAddress,
        signers.alice,
      );

      expect(decryptedCollateral).to.equal(depositAmount);
    });
  });

  describe("Borrow Functionality", function () {
    beforeEach(async function () {
      // Setup: Mint tokens and deposit collateral
      await confidentialDoge.connect(signers.deployer).mint(signers.alice.address, 1000);
      await confidentialUSDT.connect(signers.deployer).mint(zamaLendAddress, 10000);
      
      // Alice deposits collateral
      const depositAmount = 200;
      const encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await confidentialDoge
        .connect(signers.alice)
        .setOperator(zamaLendAddress, Math.floor(Date.now() / 1000) + 3600);
      
      await zamaLend
        .connect(signers.alice)
        .deposit(encryptedInput.handles[0], encryptedInput.inputProof);
    });

    it("should allow alice to borrow cUSDT", async function () {
      const borrowAmount = 50;
      
      // Create encrypted input for borrow
      const encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(borrowAmount)
        .encrypt();

      // Borrow cUSDT
      await zamaLend
        .connect(signers.alice)
        .borrow(encryptedInput.handles[0], encryptedInput.inputProof);

      // Check user position
      const [collateral, borrowed] = await zamaLend.getUserPosition(signers.alice.address);
      
      const decryptedBorrowed = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        borrowed,
        zamaLendAddress,
        signers.alice,
      );

      expect(decryptedBorrowed).to.equal(borrowAmount);

      // Check Alice's cUSDT balance
      const cUSDTBalance = await confidentialUSDT.confidentialBalanceOf(signers.alice.address);
      const decryptedUSDTBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        cUSDTBalance,
        cUSDTAddress,
        signers.alice,
      );

      expect(decryptedUSDTBalance).to.equal(borrowAmount);
    });
  });

  describe("Repay Functionality", function () {
    beforeEach(async function () {
      // Setup: Full flow - mint, deposit, borrow
      await confidentialDoge.connect(signers.deployer).mint(signers.alice.address, 1000);
      await confidentialUSDT.connect(signers.deployer).mint(zamaLendAddress, 10000);
      
      // Alice deposits collateral
      const depositAmount = 200;
      let encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(depositAmount)
        .encrypt();

      await confidentialDoge
        .connect(signers.alice)
        .setOperator(zamaLendAddress, Math.floor(Date.now() / 1000) + 3600);
      
      await zamaLend
        .connect(signers.alice)
        .deposit(encryptedInput.handles[0], encryptedInput.inputProof);

      // Alice borrows
      const borrowAmount = 50;
      encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(borrowAmount)
        .encrypt();

      await zamaLend
        .connect(signers.alice)
        .borrow(encryptedInput.handles[0], encryptedInput.inputProof);
    });

    it("should allow alice to repay borrowed cUSDT", async function () {
      const repayAmount = 25;
      
      // Create encrypted input for repay
      const encryptedInput = await fhevm
        .createEncryptedInput(zamaLendAddress, signers.alice.address)
        .add64(repayAmount)
        .encrypt();

      // Alice approves ZamaLend to spend her cUSDT for repayment
      await confidentialUSDT
        .connect(signers.alice)
        .setOperator(zamaLendAddress, Math.floor(Date.now() / 1000) + 3600);

      // Repay cUSDT
      await zamaLend
        .connect(signers.alice)
        .repay(encryptedInput.handles[0], encryptedInput.inputProof);

      // Check user position
      const [collateral, borrowed] = await zamaLend.getUserPosition(signers.alice.address);
      
      const decryptedBorrowed = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        borrowed,
        zamaLendAddress,
        signers.alice,
      );

      expect(decryptedBorrowed).to.equal(50 - repayAmount); // 50 borrowed - 25 repaid = 25
    });
  });

  describe("Price Management", function () {
    it("should allow owner to set Doge price", async function () {
      const newPrice = 2000000; // 2 USDT per DOGE
      
      await zamaLend.connect(signers.deployer).setDogePrice(newPrice);
      
      expect(await zamaLend.getDogePrice()).to.equal(newPrice);
    });

    it("should not allow non-owner to set price", async function () {
      const newPrice = 2000000;
      
      await expect(
        zamaLend.connect(signers.alice).setDogePrice(newPrice)
      ).to.be.revertedWith("Not owner");
    });
  });
});