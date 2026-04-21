const axios = require('axios');
async function test() {
  const res = await axios.get('https://api.artic.edu/api/v1/artworks/search?q=painting&query[term][is_public_domain]=true&limit=100&fields=id,title,image_id');
  const artworks = res.data.data.filter(a => a.image_id).slice(0, 100);
  console.log("Total valid:", artworks.length);
  if(artworks.length > 0) {
    console.log("Example:", `https://www.artic.edu/iiif/2/${artworks[0].image_id}/full/843,/0/default.jpg`);
  }
}
test().catch(console.error);
