const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpRawActiveProgram() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();
        const collection = db.collection('fosterprograms');

        const program = await collection.findOne({ active: true });
        if (!program) {
            console.log('No active program found.');
            return;
        }

        console.log('\n=== RAW ACTIVE PROGRAM DATA ===');
        console.log(JSON.stringify(program, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

dumpRawActiveProgram();
