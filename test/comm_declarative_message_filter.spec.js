import { describe, it, before } from 'mocha';
import { expect } from 'chai';

globalThis.IITC = { comm: {} };
import('../core/code/comm_declarative_message_filter.js');

// Define test messages
const testMessages = [
  {
    "guid":"3d.d",
    "time":1709,
    "public":false,
    "secure":true,
    "alert":false,
    "msgToPlayer":false,
    "type":"SYSTEM_BROADCAST",
    "narrowcast":false,
    "auto":true,
    "team":2,
    "player": {
      "name":"Spedd",
      "team":2
    },
    "markup":[
      ["TEXT",{"plain":"Drone returned to Agent by "}],
      ["PLAYER",{"plain":"Spedd","team":"ENLIGHTENED"}]
    ]
  },
  {
    "guid":"40.d",
    "time":1709,
    "public":false,
    "secure":true,
    "alert":false,
    "msgToPlayer":false,
    "type":"PLAYER_GENERATED",
    "narrowcast":false,
    "auto":false,
    "team":2,
    "player": {
      "name":"43Bad",
      "team":2
    },
    "markup":[
      ["SECURE",{"plain":"[secure] "}],
      ["SENDER",{"plain":"43Bad: ","team":"ENLIGHTENED"}],
      ["TEXT",{"plain":""}],
      ["AT_PLAYER",{"plain":"@RockDeckard","team":"ENLIGHTENED"}],
      ["TEXT",{"plain":": HI!"}]
    ]
  },
  {
    "guid":"40.d",
    "time":1709,
    "public":true,
    "secure":false,
    "alert":false,
    "msgToPlayer":false,
    "type":"SYSTEM_BROADCAST",
    "narrowcast":false,
    "auto":true,
    "team":0,
    "player": {
      "name":"b3387",
      "team":2
    },
    "markup":[
      ["TEXT",{"plain":"Agent "}],
      ["PLAYER",{"plain":"b3387","team":"ENLIGHTENED"}],
      ["TEXT",{"plain":" destroyed the "}],
      ["FACTION",{"team":"NEUTRAL","plain":"Neutral"}],
      ["TEXT",{"plain":" Link "}],
      ["PORTAL",{"plain":"Turner Ave. (London N15 5DG, UK)","name":"Turner Ave","address":"London N15 5DG, UK","latE6":5000,"lngE6":-800,"team":"NEUTRAL"}],
      ["TEXT",{"plain":" to "}],
      ["PORTAL",{"plain":"Notice board (London N15 5DG, UK)","name":"Notice board","address":"London N15 5DG, UK","latE6":5001,"lngE6":-801,"team":"NEUTRAL"}]
    ]
  },
  {
    "guid":"ae.d",
    "time":1709,
    "public":true,
    "secure":false,
    "alert":false,
    "msgToPlayer":false,
    "type":"SYSTEM_BROADCAST",
    "narrowcast":false,
    "auto":true,
    "team":1,
    "player": {
      "name":"Q77n",
      "team":1
    },
    "markup":[
      ["PLAYER",{"plain":"Q77n","team":"RESISTANCE"}],
      ["TEXT",{"plain":" captured "}],
      ["PORTAL",{"plain":"Bridge (UK)","name":"Bridge","address":"UK","latE6":6000,"lngE6":-4000,"team":"RESISTANCE"}]
    ]
  },
];

describe('IITC Comm Declarative Message Filter', () => {
  beforeEach(() => {
    // Reset rules before each test
    IITC.comm.declarativeMessageFilter._rules = {};
  });

  it('should add a new rule successfully', () => {
    const ruleId = 'testRule';
    const rule = {
      conditions: [{ field: 'player.team', value: 1 }],
    };

    IITC.comm.declarativeMessageFilter.addRule(ruleId, rule);

    const addedRule = IITC.comm.declarativeMessageFilter.getRuleById(ruleId);
    expect(addedRule).to.deep.equal(rule);
  });

  it('should remove an existing rule by ID', () => {
    const ruleId = 'testRule';
    IITC.comm.declarativeMessageFilter.addRule(ruleId, { conditions: [] });
    IITC.comm.declarativeMessageFilter.removeRule(ruleId);

    const ruleAfterRemoval = IITC.comm.declarativeMessageFilter.getRuleById(ruleId);
    expect(ruleAfterRemoval).to.be.null;
  });

  it('should return all current rules', () => {
    const rules = {
      rule1: { conditions: [{ field: 'player.team', value: 1 }] },
      rule2: { conditions: [{ field: 'player.team', value: 2 }] },
    };

    for (const id in rules) {
      IITC.comm.declarativeMessageFilter.addRule(id, rules[id]);
    }

    const allRules = IITC.comm.declarativeMessageFilter.getAllRules();
    expect(allRules).to.deep.equal(rules);
  });

  // Example: Test matching a rule with a direct comparison
  it('should correctly filter messages based on a direct comparison condition', () => {
    const ruleId = 'directComparison';
    const rule = {
      conditions: [{ field: 'player.name', value: '43Bad' }],
    };

    IITC.comm.declarativeMessageFilter.addRule(ruleId, rule);

    const shouldNotMatch1 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[0]);
    const shouldMatch = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[1]);
    const shouldNotMatch2 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[2]);
    const shouldNotMatch3 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[3]);

    expect(shouldMatch).to.be.true;
    expect(shouldNotMatch1).to.be.false;
    expect(shouldNotMatch2).to.be.false;
    expect(shouldNotMatch3).to.be.false;
  });

  // Example: Test matching a rule with a regex pattern
  it('should correctly filter messages based on a regex pattern condition', () => {
    const ruleId = 'regexPattern';
    const rule = {
      conditions: [{ field: 'markup[5][1].plain', pattern: /UK\)$/i }],
    };

    IITC.comm.declarativeMessageFilter.addRule(ruleId, rule);

    const shouldNotMatch1 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[0]);
    const shouldNotMatch2 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[1]);
    const shouldMatch = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[2]);
    const shouldNotMatch3 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[3]);

    expect(shouldMatch).to.be.true;
    expect(shouldNotMatch1).to.be.false;
    expect(shouldNotMatch2).to.be.false;
    expect(shouldNotMatch3).to.be.false;
  });

  it('should correctly filter messages based on an inverted condition', () => {
    const ruleId = 'invertCondition';
    const rule = {
      conditions: [{ field: 'player.team', value: 1, invert: true }],
    };

    IITC.comm.declarativeMessageFilter.addRule(ruleId, rule);

    const shouldMatch1 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[0]);
    const shouldMatch2 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[1]);
    const shouldMatch3 = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[2]);
    const shouldNotMatch = IITC.comm.declarativeMessageFilter.filterMessage(testMessages[3]); // This message is from Resistance, so it should not match when inverted

    expect(shouldMatch1).to.be.true;
    expect(shouldMatch2).to.be.true;
    expect(shouldMatch3).to.be.true;
    expect(shouldNotMatch).to.be.false;
  });
});
