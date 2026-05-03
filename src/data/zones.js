export const zones = Array.from({ length: 35 }, (_, i) => ({
  id: i + 1,
  name: `Zone ${i + 1}`,
  image: `/images/zone${i + 1}.png`
}));
