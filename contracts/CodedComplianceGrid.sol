// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract CodedComplianceGrid is SepoliaConfig
{
    address private administrator;

    enum VerificationState
    {
        Unverified,
        Approved,
        Declined
    }

    struct ComplianceRecord
    {
        string documentReference;
        string fullName;
        euint32 countryCode;
        euint32 yearOfBirth;
        VerificationState currentState;
        uint256 submissionTime;
        bool isActive;
    }

    mapping(address => ComplianceRecord) private complianceData;
    address[] private participantRegistry;

    event ComplianceRecordCreated(address indexed participant, uint256 timestamp);
    event StateTransition(address indexed participant, VerificationState previousState, VerificationState updatedState);
    event AdministratorChanged(address indexed formerAdmin, address indexed currentAdmin);

    modifier onlyAdministrator()
    {
        require(msg.sender == administrator, "Unauthorized: administrator access required");
        _;
    }

    modifier recordMustExist(address participant)
    {
        require(complianceData[participant].isActive, "Compliance record not found");
        _;
    }

    constructor()
    {
        administrator = msg.sender;
    }

    function registerCompliance(
        string calldata _documentReference,
        string calldata _fullName,
        externalEuint32 _countryCode,
        externalEuint32 _yearOfBirth,
        bytes calldata validationProof
    )
        external
    {
        require(!complianceData[msg.sender].isActive, "Compliance record already exists");

        euint32 encryptedCountry = FHE.fromExternal(_countryCode, validationProof);
        euint32 encryptedYear = FHE.fromExternal(_yearOfBirth, validationProof);

        complianceData[msg.sender] = ComplianceRecord(
        {
            documentReference: _documentReference,
            fullName: _fullName,
            countryCode: encryptedCountry,
            yearOfBirth: encryptedYear,
            currentState: VerificationState.Unverified,
            submissionTime: block.timestamp,
            isActive: true
        });

        participantRegistry.push(msg.sender);

        FHE.allowThis(encryptedCountry);
        FHE.allow(encryptedCountry, administrator);
        FHE.allow(encryptedCountry, msg.sender);

        FHE.allowThis(encryptedYear);
        FHE.allow(encryptedYear, administrator);
        FHE.allow(encryptedYear, msg.sender);

        emit ComplianceRecordCreated(msg.sender, block.timestamp);
    }

    function approveRecord(address participant)
        external
        onlyAdministrator
        recordMustExist(participant)
    {
        VerificationState previousState = complianceData[participant].currentState;
        require(previousState == VerificationState.Unverified, "Record must be in unverified state");

        complianceData[participant].currentState = VerificationState.Approved;

        emit StateTransition(participant, previousState, VerificationState.Approved);
    }

    function declineRecord(address participant)
        external
        onlyAdministrator
        recordMustExist(participant)
    {
        VerificationState previousState = complianceData[participant].currentState;
        require(previousState == VerificationState.Unverified, "Record must be in unverified state");

        complianceData[participant].currentState = VerificationState.Declined;

        emit StateTransition(participant, previousState, VerificationState.Declined);
    }

    function queryRecordState(address participant)
        external
        view
        recordMustExist(participant)
        returns (VerificationState, uint256)
    {
        return (complianceData[participant].currentState, complianceData[participant].submissionTime);
    }

    function retrieveName(address participant)
        external
        view
        recordMustExist(participant)
        returns (string memory)
    {
        return complianceData[participant].fullName;
    }

    function retrieveDocumentRef(address participant)
        external
        view
        recordMustExist(participant)
        returns (string memory)
    {
        return complianceData[participant].documentReference;
    }

    function retrieveFullRecord(address participant)
        external
        view
        recordMustExist(participant)
        returns (
            string memory documentRef,
            string memory name,
            euint32 country,
            euint32 birthYear
        )
    {
        ComplianceRecord storage record = complianceData[participant];
        return (
            record.documentReference,
            record.fullName,
            record.countryCode,
            record.yearOfBirth
        );
    }

    function checkApprovalStatus(address participant)
        external
        view
        returns (bool)
    {
        if (!complianceData[participant].isActive)
        {
            return false;
        }
        return complianceData[participant].currentState == VerificationState.Approved;
    }

    function countUnverifiedRecords()
        external
        view
        onlyAdministrator
        returns (uint256)
    {
        uint256 counter = 0;
        for (uint256 idx = 0; idx < participantRegistry.length; idx++)
        {
            if (complianceData[participantRegistry[idx]].currentState == VerificationState.Unverified)
            {
                counter++;
            }
        }
        return counter;
    }

    function fetchAllParticipants()
        external
        view
        onlyAdministrator
        returns (address[] memory)
    {
        return participantRegistry;
    }

    function updateAdministrator(address newAdmin)
        external
        onlyAdministrator
    {
        require(newAdmin != address(0), "Invalid administrator address");
        address previousAdmin = administrator;
        administrator = newAdmin;
        emit AdministratorChanged(previousAdmin, newAdmin);
    }

    function recordExists(address participant)
        external
        view
        returns (bool)
    {
        return complianceData[participant].isActive;
    }
}
