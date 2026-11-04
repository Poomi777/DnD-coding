/*
 * Realms of Wonder — published campaign data (Age of Wonders 4)
 * ------------------------------------------------------------------
 * Loaded automatically by index.html. Bump "version" on every change so
 * browsers with an older saved copy are offered the update.
 *
 * TERRAIN codes:  g grass  f forest  s swamp  h hills  m mountain  d desert
 *                 t tundra  v volcanic  w shallow water  o deep ocean
 *                 c cavern  x chasm  _ off-map
 * INFLUENCE rows: one character per hex — a faction "key" below, or "." for none.
 * Rows are odd-r offset hexes: odd rows are shifted half a hex to the right.
 * PLACES: named hexes. feature = capital | city | vassal | freecity | outpost |
 *         wonder | landmark | dungeon | portal | battle
 */
window.AOW4_CAMPAIGN = {
  version: 1,
  updated: '2026-11-04',
  activeMapId: 100,

  factions: [
    { id: 1, key: 'P', name: 'Oceans of Poseidon', color: '#22d3c5', culture: '' }
  ],

  maps: [{
    id: 100,
    name: 'The Realm',
    cols: 72, rows: 48,
    gen: { style: 'surface', water: 42, seed: '2026' },

    terrain: [
      "tttwwwwttwoowttttttttttttttwowwwoowooooooooooooooowwwwwtwooooooooooooooo",
      "wwtwwwwttwowttttttttttttttwoowtwwwwowwooooooowooowwwttttwooooooooooooooo",
      "oooowwwwtwwwtthttgtggttttwwwwttttwwwwwowoooooooowwwtttttwooooooooooooooo",
      "oooowwwwwwwttfhtgggggttttoowttthttwwwtttwoooowwwwwtttttttooooooooooooooo",
      "ooooowwwwwwwfffhttggggggggwwtthhhfttttttwwoowwttwtttthhtttwooooooooooooo",
      "oooooowwwwfsfhhttggggggggggghhvhhfhhfffggwwfggtttfhhmhhhggtwoooooooooooo",
      "ooooooowwwffffffgghgggggggghhhvhhhmhhffggggffgggffhhmvmmmmggwooooooooooo",
      "oooowowwwgffffffhhgggggggghhhvhhmvvhhhhhggffggghvvmmmvmmmhgvwoooowwwowwo",
      "oooooowwwwffffffhhggddddddghhhvhhmvvmhhmfhghggghhvvvmvmmmmhggwoooowwooww",
      "ooooooowwfffffffggggdddddghhhhhhvvvvmmmhhhgggghhhhvvvmmmmhggwooowwwwwwww",
      "ooooooooowfffffgggggggdddggghhhhhvvvvmmmhhfgggghhhhhmvmmmmhggwoooooowwww",
      "ooooooooowggggggggwwgddddggggggfmmmvvvmmhffgfgggggdhmvmmmmhggwooooowwfgg",
      "oooooooooowggggggdwwwwddwdgggggghmmvvvvvhfffffggggghhmmmmmmhggdoooowwfff",
      "oooooooowwgggddddwwwdddddggggggghmmmvvvvhfffffggggghgmmmmmhggdgooowsssss",
      "oooooooowfgdwwwwdddwwddddddddddhhhhhfmmmhfsffwwggwggfhhhmmmgggdwwowssfss",
      "ooooooowwggwwwwddwwdwwdgdddddhhhgggfhmmmfssfwoowwwwgfhhhhmhggdwwowssfsss",
      "oooooooowwwgwwwwwwowwwwwddggghhhffgffhmmmfssooooooowfhhhfffgggggwwwwssss",
      "oooooooowwwwwwwwwoowwwwgdgggghhfffgfhhmmfswooooooowffmhhfffgggggwwwwsfss",
      "oooooooooowwgwoowwowwwggwggggggggfgggghmhfswwooooowffhhhhhhffgggfwwwwffs",
      "ooooooooooowwwowgwwggggggggggggggfggghhmfffwwwwowgffhhhhhhffffffwwowffff",
      "ooowwoooowoooowwggggggggggdggggggffgghhhhffgggwwddggffhhfhhhfwwwoowwffff",
      "ooowvwwwwwoooowwgggggggggddggggggwgghvhhfffggdddddghffffffhffwoooowfffff",
      "ooowwooowwwwoooowggggdggggggddwwwwggghhhhfffgddddhhhhhfhhhfffwooooowwfff",
      "oooooooodwwwwwoowggggggggdddwwwowggghhhhfffggddhmhhhmmhfhfffwooooooowwww",
      "oooowwoowdddggwowwggggggggddwwwoowggghvvvhfhhhmmmvhhhmmhhffffwfwoooooooo",
      "oooodwowwddggwowfggdgggwgddddwooowgghvvvvhvvvmmmhdhhmhvvffffffffwooooooo",
      "owwwwwwwwdddggwowfgddgwwwddddwoooowggvvvvhvvvvmmmhghhvvvhgggggfffooooooo",
      "wwwwwwwwwgggwoowffgddgwwwwwdwwooowwghvvvmmhvmmmmmhhhhvmhgggggggfwwoooooo",
      "wwggwwwwwggfwooofwfggdgddddddwwwwwdddghhmmmvvmmmmmmhhvvhgdgggggwwooooooo",
      "wwwwwwwwwgfwoooowwffggdddddddddddddhddghhmmmmmmmmvvvvvmhddwwwwwooooooooo",
      "wwwwwwwwffwwooooowwwfghhddddddhddghhhddgffmmmmmmmmvvvvmhhdwoooooooowoooo",
      "wowwwowffwwoooooowwwfgddddhdddhhhhhhdwwfffhmhfhhhmmmvvmmddwwooooowoooooo",
      "wwoowwwwffwwwooooowfggddddddddddhhhhddwwwfffffffhhhhvvvmhddwwwwowwwooooo",
      "ooooowwwwfwwwoooogggggggdghgdddddhhddwooowffffssffhhvvvhhddwwoowwwwwwwww",
      "ooooooowwwwwwoooowgggggggggggggddhhggoooooowwwwwsffmhhhhhdddwwooowggdwdd",
      "oooooowowwwwwoooowdddwwwgghghgggghvvwoooooowwowwffhhhhhhhddgwwooowggggdd",
      "oooooowwwfwwoooooowwwwddgghhhfgghhhvwooooooooooowfghhhhhhhgggwwowwfgffgg",
      "oooooowwswwooooooowddwwggghhhhhhhfffooooowwwooowgghhhmmhhhgffswwwwffffgw",
      "oooowsffsswwoooooogddwwwgfffhhhhhfffwooowwwwfwwwghhhhhmmmhhhffswswwssffg",
      "oooowffffwooooooogddddddgffhhhmhffffwowssssffwgghmmmhhhmhhhfffssssffwffw",
      "oooowsfffswwooooowgggggggfffhhhhhfffgwffsssfffggghhhhgggghhhhfffffffwwww",
      "oooossffffwoooooowwgggggffhhhhhhffffgggffsfhffgghhhgggggffffffhffffsfwww",
      "oooowtffffwoooooooowggggffggghhhfffffggwfffhhffgggfffwwofffffffhgfffsfww",
      "oooowttttwooooooooowwwwgggghhhhgffggtwwwffhhhfghffffwooowtfffffghffswwww",
      "oooowwttttooooooooooowwwgttgthhhhhfgtwwowghhhtffffsfwoooowtfffffhhfffwwo",
      "oooowwwttwoooooooooowwwwttttttthfttttwwwtghhtttftttwooooottftthhhhtttwww",
      "oooooowwttoooooooowwowwwtttttttthtttttowwtttttttttttwoooowtttttthttttwww",
      "ooooooooowooooooowwwtwwwwwwwtttttttttwwoowwttttttwooooooowwtttttttwwowoo"
    ],

    influence: [
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........P.PPPP..........................................................",
      ".......PPPPPPP..PPP.....................................................",
      "......PPPPPPPPP.PPPPP...................................................",
      "....PPPPPPPPPPPPPPPP....................................................",
      ".PPPPPPPPPPPPPPPPPPP....................................................",
      "PPPPPPPPPPPPPPPPPPPPP...................................................",
      "PPPPPPPPPPPPPPPPPPPPP...................................................",
      "PPPPPPPPPPPPPPPPPPPP....................................................",
      "PPPP.PPPPPPPPPP.PPPP....................................................",
      "P...PPPPPPPPPP..PPPP....................................................",
      "......PPPPPPPP..........................................................",
      "......PPPPPPPP..........................................................",
      ".......PPPPPPP..........................................................",
      ".....PPPPPPPP...........................................................",
      ".....PPPPP..............................................................",
      "....PPPPPPP.............................................................",
      "....PPPPPPPP............................................................",
      "...PPPPPPPP.............................................................",
      "....PPPPPPPP............................................................",
      ".....PPPPPP.............................................................",
      "......PPPPP.............................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................",
      "........................................................................"
    ],

    places: [
      { c: 10, r: 28, name: "Atlantea", feature: "capital", owner: "P", desc: "Throne-city of the Oceans of Poseidon, raised on the central isles of the Shoal Archipelago." },
      { c: 7, r: 39, name: "Tritonhold", feature: "city", owner: "P", desc: "Forest-isle city guarding the southern sea lanes." },
      { c: 17, r: 27, name: "Coralreach", feature: "city", owner: "P", desc: "Mainland foothold across the deep channel." },
      { c: 2, r: 28, name: "Nereid Watch", feature: "outpost", owner: "P", desc: "Watch-post on the outermost islet of the archipelago." },
      { c: 4, r: 21, name: "The Trident Spire", feature: "landmark", desc: "A smoking volcanic islet out in the western deep." }
    ],

    chronicle: [
      { ts: 'Campaign start', text: 'The Oceans of Poseidon rule the Shoal Archipelago from Atlantea, with Tritonhold to the south, a mainland foothold at Coralreach and a watch-post at Nereid Watch.' }
    ]
  }]
};
