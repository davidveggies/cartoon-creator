import type { CartoonProject } from "../engine/types";

/** Our own monster-card cartoon — not Pokémon, original characters. */
export const cardBeastsProject: CartoonProject = {
  title: "Card Star League",
  characters: [
    {
      id: "staruby",
      name: "Staruby",
      image: "/assets/card-beasts/star-ruby-card.svg",
      size: "lg",
      expressions: {
        creature: "/assets/card-beasts/star-ruby-creature.svg",
        laser: "/assets/card-beasts/star-ruby-laser.svg",
      },
    },
  ],
  scenes: [
    {
      id: "the-idea",
      title: "The Idea",
      background: {
        gradient:
          "linear-gradient(180deg, #1a0a2e 0%, #3b0764 55%, #5b21b6 100%)",
        groundLine: "16%",
      },
      beats: [
        {
          type: "title",
          title: "Card Star League",
          subtitle: "Our own monster-card cartoon",
          duration: 3,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "We're making a cartoon — inspired by monster cards and battling creatures, but it's our own version.",
          duration: 4500,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "This is the storyboard. Here's what our first hero should look like…",
          duration: 3800,
        },
      ],
    },
    {
      id: "the-card",
      title: "The Card",
      background: {
        image: "/assets/backgrounds/cosmic-arena.svg",
        groundLine: "18%",
      },
      beats: [
        {
          type: "action",
          characterId: "staruby",
          action: "enter",
          position: "center",
          duration: 0.7,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "On the outside it looks like a trading card — a purple star with gold around a ruby in the middle.",
          duration: 5200,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "And it's shooting a laser beam right off the card!",
          duration: 3200,
        },
        {
          type: "action",
          characterId: "staruby",
          action: "setExpression",
          expression: "laser",
          duration: 0.3,
        },
        {
          type: "action",
          characterId: "staruby",
          action: "shake",
        },
        {
          type: "transition",
          style: "flash",
        },
      ],
    },
    {
      id: "the-creature",
      title: "The Creature",
      background: {
        image: "/assets/backgrounds/cosmic-arena.svg",
        groundLine: "14%",
      },
      beats: [
        {
          type: "action",
          characterId: "staruby",
          action: "enter",
          position: "center",
        },
        {
          type: "action",
          characterId: "staruby",
          action: "setExpression",
          expression: "creature",
          duration: 0.2,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "Flip the card over — on the back it's a real creature, not just a picture.",
          duration: 4500,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "It's still a purple star shape… but now it has a big case strapped on its back!",
          duration: 4800,
        },
        {
          type: "action",
          characterId: "staruby",
          action: "jump",
        },
        {
          type: "action",
          characterId: "staruby",
          action: "setExpression",
          expression: "laser",
          duration: 0.2,
        },
        {
          type: "action",
          characterId: "staruby",
          action: "bounce",
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "Staruby powers up — ruby glowing, laser ready. The cartoon begins…",
          duration: 4200,
        },
      ],
    },
  ],
};
