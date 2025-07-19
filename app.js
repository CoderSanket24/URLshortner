import http from 'http';
import fs from 'fs/promises';
import path from "path";
import crypto from "crypto";

const PORT = 8000;
const DATAFILE = path.join("data", "links.json");

const serverFile = async (res, filepath, contentType) => {
    try {
        const data = await fs.readFile(filepath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (err) {
        res.writeHead(404, { 'Content-Type': "text/html" });
        res.end("404 page not found");
    }
}

const loadLinks = async () => {
    try {
        const data = await fs.readFile(DATAFILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.writeFile(DATAFILE, JSON.stringify({}));
            return {};
        }
        throw error;
    }
}

const saveLinks = async (links) => {
    await fs.writeFile(DATAFILE, JSON.stringify(links));
}

const server = http.createServer(async (req, res) => {
    console.log(req.url);
    if (req.method === 'GET') {
        if (req.url === '/') {
            return serverFile(res, path.join("public", 'index.html'), 'text/html');
        } else if (req.url === '/style.css') {
            return serverFile(res, path.join("public", 'style.css'), 'text/css');
        } else if (req.url === '/links') {
            const links = await loadLinks();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1); 
            if (links[shortCode]) {
                res.writeHead(302, {location: links[shortCode]});
                return res.end();
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end("Shortend URL is not found.");
        }
    }
    if (req.method === 'POST' && req.url === '/shorten') {
        let body = "";
        req.on('data', (chunk) => (body += chunk)); 
        req.on('end', async () => {
            const links = await loadLinks();
            console.log(body);
            const { url, shortCode } = JSON.parse(body);

            if (!url) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end("URL is invalid");
            }

            const finalSHortCode = shortCode || crypto.randomBytes(4).toString("hex");

            if (links[finalSHortCode]) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                return res.end("Short code already existed please choose another.");
            }

            links[finalSHortCode] = url;

            await saveLinks(links);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, shortcode: finalSHortCode }));
        })
    }
})

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
})