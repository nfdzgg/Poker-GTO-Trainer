// Hand-written preflop ranges. These are approximations of published solver
// charts for 6-max 100bb cash (no ante), written by hand in range syntax.
// They are NOT solver output. `npm run gen:preflop` expands them into one
// JSON file per spot under src/data/preflop/.
//
// For each spot, list the hands (with frequencies) for each non-fold action.
// Fold is the remainder. Later tokens override earlier ones for a hand.

export const RFI: Record<string, string> = {
  UTG:
    '66+,55:0.75,44:0.5,33:0.5,22:0.5,' +
    'ATs+,A9s,A8s,A7s:0.75,A6s:0.5,A5s,A4s,A3s:0.75,A2s:0.5,' +
    'KTs+,K9s:0.5,QTs+,Q9s:0.25,JTs,J9s:0.5,T9s,98s:0.5,87s:0.25,76s:0.25,65s:0.25,' +
    'AJo+,ATo:0.75,KQo,KJo:0.5,QJo:0.25',
  HJ:
    '55+,44,33:0.75,22:0.75,' +
    'A2s+,K9s+,K8s:0.5,K7s:0.25,K6s:0.25,K5s:0.25,Q9s+,Q8s:0.25,J9s+,J8s:0.25,' +
    'T9s,T8s,98s,87s:0.75,76s:0.5,65s:0.5,54s:0.25,' +
    'ATo+,A9o:0.25,KJo+,KTo:0.25,QJo:0.75,QTo:0.25,JTo:0.25',
  CO:
    '22+,A2s+,K6s+,K5s:0.75,K4s:0.5,K3s:0.5,K2s:0.25,Q8s+,Q7s:0.25,Q6s:0.25,J8s+,J7s:0.25,' +
    'T8s+,T7s:0.5,97s+,87s,86s:0.5,76s,75s:0.25,65s,64s:0.25,54s:0.75,' +
    'A9o+,A8o:0.5,A5o:0.25,KTo+,K9o:0.25,QTo+,JTo,T9o:0.25',
  BTN:
    '22+,A2s+,K2s+,Q5s+,Q4s:0.75,Q3s:0.75,Q2s:0.75,J5s+,J4s:0.5,J3s:0.25,' +
    'T6s+,T5s:0.25,96s+,95s:0.25,85s+,74s+,64s+,53s+,43s:0.5,' +
    'A7o+,A6o:0.75,A5o,A4o:0.75,A3o:0.5,A2o:0.5,K8o+,K7o:0.5,Q9o+,Q8o:0.25,J9o+,J8o:0.25,' +
    'T9o,T8o:0.25,98o:0.5',
  SB:
    '22+,A2s+,K2s+,Q5s+,Q4s:0.5,Q3s:0.5,Q2s:0.5,J6s+,J5s:0.5,J4s:0.25,T6s+,96s+,85s+,' +
    '75s+,74s:0.5,64s+,53s+,43s:0.25,' +
    'A7o+,A6o:0.75,A5o,A4o:0.75,A3o:0.5,A2o:0.25,K9o+,K8o:0.75,K7o:0.5,K6o:0.25,' +
    'Q9o+,Q8o:0.5,J9o+,J8o:0.25,T9o,T8o:0.25,98o:0.25',
};

/** Facing an open: key `${hero}-vs-${opener}`. */
export const VS_OPEN: Record<string, { '3bet': string; call: string }> = {
  'HJ-vs-UTG': {
    '3bet': 'QQ+,AKs,AKo:0.8,JJ:0.4,AQs:0.4,A5s:0.6,A4s:0.4,KQs:0.3,AJs:0.2',
    call: 'JJ:0.6,TT-77,66:0.5,AQs:0.6,AJs:0.8,ATs:0.6,KQs:0.7,KJs:0.5,QJs:0.4,JTs:0.4,AKo:0.2,AQo:0.4',
  },
  'CO-vs-UTG': {
    '3bet': 'QQ+,AKs,AKo:0.85,JJ:0.5,AQs:0.5,A5s:0.7,A4s:0.5,KQs:0.4,AJs:0.25,KJs:0.15',
    call: 'JJ:0.5,TT-66,55:0.5,AQs:0.5,AJs:0.75,ATs:0.7,KQs:0.6,KJs:0.6,KTs:0.3,QJs:0.5,QTs:0.3,JTs:0.6,T9s:0.4,AKo:0.15,AQo:0.5',
  },
  'BTN-vs-UTG': {
    '3bet': 'QQ+,AKs,AKo:0.8,JJ:0.4,AQs:0.4,A5s:0.6,A4s:0.5,KQs:0.3,AJs:0.2,KJs:0.15,76s:0.15,65s:0.15',
    call:
      'JJ:0.6,TT-22,AQs:0.6,AJs:0.8,ATs-A9s,A8s:0.5,KQs:0.7,KJs:0.85,KTs:0.8,QJs:0.9,QTs:0.7,JTs:0.9,T9s:0.8,' +
      '98s:0.6,87s:0.5,76s:0.5,65s:0.4,AKo:0.2,AQo:0.7,AJo:0.3,KQo:0.4',
  },
  'SB-vs-UTG': {
    '3bet': 'QQ+,AKs,AKo,JJ:0.7,TT:0.4,AQs:0.8,AJs:0.5,A5s:0.6,A4s:0.4,KQs:0.6,AQo:0.4',
    call: 'JJ:0.3,TT:0.4,99:0.4,88:0.3,AQs:0.2,AJs:0.3,KQs:0.2',
  },
  'BB-vs-UTG': {
    '3bet': 'KK+,AKs,QQ:0.7,AKo:0.6,A5s:0.4,A4s:0.3,AQs:0.3,KQs:0.15,76s:0.1,65s:0.1',
    call:
      'QQ:0.3,JJ-22,AQs:0.7,AJs-A6s,A5s:0.6,A4s:0.7,A3s-A2s,KQs:0.85,KJs-K8s,K7s:0.5,K6s:0.5,QJs-Q9s,Q8s:0.5,' +
      'JTs-J8s,T9s-T8s,98s,97s,87s,86s:0.5,76s:0.9,75s:0.5,65s:0.9,54s,' +
      'AKo:0.4,AQo-ATo,A9o:0.4,KQo,KJo:0.8,KTo:0.4,QJo:0.6,QTo:0.3,JTo:0.5',
  },
  'CO-vs-HJ': {
    '3bet':
      'QQ+,AKs,AKo:0.9,JJ:0.6,TT:0.25,AQs:0.6,AJs:0.35,ATs:0.2,A5s:0.8,A4s:0.6,A3s:0.3,KQs:0.5,KJs:0.3,AQo:0.35,QJs:0.15',
    call:
      'JJ:0.4,TT:0.75,99-55,44:0.4,AQs:0.4,AJs:0.65,ATs:0.6,A9s:0.3,KQs:0.5,KJs:0.6,KTs:0.4,QJs:0.6,QTs:0.3,JTs:0.6,' +
      'T9s:0.4,98s:0.2,AKo:0.1,AQo:0.45,KQo:0.2',
  },
  'BTN-vs-HJ': {
    '3bet':
      'QQ+,AKs,AKo:0.85,JJ:0.5,TT:0.2,AQs:0.5,AJs:0.3,A5s:0.7,A4s:0.6,A3s:0.3,KQs:0.4,KJs:0.2,AQo:0.3,76s:0.2,65s:0.2,K9s:0.15',
    call:
      'JJ:0.5,TT:0.8,99-22,AQs:0.5,AJs:0.7,ATs-A8s,A7s:0.5,A6s:0.4,KQs:0.6,KJs:0.8,KTs,K9s:0.6,QJs,QTs,Q9s:0.5,' +
      'JTs,J9s:0.6,T9s,T8s:0.4,98s,97s:0.3,87s,76s:0.7,65s:0.6,54s:0.4,AKo:0.15,AQo:0.7,AJo:0.5,ATo:0.2,KQo:0.6,KJo:0.3,QJo:0.2',
  },
  'SB-vs-HJ': {
    '3bet':
      'QQ+,AKs,AKo,JJ:0.8,TT:0.5,99:0.25,AQs:0.9,AJs:0.6,ATs:0.4,A5s:0.7,A4s:0.5,KQs:0.7,KJs:0.4,QJs:0.2,AQo:0.6,AJo:0.2',
    call: 'JJ:0.2,TT:0.3,99:0.35,88:0.3,77:0.2,AQs:0.1,AJs:0.3,KQs:0.3,KJs:0.2,JTs:0.25',
  },
  'BB-vs-HJ': {
    '3bet':
      'KK+,AKs,QQ:0.75,JJ:0.25,AKo:0.7,AQs:0.4,A5s:0.5,A4s:0.4,A3s:0.2,KQs:0.25,KJs:0.15,76s:0.15,65s:0.15,AQo:0.15',
    call:
      'QQ:0.25,JJ:0.75,TT-22,AQs:0.6,AJs-A6s,A5s:0.5,A4s:0.6,A3s:0.8,A2s,KQs:0.75,KJs:0.85,KTs-K5s,K4s:0.5,K3s:0.3,' +
      'QJs-Q8s,Q7s:0.5,Q6s:0.3,JTs-J7s,T9s-T7s,98s-96s,87s-85s,76s:0.85,75s,65s:0.85,64s,54s,53s:0.5,43s:0.3,' +
      'AKo:0.3,AQo:0.85,AJo-A9o,A8o:0.5,A5o:0.3,KQo-KTo,K9o:0.4,QJo,QTo:0.7,JTo:0.8,T9o:0.3',
  },
  'BTN-vs-CO': {
    '3bet':
      'JJ+,AKs,AKo,TT:0.4,99:0.15,AQs:0.7,AJs:0.5,ATs:0.3,A5s:0.8,A4s:0.7,A3s:0.5,A2s:0.3,KQs:0.6,KJs:0.4,KTs:0.25,' +
      'QJs:0.25,AQo:0.6,AJo:0.25,KQo:0.25,76s:0.25,65s:0.25,54s:0.2,K9s:0.2,Q9s:0.15',
    call:
      'TT:0.6,99:0.85,88-22,AQs:0.3,AJs:0.5,ATs:0.7,A9s-A6s,KQs:0.4,KJs:0.6,KTs:0.75,K9s:0.6,K8s:0.3,QJs:0.75,QTs,' +
      'Q9s:0.6,JTs,J9s:0.8,T9s,T8s:0.6,98s,97s:0.5,87s,86s:0.3,76s:0.75,65s:0.75,54s:0.5,' +
      'AQo:0.4,AJo:0.6,ATo:0.4,KQo:0.65,KJo:0.4,QJo:0.3',
  },
  'SB-vs-CO': {
    '3bet':
      'JJ+,AKs,AKo,TT:0.7,99:0.4,88:0.2,AQs,AJs:0.8,ATs:0.6,A9s:0.3,A5s:0.8,A4s:0.7,A3s:0.4,KQs:0.85,KJs:0.6,KTs:0.4,' +
      'QJs:0.4,QTs:0.2,JTs:0.3,AQo:0.8,AJo:0.4,KQo:0.4,76s:0.15,65s:0.15',
    call: 'TT:0.3,99:0.4,88:0.4,77:0.3,66:0.2,AJs:0.2,ATs:0.2,KQs:0.15,KJs:0.2,QJs:0.2,JTs:0.3,T9s:0.25',
  },
  'BB-vs-CO': {
    '3bet':
      'QQ+,AKs,AKo:0.75,JJ:0.4,TT:0.15,AQs:0.5,AJs:0.25,A5s:0.6,A4s:0.5,A3s:0.3,KQs:0.3,KJs:0.2,K9s:0.1,76s:0.2,' +
      '65s:0.2,54s:0.15,AQo:0.25,AJo:0.1',
    call:
      'JJ:0.6,TT:0.85,99-22,AQs:0.5,AJs:0.75,ATs-A6s,A5s:0.4,A4s:0.5,A3s:0.7,A2s,KQs:0.7,KJs:0.8,KTs,K9s:0.9,K8s-K2s,' +
      'QJs-Q4s,Q3s:0.5,Q2s:0.3,JTs-J5s,T9s-T6s,98s-95s,87s-85s,76s:0.8,75s,74s,65s:0.8,64s,63s:0.5,54s:0.85,53s,43s:0.5,' +
      'AKo:0.25,AQo:0.75,AJo:0.9,ATo-A7o,A6o:0.5,A5o:0.6,A4o:0.4,KQo-K9o,K8o:0.4,QJo-Q9o,JTo,J9o:0.7,T9o,T8o:0.3,' +
      '98o:0.4,87o:0.2',
  },
  'SB-vs-BTN': {
    '3bet':
      'TT+,AKs,AKo,99:0.7,88:0.5,77:0.3,AQs,AJs,ATs:0.8,A9s:0.5,A8s:0.3,A5s,A4s:0.8,A3s:0.6,A2s:0.4,KQs,KJs:0.8,' +
      'KTs:0.6,K9s:0.4,QJs:0.7,QTs:0.5,Q9s:0.2,JTs:0.6,J9s:0.2,T9s:0.4,98s:0.2,AQo,AJo:0.7,ATo:0.4,KQo:0.7,KJo:0.3,' +
      '76s:0.2,65s:0.2',
    call: '99:0.3,88:0.4,77:0.4,66:0.4,55:0.3,ATs:0.2,A9s:0.2,KTs:0.2,K9s:0.2,QTs:0.3,JTs:0.3,T9s:0.3,98s:0.3,87s:0.3',
  },
  'BB-vs-BTN': {
    '3bet':
      'QQ+,AKs,AKo:0.8,JJ:0.5,TT:0.25,AQs:0.6,AJs:0.35,ATs:0.2,A5s:0.6,A4s:0.6,A3s:0.4,A2s:0.3,KQs:0.4,KJs:0.3,' +
      'KTs:0.2,K9s:0.15,QJs:0.2,Q9s:0.15,J9s:0.15,76s:0.25,65s:0.25,54s:0.25,AQo:0.4,AJo:0.2,KQo:0.2,A5o:0.15',
    call:
      'JJ:0.5,TT:0.75,99-22,AQs:0.4,AJs:0.65,ATs:0.8,A9s-A6s,A5s:0.4,A4s:0.4,A3s:0.6,A2s:0.7,KQs:0.6,KJs:0.7,KTs:0.8,' +
      'K9s:0.85,K8s-K2s,QJs:0.8,QTs,Q9s:0.85,Q8s-Q2s,JTs-J3s,J9s:0.85,T9s-T4s,98s-94s,87s-84s,76s:0.75,75s-73s,65s:0.75,64s,' +
      '63s,62s:0.3,54s:0.75,53s,52s:0.4,43s,42s:0.3,32s:0.3,' +
      'AKo:0.2,AQo:0.6,AJo:0.8,ATo-A2o,A5o:0.85,KQo:0.8,KJo-K5o,K4o:0.5,QJo-Q7o,JTo-J7o,T9o-T7o,98o,97o:0.6,87o,' +
      '86o:0.4,76o:0.6,65o:0.4,54o:0.2',
  },
  'BB-vs-SB': {
    '3bet':
      'TT+,AKs,AKo,99:0.5,88:0.3,AQs,AJs:0.7,ATs:0.5,A9s:0.3,A5s:0.6,A4s:0.6,A3s:0.5,A2s:0.4,KQs:0.8,KJs:0.6,KTs:0.5,' +
      'K9s:0.3,QJs:0.5,QTs:0.4,JTs:0.4,J9s:0.2,T9s:0.3,AQo:0.8,AJo:0.6,ATo:0.4,KQo:0.6,KJo:0.4,QJo:0.25,K5s:0.2,' +
      'Q8s:0.2,T8s:0.2,97s:0.2,86s:0.2,75s:0.2,64s:0.2,53s:0.2',
    call:
      '99:0.5,88:0.7,77-22,AJs:0.3,ATs:0.5,A9s:0.7,A8s-A6s,A5s:0.4,A4s:0.4,A3s:0.5,A2s:0.6,KQs:0.2,KJs:0.4,KTs:0.5,' +
      'K9s:0.7,K8s-K6s,K5s:0.8,K4s-K2s,QJs:0.5,QTs:0.6,Q9s,Q8s:0.8,Q7s-Q2s,JTs:0.6,J9s:0.8,J8s-J4s,T9s:0.7,T8s:0.8,' +
      'T7s-T5s,98s,97s:0.8,96s,95s,87s,86s:0.8,85s,84s:0.5,76s,75s:0.8,74s,65s,64s:0.8,63s,54s,53s:0.8,43s,' +
      'AQo:0.2,AJo:0.4,ATo:0.6,A9o-A2o,KQo:0.4,KJo:0.6,KTo-K6o,K5o:0.5,QJo:0.75,QTo-Q8o,Q7o:0.4,JTo-J8o,J7o:0.3,' +
      'T9o-T8o,T7o:0.4,98o,97o:0.4,87o,86o:0.3,76o,65o:0.5,54o:0.3',
  },
};

/** Facing a 3-bet after opening: key `${opener}-vs-${threeBettor}`. */
export const VS_3BET: Record<string, { '4bet': string; call: string }> = {
  'UTG-vs-HJ': {
    '4bet': 'KK+,AKs,QQ:0.25,AKo:0.45,A5s:0.35,A4s:0.2',
    call: 'QQ:0.75,JJ-99,88:0.6,77:0.4,66:0.2,AKo:0.55,AQs,AJs:0.75,ATs:0.4,KQs:0.85,KJs:0.4,QJs:0.4,JTs:0.4,T9s:0.25,AQo:0.3,A5s:0.3,A4s:0.2',
  },
  'UTG-vs-CO': {
    '4bet': 'KK+,AKs,QQ:0.3,AKo:0.5,A5s:0.4,A4s:0.25,KQs:0.1',
    call: 'QQ:0.7,JJ-88,77:0.5,66:0.3,AKo:0.5,AQs,AJs:0.8,ATs:0.5,KQs:0.8,KJs:0.5,QJs:0.5,JTs:0.5,T9s:0.3,AQo:0.35,A5s:0.3,A4s:0.25',
  },
  'UTG-vs-BTN': {
    '4bet': 'KK+,AKs,QQ:0.35,AKo:0.55,A5s:0.45,A4s:0.3,KQs:0.1,AJs:0.1',
    call:
      'QQ:0.65,JJ-77,66:0.4,55:0.3,AKo:0.45,AQs,AJs:0.8,ATs:0.6,KQs:0.85,KJs:0.6,KTs:0.3,QJs:0.6,JTs:0.6,T9s:0.4,98s:0.2,' +
      'AQo:0.45,A5s:0.3,A4s:0.3',
  },
  'UTG-vs-SB': {
    '4bet': 'KK+,AKs,QQ:0.3,AKo:0.5,A5s:0.35,A4s:0.25',
    call:
      'QQ:0.7,JJ-77,66:0.5,55:0.3,AKo:0.5,AQs,AJs:0.85,ATs:0.7,KQs:0.9,KJs:0.7,KTs:0.4,QJs:0.7,JTs:0.7,T9s:0.5,98s:0.3,' +
      'AQo:0.5,AJo:0.15,KQo:0.2,A5s:0.4,A4s:0.3',
  },
  'UTG-vs-BB': {
    '4bet': 'KK+,AKs,QQ:0.3,AKo:0.45,A5s:0.35,A4s:0.2',
    call:
      'QQ:0.7,JJ-66,55:0.4,44:0.2,AKo:0.55,AQs,AJs:0.9,ATs:0.75,A9s:0.2,KQs:0.9,KJs:0.75,KTs:0.45,QJs:0.75,QTs:0.3,' +
      'JTs:0.75,T9s:0.55,98s:0.35,87s:0.2,AQo:0.55,AJo:0.2,KQo:0.25,A5s:0.45,A4s:0.4',
  },
  'HJ-vs-CO': {
    '4bet': 'KK+,AKs,QQ:0.35,AKo:0.55,A5s:0.45,A4s:0.35,A3s:0.15,KQs:0.1',
    call:
      'QQ:0.65,JJ-88,77:0.5,66:0.3,AKo:0.45,AQs,AJs:0.75,ATs:0.5,KQs:0.8,KJs:0.5,KTs:0.2,QJs:0.5,JTs:0.5,T9s:0.3,' +
      'AQo:0.35,A5s:0.3,A4s:0.3',
  },
  'HJ-vs-BTN': {
    '4bet': 'KK+,AKs,QQ:0.4,JJ:0.1,AKo:0.6,A5s:0.5,A4s:0.4,A3s:0.2,KQs:0.15,AJs:0.1',
    call:
      'QQ:0.6,JJ:0.9,TT-77,66:0.4,55:0.25,AKo:0.4,AQs,AJs:0.8,ATs:0.6,A9s:0.2,KQs:0.8,KJs:0.6,KTs:0.35,QJs:0.6,QTs:0.25,' +
      'JTs:0.6,T9s:0.4,98s:0.25,AQo:0.45,AJo:0.1,A5s:0.3,A4s:0.3',
  },
  'HJ-vs-SB': {
    '4bet': 'KK+,AKs,QQ:0.35,AKo:0.55,A5s:0.4,A4s:0.3,A3s:0.15',
    call:
      'QQ:0.65,JJ-66,55:0.5,44:0.3,AKo:0.45,AQs,AJs:0.9,ATs:0.75,A9s:0.3,KQs:0.9,KJs:0.75,KTs:0.5,QJs:0.75,QTs:0.4,' +
      'JTs:0.75,T9s:0.6,98s:0.4,87s:0.25,AQo:0.55,AJo:0.2,KQo:0.25,A5s:0.45,A4s:0.4',
  },
  'HJ-vs-BB': {
    '4bet': 'KK+,AKs,QQ:0.35,AKo:0.5,A5s:0.4,A4s:0.3,A3s:0.15',
    call:
      'QQ:0.65,JJ-55,44:0.4,33:0.2,AKo:0.5,AQs,AJs:0.9,ATs:0.8,A9s:0.4,A8s:0.2,KQs:0.9,KJs:0.8,KTs:0.55,K9s:0.2,QJs:0.8,' +
      'QTs:0.45,JTs:0.8,J9s:0.2,T9s:0.65,98s:0.45,87s:0.3,76s:0.2,AQo:0.6,AJo:0.25,KQo:0.3,A5s:0.5,A4s:0.45',
  },
  'CO-vs-BTN': {
    '4bet': 'KK+,AKs,QQ:0.45,JJ:0.15,AKo:0.65,AQs:0.15,A5s:0.55,A4s:0.45,A3s:0.3,A2s:0.15,KQs:0.2,KJs:0.1,AJo:0.05',
    call:
      'QQ:0.55,JJ:0.85,TT-66,55:0.4,44:0.25,AKo:0.35,AQs:0.85,AJs:0.85,ATs:0.7,A9s:0.3,KQs:0.75,KJs:0.7,KTs:0.45,QJs:0.65,' +
      'QTs:0.35,JTs:0.65,T9s:0.45,98s:0.3,87s:0.2,AQo:0.55,AJo:0.25,KQo:0.25,A5s:0.3,A4s:0.3',
  },
  'CO-vs-SB': {
    '4bet': 'KK+,AKs,QQ:0.4,JJ:0.1,AKo:0.6,A5s:0.5,A4s:0.4,A3s:0.25,KQs:0.15',
    call:
      'QQ:0.6,JJ:0.9,TT-55,44:0.45,33:0.3,22:0.2,AKo:0.4,AQs,AJs:0.95,ATs:0.85,A9s:0.45,A8s:0.25,KQs:0.85,KJs:0.85,' +
      'KTs:0.6,K9s:0.25,QJs:0.85,QTs:0.55,Q9s:0.2,JTs:0.85,J9s:0.3,T9s:0.7,98s:0.55,87s:0.4,76s:0.3,65s:0.2,AQo:0.65,' +
      'AJo:0.35,KQo:0.4,A5s:0.45,A4s:0.45',
  },
  'CO-vs-BB': {
    '4bet': 'KK+,AKs,QQ:0.4,JJ:0.1,AKo:0.55,A5s:0.45,A4s:0.4,A3s:0.25,KQs:0.1',
    call:
      'QQ:0.6,JJ:0.9,TT-44,33:0.4,22:0.3,AKo:0.45,AQs,AJs:0.95,ATs:0.9,A9s:0.55,A8s:0.35,A7s:0.2,KQs:0.9,KJs:0.85,' +
      'KTs:0.7,K9s:0.35,QJs:0.85,QTs:0.65,Q9s:0.3,JTs:0.85,J9s:0.4,T9s:0.75,T8s:0.2,98s:0.6,87s:0.5,76s:0.4,65s:0.3,' +
      'AQo:0.7,AJo:0.4,KQo:0.45,A5s:0.5,A4s:0.5',
  },
  'BTN-vs-SB': {
    '4bet':
      'QQ+,AKs,JJ:0.35,TT:0.1,AKo:0.75,AQs:0.2,AQo:0.15,A5s:0.5,A4s:0.45,A3s:0.35,A2s:0.25,K9s:0.1,KTs:0.15,K5s:0.1,' +
      'Q9s:0.1,J9s:0.1,T8s:0.1,76s:0.1,65s:0.1,54s:0.1,A9o:0.05',
    call:
      'JJ:0.65,TT:0.9,99-22,AKo:0.25,AQs:0.8,AJs-A6s,A5s:0.5,A4s:0.55,A3s:0.5,A2s:0.5,KQs-KJs,KTs:0.85,K9s:0.9,K8s:0.5,' +
      'K7s:0.3,QJs-QTs,Q9s:0.9,Q8s:0.4,JTs,J9s:0.9,J8s,T9s,T8s:0.85,97s:0.5,98s,87s,86s:0.4,76s:0.85,75s:0.3,65s:0.85,' +
      '54s:0.7,AQo:0.85,AJo:0.8,ATo:0.6,A9o:0.2,KQo:0.75,KJo:0.5,KTo:0.25,QJo:0.4,QTo:0.15,JTo:0.3',
  },
  'BTN-vs-BB': {
    '4bet':
      'QQ+,AKs,JJ:0.3,AKo:0.7,AQs:0.15,AQo:0.1,A5s:0.45,A4s:0.4,A3s:0.3,A2s:0.2,KTs:0.1,K9s:0.1,Q9s:0.1,J9s:0.1,' +
      '76s:0.1,65s:0.1,54s:0.1',
    call:
      'JJ:0.7,TT-22,AKo:0.3,AQs:0.85,AJs-A6s,A5s:0.55,A4s:0.6,A3s:0.6,A2s:0.6,KQs-KJs,KTs:0.9,K9s:0.9,K8s:0.6,K7s:0.4,' +
      'K6s:0.2,QJs-QTs,Q9s:0.9,Q8s:0.5,JTs,J9s:0.9,J8s,T9s,T8s,97s:0.6,98s,87s,86s:0.5,76s:0.9,75s:0.4,65s:0.9,64s:0.2,' +
      '54s:0.8,AQo:0.9,AJo:0.85,ATo:0.7,A9o:0.3,KQo:0.85,KJo:0.6,KTo:0.35,QJo:0.5,QTo:0.25,JTo:0.4',
  },
  'SB-vs-BB': {
    '4bet':
      'QQ+,AKs,JJ:0.4,TT:0.15,AKo:0.75,AQs:0.25,AQo:0.2,A5s:0.5,A4s:0.45,A3s:0.35,A2s:0.25,K9s:0.1,KTs:0.15,K5s:0.1,' +
      'Q9s:0.1,76s:0.1,65s:0.1,54s:0.1',
    call:
      'JJ:0.6,TT:0.85,99-33,22:0.6,AKo:0.25,AQs:0.75,AJs-A7s,A6s:0.8,A5s:0.5,A4s:0.55,A3s:0.5,A2s:0.4,KQs-KJs,KTs:0.85,' +
      'K9s:0.8,K8s:0.4,QJs-QTs,Q9s:0.7,JTs,J9s:0.7,T9s,T8s:0.5,98s:0.8,87s:0.7,76s:0.6,65s:0.5,54s:0.4,AQo:0.8,' +
      'AJo:0.7,ATo:0.5,A9o:0.15,KQo:0.6,KJo:0.35,QJo:0.2',
  },
};
