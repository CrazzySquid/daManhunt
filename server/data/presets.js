// server/config/gamePresets.js
module.exports = {
  balanced: {
    revealIntervals: [20, 20, 10, 10, 10, 5, 5],
    headStartMinutes: 15,
    roundDurationMinutes: 60,
    objectiveCount: 4
  },
  hunterFavored: {
    revealIntervals: [10, 10, 5, 5, 5, 5, 2, 2, 2, 2],
    headStartMinutes: 15,
    roundDurationMinutes: 45,
    objectiveCount: 3
  },
  runnerFavored: {
    revealIntervals: [30, 20, 20, 10, 10, 5],
    headStartMinutes: 20,
    roundDurationMinutes: 75,
    objectiveCount: 5
  },
  debug: {
    revealIntervals: [0.1, 0.1, 0.1, 1],
    headStartMinutes: 0.2,
    roundDurationMinutes: 5,
    objectiveCount: 2
  }
};