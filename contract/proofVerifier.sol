pragma solidity ^0.8.19;

/* ========== Interfaces ========== */

interface IERC20 {
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}

interface IReclaimVerifier {
    function verifyProof(Proof calldata proof) external view returns (bool);
}

/* ========== Reclaim structs ========== */

struct CompleteClaimData {
    bytes32 identifier;
    address owner;
    uint32 timestampS;
    uint32 epoch;
}

struct SignedClaim {
    CompleteClaimData claim;
    bytes[] signatures;
}

struct Proof {
    CompleteClaimData claimInfo;
    SignedClaim signedClaim;
}

/* ========== Main Contract ========== */

contract CreatorAirdropL2 {
    /* ---------- Structs ---------- */

    struct Creator {
        address owner;
        string channelId;
        IERC20 token;
        bool registered;
    }

    struct ClaimPeriod {
        string channelId;
        uint256 start;
        uint256 end;
        bool open;
        address[] subscribers; // subscribers for this period
    }

    /* ---------- State ---------- */

    IReclaimVerifier public verifier;
    uint256 public nextClaimPeriodId;

    // channelId => Creator
    mapping(string => Creator) public creators;

    // claimPeriodId => ClaimPeriod
    mapping(uint256 => ClaimPeriod) public claimPeriods;

    // claimPeriodId => subscriber => registered?
    mapping(uint256 => mapping(address => bool)) public hasRegistered;

    // channelId => claimPeriodIds[]
    mapping(string => uint256[]) public channelClaimPeriods;

    /* ---------- Events ---------- */

    event CreatorRegistered(
        address indexed owner,
        string channelId,
        address token
    );
    event ClaimPeriodOpened(
        string channelId,
        uint256 claimPeriodId,
        uint256 start,
        uint256 end
    );
    event SubscriberRegistered(uint256 claimPeriodId, address subscriber);
    event ClaimPeriodClosed(uint256 claimPeriodId);
    event AirdropExecuted(
        uint256 claimPeriodId,
        uint256 count,
        uint256 amountPerUser
    );

    /* ---------- Constructor ---------- */

    constructor(address reclaimVerifier) {
        verifier = IReclaimVerifier(reclaimVerifier);
    }

    /* ---------- Creator Flow ---------- */

    function registerCreator(
        string calldata channelId,
        address token,
        Proof calldata proof
    ) external {
        require(!creators[channelId].registered, "already registered");
        require(verifier.verifyProof(proof), "invalid proof");
        require(proof.claimInfo.owner == msg.sender, "not proof owner");

        creators[channelId] = Creator({
            owner: msg.sender,
            channelId: channelId,
            token: IERC20(token),
            registered: true
        });

        emit CreatorRegistered(msg.sender, channelId, token);
    }

    function openClaimPeriod(
        string calldata channelId,
        uint256 start,
        uint256 end
    ) external returns (uint256) {
        Creator storage c = creators[channelId];
        require(c.registered, "creator not registered");
        require(c.owner == msg.sender, "not owner");
        require(start < end, "bad period");

        uint256 periodId = nextClaimPeriodId++;
        ClaimPeriod storage p = claimPeriods[periodId];
        p.channelId = channelId;
        p.start = start;
        p.end = end;
        p.open = true;

        channelClaimPeriods[channelId].push(periodId);

        emit ClaimPeriodOpened(channelId, periodId, start, end);
        return periodId;
    }

    function closeClaimPeriod(uint256 claimPeriodId) external {
        ClaimPeriod storage p = claimPeriods[claimPeriodId];
        Creator storage c = creators[p.channelId];
        require(c.owner == msg.sender, "not owner");
        require(p.open, "claim period already closed");
        p.open = false;

        emit ClaimPeriodClosed(claimPeriodId);
    }

    /* ---------- Subscriber Flow ---------- */
    function registerAsSubscriber(
        uint256 claimPeriodId,
        Proof calldata proof
    ) external {
        ClaimPeriod storage p = claimPeriods[claimPeriodId];
        require(
            block.timestamp >= p.start && block.timestamp <= p.end,
            "registration outside active claim period"
        );
        require(p.open, "claim period closed");
        require(
            !hasRegistered[claimPeriodId][msg.sender],
            "already registered"
        );

        // verify proof
        require(verifier.verifyProof(proof), "invalid proof");
        require(proof.claimInfo.owner == msg.sender, "wrong proof owner");

        // timestamp check
        require(
            proof.claimInfo.timestampS >= p.start &&
                proof.claimInfo.timestampS <= p.end,
            "timestamp outside period"
        );

        hasRegistered[claimPeriodId][msg.sender] = true;
        p.subscribers.push(msg.sender);

        emit SubscriberRegistered(claimPeriodId, msg.sender);
    }

    /* ---------- Airdrop ---------- */

    function airdrop(uint256 claimPeriodId, uint256 amount) external {
        ClaimPeriod storage p = claimPeriods[claimPeriodId];
        require(!p.open, "claim period still open");

        Creator storage c = creators[p.channelId];
        require(c.owner == msg.sender, "not owner");

        uint256 count = p.subscribers.length;
        require(count > 0, "no subscribers");
        uint256 amountPerUser = amount / count;

        for (uint256 i = 0; i < count; i++) {
            bool ok = c.token.transferFrom(
                c.owner,
                p.subscribers[i],
                amountPerUser
            );
            require(ok, "transfer failed");
        }

        emit AirdropExecuted(claimPeriodId, count, amountPerUser);
    }

    /* ---------- View Helpers ---------- */

    function getSubscribers(
        uint256 claimPeriodId
    ) external view returns (address[] memory) {
        return claimPeriods[claimPeriodId].subscribers;
    }

    function getClaimPeriods(
        string calldata channelId
    ) external view returns (uint256[] memory) {
        return channelClaimPeriods[channelId];
    }

    function getSubscriberCount(
        uint256 claimPeriodId
    ) external view returns (uint256) {
        return claimPeriods[claimPeriodId].subscribers.length;
    }
}