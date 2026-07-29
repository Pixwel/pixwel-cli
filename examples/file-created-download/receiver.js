/**
 * Minimal Pixwel webhook receiver — verifies the signature and, on `file.created`, fetches a
 * fresh presigned download URL for the new file.
 *
 * No dependencies (Node 18+). Run it behind `pixwel listen`:
 *
 *   PIXWEL_WEBHOOK_SECRET=whsec_…  PIXWEL_TOKEN=pat_…  node receiver.js
 *   pixwel listen --forward-to localhost:4000/webhooks   # in another terminal
 *   pixwel trigger file.created                           # fire a test event
 *
 * See ./README.md for the full walkthrough.
 */

import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 4000);
const SECRET = process.env.PIXWEL_WEBHOOK_SECRET; // printed by `pixwel listen`
const TOKEN = process.env.PIXWEL_TOKEN; // your pat_… token, for fetching downloads
const TOLERANCE_SECONDS = 300;

if (!SECRET) {
	console.error('Set PIXWEL_WEBHOOK_SECRET to the secret printed by `pixwel listen`.');
	process.exit(1);
}

/**
 * Verify `Pixwel-Signature: t=<unix ts>,v1=<hex hmac>` where
 * `hmac = HMAC-SHA256(secret, "<ts>.<rawBody>")`. Always verify against the RAW body, and
 * reject stale timestamps to blunt replay.
 */
function verifySignature(rawBody, header, secret) {
	const fields = Object.fromEntries(
		String(header || '')
			.split(',')
			.map((part) => part.split('=').map((s) => s.trim()))
	);

	const expected = crypto
		.createHmac('sha256', secret)
		.update(`${fields.t}.${rawBody}`)
		.digest('hex');
	const provided = fields.v1 || '';

	const signatureOk =
		provided.length === expected.length &&
		crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

	const timestamp = Number(fields.t);
	const fresh =
		Number.isFinite(timestamp) && Math.abs(Date.now() / 1000 - timestamp) <= TOLERANCE_SECONDS;

	return signatureOk && fresh;
}

/**
 * Exchange the payload's stable `download` URL for a fresh, short-lived presigned S3 URL.
 * The webhook body never carries the expiring link — you fetch it on demand with your token.
 */
async function resolveDownloadUrl(downloadEndpoint) {
	if (!TOKEN) {
		throw new Error('set PIXWEL_TOKEN (your pat_… token) to resolve downloads');
	}
	const response = await fetch(downloadEndpoint, {
		headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' }
	});
	if (!response.ok) {
		throw new Error(`download endpoint returned ${response.status}`);
	}
	const { url } = await response.json();
	return url;
}

async function onFileCreated(file) {
	console.log(`  file: ${file.name} (${file._id})`);
	if (!file.download) {
		console.log('  (no download url on this payload)');
		return;
	}
	try {
		const url = await resolveDownloadUrl(file.download);
		console.log(`  presigned: ${url.slice(0, 90)}…`);
		// To pull the bytes:
		//   const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
	} catch (err) {
		console.log(`  could not resolve download: ${err.message}`);
	}
}

const server = http.createServer((req, res) => {
	let raw = '';
	req.on('data', (chunk) => (raw += chunk));
	req.on('end', async () => {
		if (!verifySignature(raw, req.headers['pixwel-signature'], SECRET)) {
			res.writeHead(400).end('invalid signature');
			return;
		}

		const event = JSON.parse(raw);
		console.log(`✔ ${event.type}  ${event.id}${event.test ? '  [test]' : ''}`);

		if (event.type === 'file.created') {
			await onFileCreated(event.data.object);
		}

		// Whatever you return is reported back to the Pixwel delivery log — 2xx means delivered.
		res.writeHead(200).end('ok');
	});
});

server.listen(PORT, () => {
	console.log(`Receiver listening on http://localhost:${PORT}/webhooks`);
	console.log(`Forward to it with:  pixwel listen --forward-to localhost:${PORT}/webhooks`);
});
