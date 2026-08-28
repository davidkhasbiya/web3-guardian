// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Web3Guardian {
    struct RiskAssessment {
        address user;
        bytes32 transactionId;
        uint8 riskLevel;
        uint8 score;
        uint256 timestamp;
    }

    mapping(bytes32 => RiskAssessment) public assessments;
    mapping(bytes32 => bool) private recordedAssessments;

    event RiskAssessmentRecorded(
        address indexed user,
        bytes32 indexed transactionId,
        uint8 riskLevel,
        uint8 score,
        uint256 timestamp
    );

    function recordAssessment(bytes32 transactionId, uint8 riskLevel, uint8 score) external {
        require(!recordedAssessments[transactionId], "Assessment already recorded");
        require(riskLevel <= 2, "Invalid risk level");
        require(score <= 100, "Invalid score");

        uint256 timestamp = block.timestamp;

        assessments[transactionId] = RiskAssessment({
            user: msg.sender,
            transactionId: transactionId,
            riskLevel: riskLevel,
            score: score,
            timestamp: timestamp
        });
        recordedAssessments[transactionId] = true;

        emit RiskAssessmentRecorded(msg.sender, transactionId, riskLevel, score, timestamp);
    }

    function getAssessment(bytes32 transactionId) external view returns (RiskAssessment memory) {
        return assessments[transactionId];
    }

    function hasAssessment(bytes32 transactionId) external view returns (bool) {
        return recordedAssessments[transactionId];
    }
}
