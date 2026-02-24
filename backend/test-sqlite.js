const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');
db.exec('PRAGMA journal_mode = WAL');
db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
const insert = db.prepare('INSERT INTO test (name) VALUES (?)');
const res = insert.run('Alice');
console.log(res); // should have lastInsertRowid
const select = db.prepare('SELECT * FROM test');
console.log(select.all());
const selectOne = db.prepare('SELECT * FROM test WHERE id = ?');
console.log(selectOne.get(1));
