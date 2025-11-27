import clientPromise from "../../lib/mongodb";

export default async function handler(req, res) {
    try {
        const client = await clientPromise;
        const db = client.db();
        // Ping the database to ensure connection is established
        await db.command({ ping: 1 });
        res.status(200).json({ status: "Connected successfully" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: "Error", error: e.message });
    }
}
