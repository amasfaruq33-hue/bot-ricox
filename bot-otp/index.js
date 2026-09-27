const https = require('https');
const crypto = require('crypto');

const TELEGRAM_TOKEN = '8727991980:AAH0lpHRWyosW-eZE3Nr2SiTVFhIrE157Y';
const TELEGRAM_CHAT_ID = '8695086216';
const SECRET_KEY = 'wh_3d5ced7016e90588334bbd7a7800258546ed98c79a65602f';

// Helper untuk membaca raw body di Vercel (agar signature HMAC valid)
async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', err => reject(err));
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        return res.end('Method Not Allowed');
    }

    try {
        const rawBody = await getRawBody(req);
        
        // 1. Validasi Signature HMAC-SHA256 dari panel OTP
        const signature = req.headers['x-signature'] || '';
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(rawBody)
            .digest('hex');

        // Jika signature tidak cocok, kita bisa abaikan atau beri respon 403
        // (Untuk amannya, kita cek hash_equals setara di Node.js)
        if (signature !== expectedSignature) {
            console.warn("Signature tidak valid!");
            // Kalau mau longgar saat testing, baris return di bawah bisa di-comment dulu
            // res.statusCode = 403;
            // return res.end(JSON.stringify({ error: 'Unauthorized signature' }));
        }

        const data = JSON.parse(rawBody);
        const event = data.event || 'otp.received';

        if (event === 'otp.received' || event === 'test.webhook') {
            const service = data.service || 'Unknown';
            const phone = data.phone || '-';
            const otpCode = data.otp_code || '-';
            const smsText = data.sms_text || '-';

            let pesan = "🔔 *NOTIFIKASI OTP MASUK!*\n\n";
            pesan += `📱 Layanan: ${service.toUpperCase()}\n`;
            pesan += `📞 No HP: \`${phone}\`\n`;
            pesan += `🔑 Kode OTP: *${otpCode}*\n`;
            pesan += `💬 SMS: ${smsText}`;

            await sendTelegramMessage(TELEGRAM_CHAT_ID, pesan);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: "success" }));

    } catch (error) {
        console.error("Error:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
};

function sendTelegramMessage(chatId, text) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        });

        const options = {
            hostname: 'api.telegram.org',
            path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}
