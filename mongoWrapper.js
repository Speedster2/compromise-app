const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoUrl =
  "mongodb+srv://topAdmin:uCPdG9VJeLznt2Kg@cluster0.jzpwrpk.mongodb.net/?retryWrites=true&w=majority";

class DB {
  constructor(name, collections) {
    this.collections = {};
    this.name = name;
    if (!Array.isArray(collections)) {
      this.collections[collections] = collections;
    } else {
      collections.forEach((coll) => {
        this.collections[coll] = coll;
      });
    }
  }
}

class ClientPool {
  #clientList = [];
  constructor(numOfConnections = 1) {
    if (numOfConnections < 1) {
      throw new Error("Number of connections must be at least 1");
    }
    for (let i = 0; i < numOfConnections; i++) {
      this.#clientList.push(
        new MongoClient(mongoUrl, {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          },
        }),
      );
    }
    this.dbs = {
      compromise: new DB("compromise", "users"),
    };
  }

  async #getFreeClient() {
    if (this.#clientList.length < 1) {
      throw new Error("No free clients!");
    }
    return this.#clientList.pop();
  }

  async #returnClient(client) {
    client.close();
    this.#clientList.push(client);
  }

  freeConnections() {
    return this.#clientList.length;
  }

  async singleCommand(db, command) {
    let out = undefined;
    let client = undefined;
    try {
      client = await this.#getFreeClient();
      await client.connect();
      let dbConnection = await client.db(db);
      out = await dbConnection.command(command);
    } catch (err) {
      out = err;
    } finally {
      this.#returnClient(client);
      return out;
    }
  }

  async insert(db, collection, documents, options = {}) {
    let command = options;
    command.insert = collection;
    command.documents = Array.isArray(documents) ? documents : [documents];
    return await this.singleCommand(db, command);
  }

  async delete(db, collection, delQuery, options = {}) {
    let command = options;
    command.delete = collection;
    if (delQuery.limit === undefined) {
      delQuery.limit = 0;
    }
    command.deletes = Array.isArray(delQuery) ? delQuery : [delQuery];
    return await this.singleCommand(db, command);
  }

  async find(db, collection, filter, options = {}) {
    let command = options;
    command.find = collection;
    command.filter = filter;
    return await this.singleCommand(db, command);
  }

  async update(db, collection, updates, options = {}) {
    let command = options;
    command.update = collection;
    command.updates = Array.isArray(updates) ? updates : [updates];
    return await this.singleCommand(db, command);
  }
}

module.exports = { ClientPool };
