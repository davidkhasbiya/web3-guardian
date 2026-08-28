// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Web3Guardian} from "../src/Web3Guardian.sol";

contract Deploy is Script {
    function run() external returns (Web3Guardian guardian) {
        vm.startBroadcast();

        guardian = new Web3Guardian();

        vm.stopBroadcast();
    }
}