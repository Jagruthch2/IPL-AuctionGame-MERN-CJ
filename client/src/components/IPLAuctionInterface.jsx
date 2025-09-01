import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

const IPLAuctionInterface = ({ roomCode, teams, user, isCreator }) => {
  const { socket } = useSocket();
  const [auctionState, setAuctionState] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [timer, setTimer] = useState(30);
  const [tournament, setTournament] = useState(null);
  const [showTournament, setShowTournament] = useState(false);

  useEffect(() => {
    if (socket && roomCode) {
      // Listen for auction events
      socket.on('auction:started', handleAuctionStarted);
      socket.on('auction:bidPlaced', handleBidPlaced);
      socket.on('auction:passed', handlePassed);
      socket.on('auction:paused', handlePaused);
      socket.on('auction:resumed', handleResumed);
      socket.on('auction:ended', handleAuctionEnded);
      socket.on('auction:stateUpdate', handleStateUpdate);
      socket.on('auction:bidError', handleBidError);
      socket.on('auction:teamStatsUpdate', handleTeamStatsUpdate);
      socket.on('tournament:completed', handleTournamentCompleted);

      // Request current state
      socket.emit('auction:getState', { roomCode });

      return () => {
        socket.off('auction:started');
        socket.off('auction:bidPlaced');
        socket.off('auction:passed');
        socket.off('auction:paused');
        socket.off('auction:resumed');
        socket.off('auction:ended');
        socket.off('auction:stateUpdate');
        socket.off('auction:bidError');
        socket.off('auction:teamStatsUpdate');
        socket.off('tournament:completed');
      };
    }
  }, [socket, roomCode]);

  // Timer effect
  useEffect(() => {
    if (auctionState?.auctionStatus === 'active' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [auctionState?.auctionStatus, timer]);

  const handleAuctionStarted = (data) => {
    setAuctionState(data.auctionState);
    setIsLoading(false);
    setTimer(30);
  };

  const handleBidPlaced = (data) => {
    // Store the updated auction state with the lastBidTeam
    setAuctionState(data.auctionState);
    
    // Update team stats to reflect the new bid immediately
    if (data.teamStats) {
      setTeamStats(data.teamStats);
      
      // Highlight which team just placed a bid
      const biddingTeam = data.teamStats.find(t => t.id === data.team);
      if (biddingTeam) {
        // Show visual confirmation
        setError(`${biddingTeam.name} placed bid of ${formatCurrency(data.amount)}! Budget updated.`);
        setTimeout(() => setError(''), 3000); // Clear after 3 seconds
      }
    } else {
      // Request updated team stats
      socket.emit('auction:getState', { roomCode });
    }
    
    setTimer(30);
  };

  const handlePassed = (data) => {
    setAuctionState(data.auctionState);
    
    // Update team stats if provided (especially when a player is sold due to all teams passing)
    if (data.teamStats) {
      setTeamStats(data.teamStats);
      
      // If a player was sold as a result of the pass, show notification
      if (data.playerSold && data.auctionState.soldPlayers && data.auctionState.soldPlayers.length > 0) {
        const lastSoldPlayer = data.auctionState.soldPlayers[data.auctionState.soldPlayers.length - 1];
        setError(`${lastSoldPlayer.name} sold to ${lastSoldPlayer.soldTo} for ${formatCurrency(lastSoldPlayer.soldPrice)}!`);
        setTimeout(() => setError(''), 3000); // Clear after 3 seconds
      }
    }
  };

  const handlePaused = (data) => {
    setAuctionState(data);
  };

  const handleResumed = (data) => {
    setAuctionState(data);
    setTimer(30);
  };

  const handleAuctionEnded = (data) => {
    setAuctionState(data);
    
    // Show notification for removed teams
    if (data.removedTeams && data.removedTeams.length > 0) {
      data.removedTeams.forEach(team => {
        setError(`${team.name} removed: insufficient players (${team.totalPlayers}/18 minimum required)`);
      });
    }
    
    // Show automatic winner notification
    if (data.tournamentWinner) {
      setError(`${data.tournamentWinner.name} wins the tournament by default!`);
    }
  };

  const handleStateUpdate = (data) => {
    // Check if we're starting the second round (unsold players)
    if (data.auctionState.secondRoundStarted && 
        data.auctionState.secondRoundStarted !== auctionState?.secondRoundStarted) {
      setError(`Second round: Bidding on unsold players (${data.auctionState.secondRoundPlayers?.length || 0} players)`);
    }
    
    setAuctionState(data.auctionState);
    setTeamStats(data.teamStats);
    setIsLoading(false);
  };

  const handleBidError = (error) => {
    setError(error);
  };
  
  const handleTeamStatsUpdate = (updatedTeamStats) => {
    setTeamStats(updatedTeamStats);
  };

  const handleTournamentCompleted = (data) => {
    setTournament(data);
    setShowTournament(true);
  };

  const startAuction = () => {
    if (socket && isCreator) {
      socket.emit('auction:start', { roomCode });
    }
  };

  const placeBid = () => {
    // Convert the bid amount from lakhs (display format) to thousands (internal format)
    // For example, if user enters 20.5 (₹20.5L), it becomes 205 (₹205K in the system)
    const amount = parseFloat(bidAmount) * 10; 
    
    const userTeamStats = teamStats.find(t => t.id === userTeam.id);
    const userBudget = userTeamStats?.budget || 0;
    const playerCount = userTeamStats?.totalPlayers || 0;
    
    // Client-side validations
    if (!socket) {
      return;
    } else if (playerCount >= 25) {
      setError('Cannot bid - your team has reached the maximum player limit (25)');
    } else if (auctionState.lastBidTeam === userTeam.id) {
      setError('You just placed a bid - wait for other teams to respond');
    } else if (amount <= 0) {
      setError('Please enter a valid bid amount');
    } else if (amount > userBudget) {
      setError('Insufficient budget to place this bid');
    } else {
      socket.emit('auction:bid', { roomCode, amount });
      setBidAmount('');
    }
  };

  const passBid = () => {
    const userTeamStats = teamStats.find(t => t.id === userTeam.id);
    const playerCount = userTeamStats?.totalPlayers || 0;
    
    if (!socket) {
      return;
    } else if (playerCount >= 25) {
      setError('Cannot pass - your team has reached the maximum player limit (25)');
      setTimeout(() => setError(''), 3000);
    } else if (auctionState.lastBidTeam === userTeam.id) {
      setError('You just placed a bid - wait for other teams to respond');
      setTimeout(() => setError(''), 3000);
    } else {
      socket.emit('auction:pass', { roomCode });
    }
  };

  const pauseAuction = () => {
    if (socket && isCreator) {
      socket.emit('auction:pause', { roomCode });
    }
  };

  const resumeAuction = () => {
    if (socket && isCreator) {
      socket.emit('auction:resume', { roomCode });
    }
  };

  const endAuction = () => {
    if (socket && isCreator) {
      socket.emit('auction:end', { roomCode });
    }
  };

  const startTournament = () => {
    if (socket && isCreator) {
      socket.emit('tournament:start', { roomCode });
    }
  };

  const formatCurrency = (amount) => {
    // Display all amounts in lakhs
    return `₹${(amount / 10).toFixed(1)}L`;
  };

  const getPlayerLevelColor = (level) => {
    switch (level) {
      case 'ultra-legend': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'legend': return 'bg-gradient-to-r from-purple-500 to-purple-700';
      case 'elite': return 'bg-gradient-to-r from-blue-500 to-blue-700';
      case 'pro': return 'bg-gradient-to-r from-green-500 to-green-700';
      case 'domestic': return 'bg-gradient-to-r from-orange-500 to-orange-700';
      case 'uncapped': return 'bg-gradient-to-r from-gray-500 to-gray-700';
      default: return 'bg-gray-500';
    }
  };

  const getRoleIcon = (role) => {
    if (role.includes('wicket-keeper')) return '🧤';
    if (role.includes('all-rounder')) return '⚡';
    if (role.includes('bowler')) return '🎯';
    if (role.includes('batter')) return '🏏';
    return '👤';
  };

  if (showTournament && tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-6">
            <h1 className="text-3xl font-bold text-white mb-4 text-center">
              🏆 IPL Tournament Results
            </h1>
            
            {/* Winner */}
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-8 py-4 rounded-xl inline-block">
                <h2 className="text-2xl font-bold">🎉 Champion: {tournament.tournament.tournamentWinner?.name}</h2>
              </div>
            </div>

            {/* Points Table */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">📊 Final Points Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left p-3">Position</th>
                      <th className="text-left p-3">Team</th>
                      <th className="text-left p-3">Matches</th>
                      <th className="text-left p-3">Won</th>
                      <th className="text-left p-3">Lost</th>
                      <th className="text-left p-3">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.summary.pointsTable.map((team, index) => (
                      <tr key={team.id} className="border-b border-white/10">
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3 font-semibold">{team.name}</td>
                        <td className="p-3">{team.matchesPlayed}</td>
                        <td className="p-3 text-green-400">{team.matchesWon}</td>
                        <td className="p-3 text-red-400">{team.matchesLost}</td>
                        <td className="p-3 font-bold">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Matches */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">🏏 Match Results</h3>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {tournament.summary.matches.map((match, index) => (
                  <div key={match.matchId} className="bg-white/5 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Match {match.matchNumber}</span>
                        <span className="text-white">
                          {match.team1.name} vs {match.team2.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold">
                          {match.winner.name} won {match.margin}
                        </div>
                        <div className="text-sm text-gray-400">
                          {match.team1Score} - {match.team2Score}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center mt-6">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300"
              >
                New Tournament
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-xl">Loading Auction...</p>
        </div>
      </div>
    );
  }

  if (!auctionState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-6">🏏 IPL Auction Ready</h1>
            <p className="text-white/70 mb-8">All teams have selected their franchises. Ready to start the auction!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {teams.map((team, index) => (
                <div key={team.id} className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white font-bold">{team.name}</h3>
                  <p className="text-white/70">Budget: ₹120 Cr</p>
                  <p className="text-white/70">Players needed: 18-25</p>
                </div>
              ))}
            </div>

            {isCreator && (
              <button
                onClick={startAuction}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
              >
                🚀 Start Auction
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = auctionState.currentPlayer;
  const userTeam = teams.find(t => t.playerName === user.username);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
          {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">🏏 IPL Auction</h1>
              {auctionState.secondRoundStarted && (
                <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg px-2 py-1 mt-2">
                  <p className="text-purple-300 text-sm font-semibold">Second Round: Unsold Players</p>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <div className="text-white">
                <span className="text-sm">Status: </span>
                <span className={`font-bold ${
                  auctionState.auctionStatus === 'active' ? 'text-green-400' :
                  auctionState.auctionStatus === 'paused' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {auctionState.auctionStatus.toUpperCase()}
                </span>
              </div>
              {auctionState.auctionStatus === 'active' && (
                <div className="text-white">
                  <span className="text-sm">Time: </span>
                  <span className="font-bold text-orange-400">{timer}s</span>
                </div>
              )}
            </div>
          </div>
        </div>        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Player */}
          <div className="lg:col-span-2">
            {currentPlayer && auctionState.auctionStatus !== 'ended' && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-4">🎯 Current Player</h2>
                
                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${getPlayerLevelColor(currentPlayer.level)}`}>
                      {getRoleIcon(currentPlayer.role)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{currentPlayer.name}</h3>
                      <p className="text-white/70 capitalize">{currentPlayer.role}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getPlayerLevelColor(currentPlayer.level)} text-white`}>
                          {currentPlayer.level.toUpperCase()}
                        </span>
                        <span className="text-white/70">Score: {currentPlayer.score}</span>
                        {currentPlayer.overseas && (
                          <span className="px-2 py-1 bg-blue-500 rounded-full text-xs text-white">
                            OVERSEAS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/70 text-sm">Base Price</p>
                      <p className="text-white font-bold">{formatCurrency(currentPlayer.basePrice)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-white/70 text-sm">Current Bid</p>
                      <p className="text-green-400 font-bold text-xl">{formatCurrency(auctionState.currentBid)}</p>
                    </div>
                  </div>

                  {auctionState.currentBidder && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-3 mb-4">
                      <p className="text-green-400 font-bold">
                        Leading bid by {auctionState.currentBidder}
                      </p>
                    </div>
                  )}

                  {/* Bidding Controls */}
                  {auctionState.auctionStatus === 'active' && userTeam && (
                    <div className="space-y-4">
                      {/* Show current team budget */}
                      {teamStats.find(t => t.id === userTeam.id) && (
                        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <p className="text-blue-300 text-sm">Your Budget</p>
                            <p className="text-white font-bold">{formatCurrency(teamStats.find(t => t.id === userTeam.id)?.budget || 0)}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`Min: ${((auctionState.currentBid + currentPlayer.bidIncrement) / 10).toFixed(1)}L`}
                          className={`flex-1 px-4 py-2 bg-white/10 border rounded-lg text-white placeholder-white/50 ${
                            bidAmount && (parseFloat(bidAmount) * 10) > (teamStats.find(t => t.id === userTeam.id)?.budget || 0) 
                              ? 'border-red-500 bg-red-500/10' 
                              : 'border-white/20'
                          }`}
                          min={(auctionState.currentBid + currentPlayer.bidIncrement) / 10}
                          max={(teamStats.find(t => t.id === userTeam.id)?.budget || 0) / 10}
                          step="0.1"
                        />
                        <button
                          onClick={placeBid}
                          disabled={
                            !bidAmount || 
                            parseFloat(bidAmount) < (auctionState.currentBid + currentPlayer.bidIncrement) / 10 ||
                            (parseFloat(bidAmount) * 10) > (teamStats.find(t => t.id === userTeam.id)?.budget || 0) ||
                            // Disable if player count reached 25
                            (teamStats.find(t => t.id === userTeam.id)?.totalPlayers || 0) >= 25 ||
                            // Disable if team just placed a bid (turn-based bidding)
                            auctionState.lastBidTeam === userTeam.id
                          }
                          className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300"
                          title={
                            !bidAmount ? "Enter a bid amount" :
                            parseFloat(bidAmount) < (auctionState.currentBid + currentPlayer.bidIncrement) / 10 ? "Bid amount too low" :
                            (parseFloat(bidAmount) * 10) > (teamStats.find(t => t.id === userTeam.id)?.budget || 0) ? "Insufficient budget" :
                            (teamStats.find(t => t.id === userTeam.id)?.totalPlayers || 0) >= 25 ? "Maximum player limit (25) reached" :
                            auctionState.lastBidTeam === userTeam.id ? "You just placed a bid - wait for other teams to respond" :
                            "Place your bid"
                          }
                        >
                          Bid
                        </button>
                      </div>
                      
                      {/* Show budget warning if bid exceeds budget */}
                      {bidAmount && (parseFloat(bidAmount) * 10) > (teamStats.find(t => t.id === userTeam.id)?.budget || 0) && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-sm">
                          <p className="text-red-300">Bid exceeds your available budget!</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button
                          onClick={passBid}
                          disabled={
                            // Disable pass button if this team just placed the last bid (turn-based bidding)
                            auctionState.lastBidTeam === userTeam.id ||
                            // Or if player count reached 25
                            (teamStats.find(t => t.id === userTeam.id)?.totalPlayers || 0) >= 25
                          }
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300"
                          title={
                            auctionState.lastBidTeam === userTeam.id ? "You just placed a bid - wait for other teams to respond" :
                            (teamStats.find(t => t.id === userTeam.id)?.totalPlayers || 0) >= 25 ? "Maximum player limit (25) reached" :
                            "Skip bidding on this player"
                          }
                        >
                          Pass
                        </button>
                        
                        {/* Quick bid buttons */}
                        <button
                          onClick={() => {
                            const quickBid = (auctionState.currentBid + currentPlayer.bidIncrement) / 10;
                            setBidAmount(quickBid.toString());
                          }}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all duration-300"
                        >
                          +{formatCurrency(currentPlayer.bidIncrement)}
                        </button>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className={`${
                      error.includes('Cannot bid') || 
                      error.includes('Insufficient budget') || 
                      error.includes('wait for other teams') 
                        ? 'bg-red-500/20 border border-red-500/50' 
                        : error.includes('placed bid') || error.includes('sold to')
                          ? 'bg-green-500/20 border border-green-500/50'
                          : 'bg-blue-500/20 border border-blue-500/50'
                      } rounded-lg p-3 mt-4 transition-all duration-300 animate-pulse`}
                    >
                      <p className={`${
                        error.includes('Cannot bid') || 
                        error.includes('Insufficient budget') ||
                        error.includes('wait for other teams')
                          ? 'text-red-400'
                          : error.includes('placed bid') || error.includes('sold to')
                            ? 'text-green-400'
                            : 'text-blue-400'
                      } flex items-center`}>
                        {error.includes('Cannot bid') || 
                         error.includes('Insufficient budget') ||
                         error.includes('wait for other teams')
                          ? <span className="mr-2">⚠️</span>
                          : error.includes('placed bid') || error.includes('sold to')
                            ? <span className="mr-2">✅</span>
                            : <span className="mr-2">ℹ️</span>
                        }
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auction Controls for Creator */}
            {isCreator && (
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
                <h3 className="text-lg font-bold text-white mb-4">🎮 Auction Controls</h3>
                <div className="flex gap-2 flex-wrap">
                  {auctionState.auctionStatus === 'active' && (
                    <button
                      onClick={pauseAuction}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg transition-all duration-300"
                    >
                      ⏸️ Pause
                    </button>
                  )}
                  
                  {auctionState.auctionStatus === 'paused' && (
                    <button
                      onClick={resumeAuction}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-300"
                    >
                      ▶️ Resume
                    </button>
                  )}
                  
                  {auctionState.auctionStatus !== 'ended' && (
                    <button
                      onClick={endAuction}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all duration-300"
                    >
                      🛑 End Auction
                    </button>
                  )}
                  
                  {auctionState.auctionStatus === 'ended' && !auctionState.tournamentWinner && (
                    <button
                      onClick={startTournament}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-300"
                    >
                      🏆 Start Tournament
                    </button>
                  )}
                </div>
                
                {/* Display removed teams */}
                {auctionState.auctionStatus === 'ended' && auctionState.removedTeams && auctionState.removedTeams.length > 0 && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Teams Removed (Insufficient Players)</h4>
                    <div className="space-y-2">
                      {auctionState.removedTeams.map((team, index) => (
                        <div key={index} className="text-red-200 text-sm">
                          {team.name} - {team.playerCount}/18 players
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Display automatic winner if applicable */}
                {auctionState.auctionStatus === 'ended' && auctionState.tournamentWinner && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <h4 className="text-green-300 font-semibold">🏆 Tournament Winner:</h4>
                    <p className="text-white">{auctionState.tournamentWinner.name}</p>
                    <p className="text-sm text-green-200 mt-1">Winner by default (only qualifying team)</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Team Stats */}
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">📊 Team Stats</h3>
              <div className="space-y-3">
                {teamStats.map((team) => (
                  <div 
                    key={team.id} 
                    className={`bg-white/5 rounded-lg p-3 transition-all duration-500 ${
                      auctionState?.currentBidderTeam === team.id ? 'bg-green-500/20 border border-green-500/50' : ''
                    }`}
                  >
                    <h4 className="text-white font-bold flex items-center">
                      {team.name}
                      {auctionState?.currentBidderTeam === team.id && (
                        <span className="ml-2 text-xs bg-green-500 px-2 py-0.5 rounded-full">
                          Current Bidder
                        </span>
                      )}
                      {auctionState?.lastBidTeam === team.id && (
                        <span className="ml-2 text-xs bg-blue-500 px-2 py-0.5 rounded-full">
                          Last Bid
                        </span>
                      )}
                    </h4>
                    {/* Enhanced Budget Display with both remaining and spent budget */}
                    <div className="mt-2 mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-white/70">Budget:</span>
                        <span className={`font-bold ${
                          team.budget < 200000 ? "text-red-400" : 
                          team.budget < 500000 ? "text-yellow-400" : 
                          "text-green-400"
                        }`}>
                          {formatCurrency(team.budget)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-white/70">
                          Spent: <span className="text-orange-300">{formatCurrency(team.budgetSpent || 1200000 - team.budget)}</span>
                        </span>
                        <span className="text-white/70">Initial: ₹120.0L</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            team.budget < 200000 ? "bg-gradient-to-r from-red-500 to-orange-500" : 
                            team.budget < 500000 ? "bg-gradient-to-r from-yellow-500 to-green-400" :
                            "bg-gradient-to-r from-green-500 to-green-300"
                          }`}
                          style={{ width: `${(team.budget / 1200000) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-white/70">Players</p>
                        <p className={`text-sm font-bold ${team.totalPlayers >= 25 ? 'text-red-400 flex items-center' : 'text-white'}`}>
                          {team.totalPlayers}/25
                          {team.totalPlayers >= 25 && (
                            <span className="ml-1 text-xs bg-red-500/30 text-white px-1.5 rounded-sm">
                              MAX
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Overseas</p>
                        <p className="text-sm font-bold text-white">{team.overseasCount}/8</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Spent</p>
                        <p className="text-sm font-bold text-purple-300">{formatCurrency(team.budgetSpent)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-white/70">Min. Required</p>
                        <p className="text-sm font-bold text-white">18</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${team.totalPlayers < 18 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                        style={{ width: `${(team.totalPlayers / 25) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auction Progress */}
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-white mb-4">📈 Progress</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-white/70 text-sm">Players Sold</p>
                  <p className="text-green-400 font-bold">{auctionState.soldPlayers?.length || 0}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Players Unsold</p>
                  <p className="text-red-400 font-bold">{auctionState.unsoldPlayers?.length || 0}</p>
                </div>
                <div>
                  <p className="text-white/70 text-sm">Remaining</p>
                  <p className="text-white font-bold">
                    {auctionState.playerPool?.length - auctionState.currentPlayerIndex || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IPLAuctionInterface;
