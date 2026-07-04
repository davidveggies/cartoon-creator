import type { CartoonProject } from "./engine/types";

export const project: CartoonProject = {
  title: "Rufus & Archibald",
  characters: [
    {
      id: "rufus",
      name: "Rufus",
      image: "/assets/characters/rufus.png",
      size: "md",
    },
    {
      id: "archibald",
      name: "Archibald",
      image: "/assets/characters/archibald.png",
      size: "md",
    },
    {
      id: "nora",
      name: "Nora",
      image: "/assets/characters/nora.png",
      size: "lg",
    },
    {
      id: "car",
      name: "Nora's Car",
      image: "/assets/characters/car.png",
      size: "sm",
    },
    {
      id: "loco",
      name: "Loco",
      image: "/assets/characters/loco.png",
      size: "md",
    },
    {
      id: "coco",
      name: "Coco",
      image: "/assets/characters/coco.png",
      size: "md",
    },
  ],
  scenes: [
    {
      id: "storybook",
      title: "The Storybook",
      background: { color: "#e8f4fc" },
      beats: [
        {
          type: "panel",
          image: "/assets/story/story1.jpg",
          caption: "From the notebook of Nora's world…",
        },
        {
          type: "title",
          title: "Rufus & Archibald",
          subtitle: "Once upon a time…",
          duration: 3,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "Once upon a time there were 2 kittens named Rufus and Archibald, in a big city, all alone.",
        },
      ],
    },
    {
      id: "big-city",
      title: "The Big City",
      background: {
        image: "/assets/backgrounds/city.jpg",
      },
      beats: [
        {
          type: "action",
          characterId: "rufus",
          action: "enter",
          position: "left",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "enter",
          position: "right",
          delay: 0.2,
        },
        {
          type: "dialogue",
          speaker: "Rufus",
          focusCharacter: "rufus",
          text: "It's so big here… and so quiet.",
        },
        {
          type: "dialogue",
          speaker: "Archibald",
          focusCharacter: "archibald",
          text: "Just you and me, buddy. We'll figure it out.",
        },
        {
          type: "pause",
          duration: 600,
        },
        {
          type: "action",
          characterId: "rufus",
          action: "shake",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "shake",
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "Then suddenly — they heard a loud SCREECH!",
        },
      ],
    },
    {
      id: "nora-arrives",
      title: "Nora Arrives",
      background: {
        image: "/assets/backgrounds/city.jpg",
      },
      beats: [
        {
          type: "transition",
          style: "flash",
        },
        {
          type: "action",
          characterId: "rufus",
          action: "enter",
          position: "left",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "enter",
          position: "right",
        },
        {
          type: "action",
          characterId: "car",
          action: "enter",
          position: "center",
          duration: 0.4,
        },
        {
          type: "action",
          characterId: "car",
          action: "shake",
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "A car stopped right next to them!",
        },
        {
          type: "action",
          characterId: "car",
          action: "fadeOut",
          duration: 0.3,
        },
        {
          type: "action",
          characterId: "nora",
          action: "enter",
          position: "center",
        },
        {
          type: "action",
          characterId: "nora",
          action: "jump",
        },
        {
          type: "dialogue",
          speaker: "Nora",
          focusCharacter: "nora",
          text: "Hey little kittens! I'm Nora. You're coming with me!",
        },
        {
          type: "dialogue",
          speaker: "Rufus",
          focusCharacter: "rufus",
          text: "She has cat ears on her head…",
        },
        {
          type: "dialogue",
          speaker: "Archibald",
          focusCharacter: "archibald",
          text: "I like her already!",
        },
        {
          type: "transition",
          style: "wipe",
          duration: 1.2,
        },
      ],
    },
    {
      id: "cat-house",
      title: "The Cat House",
      background: {
        gradient:
          "linear-gradient(180deg, #ffd6a5 0%, #ffb5a7 50%, #fcd5ce 100%)",
      },
      beats: [
        {
          type: "action",
          characterId: "nora",
          action: "enter",
          position: "center",
        },
        {
          type: "action",
          characterId: "rufus",
          action: "enter",
          position: "left",
          delay: 0.2,
        },
        {
          type: "action",
          characterId: "archibald",
          action: "enter",
          position: "right",
          delay: 0.3,
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "Nora took the kittens in her car back to her cat house.",
        },
        {
          type: "action",
          characterId: "rufus",
          action: "jump",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "jump",
        },
        {
          type: "dialogue",
          speaker: "Archibald",
          focusCharacter: "archibald",
          text: "WHOA!!!",
        },
        {
          type: "dialogue",
          speaker: "Rufus",
          focusCharacter: "rufus",
          text: "There are… so many cats!",
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "The kittens were surprised to see 90,000 other cats!",
        },
      ],
    },
    {
      id: "loco-coco",
      title: "Loco & Coco",
      background: {
        gradient:
          "linear-gradient(180deg, #ffd6a5 0%, #ffb5a7 50%, #fcd5ce 100%)",
      },
      beats: [
        {
          type: "action",
          characterId: "rufus",
          action: "enter",
          position: "left",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "enter",
          position: "right",
        },
        {
          type: "action",
          characterId: "loco",
          action: "enter",
          position: "center",
          delay: 0.4,
        },
        {
          type: "action",
          characterId: "coco",
          action: "enter",
          position: "center",
          delay: 0.55,
        },
        {
          type: "dialogue",
          speaker: "Loco",
          focusCharacter: "loco",
          text: "Hey! What are your names?",
        },
        {
          type: "dialogue",
          speaker: "Rufus",
          focusCharacter: "rufus",
          text: "I'm Rufus — and this is Archibald.",
        },
        {
          type: "dialogue",
          speaker: "Coco",
          focusCharacter: "coco",
          text: "Nice to meet you! We're Loco and Coco.",
        },
        {
          type: "action",
          characterId: "rufus",
          action: "bounce",
        },
        {
          type: "action",
          characterId: "archibald",
          action: "bounce",
        },
        {
          type: "dialogue",
          speaker: "Narrator",
          text: "And so Rufus and Archibald were home at last. To be continued…",
        },
      ],
    },
  ],
};
