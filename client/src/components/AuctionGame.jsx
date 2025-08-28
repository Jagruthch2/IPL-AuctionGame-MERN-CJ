import { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

const AuctionGame = ({ user }) => {
  const { gameState, placeBid, updateGameState, isConnected } = useSocket();
  const [bidAmount, setBidAmount] = useState('');
  const [isPlacingBid, setIsPlacingBid] = useState(false);

  // Sample auction items
  const auctionItems = [
    { id: 1, name: 'Vintage Watch', startingBid: 100, image: '⌚' },
    { id: 2, name: 'Rare Painting', startingBid: 500, image: '🖼️' },
    { id: 3, name: 'Diamond Ring', startingBid: 1000, image: '💎' },
    { id: 4, name: 'Classic Car', startingBid: 5000, image: '🚗' },
  ];

  const [currentItem, setCurrentItem] = useState(auctionItems[0]);

  useEffect(() => {
    if (!gameState.auctionItem) {
      updateGameState({
        auctionItem: currentItem,
        isAuctionActive: true,
        currentBid: currentItem.startingBid
      });
    }
  }, [currentItem, gameState.auctionItem, updateGameState]);

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!bidAmount || !isConnected || isPlacingBid) return;

    const bid = parseInt(bidAmount);
    const currentBid = gameState.currentBid || currentItem.startingBid;

    if (bid <= currentBid) {
      alert(`Bid must be higher than current bid of $${currentBid}`);
      return;
    }

    setIsPlacingBid(true);
    placeBid(bid);
    setBidAmount('');
    
    setTimeout(() => setIsPlacingBid(false), 1000);
  };

  const startNewAuction = () => {
    const randomItem = auctionItems[Math.floor(Math.random() * auctionItems.length)];
    setCurrentItem(randomItem);
    updateGameState({
      auctionItem: randomItem,
      isAuctionActive: true,
      currentBid: randomItem.startingBid,
      currentBidder: null
    });
  };

  const quickBid = (increment) => {
    const currentBid = gameState.currentBid || currentItem.startingBid;
    const newBid = currentBid + increment;
    placeBid(newBid);
  };

  const displayedItem = gameState.auctionItem || currentItem;
  const displayedBid = gameState.currentBid || displayedItem.startingBid;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Auction Header */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
          🏆 Live Auction 🏆
        </h2>
        <p className="text-gray-600">Place your bids in real-time!</p>
      </div>

      {/* Auction Item Display */}
      <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 mb-6">
        <div className="text-center mb-6">
          <div className="text-8xl mb-4">{displayedItem.image}</div>
          <h3 className="text-3xl font-bold text-gray-800 mb-2">{displayedItem.name}</h3>
          <p className="text-gray-600">Starting bid: ${displayedItem.startingBid}</p>
        </div>

        {/* Current Bid Display */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-center text-white mb-6">
          <div className="text-sm font-medium opacity-90 mb-1">Current Highest Bid</div>
          <div className="text-4xl font-bold">${displayedBid}</div>
          {gameState.currentBidder && (
            <div className="text-sm opacity-90 mt-2">
              by {gameState.currentBidder}
            </div>
          )}
        </div>

        {/* Bidding Controls */}
        {isConnected && gameState.isAuctionActive ? (
          <div className="space-y-4">
            {/* Custom Bid Form */}
            <form onSubmit={handlePlaceBid} className="flex space-x-3">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder={`Enter bid (min: $${displayedBid + 1})`}
                min={displayedBid + 1}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 focus:outline-none bg-white/50 backdrop-blur-sm"
              />
              <button
                type="submit"
                disabled={!bidAmount || isPlacingBid}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isPlacingBid ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Bidding...</span>
                  </div>
                ) : (
                  'Place Bid'
                )}
              </button>
            </form>

            {/* Quick Bid Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => quickBid(10)}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                +$10
              </button>
              <button
                onClick={() => quickBid(50)}
                className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                +$50
              </button>
              <button
                onClick={() => quickBid(100)}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors duration-200"
              >
                +$100
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {!isConnected ? 'Connecting to server...' : 'Auction ended'}
            </p>
            {isConnected && (
              <button
                onClick={startNewAuction}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 hover:scale-105"
              >
                Start New Auction
              </button>
            )}
          </div>
        )}
      </div>

      {/* Game Instructions */}
      <div className="bg-white/60 backdrop-blur-lg rounded-xl p-6 border border-white/20">
        <h4 className="text-lg font-bold text-gray-800 mb-3">🎮 How to Play</h4>
        <ul className="text-gray-600 space-y-2 text-sm">
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Enter a bid amount higher than the current bid</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
            <span>Use quick bid buttons for faster bidding</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>All players see bids in real-time</span>
          </li>
          <li className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span>Highest bidder wins when auction ends</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default AuctionGame;
