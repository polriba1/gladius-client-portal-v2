export const reportingConfig = {
  movingAverageWindow: 3,
  economics: {
    missedCallCost: 35,
    automationCoverage: 0.4,
    automationSavingsPerCall: 18,
    avgTicketValue: 150,
    conversionRate: 0.3,
    hourlyRate: 20,
  },
  benchmarks: {
    resolutionRate: {
      top: 0.85,
      average: 0.72,
      bottom: 0.58,
    },
    avgHandleTimeSeconds: {
      top: 240,
      average: 360,
      bottom: 480,
    },
    ticketsPerCall: {
      top: 0.35,
      average: 0.25,
      bottom: 0.15,
    },
  },
};
