const { elitePlayers, proPlayers, legendPlayers, ultraLegendPlayers, domesticPlayers, uncappedPlayers } = require('../list2');

class AuctionService {
  constructor() {
    this.activeAuctions = new Map(); // roomCode -> auctionState
    this.playerPools = new Map(); // roomCode -> array of players
  }

  // Generate player pool based on number of teams
  generatePlayerPool(numberOfTeams) {
    const poolSize = this.calculatePoolSize(numberOfTeams);
    
    // Always include all Ultra Legend players
    let playerPool = [...ultraLegendPlayers];
    
    // Calculate remaining slots
    const remainingSlots = poolSize - ultraLegendPlayers.length;
    
    // Combine all other players
    const otherPlayers = [
      ...legendPlayers,
      ...elitePlayers,
      ...proPlayers,
      ...domesticPlayers,
      ...uncappedPlayers
    ];
    
    // Shuffle and select remaining players
    const shuffledOthers = this.shuffleArray([...otherPlayers]);
    const selectedOthers = shuffledOthers.slice(0, remainingSlots);
    
    playerPool = [...playerPool, ...selectedOthers];
    
    // Add unique IDs and base prices
    return playerPool.map((player, index) => ({
      ...player,
      id: `player_${index + 1}`,
      basePrice: this.getBasePrice(player.level),
      bidIncrement: this.getBidIncrement(player.level),
      sold: false,
      currentBid: 0,
      currentBidder: null,
      teamOwner: null
    }));
  }

  calculatePoolSize(numberOfTeams) {
    switch (numberOfTeams) {
      case 2: return 60;
      case 3: return 90;
      case 4: return 120;
      default: return numberOfTeams * 30; // Dynamic scaling
    }
  }

  getBasePrice(level) {
    switch (level) {
      case 'ultra-legend': return 20000; // ₹2 Cr
      case 'legend': return 20000; // ₹2 Cr
      case 'elite': return 15000; // ₹1.5 Cr
      case 'pro': return 10000; // ₹1 Cr
      case 'domestic': return 5000; // ₹50L
      case 'uncapped': return 5000; // ₹50L
      default: return 5000;
    }
  }

  getBidIncrement(level) {
    switch (level) {
      case 'ultra-legend': return 5000; // ₹50L
      case 'legend': return 5000; // ₹50L
      case 'elite': return 5000; // ₹50L
      case 'pro': return 2500; // ₹25L
      case 'domestic': return 1000; // ₹10L
      case 'uncapped': return 1000; // ₹10L
      default: return 1000;
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  initializeAuction(roomCode, teams) {
    const playerPool = this.generatePlayerPool(teams.length);
    const shuffledPool = this.shuffleArray(playerPool);
    
    const auctionState = {
      roomCode,
      teams: teams.map(team => ({
        ...team,
        budget: 1200000, // ₹120 Cr (in thousands)
        players: [],
        overseasCount: 0,
        totalPlayers: 0
      })),
      playerPool: shuffledPool,
      currentPlayerIndex: 0,
      currentPlayer: shuffledPool[0],
      currentBid: shuffledPool[0].basePrice,
      currentBidder: null,
      currentBidderTeam: null,
      biddingOrder: [...teams],
      currentBidderIndex: 0,
      auctionStatus: 'active',
      bidTimer: null,
      timeRemaining: 30,
      passCount: 0,
      soldPlayers: [],
      unsoldPlayers: []
    };

    this.activeAuctions.set(roomCode, auctionState);
    this.playerPools.set(roomCode, shuffledPool);
    
    return auctionState;
  }

  getAuctionState(roomCode) {
    return this.activeAuctions.get(roomCode);
  }

  placeBid(roomCode, teamId, bidAmount) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction || auction.auctionStatus !== 'active') {
      return { success: false, error: 'Auction not active' };
    }

    const team = auction.teams.find(t => t.id === teamId);
    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    const currentPlayer = auction.currentPlayer;
    const minBid = auction.currentBid + currentPlayer.bidIncrement;

    // Validate bid
    if (bidAmount < minBid) {
      return { success: false, error: `Minimum bid is ₹${(minBid/10).toFixed(1)}L` };
    }

    if (bidAmount > team.budget) {
      return { success: false, error: 'Insufficient budget' };
    }

    // Check overseas limit
    if (currentPlayer.overseas && team.overseasCount >= 8) {
      return { success: false, error: 'Overseas player limit reached (8)' };
    }

    // Update auction state
    auction.currentBid = bidAmount;
    auction.currentBidder = team.name;
    auction.currentBidderTeam = teamId;
    auction.passCount = 0;
    auction.timeRemaining = 30; // Reset timer

    this.activeAuctions.set(roomCode, auction);

    return { 
      success: true, 
      auctionState: auction,
      message: `${team.name} bids ₹${(bidAmount/10).toFixed(1)}L` 
    };
  }

  passBid(roomCode, teamId) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction || auction.auctionStatus !== 'active') {
      return { success: false, error: 'Auction not active' };
    }

    auction.passCount++;
    
    // If all teams pass, sell to current bidder or mark as unsold
    if (auction.passCount >= auction.teams.length - 1) {
      return this.completePlayerAuction(roomCode);
    }

    // Move to next bidder
    auction.currentBidderIndex = (auction.currentBidderIndex + 1) % auction.teams.length;
    
    this.activeAuctions.set(roomCode, auction);
    return { 
      success: true, 
      auctionState: auction,
      teamStats: this.getTeamStats(roomCode)
    };
  }

  completePlayerAuction(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    const currentPlayer = auction.currentPlayer;

    if (auction.currentBidder) {
      // Player sold
      const winningTeam = auction.teams.find(t => t.id === auction.currentBidderTeam);
      
      // Update team
      winningTeam.players.push({
        ...currentPlayer,
        soldPrice: auction.currentBid,
        soldTo: winningTeam.name
      });
      winningTeam.budget -= auction.currentBid;
      winningTeam.totalPlayers++;
      
      if (currentPlayer.overseas) {
        winningTeam.overseasCount++;
      }

      // Mark player as sold
      currentPlayer.sold = true;
      currentPlayer.soldPrice = auction.currentBid;
      currentPlayer.teamOwner = winningTeam.name;
      
      auction.soldPlayers.push({
        ...currentPlayer,
        soldTo: winningTeam.name,
        soldPrice: auction.currentBid
      });
    } else {
      // Player unsold
      auction.unsoldPlayers.push(currentPlayer);
    }

    // Move to next player
    auction.currentPlayerIndex++;
    
    if (auction.currentPlayerIndex >= auction.playerPool.length) {
      // Check if there are unsold players to re-auction
      if (auction.unsoldPlayers.length > 0 && !auction.secondRoundStarted) {
        console.log(`Starting second round for ${auction.unsoldPlayers.length} unsold players`);
        // Start the second round with unsold players
        auction.secondRoundStarted = true;
        auction.secondRoundPlayers = [...auction.unsoldPlayers];
        auction.unsoldPlayers = [];
        
        // Add unsold players to the end of the player pool
        auction.playerPool = [...auction.playerPool, ...auction.secondRoundPlayers];
        
        // Continue with the next player
        auction.currentPlayer = auction.playerPool[auction.currentPlayerIndex];
        auction.currentBid = auction.currentPlayer.basePrice;
        auction.currentBidder = null;
        auction.currentBidderTeam = null;
        auction.passCount = 0;
        auction.timeRemaining = 30;
      } else {
        // Auction complete
        auction.auctionStatus = 'completed';
        auction.currentPlayer = null;
      }
    } else {
      // Next player
      auction.currentPlayer = auction.playerPool[auction.currentPlayerIndex];
      auction.currentBid = auction.currentPlayer.basePrice;
      auction.currentBidder = null;
      auction.currentBidderTeam = null;
      auction.passCount = 0;
      auction.timeRemaining = 30;
    }

    this.activeAuctions.set(roomCode, auction);
    
    // Return updated auction state and team stats
    return { 
      success: true, 
      auctionState: auction,
      teamStats: this.getTeamStats(roomCode),
      playerSold: auction.currentBidder ? true : false  // Flag to indicate if a player was sold
    };
  }

  canEndAuction(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) return false;

    // Check if all teams have at least 18 players
    return auction.teams.every(team => team.totalPlayers >= 18);
  }

  endAuction(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    // Check for teams that didn't meet minimum player requirement (18)
    const MINIMUM_PLAYERS_REQUIRED = 18;
    const teamsBeforeFilter = [...auction.teams];
    
    // Identify teams that don't meet minimum requirements
    const teamsNotMeetingRequirements = auction.teams.filter(team => 
      team.totalPlayers < MINIMUM_PLAYERS_REQUIRED
    );
    
    if (teamsNotMeetingRequirements.length > 0) {
      console.log(`${teamsNotMeetingRequirements.length} teams did not meet minimum player requirement`);
      
      // If we're down to only 2 teams and one doesn't meet requirements, the other is the winner
      if (auction.teams.length === 2 && teamsNotMeetingRequirements.length === 1) {
        const winningTeam = auction.teams.find(team => team.totalPlayers >= MINIMUM_PLAYERS_REQUIRED);
        if (winningTeam) {
          auction.tournamentWinner = winningTeam;
          auction.tournamentMessage = `${winningTeam.name} wins by default as they were the only team to meet player requirements!`;
        }
      }
      
      // Filter out teams that don't meet minimum requirements
      auction.teams = auction.teams.filter(team => team.totalPlayers >= MINIMUM_PLAYERS_REQUIRED);
      
      // Add messages about removed teams
      auction.removedTeams = teamsBeforeFilter
        .filter(team => team.totalPlayers < MINIMUM_PLAYERS_REQUIRED)
        .map(team => ({
          name: team.name,
          playerCount: team.totalPlayers,
          reason: `Insufficient players (minimum ${MINIMUM_PLAYERS_REQUIRED} required)`
        }));
    }
    
    auction.auctionStatus = 'ended';
    this.activeAuctions.set(roomCode, auction);

    return { 
      success: true, 
      auctionState: auction,
      teamsRemoved: teamsNotMeetingRequirements.length > 0 ? teamsNotMeetingRequirements : null
    };
  }

  pauseAuction(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    auction.auctionStatus = 'paused';
    this.activeAuctions.set(roomCode, auction);

    return { success: true, auctionState: auction };
  }

  resumeAuction(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) {
      return { success: false, error: 'Auction not found' };
    }

    auction.auctionStatus = 'active';
    this.activeAuctions.set(roomCode, auction);

    return { success: true, auctionState: auction };
  }

  getTeamStats(roomCode) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) return null;

    return auction.teams.map(team => ({
      id: team.id,
      name: team.name,
      budget: team.budget,
      budgetSpent: 1200000 - team.budget,
      totalPlayers: team.totalPlayers,
      overseasCount: team.overseasCount,
      players: team.players,
      canBid: team.budget > 0 && team.totalPlayers < 25
    }));
  }
  
  // Update a team's budget after purchase
  updateTeamBudget(roomCode, teamId, amount) {
    const auction = this.activeAuctions.get(roomCode);
    if (!auction) return false;
    
    const team = auction.teams.find(t => t.id === teamId);
    if (!team) return false;
    
    // Update budget
    team.budget -= amount;
    
    // Ensure budget doesn't go below 0
    if (team.budget < 0) {
      team.budget = 0;
    }
    
    this.activeAuctions.set(roomCode, auction);
    return true;
  }

  formatCurrency(amount) {
    if (amount >= 1000) {
      return `₹${(amount / 10).toFixed(1)}L`;
    }
    return `₹${amount}K`;
  }
}

module.exports = new AuctionService();
