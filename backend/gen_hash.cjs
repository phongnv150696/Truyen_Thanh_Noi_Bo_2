const bcrypt = require('bcrypt');
bcrypt.hash('123456', 10, (err, hash) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('---HASH_START---');
    console.log(hash);
    console.log('---HASH_END---');
});
