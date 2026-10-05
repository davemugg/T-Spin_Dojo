/* T-Spin Dojo setup catalog. Rows run top -> bottom, 'X' = filled, '.' = empty.
   Solutions are NOT stored: the engine's solver finds the shortest input sequence for the
   board (and for its mirror image), so the lessons always match the real rules. */
(function (root) {
  'use strict';

  const SETUPS = [
    {
      id: 'edge',
      name: 'Edge Overhang',
      level: 'Essential',
      blurb: 'The bread-and-butter T-spin double. A one-cell hole in the bottom row sits next to the wall, and a ledge hangs over the right side of the pocket above it.',
      spot: [
        'Bottom row is full except for one hole, one cell in from the wall.',
        'The row above is open for three cells, starting at the wall and running over the hole.',
        'A block sits above the far side of that opening (the overhang). The wall side above the pocket is open.'
      ],
      rows: [
        '..XXXXXXXX',
        '...XXXXXXX',
        'X.XXXXXXXX'
      ]
    },
    {
      id: 'floor',
      name: 'Open-Floor Overhang',
      level: 'Essential',
      blurb: 'The same idea out in the middle of the board. A step on the left, a taller stack on the right, and the overhang juts out over the pocket.',
      spot: [
        'A one-cell hole in the floor row, with filled cells on both sides of it.',
        'The row above has a three-cell gap centred on that hole.',
        'The taller side has a block hanging over the gap. The shorter side is open above, which is where the T drops in.'
      ],
      rows: [
        '.....XXXXX',
        'XXX...XXXX',
        'XXXX.XXXXX'
      ]
    },
    {
      id: 'ledge',
      name: 'Ledge Kick',
      level: 'Intermediate',
      blurb: 'A pocket with a wide open ledge beside it. The shortest route uses the wall kick: rotate the T down beside the pocket, then rotate again and the game slides it into the slot.',
      spot: [
        'A one-cell hole in the floor row under a pocket that is three cells wide.',
        'The row above the pocket has a two-cell opening starting at the pocket centre.',
        'An overhang block covers the outer edge of the pocket on the wall side.'
      ],
      rows: [
        'XXX..XXXXX',
        'XX...XXXXX',
        'XXX.XXXXXX'
      ]
    },
    {
      id: 'stair',
      name: 'Staircase',
      level: 'Intermediate',
      blurb: 'The stack rises in steps from left to right. The top step forms the overhang, and the pocket sits at the foot of the staircase.',
      spot: [
        'Three levels: a low left side, a middle step, and a tall right side.',
        'The hole in the floor row sits under the gap between the low side and the middle step.',
        'The top step overlaps the pocket by one cell. That cell is the overhang.'
      ],
      rows: [
        '......XXXX',
        '.....XXXXX',
        'XXX...XXXX',
        'XXXX.XXXXX'
      ]
    },
    {
      id: 'plateau',
      name: 'Plateau',
      level: 'Intermediate',
      blurb: 'A raised right side with a short shelf, and a wide flat area on the left. The pocket is tucked against the plateau wall.',
      spot: [
        'A tall block on the right with a one-cell step on its top-left.',
        'A one-cell hole in the floor row, centred in a three-cell gap next to that block.',
        'The three cells above the hole are open apart from the step, which overhangs the pocket.'
      ],
      rows: [
        '.......XXX',
        '......XXXX',
        'XXXX...XXX',
        'XXXXX.XXXX'
      ]
    }
  ];

  // Build drills: start from bare stack ('G' = filled), drop the listed pieces in order, then spin the T.
  // Nothing here is scripted: any placement that keeps a T-spin double available is accepted, and the
  // engine's search (TW.buildPlan) supplies hints and the reference plan. Each drill needs every piece.
  const BUILDS = [
    { id: 'b-flat-ledge', name: 'Level the Floor, Raise the Ledge',
      tip: 'A wide gap sits beside the pocket. One piece levels it, the other makes the overhang.',
      rows: ['GG...G....', 'GGG.GGGGGG'], pieces: ['I', 'J'] },
    { id: 'b-square-ledge', name: 'Square Then Ledge',
      tip: 'The gap at the edge is only two cells wide. Decide which piece suits it.',
      rows: ['GG...GGG..', 'GGG.GGGGGG'], pieces: ['O', 'L'] },
    { id: 'b-notch', name: 'Fill the Notch',
      tip: 'A one-cell notch interrupts the flat. Fill it without closing the pocket.',
      rows: ['GG...G.GGG', 'GGG.GGGGGG'], pieces: ['S', 'L'] },
    { id: 'b-zigzag', name: 'Zig-Zag Base',
      tip: 'Only one order and placement of these two pieces works. Look for the overhang first.',
      rows: ['.....GGGGG', 'GGG.GGGGGG'], pieces: ['Z', 'J'] },
    { id: 'b-wall-base', name: 'Wall Base',
      tip: 'The wall already gives you one overhang cell. Level the floor next to the pocket.',
      rows: ['G.........', '......GGGG', 'G.GGGGGGGG'], pieces: ['O', 'Z'] },
    { id: 'b-shallow', name: 'Shallow Base',
      tip: 'The pocket is nearly built. One piece finishes the floor and one covers the pocket.',
      rows: ['G....GGGGG', 'GG.GGGGGGG'], pieces: ['Z', 'J'] },
    { id: 'b-wide', name: 'Wide Floor',
      tip: 'Two separate gaps flank the pocket. Keep the three cells above the hole clear.',
      rows: ['GGG...G...', 'GGGG.GGGGG'], pieces: ['I', 'L'] },
    { id: 'b-t-base', name: 'T as a Builder',
      tip: 'The first T is just a building block. Save the spin for the second one.',
      rows: ['.....GGGGG', 'GGG.GGGGGG'], pieces: ['T', 'L'] },
    { id: 'b-three-floor', name: 'Three-Piece Floor',
      tip: 'A long open floor. Level it from the far side, then raise the ledge last.',
      rows: ['GG........', 'GGG.GGGGGG'], pieces: ['I', 'O', 'J'] },
    { id: 'b-three-mixed', name: 'Three-Piece Mix',
      tip: 'Every piece matters here. Plan which one is the overhang before you drop any.',
      rows: ['GG........', 'GGG.GGGGGG'], pieces: ['I', 'J', 'L'] }
  ];

  root.TW_SETUPS = SETUPS;
  root.TW_BUILDS = BUILDS;
})(this);
