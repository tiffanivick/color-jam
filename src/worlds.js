// The worlds. Each has a theme (see style.css) and a brick picture that fills in as you clear its levels.
const WORLDS = [
 {
  "id": "meadow",
  "name": "Sunny Meadow",
  "tagline": "Warm up on easy slides",
  "picture": "a cozy cottage",
  "pal": {
   "Y": "#ffd447",
   "R": "#e8434f",
   "W": "#fff1d6",
   "B": "#8fd3ff",
   "D": "#8a5a35",
   "g": "#33cc7a",
   "f": "#1f9d55",
   "N": "#8a5a35",
   "c": "#ffffff"
  },
  "art": [
   "..........YY....",
   ".....RR..YYYY...",
   "....RRRR..YY.ff.",
   "...RRRRRR...ffff",
   "..RRRRRRRR.fffff",
   "..WWWWWWWW.fffff",
   "..WBBWWBBW..fff.",
   "..WBBWWBBW...N..",
   "..WWWDDWWW...N..",
   "..WWWDDWWW...N..",
   "gggggggggggggggg",
   "gggggggggggggggg"
  ]
 },
 {
  "id": "frost",
  "name": "Frostbite Peak",
  "tagline": "Ice blocks thaw as others leave",
  "picture": "a chilly penguin",
  "pal": {
   "k": "#3d4f9e",
   "w": "#f4fbff",
   "o": "#ff9a2e",
   "b": "#9fd8ff",
   "i": "#d6f1ff",
   "s": "#ffffff"
  },
  "art": [
   "...........s..",
   "....kkkk......",
   "...kkkkkk.....",
   "..kkwkkwkk..s.",
   "..kkkkkkkk....",
   "..kkkoookk....",
   ".kkkwwwwkkk...",
   ".kkwwwwwwkk...",
   ".kkwwwwwwkk...",
   ".kkwwwwwwkk...",
   "..kwwwwwwk....",
   "..kkwwwwkk....",
   "...ooo.ooo....",
   "bbbbbbbbbbbbbb",
   "iiiiiiiiiiiiii"
  ]
 },
 {
  "id": "candy",
  "name": "Candy Cove",
  "tagline": "Tighter boards, sweeter puzzles",
  "picture": "an ice cream cone",
  "pal": {
   "r": "#e8434f",
   "p": "#ff7ab6",
   "c": "#fff0d9",
   "t": "#e8a85a",
   "T": "#c98638",
   "m": "#b66be8",
   "s": "#ffffff"
  },
  "art": [
   ".....r....",
   "....rr....",
   "...pppp...",
   "..pppppp..",
   ".pppppppp.",
   ".pcpcpcpc.",
   "..cccccc..",
   ".mmmmmmmm.",
   ".mmmmmmmm.",
   "..tTtTtT..",
   "..tTtTtT..",
   "...TtTtT..",
   "...tTtT...",
   "....TtT...",
   ".....T...."
  ]
 },
 {
  "id": "ember",
  "name": "Ember Forge",
  "tagline": "Hot, crowded and clever",
  "picture": "a grumbling volcano",
  "pal": {
   "r": "#ff4d2e",
   "o": "#ffa02e",
   "y": "#ffe14a",
   "d": "#4a3040",
   "m": "#6b4558",
   "k": "#8a8aa8",
   "s": "#b9b9d4"
  },
  "art": [
   "...s....s.....",
   "..sks..sks....",
   "...sk..ks.....",
   "....y..y......",
   "...yoyyoy.....",
   "..yoorrooy....",
   "...mrrrrm.....",
   "...mmddmm.....",
   "..mmmddmmm....",
   ".mmmmddmmmm...",
   ".mmmdddmmmmm..",
   "mmdddddmmmmmm.",
   "dddddddddddddd",
   "dddddddddddddd"
  ]
 },
 {
  "id": "star",
  "name": "Starlight Station",
  "tagline": "The final countdown",
  "picture": "a rocket ship",
  "pal": {
   "w": "#f4f6ff",
   "r": "#e8434f",
   "b": "#4d9bff",
   "y": "#ffd447",
   "o": "#ff8a3d",
   "n": "#6a63d9",
   "s": "#ffffff",
   "g": "#b9bde8"
  },
  "art": [
   "s.....y.......s",
   ".......r.......",
   "......www......",
   ".....wwwww.....",
   ".....wwbww.....",
   ".....wbbbw.....",
   ".....wwbww.....",
   "....rwwwwwr....",
   "...rrwwwwwrr...",
   "...rrwgggwrr...",
   "...r.wwwww.r...",
   "s.....ooo....s.",
   "......oyo......",
   ".......o.......",
   "..y..........y."
  ]
 }
];
