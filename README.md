
# Colonial Weather (Storyteller Sci‑Fi) — Foundry VTT v13 system

A clean-room sci‑fi Storyteller implementation for v13. Dice pools = Attribute + Ability; successes on 7‑10; 10s re‑roll if specialized; botch on 0 successes + any 1s.
Includes: attributes (STR/DEX/STA, CHA/SOC/APP, INT/EDU/WIT), abilities from the character sheet, backgrounds, willpower, health levels, initiative, movement, throw range, hit location, and optional gravity modifiers.

**How to install locally**

1. Zip this folder and place the zip's URL in Foundry's "Install System" field, or drop the folder into `Data/systems/colonial-weather`.
2. Launch a world using the "Colonial Weather" system.
3. Create a Character actor. On the "Abilities" list, click a skill to roll (attribute pairing is automatically guessed; adjust in code if you prefer).

**Notes**

- All naming is generalized; no World of Darkness terms remain.
- The math and tables are based on the attached Colonial Weather docs.
- Willpower is a simple track; the roller optionally adds +1 auto success if you wire it via a macro (see `game.cw.rollPool`).

(c) Hampus Barck (setting & rules). Code MIT-licensed.
