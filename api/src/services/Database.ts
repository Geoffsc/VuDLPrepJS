import fs = require("fs");
import path = require("path");
import Config from "../models/Config";
import { Knex, knex } from "knex";
import { nanoid } from "nanoid";

// TODO: Config
const dbFilename = "./data/auth.sqlite3";
const tokenLifetime = 24 * 60 * 60 * 1000;

interface User {
    id: number;
    username: string;
    password: string;
    hash: string;
}
interface Token {
    token: string;
    created_at: number;
    user_id: number;
}
interface Pid {
    namespace: string;
    pid: number;
}

async function createDatabase(db): Promise<void> {
    console.log("Database:createTables");
    await db.schema.dropTableIfExists("users");
    await db.schema.createTable("users", (table) => {
        table.increments("id");
        table.string("username");
        table.string("password");
        table.string("hash");
    });
    await db.schema.dropTableIfExists("tokens");
    await db.schema.createTable("tokens", (table) => {
        table.string("token").primary();
        table.timestamp("created_at").notNullable();
        table.integer("user_id").unsigned().references("users.id");
    });
    await db.schema.dropTableIfExists("pids");
    await db.schema.createTable("pids", (table) => {
        table.string("namespace").primary();
        table.integer("pid");
    });
    const config = Config.getInstance();
    const initialPid: Pid = {
        namespace: config.fedoraPidNameSpace,
        pid: config.initialPidValue,
    };
    await db("pids").insert(initialPid);

    const users = [
        { username: "geoff", password: "earth", hash: "CuhFfwkebs3RKr1Zo_Do_" },
        { username: "chris", password: "air", hash: "V1StGXR8_Z5jdHi6B-myT" },
        { username: "dkatz", password: "avatar", hash: "_HPZZ6uCouEU5jy-AYrDd" },
    ];
    for (const user of users) {
        console.log(`Database:insert: ${user.username}`);
        await db("users").insert(user);
    }
}

let db: Knex = null;
const REBUILD_DB = false;
async function getDatabase(): Promise<Knex> {
    if (db === null) {
        console.log("Database:connect");

        const config: Knex.Config = {
            client: "sqlite3",
            connection: {
                filename: dbFilename,
            },
            useNullAsDefault: true,
        };

        db = await knex(config);

        if (REBUILD_DB || !fs.existsSync(dbFilename)) {
            const dataDir = path.dirname(dbFilename);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir);
            }
            await createDatabase(db);
        }

        console.log("Database:ready");
    }

    return db;
}

export async function getUserBy(key: string, val: string | number): Promise<User> {
    const db = await getDatabase();
    const users = await db<User>("users").where(key, val);
    return users[0] ?? null;
}

export async function confirmToken(token: string): Promise<boolean> {
    const db = await getDatabase();
    const rows = await db<Token>("tokens").where("token", token);
    const check = (rows ?? [null])[0];
    if (!check || check.created_at + tokenLifetime < Date.now()) {
        await db("tokens").where("token", token).delete();
        return false;
    }
    return true;
}

export async function getNextPid(namespace: string): Promise<string> {
    const db = await getDatabase();
    let pid = "";
    // We don't want to create a duplicate PID or get out of sync, so we need to
    // do this as a transcation!
    await db.transaction(async function (trx) {
        // Get the latest PID, and fail if we can't find it:
        const current = await trx<Pid>("pids").where("namespace", namespace);
        if (current.length < 1) {
            throw new Error("Cannot find PID for namespace: " + namespace);
        }
        // Increment the PID and update the database:
        const numericPortion = current[0].pid + 1;
        await trx("pids").where("namespace", namespace).update("pid", numericPortion);
        // Commit the transaction:
        await trx.commit();
        // Only update the variable AFTER everything has been successful:
        pid = namespace + ":" + numericPortion;
    });
    if (pid.length === 0) {
        throw new Error("Unexpected pid generation error.");
    }
    return pid;
}

export async function makeToken(user: User): Promise<string> {
    if (user === null) {
        return null;
    }
    const db = await getDatabase();
    const token = nanoid();
    await db("tokens").insert({
        token,
        user_id: user.id,
        created_at: Date.now(),
    });
    return token;
}
