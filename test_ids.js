const axios = require('axios');
const ids = [
  "1579783902614-a3fb3927b6a5", "1543857778-c4a1a3e0b2eb", "1577083552431-6e5fd01988ec",
  "1580136608260-4eb11f4b24fe", "1578301978693-85fa9c026f47", "1579783900882-c0d514d2b271",
  "1576766465809-d754dc93952f", "1582200297052-e5b1ac9a039d", "1579965039268-dceeb7b6f3c5",
  "1513364776144-60967b0f800f", "1578301978018-3005759f48f7", "1505909182942-e2f09aee3e89",
  "1515405295579-ba7b45403062", "1501472312651-726afe119ff1", "1549887552-cb1071d3e5ca",
  "1561214078-f3247657cf49", "1580136608260-4eb11f4b24fe", "1572949645841-094f3a9c4c94",
  "1576766465809-d754dc93952f", "1557053503-0c252e5c8093"
];

async function check() {
  const valid = [];
  for(let id of ids) {
    try {
      const url = `https://images.unsplash.com/photo-${id}?w=800&q=80`;
      const res = await axios.head(url);
      if(res.status === 200) valid.push(url);
    } catch(e) {}
  }
  console.log(JSON.stringify(valid, null, 2));
}
check();
