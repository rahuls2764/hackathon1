// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// LayerZero interfaces defined inline
interface ILayerZeroReceiver {
    // @notice LayerZero endpoint will invoke this function to deliver the message on the destination
    // @param _srcChainId - the source endpoint identifier
    // @param _srcAddress - the source sending contract address from the source chain
    // @param _nonce - the ordered message nonce
    // @param _payload - the signed payload is the UA bytes has encoded to be sent
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

interface ILayerZeroEndpoint {
    // @notice send a LayerZero message to the specified address at a LayerZero endpoint.
    // @param _dstChainId - the destination chain identifier
    // @param _destination - the address on destination chain (in bytes)
    // @param _payload - a custom bytes payload to send to the destination contract
    // @param _refundAddress - if the source transaction is cheaper than the amount of value passed, refund the additional amount to this address
    // @param _zroPaymentAddress - the address of the ZRO token holder who would pay for the transaction
    // @param _adapterParams - parameters for custom functionality. e.g. receive airdropped native gas from the relayer on destination
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    // @notice used to estimate the fees for a send() message.
    // @param _dstChainId - the destination chain identifier
    // @param _userApplication - the user application sending the message
    // @param _payload - the custom message payload
    // @param _payInZRO - if true, return the fee amount in ZRO
    // @param _adapterParam - parameters for custom functionality. e.g. receive airdropped native gas from the relayer on destination
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParam
    ) external view returns (uint256 nativeFee, uint256 zroFee);
}

contract CrossChainCrowdfunding is ILayerZeroReceiver {
    // LayerZero endpoint
    ILayerZeroEndpoint public endpoint;

    struct Campaign {
        address owner;
        string title;
        string description;
        uint256 goal;
        uint256 fundsRaised;
        bool completed;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    mapping(bytes32 => bool) public confirmedTransactions; // Store confirmed txs

    // Track contributions from different chains
    mapping(uint16 => mapping(uint256 => mapping(address => uint256)))
        public crossChainContributions;

    uint256 public campaignCount;
    address public owner;

    event CampaignCreated(
        uint256 campaignId,
        address owner,
        string title,
        uint256 goal
    );
    event DonationReceived(uint256 campaignId, address donor, uint256 amount);
    event FundsWithdrawn(uint256 campaignId, uint256 amount);
    event TransactionConfirmed(bytes32 txHash);
    event CrossChainDonationReceived(
        uint16 srcChainId,
        uint256 campaignId,
        address donor,
        uint256 amount
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor(address _endpoint) {
        owner = msg.sender;
        endpoint = ILayerZeroEndpoint(_endpoint);
    }

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal
    ) external {
        require(_goal > 0, "Goal must be greater than 0");
        campaignCount++;
        campaigns[campaignCount] = Campaign(
            msg.sender,
            _title,
            _description,
            _goal,
            0,
            false
        );
        emit CampaignCreated(campaignCount, msg.sender, _title, _goal);
    }

    function donate(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];
        require(msg.value > 0, "Donation must be greater than 0");
        require(!campaign.completed, "Campaign already completed");
        campaign.fundsRaised += msg.value;
        contributions[_campaignId][msg.sender] += msg.value;
        emit DonationReceived(_campaignId, msg.sender, msg.value);
    }

    /**
     * @dev Donate to a campaign from another chain
     * @param _dstChainId The destination chain ID
     * @param _campaignId The campaign ID to donate to
     * @param _destination The address on destination chain (typically this contract's address)
     */
    function crossChainDonate(
        uint16 _dstChainId,
        uint256 _campaignId,
        bytes calldata _destination
    ) external payable {
        require(msg.value > 0, "Donation must be greater than 0");

        // Prepare the payload with sender, campaign ID, and amount
        bytes memory payload = abi.encode(msg.sender, _campaignId, msg.value);

        // Calculate the fees for LayerZero
        (uint256 messageFee, ) = endpoint.estimateFees(
            _dstChainId,
            address(this),
            payload,
            false,
            bytes("")
        );

        require(
            msg.value >= messageFee,
            "Not enough funds to cover message fee"
        );

        // Calculate donation amount after deducting LayerZero fees
        uint256 donationAmount = msg.value - messageFee;

        require(
            donationAmount > 0,
            "Effective donation must be greater than zero"
        );

        // Send the message through LayerZero
        endpoint.send{value: messageFee}(
            _dstChainId,
            _destination,
            payload,
            payable(msg.sender),
            address(0x0),
            bytes("")
        );

        // Track cross-chain contribution
        crossChainContributions[_dstChainId][_campaignId][
            msg.sender
        ] += donationAmount;
    }

    /**
     * @dev Receives messages from LayerZero
     * @param _srcChainId Source chain ID
     * @param _srcAddress Source address
     * @param _nonce Message nonce
     * @param _payload The payload containing the sender, campaign ID, and amount
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override {
        // Verify that the call is coming from the LayerZero endpoint
        require(msg.sender == address(endpoint), "Invalid endpoint caller");

        // Decode the payload
        (address donor, uint256 campaignId, uint256 amount) = abi.decode(
            _payload,
            (address, uint256, uint256)
        );

        // Verify the campaign exists
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.owner != address(0), "Campaign does not exist");
        require(!campaign.completed, "Campaign already completed");

        // Update campaign funds
        campaign.fundsRaised += amount;

        // Track cross-chain contribution
        crossChainContributions[_srcChainId][campaignId][donor] += amount;

        emit CrossChainDonationReceived(_srcChainId, campaignId, donor, amount);
    }

    function withdrawFunds(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(
            msg.sender == campaign.owner,
            "Only campaign owner can withdraw"
        );
        require(
            campaign.fundsRaised >= campaign.goal,
            "Funding goal not reached"
        );
        require(!campaign.completed, "Funds already withdrawn");
        uint256 amount = campaign.fundsRaised;
        campaign.completed = true;
        payable(campaign.owner).transfer(amount);
        emit FundsWithdrawn(_campaignId, amount);
    }

    function confirmTransaction(bytes32 _txHash) external onlyOwner {
        require(
            !confirmedTransactions[_txHash],
            "Transaction already confirmed"
        );
        confirmedTransactions[_txHash] = true;
        emit TransactionConfirmed(_txHash);
    }

    function isTransactionConfirmed(
        bytes32 _txHash
    ) external view returns (bool) {
        return confirmedTransactions[_txHash];
    }

    function getCampaignDetails(
        uint256 _campaignId
    ) external view returns (Campaign memory) {
        return campaigns[_campaignId];
    }

    /**
     * @dev Get cross-chain contribution for a specific donor
     * @param _srcChainId Source chain ID
     * @param _campaignId Campaign ID
     * @param _donor Donor address
     * @return Amount contributed
     */
    function getCrossChainContribution(
        uint16 _srcChainId,
        uint256 _campaignId,
        address _donor
    ) external view returns (uint256) {
        return crossChainContributions[_srcChainId][_campaignId][_donor];
    }

    /**
     * @dev Set a new LayerZero endpoint
     * @param _endpoint The new endpoint address
     */
    function setEndpoint(address _endpoint) external onlyOwner {
        endpoint = ILayerZeroEndpoint(_endpoint);
    }
}
