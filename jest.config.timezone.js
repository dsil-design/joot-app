// The main suite pins TZ=UTC so a local run predicts CI. That is also the one
// timezone where date bugs hide: a 'YYYY-MM-DD' string parses to UTC midnight,
// so reading local calendar components back off it only misbehaves away from
// UTC. This config re-runs the same suite from a zone west of UTC, where such a
// mistake shifts every date by a day.
//
// The require comes first on purpose — the base config sets TZ=UTC when it is
// evaluated, so overriding it has to happen afterwards.
const base = require('./jest.config');

process.env.TZ = 'America/New_York';

module.exports = {
  ...base,
  displayName: 'timezone',
};
