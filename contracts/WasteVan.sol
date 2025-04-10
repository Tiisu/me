// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title WasteVanToken
 * @dev ERC20 token for rewarding users in the WasteVan ecosystem
 */
contract WasteVanToken is ERC20, Ownable {
    constructor() ERC20("WasteVan Token", "WVAN") Ownable() {
        // Mint initial supply to contract creator (can be adjusted as needed)
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title WasteVan
 * @dev Main contract for the WasteVan platform
 */
contract WasteVan is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Token contract
    WasteVanToken public wasteVanToken;

    // Point cost (in wei)
    uint256 public pointCost = 0.001 ether;

    // Minimum required points for agent registration
    uint256 public constant MIN_AGENT_POINTS = 100;

    // Counters
    Counters.Counter private _wasteReportIdCounter;
    Counters.Counter private _userIdCounter;
    Counters.Counter private _agentIdCounter;

    // Enums
    enum UserType { Regular, Agent }
    enum AgentStatus { Pending, Approved, Rejected }
    enum WasteStatus { Reported, Collected, Processed }
    enum PlasticType { PET, HDPE, PVC, LDPE, PP, PS, Other }

    // Structs
    struct User {
        uint256 id;
        address userAddress;
        UserType userType;
        uint256 tokenBalance;
        bool isRegistered;
    }

    struct Agent {
        uint256 id;
        address agentAddress;
        AgentStatus status;
        uint256 pointBalance;
        uint256 totalCollections;
        uint256 totalProcessed;
    }

    struct WasteReport {
        uint256 id;
        address reporter;
        PlasticType plasticType;
        uint256 quantity; // in grams
        string qrCodeHash;
        WasteStatus status;
        uint256 reportTime;
        address assignedAgent;
        uint256 collectionTime;
        uint256 processingTime;
        bool isRewarded;
    }

    // Mappings
    mapping(address => User) public users;
    mapping(address => Agent) public agents;
    mapping(uint256 => WasteReport) public wasteReports;
    mapping(string => uint256) public qrCodeToReportId;

    // Token rewards per plastic type (in tokens per kg)
    mapping(PlasticType => uint256) public rewardsPerKg;

    // Events
    event UserRegistered(uint256 indexed userId, address indexed userAddress);
    event AgentRegistered(uint256 indexed agentId, address indexed agentAddress);
    event AgentStatusChanged(uint256 indexed agentId, AgentStatus status);
    event PointsPurchased(address indexed agent, uint256 amount);
    event WasteReported(uint256 indexed reportId, address indexed reporter, string qrCodeHash);
    event WasteCollected(uint256 indexed reportId, address indexed agent);
    event WasteProcessed(uint256 indexed reportId, address indexed agent);
    event RewardDistributed(address indexed user, uint256 amount);
    event QRCodeScanned(string qrCodeHash, address indexed agent);

    // Modifiers
    modifier onlyRegisteredUser() {
        require(users[msg.sender].isRegistered, "Not a registered user");
        _;
    }

    modifier onlyApprovedAgent() {
        require(agents[msg.sender].status == AgentStatus.Approved, "Not an approved agent");
        _;
    }

    constructor(address tokenAddress) Ownable() {
        wasteVanToken = WasteVanToken(tokenAddress);

        // Initialize rewards per plastic type (tokens per kg)
        rewardsPerKg[PlasticType.PET] = 10;
        rewardsPerKg[PlasticType.HDPE] = 12;
        rewardsPerKg[PlasticType.PVC] = 8;
        rewardsPerKg[PlasticType.LDPE] = 9;
        rewardsPerKg[PlasticType.PP] = 11;
        rewardsPerKg[PlasticType.PS] = 7;
        rewardsPerKg[PlasticType.Other] = 5;
    }

    /**
     * @dev Register a new regular user
     */
    function registerUser() external {
        require(!users[msg.sender].isRegistered, "User already registered");

        _userIdCounter.increment();
        uint256 newUserId = _userIdCounter.current();

        users[msg.sender] = User({
            id: newUserId,
            userAddress: msg.sender,
            userType: UserType.Regular,
            tokenBalance: 0,
            isRegistered: true
        });

        emit UserRegistered(newUserId, msg.sender);
    }

    /**
     * @dev Register a new agent (requires ETH for initial points)
     */
    function registerAgent() external payable {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(msg.value >= pointCost * MIN_AGENT_POINTS, "Insufficient ETH for minimum points");

        uint256 pointAmount = msg.value / pointCost;

        _agentIdCounter.increment();
        uint256 newAgentId = _agentIdCounter.current();

        _userIdCounter.increment();
        uint256 newUserId = _userIdCounter.current();

        // Register as a user first
        users[msg.sender] = User({
            id: newUserId,
            userAddress: msg.sender,
            userType: UserType.Agent,
            tokenBalance: 0,
            isRegistered: true
        });

        // Then register as an agent
        agents[msg.sender] = Agent({
            id: newAgentId,
            agentAddress: msg.sender,
            status: AgentStatus.Pending,
            pointBalance: pointAmount,
            totalCollections: 0,
            totalProcessed: 0
        });

        emit UserRegistered(newUserId, msg.sender);
        emit AgentRegistered(newAgentId, msg.sender);
    }

    /**
     * @dev Admin function to approve or reject agent registration
     */
    function updateAgentStatus(address agentAddress, AgentStatus status) external onlyOwner {
        require(users[agentAddress].isRegistered, "Agent not registered");
        require(users[agentAddress].userType == UserType.Agent, "Not an agent");
        require(agents[agentAddress].status != status, "Status already set");

        agents[agentAddress].status = status;

        emit AgentStatusChanged(agents[agentAddress].id, status);
    }

    /**
     * @dev Allow agents to purchase more points
     */
    function purchasePoints() external payable nonReentrant onlyApprovedAgent {
        require(msg.value > 0, "Must send ETH to purchase points");

        uint256 pointAmount = msg.value / pointCost;
        agents[msg.sender].pointBalance += pointAmount;

        emit PointsPurchased(msg.sender, pointAmount);
    }

    /**
     * @dev Report waste collection and generate QR code hash
     */
    function reportWaste(
        PlasticType plasticType,
        uint256 quantityInGrams,
        string calldata qrCodeHash
    ) external onlyRegisteredUser {
        require(bytes(qrCodeHash).length > 0, "QR code hash cannot be empty");
        require(qrCodeToReportId[qrCodeHash] == 0, "QR code already exists");

        _wasteReportIdCounter.increment();
        uint256 newReportId = _wasteReportIdCounter.current();

        wasteReports[newReportId] = WasteReport({
            id: newReportId,
            reporter: msg.sender,
            plasticType: plasticType,
            quantity: quantityInGrams,
            qrCodeHash: qrCodeHash,
            status: WasteStatus.Reported,
            reportTime: block.timestamp,
            assignedAgent: address(0),
            collectionTime: 0,
            processingTime: 0,
            isRewarded: false
        });

        qrCodeToReportId[qrCodeHash] = newReportId;

        emit WasteReported(newReportId, msg.sender, qrCodeHash);
    }

    /**
     * @dev Agent scans QR code to collect waste
     */
    function collectWaste(string calldata qrCodeHash) external onlyApprovedAgent nonReentrant {
        uint256 reportId = qrCodeToReportId[qrCodeHash];
        require(reportId > 0, "QR code not found");

        WasteReport storage report = wasteReports[reportId];
        require(report.status == WasteStatus.Reported, "Waste not in reported state");

        // Update waste report
        report.status = WasteStatus.Collected;
        report.assignedAgent = msg.sender;
        report.collectionTime = block.timestamp;

        // Update agent stats
        agents[msg.sender].totalCollections++;

        emit WasteCollected(reportId, msg.sender);
        emit QRCodeScanned(qrCodeHash, msg.sender);

        // Calculate and distribute rewards
        distributeRewards(reportId);
    }

    /**
     * @dev Distribute rewards to user after waste collection
     */
    function distributeRewards(uint256 reportId) internal {
        WasteReport storage report = wasteReports[reportId];
        require(!report.isRewarded, "Rewards already distributed");

        // Calculate reward based on plastic type and quantity
        uint256 rewardAmount = (report.quantity * rewardsPerKg[report.plasticType]) / 1000; // Convert g to kg and calculate

        // Ensure agent has enough points
        require(agents[msg.sender].pointBalance >= rewardAmount, "Agent has insufficient points");

        // Update balances
        agents[msg.sender].pointBalance -= rewardAmount;
        users[report.reporter].tokenBalance += rewardAmount;

        // Mark as rewarded
        report.isRewarded = true;

        // Transfer tokens from contract to user
        wasteVanToken.transfer(report.reporter, rewardAmount * 10 ** 18); // Adjust for decimals

        emit RewardDistributed(report.reporter, rewardAmount);
    }

    /**
     * @dev Agent marks waste as processed
     */
    function processWaste(uint256 reportId) external onlyApprovedAgent {
        WasteReport storage report = wasteReports[reportId];
        require(report.status == WasteStatus.Collected, "Waste not collected yet");
        require(report.assignedAgent == msg.sender, "Not the assigned agent");

        report.status = WasteStatus.Processed;
        report.processingTime = block.timestamp;

        agents[msg.sender].totalProcessed++;

        emit WasteProcessed(reportId, msg.sender);
    }

    /**
     * @dev Update token rewards per kg for a plastic type
     */
    function updateRewardRate(PlasticType plasticType, uint256 newRatePerKg) external onlyOwner {
        rewardsPerKg[plasticType] = newRatePerKg;
    }

    /**
     * @dev Update point cost
     */
    function updatePointCost(uint256 newPointCostInWei) external onlyOwner {
        pointCost = newPointCostInWei;
    }

    /**
     * @dev Get waste reports by status
     */
    function getWasteReportsByStatus(WasteStatus status, uint256 limit, uint256 offset)
        external
        view
        returns (WasteReport[] memory)
    {
        // First, count how many reports match the status
        uint256 count = 0;
        for (uint256 i = 1; i <= _wasteReportIdCounter.current(); i++) {
            if (wasteReports[i].status == status) {
                count++;
            }
        }

        // Adjust limit if needed
        if (offset >= count) {
            return new WasteReport[](0);
        }

        uint256 remaining = count - offset;
        uint256 actualLimit = remaining < limit ? remaining : limit;

        WasteReport[] memory result = new WasteReport[](actualLimit);
        uint256 resultIndex = 0;

        // Start from offset + 1
        uint256 currentOffset = 0;
        for (uint256 i = 1; i <= _wasteReportIdCounter.current() && resultIndex < actualLimit; i++) {
            if (wasteReports[i].status == status) {
                if (currentOffset >= offset) {
                    result[resultIndex] = wasteReports[i];
                    resultIndex++;
                } else {
                    currentOffset++;
                }
            }
        }

        return result;
    }

    /**
     * @dev Get agent statistics
     */
    function getAgentStats(address agentAddress)
        external
        view
        returns (
            uint256 pointBalance,
            uint256 totalCollections,
            uint256 totalProcessed
        )
    {
        Agent memory agent = agents[agentAddress];
        return (agent.pointBalance, agent.totalCollections, agent.totalProcessed);
    }

    /**
     * @dev Get user token balance
     */
    function getUserTokenBalance(address userAddress) external view returns (uint256) {
        return users[userAddress].tokenBalance;
    }

    /**
     * @dev Allow contract owner to withdraw ETH fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}
}