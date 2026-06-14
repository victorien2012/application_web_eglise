const fs = require('fs');

async function removeBackground() {
  // Dynamically import jimp
  const jimp = (await import('jimp')).default;
  
  const imagePath = 'd:/PROJET WEB EGLISE/frontend/public/aigle_vol.png';
  const outPath = 'd:/PROJET WEB EGLISE/frontend/public/eagle_transparent.png';
  
  try {
    const image = await jimp.read(imagePath);
    
    // Convert dark pixels to transparent
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // The background is a very dark blue/black.
      // If the pixel is dark enough, make it fully transparent.
      if (red < 50 && green < 50 && blue < 70) {
        this.bitmap.data[idx + 3] = 0; // Alpha = 0
      }
    });
    
    await image.writeAsync(outPath);
    console.log("Background removed successfully.");
  } catch (err) {
    console.error("Error processing image:", err);
  }
}

removeBackground();
