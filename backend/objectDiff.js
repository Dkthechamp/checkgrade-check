const sharp = require("sharp");

/**
 * Extract object bounding boxes using thresholding
 */
async function extractObjects(imagePath, width = 260, height = 180) {
  const { data } = await sharp(imagePath)
    .resize(width, height)
    .grayscale()
    .threshold(120)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const visited = new Uint8Array(width * height);
  const objects = [];

  const index = (x, y) => y * width + x;

  function floodFill(x, y) {
    const stack = [[x, y]];
    let minX = x, maxX = x, minY = y, maxY = y;
    let area = 0;

    while (stack.length) {
      const [cx, cy] = stack.pop();
      const i = index(cx, cy);
      if (visited[i] || data[i] === 0) continue;

      visited[i] = 1;
      area++;

      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
            stack.push([nx, ny]);
          }
        }
      }
    }

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, area };
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(x, y);
      if (!visited[i] && data[i] > 0) {
        const obj = floodFill(x, y);
        if (obj.area > 300) objects.push(obj); // ignore noise
      }
    }
  }

  return objects;
}

/**
 * Compare reference vs actual objects
 */
function compareObjects(ref, act) {
  let missing = 0;
  let misplaced = 0;

  ref.forEach(r => {
    const match = act.find(a =>
      Math.abs(r.w - a.w) < 25 &&
      Math.abs(r.h - a.h) < 25 &&
      Math.abs(r.x - a.x) < 40 &&
      Math.abs(r.y - a.y) < 40
    );

    if (!match) missing++;
    else {
      const shift = Math.abs(r.x - match.x) + Math.abs(r.y - match.y);
      if (shift > 60) misplaced++;
    }
  });

  const extra = Math.max(0, act.length - ref.length);
  return { missing, extra, misplaced };
}

module.exports = { extractObjects, compareObjects };
