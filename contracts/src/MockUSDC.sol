// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC contract for testing purposes with unlimited free minting
 * @notice This contract provides unlimited free minting for testing the fee-based system
 */
contract MockUSDC is ERC20, Ownable {

    uint8 private constant DECIMALS = 6; // USDC uses 6 decimals

    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10**DECIMALS); // 1M USDC
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     * @return The number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @dev Free mint function for testing - anyone can mint unlimited USDC
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint (in USDC units with 6 decimals)
     */
    function freeMint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @dev Batch mint to multiple addresses for testing
     * @param recipients Array of addresses to mint tokens to
     * @param amounts Array of amounts to mint to each recipient
     */
    function batchFreeMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Array length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }

    /**
     * @dev Mint tokens to caller with a convenient amount (1000 USDC)
     */
    function mintToSelf() external {
        _mint(msg.sender, 1000 * 10**DECIMALS);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Admin mint function (only owner)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function adminMint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}