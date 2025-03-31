import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";

// Import ABI from your contract compilation
// This would be the actual ABI from your compiled contract
const CrossChainCrowdfundingABI = [
  // ABI would go here - this is a placeholder
  "function createCampaign(string _title, string _description, uint256 _goal)",
  "function donate(uint256 _campaignId) payable",
  "function crossChainDonate(uint16 _dstChainId, uint256 _campaignId, bytes _destination) payable",
  "function withdrawFunds(uint256 _campaignId)",
  "function getCampaignDetails(uint256 _campaignId) view returns (tuple(address owner, string title, string description, uint256 goal, uint256 fundsRaised, bool completed))",
  "function getCrossChainContribution(uint16 _srcChainId, uint256 _campaignId, address _donor) view returns (uint256)",
];

// Chain configuration
const chainConfig = {
  Ethereum: {
    id: 1,
    contractAddress: "0x1234567890123456789012345678901234567890", // Replace with actual address
    layerZeroChainId: 101, // LayerZero chain ID for Ethereum
    rpcUrl: "https://mainnet.infura.io/v3/your-infura-key",
  },
  Polygon: {
    id: 137,
    contractAddress: "0x2345678901234567890123456789012345678901", // Replace with actual address
    layerZeroChainId: 109, // LayerZero chain ID for Polygon
    rpcUrl: "https://polygon-rpc.com",
  },
  Binance: {
    id: 56,
    contractAddress: "0x3456789012345678901234567890123456789012", // Replace with actual address
    layerZeroChainId: 102, // LayerZero chain ID for BSC
    rpcUrl: "https://bsc-dataseed.binance.org",
  },
};

function App() {
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      title: "Build a Sustainable Garden",
      description:
        "Help us create a community garden with sustainable practices.",
      goal: 5.0,
      amountRaised: 2.7,
      chain: "Ethereum",
      daysLeft: 15,
      creator: "0x7a86C6eA300f1bF79236F60d68Cf12dd9D9894Ba",
      imageUrl: "/image/1.webp",
    },
    {
      id: 2,
      title: "Decentralized Educational Platform",
      description:
        "Building a platform for free education leveraging blockchain technology.",
      goal: 10.0,
      amountRaised: 7.5,
      chain: "Polygon",
      daysLeft: 21,
      creator: "0x2F3A5664BbC7468c46aD8C3dD153Af9660B6EF76",
      imageUrl: "/image/2.jpeg",
    },
    {
      id: 3,
      title: "Community NFT Marketplace",
      description:
        "Creating a fair marketplace for artists to sell their NFTs with minimal fees.",
      goal: 8.0,
      amountRaised: 3.2,
      chain: "Binance",
      daysLeft: 10,
      creator: "0xA13e0D7B15538c36E95fA3Bb0Db495A49F9a6EB8",
      imageUrl: "/image/3.jpg",
    },
  ]);

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState("Ethereum");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [donationAmount, setDonationAmount] = useState("");
  const [targetChain, setTargetChain] = useState("");
  const [isCrossChain, setIsCrossChain] = useState(false);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [loadingState, setLoadingState] = useState("");

  // Effect to initialize provider and contract when wallet connects
  useEffect(() => {
    if (walletConnected && window.ethereum) {
      initializeProviderAndContract();
    }
  }, [walletConnected, selectedChain]);

  const initializeProviderAndContract = async () => {
    try {
      // Create Web3 provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const chainId = await web3Provider
        .getNetwork()
        .then((network) => network.chainId);

      // Check if user is on the selected chain
      const selectedChainId = chainConfig[selectedChain].id;

      if (chainId !== selectedChainId) {
        alert(`Please switch to ${selectedChain} network in your wallet`);
        try {
          // Request wallet to switch to the selected chain
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
          });
        } catch (switchError) {
          // Handle chain switch error
          console.error("Failed to switch chains:", switchError);
          return;
        }
      }

      setProvider(web3Provider);

      // Create contract instance for the selected chain
      const signer = web3Provider.getSigner();
      const contractAddress = chainConfig[selectedChain].contractAddress;
      const contractInstance = new ethers.Contract(
        contractAddress,
        CrossChainCrowdfundingABI,
        signer
      );

      setContract(contractInstance);
    } catch (error) {
      console.error("Error initializing provider and contract:", error);
    }
  };

  // Connect wallet using MetaMask or other injected provider
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        setLoadingState("Connecting wallet...");
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        setLoadingState("");
      } else {
        alert("Please install MetaMask or another compatible wallet");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setLoadingState("");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setWalletConnected(false);
    setProvider(null);
    setContract(null);
  };

  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    goal: "",
    days: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCampaign({
      ...newCampaign,
      [name]: value,
    });
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (!contract) {
      alert("Contract not initialized. Please check your wallet connection.");
      return;
    }

    try {
      setLoadingState("Creating campaign...");

      // Convert goal to wei (assuming goal is in ETH)
      const goalInWei = ethers.utils.parseEther(newCampaign.goal);

      // Call contract function to create campaign
      const tx = await contract.createCampaign(
        newCampaign.title,
        newCampaign.description,
        goalInWei
      );

      // Wait for transaction to be mined
      await tx.wait();

      // Create campaign object for UI (this would ideally come from contract events)
      const campaign = {
        id: campaigns.length + 1,
        title: newCampaign.title,
        description: newCampaign.description,
        goal: parseFloat(newCampaign.goal),
        amountRaised: 0,
        chain: selectedChain,
        daysLeft: parseInt(newCampaign.days),
        creator: walletAddress,
        imageUrl: "/api/placeholder/400/200",
      };

      setCampaigns([...campaigns, campaign]);
      setNewCampaign({
        title: "",
        description: "",
        goal: "",
        days: "",
      });
      setShowCreateForm(false);
      setLoadingState("");
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert("Failed to create campaign: " + error.message);
      setLoadingState("");
    }
  };

  const handleDonateClick = (campaign) => {
    setSelectedCampaign(campaign);
    setTargetChain(campaign.chain);
    setIsCrossChain(selectedChain !== campaign.chain);
    setShowDonateModal(true);
  };

  const handleDonation = async (e) => {
    e.preventDefault();

    if (!contract) {
      alert("Contract not initialized. Please check your wallet connection.");
      return;
    }

    try {
      setLoadingState("Processing donation...");
      const amountInWei = ethers.utils.parseEther(donationAmount);

      if (isCrossChain) {
        // Cross-chain donation
        const sourceChainConfig = chainConfig[selectedChain];
        const targetChainConfig = chainConfig[targetChain];

        // Format destination address as bytes
        const destinationAddress = ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [targetChainConfig.contractAddress]
        );

        // Execute cross-chain donation
        const tx = await contract.crossChainDonate(
          targetChainConfig.layerZeroChainId,
          selectedCampaign.id,
          destinationAddress,
          { value: amountInWei }
        );

        await tx.wait();
      } else {
        // Same-chain donation
        const tx = await contract.donate(selectedCampaign.id, {
          value: amountInWei,
        });
        await tx.wait();
      }

      // Update UI (in a production app, you'd refetch from the blockchain)
      const updatedCampaigns = campaigns.map((c) => {
        if (c.id === selectedCampaign.id) {
          return {
            ...c,
            amountRaised: c.amountRaised + parseFloat(donationAmount),
          };
        }
        return c;
      });

      setCampaigns(updatedCampaigns);
      setDonationAmount("");
      setShowDonateModal(false);
      setLoadingState("");
    } catch (error) {
      console.error("Error making donation:", error);
      alert("Failed to complete donation: " + error.message);
      setLoadingState("");
    }
  };

  const calculateProgress = (raised, goal) => {
    return (raised / goal) * 100;
  };

  const handleChainChange = (chain) => {
    setSelectedChain(chain);
    if (walletConnected) {
      // Re-initialize provider and contract with new chain
      initializeProviderAndContract();
    }
  };

  const filterCampaignsByChain = () => {
    if (selectedChain === "All Chains") {
      return campaigns;
    }
    return campaigns.filter((campaign) => campaign.chain === selectedChain);
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <h1>CrowdChain</h1>
        </div>
        <nav>
          <ul>
            <li>
              <a href="#" className="active">
                Home
              </a>
            </li>
            <li>
              <a href="#">Explore</a>
            </li>
            <li>
              <a href="#">My Campaigns</a>
            </li>
          </ul>
        </nav>
        <div className="wallet-container">
          {walletConnected ? (
            <div className="wallet-info">
              <div className="wallet-address">
                {walletAddress.substring(0, 6)}...
                {walletAddress.substring(walletAddress.length - 4)}
              </div>
              <button
                className="wallet-btn disconnect"
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button className="wallet-btn connect" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main>
        {loadingState && (
          <div className="loading-indicator">
            <p>{loadingState}</p>
          </div>
        )}

        <section className="hero-section">
          <div className="hero-content">
            <h2>Cross-Chain Crowdfunding</h2>
            <p>
              Fund and support projects across multiple blockchains with a
              single platform
            </p>
            {walletConnected ? (
              <button
                className="cta-button"
                onClick={() => setShowCreateForm(true)}
              >
                Create Campaign
              </button>
            ) : (
              <button className="cta-button" onClick={connectWallet}>
                Connect to Start
              </button>
            )}
          </div>
        </section>

        <section className="chain-filter">
          <h3>Browse Campaigns</h3>
          <div className="chain-selector">
            <button
              className={selectedChain === "All Chains" ? "active" : ""}
              onClick={() => handleChainChange("All Chains")}
            >
              All Chains
            </button>
            <button
              className={selectedChain === "Ethereum" ? "active" : ""}
              onClick={() => handleChainChange("Ethereum")}
            >
              Ethereum
            </button>
            <button
              className={selectedChain === "Polygon" ? "active" : ""}
              onClick={() => handleChainChange("Polygon")}
            >
              Polygon
            </button>
            <button
              className={selectedChain === "Binance" ? "active" : ""}
              onClick={() => handleChainChange("Binance")}
            >
              Binance
            </button>
          </div>
        </section>

        <section className="campaigns-section">
          <div className="campaigns-grid">
            {filterCampaignsByChain().map((campaign) => (
              <div className="campaign-card" key={campaign.id}>
                <div className="campaign-image">
                  <img src={campaign.imageUrl} alt={campaign.title} />
                  <div className="chain-badge">{campaign.chain}</div>
                </div>
                <div className="campaign-content">
                  <h3>{campaign.title}</h3>
                  <p>{campaign.description}</p>
                  <div className="campaign-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${calculateProgress(
                            campaign.amountRaised,
                            campaign.goal
                          )}%`,
                        }}
                      ></div>
                    </div>
                    <div className="progress-stats">
                      <span>
                        {campaign.amountRaised} ETH raised of {campaign.goal}{" "}
                        ETH
                      </span>
                      <span>{campaign.daysLeft} days left</span>
                    </div>
                  </div>
                  <button
                    className="support-btn"
                    onClick={() => handleDonateClick(campaign)}
                    disabled={!walletConnected}
                  >
                    Support Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {showCreateForm && (
          <div className="modal-overlay">
            <div className="create-campaign-modal">
              <div className="modal-header">
                <h3>Create New Campaign</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateCampaign}>
                <div className="form-group">
                  <label htmlFor="title">Campaign Title</label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newCampaign.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={newCampaign.description}
                    onChange={handleInputChange}
                    required
                  ></textarea>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="goal">Funding Goal (ETH)</label>
                    <input
                      type="number"
                      id="goal"
                      name="goal"
                      value={newCampaign.goal}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="days">Duration (Days)</label>
                    <input
                      type="number"
                      id="days"
                      name="days"
                      value={newCampaign.days}
                      onChange={handleInputChange}
                      min="1"
                      max="60"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Blockchain</label>
                  <div className="chain-selector modal-chains">
                    <button
                      type="button"
                      className={selectedChain === "Ethereum" ? "active" : ""}
                      onClick={() => handleChainChange("Ethereum")}
                    >
                      Ethereum
                    </button>
                    <button
                      type="button"
                      className={selectedChain === "Polygon" ? "active" : ""}
                      onClick={() => handleChainChange("Polygon")}
                    >
                      Polygon
                    </button>
                    <button
                      type="button"
                      className={selectedChain === "Binance" ? "active" : ""}
                      onClick={() => handleChainChange("Binance")}
                    >
                      Binance
                    </button>
                  </div>
                </div>
                <button type="submit" className="create-btn">
                  Create Campaign
                </button>
              </form>
            </div>
          </div>
        )}

        {showDonateModal && selectedCampaign && (
          <div className="modal-overlay">
            <div className="donation-modal">
              <div className="modal-header">
                <h3>Support this Project</h3>
                <button
                  className="close-btn"
                  onClick={() => setShowDonateModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="donation-campaign-info">
                <h4>{selectedCampaign.title}</h4>
                <p>Chain: {selectedCampaign.chain}</p>
              </div>
              <form onSubmit={handleDonation}>
                <div className="form-group">
                  <label htmlFor="donationAmount">Amount (ETH)</label>
                  <input
                    type="number"
                    id="donationAmount"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>

                {selectedChain !== selectedCampaign.chain && (
                  <div className="cross-chain-notice">
                    <p>
                      You're donating from {selectedChain} to a campaign on{" "}
                      {selectedCampaign.chain}. This is a cross-chain
                      transaction.
                    </p>
                    <p className="fee-note">
                      Note: A small LayerZero gas fee will be deducted from your
                      donation to cover cross-chain messaging.
                    </p>
                  </div>
                )}

                <button type="submit" className="donate-btn">
                  {isCrossChain ? "Make Cross-Chain Donation" : "Donate Now"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      <footer>
        <div className="footer-content">
          <div className="footer-column">
            <h4>CrowdChain</h4>
            <p>
              A decentralized cross-chain crowdfunding platform built for the
              future of community funding.
            </p>
          </div>
          <div className="footer-column">
            <h4>Supported Chains</h4>
            <ul>
              <li>Ethereum</li>
              <li>Polygon</li>
              <li>Binance Smart Chain</li>
              <li>Avalanche</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="#">Documentation</a>
              </li>
              <li>
                <a href="#">FAQ</a>
              </li>
              <li>
                <a href="#">Support</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 CrowdChain. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
