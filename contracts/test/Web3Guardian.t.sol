// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Web3Guardian} from "../src/Web3Guardian.sol";

interface Vm {
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
    function warp(uint256 newTimestamp) external;
}

contract Web3GuardianTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    Web3Guardian private guardian;

    event RiskAssessmentRecorded(
        address indexed user,
        bytes32 indexed transactionId,
        uint8 riskLevel,
        uint8 score,
        uint256 timestamp
    );

    function setUp() public {
        guardian = new Web3Guardian();
    }

    function testRecordsAssessmentSuccessfully() public {
        bytes32 transactionId = keccak256("transaction-1");
        address user = address(0xA11CE);
        uint256 timestamp = 1_700_000_000;

        vm.warp(timestamp);
        vm.prank(user);
        guardian.recordAssessment(transactionId, 1, 72);

        Web3Guardian.RiskAssessment memory assessment = guardian.getAssessment(transactionId);

        assertEq(assessment.user, user);
        assertEq(assessment.transactionId, transactionId);
        assertEq(assessment.riskLevel, 1);
        assertEq(assessment.score, 72);
        assertEq(assessment.timestamp, timestamp);
    }

    function testEmitsEventAfterSuccessfulRecording() public {
        bytes32 transactionId = keccak256("transaction-2");
        address user = address(0xB0B);
        uint256 timestamp = 1_800_000_000;

        vm.warp(timestamp);
        vm.expectEmit(true, true, false, true);
        emit RiskAssessmentRecorded(user, transactionId, 2, 90, timestamp);

        vm.prank(user);
        guardian.recordAssessment(transactionId, 2, 90);
    }

    function testStoredUserIsMessageSender() public {
        bytes32 transactionId = keccak256("transaction-3");
        address user = address(0xCAFE);

        vm.prank(user);
        guardian.recordAssessment(transactionId, 0, 10);

        Web3Guardian.RiskAssessment memory assessment = guardian.getAssessment(transactionId);
        assertEq(assessment.user, user);
    }

    function testDuplicateTransactionIdReverts() public {
        bytes32 transactionId = keccak256("transaction-4");

        guardian.recordAssessment(transactionId, 0, 5);

        vm.expectRevert(bytes("Assessment already recorded"));
        guardian.recordAssessment(transactionId, 1, 30);
    }

    function testInvalidRiskLevelReverts() public {
        vm.expectRevert(bytes("Invalid risk level"));
        guardian.recordAssessment(keccak256("transaction-5"), 3, 50);
    }

    function testScoreAboveOneHundredReverts() public {
        vm.expectRevert(bytes("Invalid score"));
        guardian.recordAssessment(keccak256("transaction-6"), 1, 101);
    }

    function testHasAssessmentReturnsCorrectResult() public {
        bytes32 transactionId = keccak256("transaction-7");
        bytes32 missingTransactionId = keccak256("missing-transaction");

        assertFalse(guardian.hasAssessment(transactionId));
        assertFalse(guardian.hasAssessment(missingTransactionId));

        guardian.recordAssessment(transactionId, 2, 100);

        assertTrue(guardian.hasAssessment(transactionId));
        assertFalse(guardian.hasAssessment(missingTransactionId));
    }

    function assertEq(address actual, address expected) internal pure {
        require(actual == expected, "address mismatch");
    }

    function assertEq(bytes32 actual, bytes32 expected) internal pure {
        require(actual == expected, "bytes32 mismatch");
    }

    function assertEq(uint256 actual, uint256 expected) internal pure {
        require(actual == expected, "uint256 mismatch");
    }

    function assertTrue(bool value) internal pure {
        require(value, "expected true");
    }

    function assertFalse(bool value) internal pure {
        require(!value, "expected false");
    }
}
