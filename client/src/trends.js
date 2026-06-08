// Viral image-trend presets for the Image → Prompt screen.
// Each preset fills the task field with a battle-tested instruction; the
// backend vision model turns it into a polished prompt for the target model.
// `g` = card gradient [from, to]; emoji keeps cards image-free (zero assets).

export const TRENDS = [
  {
    id: "toy",
    title: "Toy Figure",
    sub: "Collectible box",
    emoji: "🧸",
    g: ["#f7b733", "#fc4a1a"],
    task:
      "Turn the person in this photo into a hyper-detailed collectible action figure displayed inside retail blister packaging. Keep the face clearly recognizable. The box has a bold toy-brand logo, a fun product name, and small accessories (