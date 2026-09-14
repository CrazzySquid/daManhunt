// server/config/gamePresets.js
module.exports = {
  balanced: {
    revealIntervals: [5, 10, 10, 10, 10, 10, 10, 5, 5, 5, 2, 2, 2, 2, 2],
    headStartMinutes: 15,
    roundDurationMinutes: 90,
    objectiveCount: 4
  },
  hunterFavored: {
    revealIntervals: [5, 10, 10, 10, 10, 10, 5, 2, 2, 2, 2, 2],
    headStartMinutes: 15,
    roundDurationMinutes: 70,
    objectiveCount: 4
  },
  runnerFavored: {
    revealIntervals: [5, 15, 10, 10, 10, 10, 10, 5, 5, 5, 5, 2, 2, 2, 2, 2],
    headStartMinutes: 15,
    roundDurationMinutes: 100,
    objectiveCount: 4
  },
  quickGame: {
    revealIntervals: [5, 10, 10, 10, 5, 5, 2, 2, 1],
    headStartMinutes: 10,
    roundDurationMinutes: 50,
    objectiveCount: 3
  },
  superMegaCrazyLongGame: {
    revealIntervals: [5, 15, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 15, 15, 10, 10, 10, 10, 5, 5, 2, 2, 2, 2, 2],
    headStartMinutes: 15,
    roundDurationMinutes: 180,
    objectiveCount: 9
  },
  debug: {
    revealIntervals: [0.1, 0.1, 0.1, 1],
    headStartMinutes: 0.2,
    roundDurationMinutes: 5,
    objectiveCount: 3
  }
};