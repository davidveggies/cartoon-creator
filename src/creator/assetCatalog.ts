export type AssetCategory = "character" | "background";

export interface GalleryAsset {
  id: string;
  label: string;
  path: string;
  category: AssetCategory;
}

/** Reusable art for the gallery — not tied to any pre-made story. */
export const GALLERY_ASSETS: GalleryAsset[] = [
  { id: "kitten", label: "Kitten", path: "/assets/characters/kitten.svg", category: "character" },
  { id: "kitten-happy", label: "Happy Kitten", path: "/assets/characters/kitten-happy.svg", category: "character" },
  { id: "kitten-surprised", label: "Surprised Kitten", path: "/assets/characters/kitten-surprised.svg", category: "character" },
  { id: "orange-kitten", label: "Orange Kitten", path: "/assets/characters/orange-kitten.svg", category: "character" },
  { id: "rufus", label: "Tabby Cat", path: "/assets/characters/rufus.svg", category: "character" },
  { id: "archibald", label: "Fluffy Cat", path: "/assets/characters/archibald.svg", category: "character" },
  { id: "nora", label: "Person", path: "/assets/characters/noa.svg", category: "character" },
  { id: "loco", label: "Alley Cat", path: "/assets/characters/loco.svg", category: "character" },
  { id: "coco", label: "Small Cat", path: "/assets/characters/coco.svg", category: "character" },
  { id: "car", label: "Car", path: "/assets/characters/car.svg", category: "character" },
  { id: "glowing-dog", label: "Glowing Dog", path: "/assets/characters/glowing-dog.svg", category: "character" },
  { id: "star-ruby", label: "Star Card", path: "/assets/card-beasts/star-ruby-card.svg", category: "character" },
  { id: "city", label: "Big City", path: "/assets/backgrounds/city.svg", category: "background" },
  { id: "cat-house", label: "Cat House", path: "/assets/backgrounds/cat-house.svg", category: "background" },
  { id: "field", label: "Field", path: "/assets/backgrounds/field.svg", category: "background" },
  { id: "cosmic", label: "Cosmic Arena", path: "/assets/backgrounds/cosmic-arena.svg", category: "background" },
  { id: "storm-house", label: "Stormy House", path: "/assets/backgrounds/cat-house-storm.svg", category: "background" },
];

export function galleryByCategory(category: AssetCategory): GalleryAsset[] {
  return GALLERY_ASSETS.filter((a) => a.category === category);
}
