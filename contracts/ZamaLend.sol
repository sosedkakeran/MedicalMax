// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialDoge} from "./ConfidentialDoge.sol";
import {ConfidentialUSDT} from "./ConfidentialUSDT.sol";

contract ZamaLend is SepoliaConfig {
    address public owner;

    ConfidentialDoge public cDoge;
    ConfidentialUSDT public cUSDT;

    uint64 public dogePrice = 210000; // 1 DOGE = 0.21 USDT (with 6 decimals)
    uint64 public constant COLLATERAL_RATIO = 200; // 200% collateralization (50% LTV)
    uint64 public constant PRECISION = 100;

    struct UserPosition {
        euint64 collateralAmount; // Amount of cDoge deposited
        euint64 borrowedAmount; // Amount of cUSDT borrowed
    }

    mapping(address => UserPosition) public positions;

    event Deposited(address indexed user, uint64 amount);
    event Borrowed(address indexed user, uint64 amount);
    event Repaid(address indexed user, uint64 amount);
    event Withdrawn(address indexed user, uint64 amount);
    event PriceUpdated(uint256 newPrice);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _cDoge, address _cUSDT) {
        owner = msg.sender;
        cDoge = ConfidentialDoge(_cDoge);
        cUSDT = ConfidentialUSDT(_cUSDT);
    }

    function setDogePrice(uint64 _price) external onlyOwner {
        dogePrice = _price;
        emit PriceUpdated(_price);
    }

    function deposit(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer cDoge from user to this contract
        FHE.allowTransient(amount, address(cDoge));
        cDoge.confidentialTransferFrom(msg.sender, address(this), amount);

        // Ensure collateral amount is initialized
        if (!FHE.isInitialized(positions[msg.sender].collateralAmount)) {
            positions[msg.sender].collateralAmount = FHE.asEuint64(0);
        }

        // Update user position
        positions[msg.sender].collateralAmount = FHE.add(positions[msg.sender].collateralAmount, amount);
        FHE.allowThis(positions[msg.sender].collateralAmount);
        FHE.allow(positions[msg.sender].collateralAmount, msg.sender);

        emit Deposited(msg.sender, uint64(0)); // Cannot emit encrypted amount
    }

    function borrow(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        UserPosition storage position = positions[msg.sender];
        
        // Ensure borrowed amount is initialized
        if (!FHE.isInitialized(position.borrowedAmount)) {
            position.borrowedAmount = FHE.asEuint64(0);
        }

        // collateral check
        euint64 newBorrowedAmount = FHE.add(position.borrowedAmount, amount);

        // Calculate max borrowable amount based on collateral
        // Max borrow = (collateral * price * PRECISION) / COLLATERAL_RATIO
        euint64 collateralValue = FHE.mul(position.collateralAmount, dogePrice);
        euint64 maxBorrowableAmount = FHE.div(FHE.mul(collateralValue, PRECISION), COLLATERAL_RATIO);

        // Check if new borrowed amount exceeds max borrowable amount
        ebool canBorrow = FHE.le(newBorrowedAmount, maxBorrowableAmount);

        // Only proceed if user can borrow
        euint64 actualBorrowAmount = FHE.select(canBorrow, amount, FHE.asEuint64(0));

        position.borrowedAmount = FHE.add(position.borrowedAmount, actualBorrowAmount);
        FHE.allowThis(position.borrowedAmount);
        FHE.allow(position.borrowedAmount, msg.sender);

        // Transfer cUSDT to user (only the actual borrow amount)
        FHE.allowTransient(actualBorrowAmount, address(cUSDT));
        cUSDT.confidentialTransfer(msg.sender, actualBorrowAmount);

        emit Borrowed(msg.sender, uint64(0)); // Cannot emit encrypted amount
    }

    function repay(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        UserPosition storage position = positions[msg.sender];
        
        // Ensure borrowed amount is initialized (handle zero case)
        if (!FHE.isInitialized(position.borrowedAmount)) {
            position.borrowedAmount = FHE.asEuint64(0);
        }

        // Calculate actual repay amount (cannot exceed borrowed amount)
        euint64 actualRepayAmount = FHE.min(amount, position.borrowedAmount);

        // Transfer cUSDT from user to this contract
        FHE.allowTransient(actualRepayAmount, address(cUSDT));
        cUSDT.confidentialTransferFrom(msg.sender, address(this), actualRepayAmount);

        // Update borrowed amount
        position.borrowedAmount = FHE.sub(position.borrowedAmount, actualRepayAmount);
        FHE.allowThis(position.borrowedAmount);
        FHE.allow(position.borrowedAmount, msg.sender);

        emit Repaid(msg.sender, uint64(0)); // Cannot emit encrypted amount
    }

    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        UserPosition storage position = positions[msg.sender];

        // collateral check - calculate remaining collateral after withdrawal
        euint64 newCollateralAmount = FHE.sub(position.collateralAmount, amount);

        // Calculate min required collateral based on borrowed amount
        // Min collateral = (borrowed * COLLATERAL_RATIO) / (price * PRECISION)
        euint64 minRequiredCollateral = FHE.div(
            FHE.mul(position.borrowedAmount, COLLATERAL_RATIO),
            dogePrice * PRECISION
        );

        // Check if remaining collateral meets minimum requirement
        ebool canWithdraw = FHE.ge(newCollateralAmount, minRequiredCollateral);

        // Only proceed if user can withdraw
        euint64 actualWithdrawAmount = FHE.select(canWithdraw, amount, FHE.asEuint64(0));

        position.collateralAmount = FHE.sub(position.collateralAmount, actualWithdrawAmount);
        FHE.allowThis(position.collateralAmount);
        FHE.allow(position.collateralAmount, msg.sender);

        // Transfer cDoge to user (only the actual withdraw amount)
        FHE.allowTransient(actualWithdrawAmount, address(cDoge));
        cDoge.confidentialTransfer(msg.sender, actualWithdrawAmount);

        emit Withdrawn(msg.sender, uint64(0)); // Cannot emit encrypted amount
    }

    function getUserPosition(address user) external view returns (euint64, euint64) {
        return (positions[user].collateralAmount, positions[user].borrowedAmount);
    }

    // function getAvailableToBorrow(address user) external returns (euint64) {
    //     UserPosition storage position = positions[user];

    //     // Calculate max borrowable amount based on collateral
    //     // Max borrow = (collateral * price * PRECISION) / COLLATERAL_RATIO
    //     euint64 collateralValue = FHE.mul(position.collateralAmount, dogePrice);
    //     euint64 maxBorrowableAmount = FHE.div(FHE.mul(collateralValue, PRECISION), COLLATERAL_RATIO);

    //     // Available to borrow = max borrowable - already borrowed
    //     euint64 availableAmount = FHE.sub(maxBorrowableAmount, position.borrowedAmount);

    //     // Make sure it's not negative (return 0 if already over-borrowed somehow)
    //     ebool isPositive = FHE.gt(maxBorrowableAmount, position.borrowedAmount);
    //     availableAmount = FHE.select(isPositive, availableAmount, FHE.asEuint64(0));

    //     return availableAmount;
    // }

    function getDogePrice() external view returns (uint64) {
        return dogePrice;
    }

    function getCollateralRatio() external pure returns (uint64) {
        return COLLATERAL_RATIO;
    }
}
