/** User class for message.ly */
const client = require("../db");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const date = new Date();
    const join_at = date.toISOString();
    const result = await client.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone, join_at, date]
    );
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await client.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]
    );
    let user = result.rows[0];

    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        return true;
      } else {
        return false;
      }
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const date = new Date();
    const result = await client.query(
      `UPDATE users SET last_login_at = $1 WHERE username = $2`,
      [date, username]
    );
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await client.query(
      `SELECT username, first_name, last_name, phone FROM users`
    );
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await client.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at FROM users WHERE username = $1`,
      [username]
    );
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await client.query(
      `SELECT id, username, first_name, last_name, phone, body, sent_at, read_at
        FROM messages JOIN users ON to_username = username WHERE from_username = $1`,
      [username]
    );

    const messages = [];
    for (let r of result.rows) {
      const m = {
        id: r.id,
        to_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
      messages.push(m);
    }
    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await client.query(
      `SELECT id, username, first_name, last_name, phone, body, sent_at, read_at
        FROM messages JOIN users ON from_username = username WHERE to_username = $1`,
      [username]
    );
    const messages = [];
    for (let r of result.rows) {
      const m = {
        id: r.id,
        from_user: {
          username: r.username,
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone,
        },
        body: r.body,
        sent_at: r.sent_at,
        read_at: r.read_at,
      };
      messages.push(m);
    }
    return messages;
  }
}

module.exports = User;
