const { ClientPool } = require("./mongoWrapper.js");
const pool = new ClientPool(10);

(async () => {
  await pool.delete("compromise", "rooms", { q: {}, limit: 0 });
  await pool.delete("compromise", "users", { q: {}, limit: 0 });
  console.log("Done!");
})();
