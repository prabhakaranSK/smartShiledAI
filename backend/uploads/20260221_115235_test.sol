// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestVulnerableContract {

    address public owner;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    // Deposit ether into contract
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    // ❌ VULNERABILITY: Reentrancy risk
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Not enough balance");

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount;
    }

    // ❌ VULNERABILITY: Anyone can change owner
    function changeOwner(address newOwner) public {
        owner = newOwner;
    }

    // ❌ VULNERABILITY: Integer overflow (older solidity unsafe style)
    function unsafeAdd(uint256 a, uint256 b) public pure returns (uint256) {
        return a + b;
    }

    // ❌ VULNERABILITY: No access control
    function drainContract() public {
        payable(msg.sender).transfer(address(this).balance);
    }

    // Helper function
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}