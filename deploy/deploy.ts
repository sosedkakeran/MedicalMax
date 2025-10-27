import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy ConfidentialDoge token
  const deployedcDoge = await deploy("ConfidentialDoge", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialDoge contract: `, deployedcDoge.address);

  // Deploy ConfidentialUSDT token
  const deployedcUSDT = await deploy("ConfidentialUSDT", {
    from: deployer,
    log: true,
  });
  console.log(`ConfidentialUSDT contract: `, deployedcUSDT.address);

  // Deploy ZamaLend contract
  const deployedZamaLend = await deploy("ZamaLend", {
    from: deployer,
    args: [deployedcDoge.address, deployedcUSDT.address],
    log: true,
  });
  console.log(`ZamaLend contract: `, deployedZamaLend.address);
};

export default func;
func.id = "deploy_zamaLend"; // id required to prevent reexecution
func.tags = ["ZamaLend", "ConfidentialDoge", "ConfidentialUSDT", "FHECounter"];
