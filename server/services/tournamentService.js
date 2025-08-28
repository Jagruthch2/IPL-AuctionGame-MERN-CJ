class TournamentService {
  constructor() {
    this.tournaments = new Map(); // roomCode -> tournamentState
  }

  initializeTournament(roomCode, teams) {
    const tournamentState = {
      roomCode,
      teams: teams.map(team => ({
        ...team,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        points: 0,
        netRunRate: 0, // Simplified for this implementation
        probabilityScore: this.calculateTeamProbability(team.players)
      })),
      matches: [],
      pointsTable: [],
      currentPhase: 'league', // league, playoffs, final, completed
      tournamentWinner: null,
      playoffTeams: [],
      finalTeams: []
    };

    // Generate match fixtures based on number of teams
    this.generateFixtures(tournamentState);
    
    this.tournaments.set(roomCode, tournamentState);
    return tournamentState;
  }

  calculateTeamProbability(players) {
    if (!players || players.length === 0) return 0;
    
    // Calculate average score with role weightings
    const roleWeights = {
      'batter': 1.2,
      'wicket-keeper': 1.1,
      'wicket-keeper batter': 1.2,
      'all-rounder': 1.3,
      'bowler': 1.1
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;

    players.forEach(player => {
      const weight = roleWeights[player.role] || 1.0;
      totalWeightedScore += player.score * weight;
      totalWeight += weight;
    });

    const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    
    // Normalize to percentage (assuming max possible average is around 95)
    return Math.min(averageScore / 95 * 100, 100);
  }

  generateFixtures(tournament) {
    const teams = tournament.teams;
    const numTeams = teams.length;

    if (numTeams === 2) {
      // 15 head-to-head matches
      for (let i = 0; i < 15; i++) {
        tournament.matches.push({
          matchId: `match_${i + 1}`,
          team1: teams[0],
          team2: teams[1],
          matchNumber: i + 1,
          phase: 'league',
          completed: false,
          winner: null
        });
      }
    } else if (numTeams === 3) {
      // Each pair plays 3 times
      let matchCounter = 1;
      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < numTeams; i++) {
          for (let j = i + 1; j < numTeams; j++) {
            tournament.matches.push({
              matchId: `match_${matchCounter}`,
              team1: teams[i],
              team2: teams[j],
              matchNumber: matchCounter,
              round: round + 1,
              phase: 'league',
              completed: false,
              winner: null
            });
            matchCounter++;
          }
        }
      }
    } else if (numTeams >= 4 && numTeams <= 6) {
      // 2 matches per team pairing + playoffs
      let matchCounter = 1;
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < numTeams; i++) {
          for (let j = i + 1; j < numTeams; j++) {
            tournament.matches.push({
              matchId: `match_${matchCounter}`,
              team1: teams[i],
              team2: teams[j],
              matchNumber: matchCounter,
              round: round + 1,
              phase: 'league',
              completed: false,
              winner: null
            });
            matchCounter++;
          }
        }
      }
    } else if (numTeams >= 7 && numTeams <= 10) {
      // 2 matches per pairing + playoffs
      let matchCounter = 1;
      for (let round = 0; round < 2; round++) {
        for (let i = 0; i < numTeams; i++) {
          for (let j = i + 1; j < numTeams; j++) {
            tournament.matches.push({
              matchId: `match_${matchCounter}`,
              team1: teams[i],
              team2: teams[j],
              matchNumber: matchCounter,
              round: round + 1,
              phase: 'league',
              completed: false,
              winner: null
            });
            matchCounter++;
          }
        }
      }
    }
  }

  simulateMatch(team1, team2) {
    const prob1 = team1.probabilityScore || 50;
    const prob2 = team2.probabilityScore || 50;
    
    // Normalize probabilities
    const total = prob1 + prob2;
    const normalizedProb1 = prob1 / total;
    
    // Add some randomness (±15% variation)
    const randomFactor = 0.85 + Math.random() * 0.3;
    const finalProb1 = normalizedProb1 * randomFactor;
    
    // Simulate match
    const random = Math.random();
    const winner = random < finalProb1 ? team1 : team2;
    
    return {
      winner,
      team1Score: Math.floor(140 + Math.random() * 80), // Random score between 140-220
      team2Score: Math.floor(140 + Math.random() * 80),
      margin: this.generateMargin()
    };
  }

  generateMargin() {
    const margins = [
      "by 6 wickets", "by 4 wickets", "by 8 wickets", "by 2 wickets",
      "by 15 runs", "by 23 runs", "by 7 runs", "by 45 runs",
      "by 1 wicket", "by 3 wickets", "by 5 wickets"
    ];
    return margins[Math.floor(Math.random() * margins.length)];
  }

  simulateLeaguePhase(roomCode) {
    const tournament = this.tournaments.get(roomCode);
    if (!tournament) return null;

    const leagueMatches = tournament.matches.filter(m => m.phase === 'league');
    
    leagueMatches.forEach(match => {
      const result = this.simulateMatch(match.team1, match.team2);
      match.completed = true;
      match.winner = result.winner;
      match.team1Score = result.team1Score;
      match.team2Score = result.team2Score;
      match.margin = result.margin;

      // Update team stats
      const team1 = tournament.teams.find(t => t.id === match.team1.id);
      const team2 = tournament.teams.find(t => t.id === match.team2.id);

      team1.matchesPlayed++;
      team2.matchesPlayed++;

      if (result.winner.id === team1.id) {
        team1.matchesWon++;
        team1.points += 2;
        team2.matchesLost++;
      } else {
        team2.matchesWon++;
        team2.points += 2;
        team1.matchesLost++;
      }
    });

    // Generate points table
    this.generatePointsTable(tournament);
    
    // Determine next phase
    if (tournament.teams.length === 2 || tournament.teams.length === 3) {
      tournament.currentPhase = 'completed';
      tournament.tournamentWinner = this.determineWinner(tournament);
    } else {
      tournament.currentPhase = 'playoffs';
      this.setupPlayoffs(tournament);
    }

    this.tournaments.set(roomCode, tournament);
    return tournament;
  }

  generatePointsTable(tournament) {
    tournament.pointsTable = [...tournament.teams]
      .sort((a, b) => {
        // Sort by points, then by matches won, then by probability score
        if (b.points !== a.points) return b.points - a.points;
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        return b.probabilityScore - a.probabilityScore;
      })
      .map((team, index) => ({
        position: index + 1,
        ...team
      }));
  }

  setupPlayoffs(tournament) {
    const sortedTeams = [...tournament.teams].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      return b.probabilityScore - a.probabilityScore;
    });

    if (tournament.teams.length >= 4) {
      // Top 4 teams for playoffs
      tournament.playoffTeams = sortedTeams.slice(0, 4);
      
      // Qualifier 1: 1st vs 2nd
      const qualifier1 = {
        matchId: 'qualifier1',
        team1: tournament.playoffTeams[0],
        team2: tournament.playoffTeams[1],
        matchNumber: tournament.matches.length + 1,
        phase: 'qualifier1',
        completed: false,
        winner: null
      };

      // Eliminator: 3rd vs 4th
      const eliminator = {
        matchId: 'eliminator',
        team1: tournament.playoffTeams[2],
        team2: tournament.playoffTeams[3],
        matchNumber: tournament.matches.length + 2,
        phase: 'eliminator',
        completed: false,
        winner: null
      };

      tournament.matches.push(qualifier1, eliminator);
    }
  }

  simulatePlayoffs(roomCode) {
    const tournament = this.tournaments.get(roomCode);
    if (!tournament) return null;

    const playoffMatches = tournament.matches.filter(m => 
      ['qualifier1', 'eliminator', 'qualifier2', 'final'].includes(m.phase) && !m.completed
    );

    playoffMatches.forEach(match => {
      if (match.phase === 'qualifier1') {
        const result = this.simulateMatch(match.team1, match.team2);
        match.completed = true;
        match.winner = result.winner;
        match.team1Score = result.team1Score;
        match.team2Score = result.team2Score;
        match.margin = result.margin;

        // Winner goes to final, loser goes to qualifier 2
        const winner = result.winner;
        const loser = result.winner.id === match.team1.id ? match.team2 : match.team1;
        
        tournament.finalTeams.push(winner);
        
        // Create Qualifier 2
        const elimWinner = tournament.matches.find(m => m.phase === 'eliminator')?.winner;
        if (elimWinner) {
          const qualifier2 = {
            matchId: 'qualifier2',
            team1: loser,
            team2: elimWinner,
            matchNumber: tournament.matches.length + 1,
            phase: 'qualifier2',
            completed: false,
            winner: null
          };
          tournament.matches.push(qualifier2);
        }
      } else if (match.phase === 'eliminator') {
        const result = this.simulateMatch(match.team1, match.team2);
        match.completed = true;
        match.winner = result.winner;
        match.team1Score = result.team1Score;
        match.team2Score = result.team2Score;
        match.margin = result.margin;
      } else if (match.phase === 'qualifier2') {
        const result = this.simulateMatch(match.team1, match.team2);
        match.completed = true;
        match.winner = result.winner;
        match.team1Score = result.team1Score;
        match.team2Score = result.team2Score;
        match.margin = result.margin;

        tournament.finalTeams.push(result.winner);
        
        // Create Final
        if (tournament.finalTeams.length === 2) {
          const final = {
            matchId: 'final',
            team1: tournament.finalTeams[0],
            team2: tournament.finalTeams[1],
            matchNumber: tournament.matches.length + 1,
            phase: 'final',
            completed: false,
            winner: null
          };
          tournament.matches.push(final);
        }
      } else if (match.phase === 'final') {
        const result = this.simulateMatch(match.team1, match.team2);
        match.completed = true;
        match.winner = result.winner;
        match.team1Score = result.team1Score;
        match.team2Score = result.team2Score;
        match.margin = result.margin;

        tournament.tournamentWinner = result.winner;
        tournament.currentPhase = 'completed';
      }
    });

    this.tournaments.set(roomCode, tournament);
    return tournament;
  }

  determineWinner(tournament) {
    if (tournament.teams.length === 2 || tournament.teams.length === 3) {
      // Winner by most matches won
      return tournament.teams.reduce((winner, team) => 
        team.matchesWon > winner.matchesWon ? team : winner
      );
    } else {
      // Winner determined by final match
      const finalMatch = tournament.matches.find(m => m.phase === 'final');
      return finalMatch?.winner || tournament.pointsTable[0];
    }
  }

  getTournamentState(roomCode) {
    return this.tournaments.get(roomCode);
  }

  simulateFullTournament(roomCode) {
    let tournament = this.simulateLeaguePhase(roomCode);
    
    if (tournament.currentPhase === 'playoffs') {
      tournament = this.simulatePlayoffs(roomCode);
    }

    return tournament;
  }

  getTournamentSummary(roomCode) {
    const tournament = this.tournaments.get(roomCode);
    if (!tournament) return null;

    return {
      winner: tournament.tournamentWinner,
      pointsTable: tournament.pointsTable,
      matches: tournament.matches.filter(m => m.completed),
      totalMatches: tournament.matches.filter(m => m.completed).length,
      phases: {
        league: tournament.matches.filter(m => m.phase === 'league' && m.completed).length,
        playoffs: tournament.matches.filter(m => ['qualifier1', 'eliminator', 'qualifier2', 'final'].includes(m.phase) && m.completed).length
      }
    };
  }
}

module.exports = new TournamentService();
